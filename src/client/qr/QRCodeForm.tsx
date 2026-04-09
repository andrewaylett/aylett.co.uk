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

import {
  type ButtonText,
  type QRCodeState,
  BUTTON_TEXT,
  QRCode,
  URL_SPLITTER,
} from '@/client/qr/QRCode';
import { encodeQueryComponent, nullToError } from '@/utilities';

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

type QRCodeStateUpdate =
  | QRCodeStateSetShouldOptimiseUrl
  | QRCodeStateSetText
  | QRCodeStatePushState
  | QRCodeResetNextPushStateText
  | QRCodeStateSetButtonText
  | QRCodeStateUpdateGeneration
  | QRCodeStatePopState;

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
  return {
    qrState: {
      text,
      buttonText: BUTTON_TEXT.INITIAL_TEXT,
      generation: 0,
      shouldOptimiseUrl: true,
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

  useEffect(() => {
    if (
      state.nextPushStateText !== undefined &&
      state.nextPushStateText !== state.qrState.text
    ) {
      const pushStateUrl = `?text=${encodeQueryComponent(state.nextPushStateText)}`;
      globalThis.history.pushState({}, '', pushStateUrl);
      dispatch({
        type: 'resetNextPushStateText',
      });
    }
  }, [state.nextPushStateText, state.qrState.text]);

  useEffect(() => {
    const linkUrl = state.qrState.text
      ? `?text=${encodeQueryComponent(state.qrState.text)}`
      : './qr';

    globalThis.history.replaceState({}, '', linkUrl);
  }, [state.qrState.text]);

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
