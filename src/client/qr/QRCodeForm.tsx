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
  SVG_BUTTON_TEXT,
  type SvgButtonText,
} from '@/client/qr/QRCode';
import { nullToError } from '@/utilities';
import { useSearchParamsWithEdit } from '@/client/hooks/useSearchParamsWithEdit';
import QRTextStyleControls from '@/client/qr/QRTextStyleControls';
import { useTransformedState } from '@/client/hooks/useTransformedState';
import { BoundEditableInput } from '@/components/BoundEditableInput';

const DEFAULTS = {
  shouldOptimiseUrl: true,
  isQuine: false,
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
  if (qrState.renderAsQuine) {
    params.set('quine', 'true');
  }
  if (qrState.shouldOptimiseUrl) {
    params.set('optimise', 'true');
  }
  if (qrState.dotStyle === 'dot') {
    params.set('dotStyle', 'dot');
    if (qrState.dotRadius !== DEFAULTS.dotRadius) {
      params.set('dotRadius', Math.round(qrState.dotRadius * 200).toString());
    }
  } else if (qrState.dotStyle === 'text' || qrState.dotStyle === 'cutout') {
    params.set('dotStyle', qrState.dotStyle);
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
  const renderAsQuine = searchParams.get('quine') === 'true';
  const text = searchParams.get('text') ?? '';

  const dotStyleParam = searchParams.get('dotStyle');
  const dotStyle: 'square' | 'dot' | 'text' | 'cutout' =
    dotStyleParam === 'dot'
      ? 'dot'
      : dotStyleParam === 'text'
        ? 'text'
        : dotStyleParam === 'cutout'
          ? 'cutout'
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
  const shouldOptimiseUrl = searchParams.get('optimise') === 'true';
  const rasterText = searchParams.get('rasterText') ?? DEFAULTS.rasterText;
  const rasterFont = searchParams.get('rasterFont') ?? DEFAULTS.rasterFont;

  return {
    text,
    renderAsQuine,
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

  const [href, searchParams, setSearchParams] = useSearchParamsWithEdit();
  const [qrContent, setQRContent] = useTransformedState(
    searchParams,
    setSearchParams,
    extractContent,
    buildSearchParams,
  );

  const [buttonText, setButtonText] = useState<ButtonText>(
    BUTTON_TEXT.INITIAL_TEXT,
  );
  const [svgButtonText, setSvgButtonText] = useState<SvgButtonText>(
    SVG_BUTTON_TEXT.INITIAL,
  );
  const [_inTransition, startTransition] = useTransition();
  const [advancedOpen, setAdvancedOpen] = useState(false);

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

  function copyPngText(buttonText: ButtonText): string {
    switch (buttonText) {
      case BUTTON_TEXT.INITIAL_TEXT: {
        return 'Copy as PNG';
      }
      case BUTTON_TEXT.SUCCESS_TEXT: {
        return 'Copied as PNG!';
      }
      case BUTTON_TEXT.FAILED_TEXT: {
        return 'Failed to copy PNG';
      }
    }
  }

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

  function downloadSvg() {
    startTransition(() => {
      const svgEl = ref.current?.querySelector('svg');
      if (!svgEl) {
        throw new Error('QR Code SVG is not ready');
      }
      const svgStr = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `qr-${alphanumericValue}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  function copyAsSvg() {
    startTransition(async () => {
      const svgEl = ref.current?.querySelector('svg');
      if (!svgEl) {
        throw new Error('QR Code SVG is not ready');
      }
      try {
        const svgStr = new XMLSerializer().serializeToString(svgEl);
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/svg+xml': svgStr }),
        ]);
        setSvgButtonText(SVG_BUTTON_TEXT.SUCCESS);
      } catch (error) {
        console.error(error);
        setSvgButtonText(SVG_BUTTON_TEXT.FAILED);
      }
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
      <details
        className="w-full mt-2"
        onToggle={(e) => {
          setAdvancedOpen(e.currentTarget.open);
        }}
      >
        <summary>Advanced options</summary>
        <label
          className={
            'w-full overflow-hidden transition-discrete transition-[height] duration-300 ease h-lh'
          }
        >
          <input
            type="checkbox"
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
          Optimise URLs
        </label>
        <label className="w-full">
          <input
            type="checkbox"
            className="m-1"
            checked={qrContent.renderAsQuine}
            onChange={(event) => {
              startTransition(() => {
                setQRContent((draft) => {
                  draft.renderAsQuine = event.target.checked;
                });
              });
            }}
          />
          Quine (encode a link back to this page)
        </label>
        <label className="w-full flex flex-row items-center gap-2">
          Module style
          <select
            value={qrContent.dotStyle}
            onChange={(event) => {
              startTransition(() => {
                setQRContent((draft) => {
                  draft.dotStyle = event.target.value as
                    'square' | 'dot' | 'text' | 'cutout';
                });
              });
            }}
          >
            <option value="square">Square</option>
            <option value="dot">Dot</option>
            <option value="text">Text raster</option>
            <option value="cutout">Text cutout</option>
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
        <label
          className="w-full flex flex-row items-center gap-2"
          title={
            qrContent.dotStyle === 'cutout'
              ? 'Text cutout always uses High error correction'
              : undefined
          }
        >
          Min error correction
          <select
            value={qrContent.minErrorCorrectionLevel}
            disabled={qrContent.dotStyle === 'cutout'}
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
          <QRCode
            content={qrContent}
            quineValue={href}
            ref={ref}
            showDebug={true}
          >
            <div className="mt-4 w-full flex flex-row flex-wrap *:grow *:basis-0 gap-4">
              <button
                type="button"
                onClick={() => {
                  startTransition(copyToClipboard);
                }}
              >
                {advancedOpen ? copyPngText(buttonText) : buttonText}
              </button>
              <button
                type="button"
                onClick={() => {
                  startTransition(download);
                }}
              >
                {advancedOpen ? 'Download as PNG' : 'Download'}
              </button>
              {advancedOpen && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      copyAsSvg();
                    }}
                    disabled={!ClipboardItem.supports('image/svg+xml')}
                  >
                    {svgButtonText}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadSvg();
                    }}
                  >
                    Download as SVG
                  </button>
                </>
              )}
            </div>
          </QRCode>
        </ErrorBoundary>
      </QRCodeErrorContext>
    </form>
  );
}
