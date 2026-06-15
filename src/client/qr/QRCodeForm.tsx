'use client';

import {
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
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

import type { ErrorCorrectionLevel } from '@/client/qr/thirdparty/qrcode.react';

import {
  type ButtonText,
  type QRCodeState,
  BUTTON_TEXT,
  QRCode,
  URL_SPLITTER,
} from '@/client/qr/QRCode';
import { encodeQueryComponent, nullToError } from '@/utilities';

const DEFAULTS = {
  shouldOptimiseUrl: true,
  dotStyle: 'square' as const,
  dotRadius: 0.25,
  minErrorCorrectionLevel: 'L' as ErrorCorrectionLevel,
  rasterText: '',
  rasterFont: 'Impact',
};

function buildQrUrl(qrState: QRCodeState): string {
  const parts: string[] = [];
  if (qrState.text) {
    parts.push(`text=${encodeQueryComponent(qrState.text)}`);
  }
  if (!qrState.shouldOptimiseUrl) {
    parts.push('optimise=false');
  }
  if (qrState.dotStyle === 'dot') {
    parts.push('dotStyle=dot');
    if (qrState.dotRadius !== DEFAULTS.dotRadius) {
      parts.push(`dotRadius=${Math.round(qrState.dotRadius * 200)}`);
    }
  } else if (qrState.dotStyle === 'text') {
    parts.push('dotStyle=text');
    if (qrState.rasterText) {
      parts.push(`rasterText=${encodeQueryComponent(qrState.rasterText)}`);
    }
    if (qrState.rasterFont && qrState.rasterFont !== DEFAULTS.rasterFont) {
      parts.push(`rasterFont=${encodeQueryComponent(qrState.rasterFont)}`);
    }
  }
  if (qrState.minErrorCorrectionLevel !== 'L') {
    parts.push(`ecl=${qrState.minErrorCorrectionLevel}`);
  }
  return parts.length > 0 ? `?${parts.join('&')}` : './qr';
}

export interface QRCodeFormState {
  nextPushStateText?: string;
  previousPushStateText?: string;
  qrState: QRCodeState;
}

interface QRCodeStateSetShouldOptimiseUrl {
  type: 'setShouldOptimiseUrl';
  shouldOptimiseUrl: boolean;
}

interface QRCodeStateSetText {
  type: 'setText';
  text: string;
}

interface QRCodeStatePushState {
  type: 'pushState';
}

interface QRCodeResetNextPushStateText {
  type: 'resetNextPushStateText';
}

interface QRCodeStateSetButtonText {
  type: 'setButtonText';
  buttonText: ButtonText;
}

interface QRCodeStateUpdateGeneration {
  type: 'updateGeneration';
}

interface QRCodeStatePopState {
  type: 'popState';
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

type QRCodeStateUpdate =
  | QRCodeStateSetShouldOptimiseUrl
  | QRCodeStateSetText
  | QRCodeStatePushState
  | QRCodeResetNextPushStateText
  | QRCodeStateSetButtonText
  | QRCodeStateUpdateGeneration
  | QRCodeStatePopState
  | QRCodeStateSetDotStyle
  | QRCodeStateSetDotRadius
  | QRCodeStateSetMinErrorCorrectionLevel
  | QRCodeStateSetRasterText
  | QRCodeStateSetRasterFont;

function recipe(draft: QRCodeFormState, instructions: QRCodeStateUpdate) {
  switch (instructions.type) {
    case 'setText': {
      draft.qrState.text = instructions.text;
      break;
    }
    case 'pushState': {
      if (draft.previousPushStateText !== draft.qrState.text) {
        draft.nextPushStateText = draft.qrState.text;
      }
      break;
    }
    case 'popState': {
      recipe(draft, { type: 'setText', text: instructions.text });
      draft.previousPushStateText = undefined;
      draft.nextPushStateText = undefined;
      recipe(draft, { type: 'updateGeneration' });
      break;
    }
    case 'resetNextPushStateText': {
      draft.previousPushStateText = draft.nextPushStateText;
      draft.nextPushStateText = undefined;
      break;
    }
    case 'setShouldOptimiseUrl': {
      draft.qrState.shouldOptimiseUrl = instructions.shouldOptimiseUrl;
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
    case 'setButtonText': {
      draft.qrState.buttonText = instructions.buttonText;
      break;
    }
    case 'updateGeneration': {
      draft.qrState.generation = draft.qrState.generation + 1;
      break;
    }
    default: {
      throw new Error('Unknown state update');
    }
  }
}
const producer = produce<QRCodeFormState, [QRCodeStateUpdate]>(recipe);

function initState(searchParams: URLSearchParams): QRCodeFormState {
  const isQuine = searchParams.get('quine') === 'true';
  const paramText = searchParams.get('text') ?? '';
  const text = isQuine
    ? `https://www.aylett.co.uk/qr/?text=${paramText}`
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
    qrState: {
      text,
      buttonText: BUTTON_TEXT.INITIAL_TEXT,
      generation: 0,
      shouldOptimiseUrl,
      dotStyle,
      dotRadius,
      rasterText,
      rasterFont,
      minErrorCorrectionLevel,
    },
  };
}

export function QRCodeForm(): JSX.Element {
  const resetRef = useRef<() => void>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const [state, dispatch] = useReducer(producer, searchParams, initState);
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
          dispatch({
            type: 'pushState',
          });
          dispatch({
            type: 'setButtonText',
            buttonText: BUTTON_TEXT.SUCCESS_TEXT,
          });
        });
      } catch (error) {
        console.error(error);
        startTransition(() => {
          dispatch({
            type: 'setButtonText',
            buttonText: BUTTON_TEXT.FAILED_TEXT,
          });
        });
      }
    });
  }

  const alphanumericValue = state.qrState.text.replaceAll(/[^A-Z0-9]/gi, '-');

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

  const onPopState = useEffectEvent(() => {
    dispatch({ type: 'popState', text: searchParams.get('text') ?? '' });
    const popDotStyleParam = searchParams.get('dotStyle');
    dispatch({
      type: 'setDotStyle',
      dotStyle:
        popDotStyleParam === 'dot'
          ? 'dot'
          : popDotStyleParam === 'text'
            ? 'text'
            : DEFAULTS.dotStyle,
    });
    const rawRadius = searchParams.get('dotRadius');
    dispatch({
      type: 'setDotRadius',
      dotRadius:
        rawRadius !== null && !Number.isNaN(Number(rawRadius))
          ? Number(rawRadius) / 200
          : DEFAULTS.dotRadius,
    });
    dispatch({
      type: 'setRasterText',
      rasterText: searchParams.get('rasterText') ?? DEFAULTS.rasterText,
    });
    dispatch({
      type: 'setRasterFont',
      rasterFont: searchParams.get('rasterFont') ?? DEFAULTS.rasterFont,
    });
    const eclParam = searchParams.get('ecl') ?? 'L';
    dispatch({
      type: 'setMinErrorCorrectionLevel',
      minErrorCorrectionLevel: (['L', 'M', 'Q', 'H'] as const).includes(
        eclParam as ErrorCorrectionLevel,
      )
        ? (eclParam as ErrorCorrectionLevel)
        : DEFAULTS.minErrorCorrectionLevel,
    });
    dispatch({
      type: 'setShouldOptimiseUrl',
      shouldOptimiseUrl: searchParams.get('optimise') !== 'false',
    });
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

  const pushStateUrl =
    state.nextPushStateText !== undefined &&
    state.nextPushStateText !== state.qrState.text
      ? buildQrUrl({ ...state.qrState, text: state.nextPushStateText })
      : null;

  useEffect(() => {
    if (pushStateUrl !== null) {
      globalThis.history.pushState({}, '', pushStateUrl);
      dispatch({ type: 'resetNextPushStateText' });
    }
  }, [pushStateUrl]);

  const replaceStateUrl = buildQrUrl(state.qrState);

  useEffect(() => {
    globalThis.history.replaceState({}, '', replaceStateUrl);
  }, [replaceStateUrl]);

  function setText(newText: string, updateGeneration?: boolean) {
    dispatch({
      type: 'setText',
      text: newText,
    });
    if (updateGeneration) {
      dispatch({ type: 'updateGeneration' });
    }
    dispatch({
      type: 'setButtonText',
      buttonText: BUTTON_TEXT.INITIAL_TEXT,
    });
    if (resetRef.current) {
      resetRef.current();
    }
  }

  const canOptimiseUrl = URL_SPLITTER.test(state.qrState.text);

  return (
    <form className="flex items-center flex-col contain-content">
      <input
        key={state.qrState.generation}
        type="text"
        defaultValue={state.qrState.text}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          startTransition(() => {
            setText(e.target.value);
          });
        }}
        onBlur={() => {
          dispatch({
            type: 'pushState',
          });
        }}
        placeholder="Paste your text here"
        className="border-2 border-gray-300 rounded-md p-2 mb-4 grid-cols-centre w-full"
        data-testid="qr-code-input"
        data-generation={state.qrState.generation}
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
            defaultChecked={state.qrState.shouldOptimiseUrl}
            onChange={(event) => {
              startTransition(() => {
                dispatch({
                  type: 'setShouldOptimiseUrl',
                  shouldOptimiseUrl: event.target.checked,
                });
              });
            }}
          />
          Optimise URL
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
          <QRCode state={state.qrState} ref={ref} showDebug={true}>
            <div className="mt-4 w-full flex flex-row flex-wrap *:grow *:basis-0 gap-4">
              <button
                type="button"
                onClick={() => {
                  startTransition(copyToClipboard);
                }}
              >
                {state.qrState.buttonText}
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
