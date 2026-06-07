'use client';

import {
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type JSX,
} from 'react';

import { useSearchParams } from 'next/navigation';
import { produce } from 'immer';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { toBlob, toPng } from 'html-to-image';

import { QRCodeError } from './QRCodeError';
import { QRCodeErrorContext } from './QRCodeErrorContext';

import type { ErrorCorrectionLevel } from '@/client/qr/thirdparty/qrcode.react/errorCorrectionLevel';

import {
  type ButtonText,
  type QRCodeState,
  type SvgButtonText,
  BUTTON_TEXT,
  SVG_BUTTON_TEXT,
  QRCode,
  URL_SPLITTER,
} from '@/client/qr/QRCode';
import { encodeQueryComponent, nullToError } from '@/utilities';

const DEFAULTS = {
  shouldOptimiseUrl: true,
  isQuine: false,
  dotStyle: 'square' as const,
  dotRadius: 0.25,
  minErrorCorrectionLevel: 'L' as ErrorCorrectionLevel,
  rasterText: '',
  rasterFont: 'Impact',
};

const QUINE_BASE = 'https://www.aylett.co.uk/qr/';

function buildQrUrl(qrState: QRCodeState): string {
  const parts: string[] = [];
  if (qrState.text) parts.push(`text=${encodeQueryComponent(qrState.text)}`);
  if (qrState.isQuine) parts.push('quine=true');
  if (!qrState.shouldOptimiseUrl) parts.push('optimise=false');
  if (qrState.dotStyle === 'dot') {
    parts.push('dotStyle=dot');
    if (qrState.dotRadius !== DEFAULTS.dotRadius)
      parts.push(`dotRadius=${Math.round(qrState.dotRadius * 200)}`);
  } else if (qrState.dotStyle === 'text') {
    parts.push('dotStyle=text');
    if (qrState.rasterText)
      parts.push(`rasterText=${encodeQueryComponent(qrState.rasterText)}`);
    if (qrState.rasterFont && qrState.rasterFont !== DEFAULTS.rasterFont)
      parts.push(`rasterFont=${encodeQueryComponent(qrState.rasterFont)}`);
  }
  if (qrState.minErrorCorrectionLevel !== 'L')
    parts.push(`ecl=${qrState.minErrorCorrectionLevel}`);
  return parts.length > 0 ? `?${parts.join('&')}` : './qr';
}

function buildQuineText(qrState: QRCodeState): string {
  const rel = buildQrUrl(qrState);
  return QUINE_BASE + (rel.startsWith('?') ? rel : '');
}

export interface QRCodeFormState {
  qrState: QRCodeState;
}

interface QRCodeStateSetShouldOptimiseUrl {
  type: 'setShouldOptimiseUrl';
  shouldOptimiseUrl: boolean;
}

interface QRCodeStateSetIsQuine {
  type: 'setIsQuine';
  isQuine: boolean;
}

interface QRCodeStateSetText {
  type: 'setText';
  text: string;
}

interface QRCodeStateSetDotStyle {
  type: 'setDotStyle';
  dotStyle: 'square' | 'dot' | 'text';
}

interface QRCodeStateSetRasterText {
  type: 'setRasterText';
  rasterText: string;
}

interface QRCodeStateSetRasterFont {
  type: 'setRasterFont';
  rasterFont: string;
}

interface QRCodeStateSetDotRadius {
  type: 'setDotRadius';
  dotRadius: number;
}

interface QRCodeStateSetMinErrorCorrectionLevel {
  type: 'setMinErrorCorrectionLevel';
  minErrorCorrectionLevel: ErrorCorrectionLevel;
}

interface QRCodeStateReinitialize {
  type: 'reinitialize';
  qrState: QRCodeState;
}

type QRCodeStateUpdate =
  | QRCodeStateSetShouldOptimiseUrl
  | QRCodeStateSetIsQuine
  | QRCodeStateSetText
  | QRCodeStateSetDotStyle
  | QRCodeStateSetDotRadius
  | QRCodeStateSetMinErrorCorrectionLevel
  | QRCodeStateSetRasterText
  | QRCodeStateSetRasterFont
  | QRCodeStateReinitialize;

function recipe(draft: QRCodeFormState, instructions: QRCodeStateUpdate) {
  switch (instructions.type) {
    case 'setText': {
      draft.qrState.text = instructions.text;
      break;
    }
    case 'reinitialize': {
      draft.qrState = instructions.qrState;
      break;
    }
    case 'setShouldOptimiseUrl': {
      draft.qrState.shouldOptimiseUrl = instructions.shouldOptimiseUrl;
      break;
    }
    case 'setIsQuine': {
      draft.qrState.isQuine = instructions.isQuine;
      break;
    }
    case 'setDotStyle': {
      draft.qrState.dotStyle = instructions.dotStyle;
      break;
    }
    case 'setDotRadius': {
      draft.qrState.dotRadius = instructions.dotRadius;
      break;
    }
    case 'setMinErrorCorrectionLevel': {
      draft.qrState.minErrorCorrectionLevel =
        instructions.minErrorCorrectionLevel;
      break;
    }
    case 'setRasterText': {
      draft.qrState.rasterText = instructions.rasterText;
      break;
    }
    case 'setRasterFont': {
      draft.qrState.rasterFont = instructions.rasterFont;
      break;
    }
    default: {
      throw new Error('Unknown state update');
    }
  }
}
const producer = produce<QRCodeFormState, [QRCodeStateUpdate]>(recipe);

function parseQRState(searchParams: URLSearchParams): QRCodeState {
  const isQuine = searchParams.get('quine') === 'true';
  const text = searchParams.get('text') ?? '';

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
    isQuine,
    shouldOptimiseUrl,
    dotStyle,
    dotRadius,
    rasterText,
    rasterFont,
    minErrorCorrectionLevel,
  };
}

function initState(searchParams: URLSearchParams): QRCodeFormState {
  return { qrState: parseQRState(searchParams) };
}

export function QRCodeForm(): JSX.Element {
  const resetRef = useRef<() => void>(undefined);
  const ref = useRef<HTMLDivElement>(null);
  const lastPushedTextRef = useRef<string | undefined>(undefined);

  const searchParams = useSearchParams();
  const [state, dispatch] = useReducer(producer, searchParams, initState);
  const [_inTransition, startTransition] = useTransition();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [buttonText, setButtonText] = useState<ButtonText>(
    BUTTON_TEXT.INITIAL_TEXT,
  );
  const [svgButtonText, setSvgButtonText] = useState<SvgButtonText>(
    SVG_BUTTON_TEXT.INITIAL,
  );
  const [generation, setGeneration] = useState(0);

  function resetCopyState() {
    setButtonText(BUTTON_TEXT.INITIAL_TEXT);
    setSvgButtonText(SVG_BUTTON_TEXT.INITIAL);
  }

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
        if (state.qrState.text !== lastPushedTextRef.current) {
          globalThis.history.pushState({}, '', buildQrUrl(state.qrState));
          lastPushedTextRef.current = state.qrState.text;
        }
        setButtonText(BUTTON_TEXT.SUCCESS_TEXT);
      } catch (error) {
        console.error(error);
        setButtonText(BUTTON_TEXT.FAILED_TEXT);
      }
    });
  }

  const alphanumericValue = state.qrState.text.replaceAll(/[^A-Z0-9]/gi, '-');

  function copyPngText(bt: ButtonText): string {
    switch (bt) {
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
    const svgEl = ref.current?.querySelector('svg');
    if (!svgEl) throw new Error('QR Code SVG is not ready');
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `qr-${alphanumericValue}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  function copyAsSvg() {
    startTransition(async () => {
      const svgEl = ref.current?.querySelector('svg');
      if (!svgEl) throw new Error('QR Code SVG is not ready');
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

  const onPopState = useEffectEvent(() => {
    const newState = parseQRState(searchParams);
    dispatch({ type: 'reinitialize', qrState: newState });
    setGeneration((g) => g + 1);
    setButtonText(BUTTON_TEXT.INITIAL_TEXT);
    setSvgButtonText(SVG_BUTTON_TEXT.INITIAL);
    lastPushedTextRef.current = newState.text;
    if (resetRef.current) {
      startTransition(resetRef.current);
    }
  });
  useEffect(() => {
    const abortController = new AbortController();
    globalThis.addEventListener('popstate', onPopState, {
      passive: true,
      signal: abortController.signal,
    });

    return () => {
      abortController.abort();
    };
  }, []);

  const replaceStateUrl = buildQrUrl(state.qrState);

  useEffect(() => {
    globalThis.history.replaceState({}, '', replaceStateUrl);
  }, [replaceStateUrl]);

  function setText(newText: string, updateGeneration?: boolean) {
    dispatch({ type: 'setText', text: newText });
    resetCopyState();
    if (updateGeneration) {
      setGeneration((g) => g + 1);
    }
    if (resetRef.current) {
      resetRef.current();
    }
  }

  const canOptimiseUrl = URL_SPLITTER.test(state.qrState.text);

  const effectiveQrState = state.qrState.isQuine
    ? { ...state.qrState, text: buildQuineText(state.qrState) }
    : state.qrState;

  return (
    <form className="flex items-center flex-col contain-content">
      <input
        key={generation}
        type="text"
        defaultValue={state.qrState.text}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          startTransition(() => {
            setText(e.target.value);
          });
        }}
        onBlur={() => {
          if (state.qrState.text !== lastPushedTextRef.current) {
            globalThis.history.pushState({}, '', buildQrUrl(state.qrState));
            lastPushedTextRef.current = state.qrState.text;
          }
        }}
        placeholder="Paste your text here"
        className="border-2 border-gray-300 rounded-md p-2 mb-4 grid-cols-centre w-full"
        data-testid="qr-code-input"
        data-generation={generation}
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
            'w-full overflow-hidden transition-discrete transition-[height] duration-300 ease' +
            (canOptimiseUrl ? ' h-lh' : ' h-0')
          }
        >
          <input
            type="checkbox"
            disabled={!canOptimiseUrl}
            className="m-1"
            defaultChecked={state.qrState.shouldOptimiseUrl}
            onChange={(event) => {
              startTransition(() => {
                dispatch({
                  type: 'setShouldOptimiseUrl',
                  shouldOptimiseUrl: event.target.checked,
                });
                resetCopyState();
              });
            }}
          />
          Optimise URL
        </label>
        <label className="w-full">
          <input
            type="checkbox"
            className="m-1"
            checked={state.qrState.isQuine}
            onChange={(event) => {
              startTransition(() => {
                dispatch({
                  type: 'setIsQuine',
                  isQuine: event.target.checked,
                });
                resetCopyState();
              });
            }}
          />
          Quine (encode a link back to this page)
        </label>
        <label className="w-full flex flex-row items-center gap-2">
          Module style
          <select
            value={state.qrState.dotStyle}
            onChange={(event) => {
              startTransition(() => {
                dispatch({
                  type: 'setDotStyle',
                  dotStyle: event.target.value as 'square' | 'dot' | 'text',
                });
                resetCopyState();
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
            (state.qrState.dotStyle === 'dot' ? ' h-lh' : ' h-0')
          }
        >
          Dot size
          <input
            type="range"
            className="flex-1"
            min={30}
            max={100}
            step={5}
            value={Math.round(state.qrState.dotRadius * 200)}
            onChange={(event) => {
              startTransition(() => {
                dispatch({
                  type: 'setDotRadius',
                  dotRadius: Number(event.target.value) / 200,
                });
                resetCopyState();
              });
            }}
          />
          <output className="w-[3ch] text-right">
            {Math.round(state.qrState.dotRadius * 200)}%
          </output>
        </label>
        <label
          className={
            'w-full overflow-hidden transition-discrete transition-[height] duration-300 ease' +
            (state.qrState.dotStyle === 'text' ? ' h-lh' : ' h-0')
          }
        >
          Raster text
          <input
            type="text"
            className="border border-gray-300 rounded p-1 ml-2"
            value={state.qrState.rasterText}
            onChange={(event) => {
              startTransition(() => {
                dispatch({
                  type: 'setRasterText',
                  rasterText: event.target.value,
                });
                resetCopyState();
              });
            }}
          />
        </label>
        <label
          className={
            'w-full flex flex-row items-center gap-2 overflow-hidden transition-discrete transition-[height] duration-300 ease' +
            (state.qrState.dotStyle === 'text' ? ' h-lh' : ' h-0')
          }
        >
          Font
          <select
            value={state.qrState.rasterFont}
            onChange={(event) => {
              startTransition(() => {
                dispatch({
                  type: 'setRasterFont',
                  rasterFont: event.target.value,
                });
                resetCopyState();
              });
            }}
          >
            <option value="Impact">Impact</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Courier New">Courier New</option>
            <option value="Verdana">Verdana</option>
            <option value="Trebuchet MS">Trebuchet MS</option>
          </select>
        </label>
        <label className="w-full flex flex-row items-center gap-2">
          Min error correction
          <select
            value={state.qrState.minErrorCorrectionLevel}
            onChange={(event) => {
              startTransition(() => {
                dispatch({
                  type: 'setMinErrorCorrectionLevel',
                  minErrorCorrectionLevel: event.target
                    .value as ErrorCorrectionLevel,
                });
                resetCopyState();
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
            setText('', true);
          },
          updateResetRef: (newRef) => {
            resetRef.current = newRef;
          },
        }}
      >
        <ErrorBoundary errorComponent={QRCodeError}>
          <QRCode
            state={effectiveQrState}
            generation={generation}
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
