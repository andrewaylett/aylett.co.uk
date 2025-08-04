'use client';

import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import { type ReadonlyURLSearchParams, useSearchParams } from 'next/navigation';
import { produce } from 'immer';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { toBlob, toPng } from 'html-to-image';

import { QRCodeError } from './QRCodeError';
import { QRCodeErrorContext } from './QRCodeErrorContext';

import { encodeQueryComponent, nullToError } from '@/utilities';
import {
  BUTTON_TEXT,
  type ButtonText,
  QRCode,
  type QRCodeState,
  URL_SPLITTER,
} from '@/client/qr/QRCode';

export interface QRCodeFormState {
  nextPushStateText?: string;
  previousPushStateText?: string;
  qrState: QRCodeState;
}

export interface QRCodeStateUpdate {
  text?: string;
  buttonText?: ButtonText;
  shouldPushState?: boolean;
  updateGeneration?: boolean;
  resetNextPushStateText?: boolean;
  shouldOptimiseUrl?: boolean;
}

export function QRCodeForm() {
  const resetRef = useRef<() => void>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const [state, updateState] = useReducer<
    QRCodeFormState,
    ReadonlyURLSearchParams,
    [QRCodeStateUpdate]
  >(
    produce((draft, instructions) => {
      if (
        instructions.shouldPushState &&
        draft.previousPushStateText !== draft.qrState.text
      ) {
        draft.nextPushStateText = draft.qrState.text;
      }
      if (instructions.resetNextPushStateText) {
        draft.previousPushStateText = draft.nextPushStateText;
        draft.nextPushStateText = undefined;
      }
      if (instructions.text !== undefined) {
        draft.qrState.text = instructions.text;
      }
      if (instructions.buttonText !== undefined) {
        draft.qrState.buttonText = instructions.buttonText;
      }
      if (instructions.updateGeneration) {
        draft.qrState.generation = draft.qrState.generation + 1;
        if (instructions.text === undefined) {
          draft.qrState.text = searchParams.get('text') ?? '';
          draft.previousPushStateText = undefined;
          draft.nextPushStateText = undefined;
        }
      }
      if (instructions.shouldOptimiseUrl !== undefined) {
        draft.qrState.shouldOptimiseUrl = instructions.shouldOptimiseUrl;
      }
    }),
    searchParams,
    (searchParams): QRCodeFormState => {
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
    },
  );

  const copyToClipboard = useCallback(() => {
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
          updateState({
            buttonText: BUTTON_TEXT.SUCCESS_TEXT,
            shouldPushState: true,
          });
        });
      } catch (error) {
        startTransition(() => {
          console.error(error);
          updateState({ buttonText: BUTTON_TEXT.FAILED_TEXT });
        });
      }
    });
  }, [updateState]);

  const alphanumericValue = useMemo(() => {
    return state.qrState.text.replaceAll(/[^A-Z0-9]/gi, '-');
  }, [state.qrState.text]);

  const download = useCallback(() => {
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
  }, [alphanumericValue]);

  useEffect(() => {
    const handlePopState = () => {
      updateState({ updateGeneration: true });
      if (resetRef.current) {
        startTransition(resetRef.current);
      }
    };

    const abortController = new AbortController();
    globalThis.addEventListener('popstate', handlePopState, {
      passive: true,
      signal: abortController.signal,
    });

    return () => {
      abortController.abort();
    };
  }, [updateState]);

  useEffect(() => {
    if (
      state.nextPushStateText !== undefined &&
      state.nextPushStateText !== state.qrState.text
    ) {
      const pushStateUrl = `?text=${encodeQueryComponent(state.nextPushStateText)}`;
      globalThis.history.pushState({}, '', pushStateUrl);
      updateState({ resetNextPushStateText: true });
    }
  }, [state.nextPushStateText, state.qrState.text]);

  useEffect(() => {
    const linkUrl = state.qrState.text
      ? `?text=${encodeQueryComponent(state.qrState.text)}`
      : './qr';

    globalThis.history.replaceState({}, '', linkUrl);
  }, [state.qrState.text]);

  const setText = useCallback(
    (newText: string, updateGeneration?: boolean) => {
      updateState({
        text: newText,
        buttonText: BUTTON_TEXT.INITIAL_TEXT,
        updateGeneration,
      });
      if (resetRef.current) {
        resetRef.current();
      }
    },
    [updateState],
  );

  const canOptimiseUrl = useMemo(() => {
    return URL_SPLITTER.test(state.qrState.text);
  }, [state.qrState.text]);

  return (
    <form className="flex items-center flex-col">
      <input
        key={state.qrState.generation}
        type="text"
        defaultValue={state.qrState.text}
        onChange={(e) => {
          startTransition(() => {
            setText(e.target.value);
          });
        }}
        onBlur={() => {
          updateState({ shouldPushState: true });
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
          (canOptimiseUrl ? ' h-lh' : ' h-[0]')
        }
      >
        <input
          type="checkbox"
          disabled={!canOptimiseUrl}
          className="m-1"
          defaultChecked={state.qrState.shouldOptimiseUrl}
          onChange={(event) => {
            startTransition(() => {
              updateState({ shouldOptimiseUrl: event.target.checked });
            });
          }}
        />
        Optimise URL
      </label>
      <QRCodeErrorContext
        value={{
          resetText: useCallback(() => {
            setText('', true);
          }, [setText]),
          updateResetRef: useCallback((newRef) => {
            resetRef.current = newRef;
          }, []),
        }}
      >
        <ErrorBoundary errorComponent={QRCodeError}>
          <QRCode state={state.qrState} ref={ref} showDebug={true}>
            <div className=" mt-4 w-full flex flex-row flex-wrap *:grow *:basis-0 gap-4">
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
