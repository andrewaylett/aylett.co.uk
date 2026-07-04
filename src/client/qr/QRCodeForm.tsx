'use client';

import {
  type ChangeEvent,
  type JSX,
  useRef,
  useState,
  useTransition,
} from 'react';

import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { toBlob, toPng } from 'html-to-image';

import { QRCodeError } from './QRCodeError';
import { QRCodeErrorContext } from './QRCodeErrorContext';

import type { ErrorCorrectionLevel } from '@/client/qr/thirdparty/qrcode.react';

import {
  BUTTON_TEXT,
  type ButtonText,
  QRCode,
  type QRCodeContent,
  URL_SPLITTER,
} from '@/client/qr/QRCode';
import { nullToError } from '@/utilities';
import { useSearchParamsWithEdit } from '@/client/hooks/useSearchParamsWithEdit';
import QRTextStyleControls from '@/client/qr/QRTextStyleControls';
import { useTransformedState } from '@/client/hooks/useTransformedState';
import { BoundEditableInput } from '@/components/BoundEditableInput';

const DEFAULTS = {
  shouldOptimiseUrl: true,
  dotStyle: 'square' as const,
  dotRadius: 0.25,
  minErrorCorrectionLevel: 'L' as ErrorCorrectionLevel,
  rasterText: '',
  rasterFont: 'Impact',
};

function buildSearchParams(qrState: QRCodeContent): URLSearchParams {
  const params = new URLSearchParams();
  if (qrState.text) {
    params.set('text', qrState.text);
  }
  if (!qrState.shouldOptimiseUrl) {
    params.set('optimise', 'false');
  }
  if (qrState.dotStyle === 'dot') {
    params.set('dotStyle', 'dot');
    if (qrState.dotRadius !== DEFAULTS.dotRadius) {
      params.set('dotRadius', Math.round(qrState.dotRadius * 200).toString());
    }
  } else if (qrState.dotStyle === 'text') {
    params.set('dotStyle', 'text');
    if (qrState.rasterText) {
      params.set('rasterText', qrState.rasterText);
    }
    if (qrState.rasterFont && qrState.rasterFont !== DEFAULTS.rasterFont) {
      params.set('rasterFont', qrState.rasterFont);
    }
  }
  if (qrState.minErrorCorrectionLevel !== 'L') {
    params.set('ecl', qrState.minErrorCorrectionLevel);
  }
  return params;
}

function extractContent(searchParams: URLSearchParams): QRCodeContent {
  const isQuine = searchParams.get('quine') === 'true';
  const paramText = searchParams.get('text') ?? '';
  const text = isQuine
    ? `https://www.aylett.co.uk/qr?${searchParams.toString()}`
    : paramText;

  const dotStyleParam = searchParams.get('dotStyle');
  const dotStyle: 'square' | 'dot' | 'text' =
    dotStyleParam === 'dot'
      ? 'dot'
      : dotStyleParam === 'text'
        ? 'text'
        : DEFAULTS.dotStyle;
  const rawRadius = searchParams.get('dotRadius');
  const dotRadius =
    rawRadius !== null && !Number.isNaN(Number(rawRadius))
      ? Number(rawRadius) / 200
      : DEFAULTS.dotRadius;
  const eclParam = searchParams.get('ecl') ?? 'L';
  const minErrorCorrectionLevel = (['L', 'M', 'Q', 'H'] as const).includes(
    eclParam as ErrorCorrectionLevel,
  )
    ? (eclParam as ErrorCorrectionLevel)
    : DEFAULTS.minErrorCorrectionLevel;
  const shouldOptimiseUrl = searchParams.get('optimise') !== 'false';
  const rasterText = searchParams.get('rasterText') ?? DEFAULTS.rasterText;
  const rasterFont = searchParams.get('rasterFont') ?? DEFAULTS.rasterFont;

  return {
    text,
    shouldOptimiseUrl,
    dotStyle,
    dotRadius,
    rasterText,
    rasterFont,
    minErrorCorrectionLevel,
  };
}

export function QRCodeForm(): JSX.Element {
  const resetRef = useRef<() => void>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  const [searchParams, setSearchParams] = useSearchParamsWithEdit();
  const [qrContent, setQRContent] = useTransformedState(
    searchParams,
    setSearchParams,
    extractContent,
    buildSearchParams,
  );

  const [buttonText, setButtonText] = useState<ButtonText>(
    BUTTON_TEXT.INITIAL_TEXT,
  );
  const [_inTransition, startTransition] = useTransition();

  function copyToClipboard() {
    startTransition(async () => {
      if (!ref.current) {
        throw new Error('QR Code SVG is not ready');
      }

      try {
        const blob = nullToError(
          toBlob(ref.current, {
            pixelRatio: 1,
            skipFonts: true,
          }),
          'Failed to render QR code image',
        );
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        startTransition(() => {
          setQRContent();
          setButtonText(BUTTON_TEXT.SUCCESS_TEXT);
        });
      } catch (error) {
        console.error(error);
        startTransition(() => {
          setButtonText(BUTTON_TEXT.FAILED_TEXT);
        });
      }
    });
  }

  const alphanumericValue = qrContent.text.replaceAll(/[^A-Z0-9]/gi, '-');

  function download() {
    startTransition(async () => {
      if (!ref.current) {
        throw new Error('QR Code SVG is not ready');
      }

      const dataUrl = await toPng(ref.current, {
        pixelRatio: 1,
        skipFonts: true,
      });

      const link = document.createElement('a');
      link.download = `qr-${alphanumericValue}.png`;
      link.href = dataUrl;
      link.click();
    });
  }

  function setText(newText: string, inputChanged: boolean = false) {
    startTransition(() => {
      setQRContent((draft) => {
        draft.text = newText;
      }, inputChanged);
      setButtonText(BUTTON_TEXT.INITIAL_TEXT);

      if (resetRef.current) {
        resetRef.current();
      }
    });
  }

  const canOptimiseUrl = URL_SPLITTER.test(qrContent.text);

  return (
    <form className="flex items-center flex-col contain-content">
      <BoundEditableInput
        type="text"
        value={qrContent.text}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          setText(event.target.value, true);
        }}
        onFocus={() => {
          setQRContent();
        }}
        onBlur={() => {
          setQRContent();
        }}
        placeholder="Paste your text here"
        className="border-2 border-gray-300 rounded-md p-2 mb-4 grid-cols-centre w-full"
        data-testid="qr-code-input"
        aria-label="Text to render as a QR code"
      />
      <details className="w-full mt-2">
        <summary>Advanced options</summary>
        <label
          className={
            'w-full overflow-hidden transition-discrete transition-[height] duration-300 ease' +
            (canOptimiseUrl ? ' h-lh' : ' h-0')
          }
        >
          <input
            type="checkbox"
            disabled={!canOptimiseUrl}
            className="m-1"
            checked={qrContent.shouldOptimiseUrl}
            onChange={(event) => {
              startTransition(() => {
                setQRContent((draft) => {
                  draft.shouldOptimiseUrl = event.target.checked;
                });
              });
            }}
          />
          Optimise URL
        </label>
        <label className="w-full flex flex-row items-center gap-2">
          Module style
          <select
            value={qrContent.dotStyle}
            onChange={(event) => {
              startTransition(() => {
                setQRContent((draft) => {
                  draft.dotStyle = event.target.value as
                    | 'square'
                    | 'dot'
                    | 'text';
                });
              });
            }}
          >
            <option value="square">Square</option>
            <option value="dot">Dot</option>
            <option value="text">Text raster</option>
          </select>
        </label>
        <label
          className={
            'w-full flex flex-row items-center gap-2 overflow-hidden transition-discrete transition-[height] duration-300 ease' +
            (qrContent.dotStyle === 'dot' ? ' h-lh' : ' h-0')
          }
        >
          Dot size
          <input
            type="range"
            className="flex-1"
            min={30}
            max={100}
            step={5}
            value={Math.round(qrContent.dotRadius * 200)}
            onChange={(event) => {
              startTransition(() => {
                setQRContent((draft) => {
                  draft.dotRadius = Number(event.target.value) / 200;
                });
              });
            }}
            onFocus={() => {
              setQRContent();
            }}
            onBlur={() => {
              setQRContent();
            }}
          />
          <output className="w-[3ch] text-right">
            {Math.round(qrContent.dotRadius * 200)}%
          </output>
        </label>
        <QRTextStyleControls
          qrContent={qrContent}
          updateQRCode={setQRContent}
        />
        <label className="w-full flex flex-row items-center gap-2">
          Min error correction
          <select
            value={qrContent.minErrorCorrectionLevel}
            onChange={(event) => {
              startTransition(() => {
                setQRContent((draft) => {
                  draft.minErrorCorrectionLevel = event.target
                    .value as ErrorCorrectionLevel;
                });
              });
            }}
          >
            <option value="L">L — Low</option>
            <option value="M">M — Medium</option>
            <option value="Q">Q — Quartile</option>
            <option value="H">H — High</option>
          </select>
        </label>
      </details>
      <QRCodeErrorContext
        value={{
          resetText: () => {
            setText('');
          },
          updateResetRef: (newRef) => {
            resetRef.current = newRef;
          },
        }}
      >
        <ErrorBoundary errorComponent={QRCodeError}>
          <QRCode content={qrContent} ref={ref} showDebug={true}>
            <div className="mt-4 w-full flex flex-row flex-wrap *:grow *:basis-0 gap-4">
              <button
                type="button"
                onClick={() => {
                  startTransition(copyToClipboard);
                }}
              >
                {buttonText}
              </button>
              <button
                type="button"
                onClick={() => {
                  startTransition(download);
                }}
              >
                Download
              </button>
            </div>
          </QRCode>
        </ErrorBoundary>
      </QRCodeErrorContext>
    </form>
  );
}
