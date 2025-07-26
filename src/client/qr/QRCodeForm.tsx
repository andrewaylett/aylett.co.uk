'use client';

import React, {
  type ReactElement,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useTransition,
} from 'react';

import { toBlob } from 'html-to-image';
import { produce } from 'immer';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { type ReadonlyURLSearchParams, useSearchParams } from 'next/navigation';

import { QRCodeError } from './QRCodeError';
import { QRCodeSVGWrapper, type Size } from './QRCodeSVGWrapper';
import { QRCodeErrorContext } from './QRCodeErrorContext';

import { encodeQueryComponent, nullToError } from '@/utilities';

const INITIAL_TEXT = 'Copy to clipboard';
const FAILED_TEXT = 'Failed to copy';
const SUCCESS_TEXT = 'Copied to clipboard!';

interface QRCodeState {
  text: string;
  buttonText: string;
  nextPushStateText?: string;
  previousPushStateText?: string;
  generation: number;
}

interface QRCodeStateUpdate {
  text?: string;
  buttonText?: string;
  shouldPushState?: boolean;
  updateGeneration?: boolean;
  resetNextPushStateText?: boolean;
}

export function QRCodeForm(): ReactElement {
  const [_isPending, startTransition] = useTransition();
  const ref = useRef<SVGSVGElement>(null);
  const resetRef = useRef<() => void>(undefined);
  const dimensionsRef = useRef<Size>({
    width: 29,
    height: 29,
  });

  const searchParams = useSearchParams();
  const [state, updateState] = useReducer<
    QRCodeState,
    ReadonlyURLSearchParams,
    [QRCodeStateUpdate]
  >(
    useCallback(
      (original, instructions) =>
        produce(original, (draft) => {
          if (
            instructions.shouldPushState &&
            draft.previousPushStateText !== draft.text
          ) {
            draft.nextPushStateText = draft.text;
          }
          if (instructions.resetNextPushStateText) {
            draft.previousPushStateText = draft.nextPushStateText;
            draft.nextPushStateText = undefined;
          }
          if (instructions.text) {
            draft.text = instructions.text;
          }
          if (instructions.buttonText) {
            draft.buttonText = instructions.buttonText;
          }
          if (instructions.updateGeneration) {
            draft.generation = draft.generation + 1;
            if (!instructions.text) {
              draft.text = searchParams.get('text') ?? '';
              draft.previousPushStateText = undefined;
              draft.nextPushStateText = undefined;
            }
          }
        }),
      [searchParams],
    ),
    searchParams,
    (searchParams) => {
      const isQuine = searchParams.get('quine') === 'true';
      const paramText = searchParams.get('text') ?? '';
      return {
        text: isQuine
          ? `https://www.aylett.co.uk/qr/?text=${paramText}`
          : paramText,
        buttonText: INITIAL_TEXT,
        generation: 0,
      };
    },
  );

  useEffect(() => {
    const handlePopState = () => {
      updateState({ updateGeneration: true });
    };

    const abortController = new AbortController();
    globalThis.addEventListener('popstate', handlePopState, {
      passive: true,
      signal: abortController.signal,
    });

    return () => {
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    if (state.nextPushStateText && state.nextPushStateText !== state.text) {
      const pushStateUrl = `?text=${encodeQueryComponent(state.nextPushStateText)}`;
      globalThis.history.pushState({}, '', pushStateUrl);
      updateState({ resetNextPushStateText: true });
    }
  }, [state.nextPushStateText, state.text]);

  useEffect(() => {
    const linkUrl = state.text
      ? `?text=${encodeQueryComponent(state.text)}`
      : './qr';

    globalThis.history.replaceState({}, '', linkUrl);
  }, [state.text]);

  const setText = useCallback(
    (newText: string, updateGeneration?: boolean) => {
      updateState({
        text: newText,
        buttonText: INITIAL_TEXT,
        updateGeneration,
      });
      if (resetRef.current) {
        resetRef.current();
      }
    },
    [updateState],
  );

  const copyToClipboard = useCallback(() => {
    startTransition(async () => {
      if (!ref.current) {
        return;
      }

      try {
        const blob = nullToError(
          toBlob(ref.current as unknown as HTMLElement, {
            pixelRatio: 1,
            skipFonts: true,
            width: dimensionsRef.current.width * 4,
            height: dimensionsRef.current.height * 4,
          }),
          'Failed to render QR code image',
        );
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        startTransition(() => {
          updateState({ buttonText: SUCCESS_TEXT, shouldPushState: true });
        });
      } catch (error) {
        startTransition(() => {
          console.error(error);
          updateState({ buttonText: FAILED_TEXT });
        });
      }
    });
  }, [updateState]);

  return (
    <form className="flex items-center flex-col">
      <input
        key={state.generation}
        type="text"
        defaultValue={state.text}
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
      />
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
          <QRCodeSVGWrapper
            value={state.text}
            marginSize={4}
            ref={ref}
            size={512}
            dimensionsRef={dimensionsRef}
          />
          <button
            type="button"
            onClick={() => {
              startTransition(copyToClipboard);
            }}
            className="bg-blue-500 text-white rounded-md p-2 mt-4 w-full"
          >
            {state.buttonText}
          </button>
        </ErrorBoundary>
      </QRCodeErrorContext>
    </form>
  );
}
