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
import { useSearchParams } from 'next/navigation';

import { QRCodeError, TextContext } from './QRCodeError';
import { QRCodeSVGWrapper } from './QRCodeSVGWrapper';

import 'client-only';

const INITIAL_TEXT = 'Copy to clipboard';
const FAILED_TEXT = 'Failed to copy';
const SUCCESS_TEXT = 'Copied to clipboard!';

export async function nullToError<T>(
  value: Promise<T | null>,
  message?: string,
): Promise<T> {
  const result = await value;
  if (result === null) {
    throw new Error(message ?? 'value is null');
  }
  return result;
}

/**
 * RFC 3986 allows:
 *   pchar = unreserved / pct-encoded / sub-delims / ":" / "@"
 *   query = *( pchar / "/" / "?" )
 * So we replace everything else with its percent-encoded value.
 * @param component
 */
export function encodeQueryComponent(component: string): string {
  return component.replace(
    /[^a-zA-Z0-9:@/?]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

interface Size {
  width: number;
  height: number;
}

interface QRCodeState {
  unitSize: Size;
  pxSize: Size;
  text: string;
  initialText: string;
  isQuine: boolean;
  buttonText: string;
  linkUrl: string;
}

export default function QRCodeForm(): ReactElement {
  const [_isPending, startTransition] = useTransition();
  const ref = useRef<SVGSVGElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resetRef = useRef<() => void>(null);

  const [state, updateState] = useReducer<
    QRCodeState,
    Pick<QRCodeState, 'initialText' | 'isQuine'>,
    [Partial<QRCodeState>]
  >(
    produce((draft, newState) => {
      Object.assign(draft, newState);
      draft.linkUrl = draft.text
        ? `?text=${encodeQueryComponent(draft.text)}`
        : './qr';
      draft.pxSize = {
        width: draft.unitSize.width * 4,
        height: draft.unitSize.height * 4,
      };
    }),
    {
      initialText: decodeURIComponent(useSearchParams()?.get('text') ?? ''),
      isQuine: useSearchParams()?.get('quine') === 'true',
    },
    (init) => {
      const unitSize = {
        width: 29,
        height: 29,
      };
      const pxSize = {
        width: unitSize.width * 4,
        height: unitSize.height * 4,
      };
      return {
        unitSize,
        pxSize,
        text: init.initialText,
        buttonText: INITIAL_TEXT,
        linkUrl: init.initialText
          ? '?text=' + encodeQueryComponent(init.initialText)
          : './qr',
        ...init,
      };
    },
  );

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const qrText = event.state?.qrText;
      if (qrText) {
        startTransition(() => {
          updateState({ text: qrText });
          if (inputRef.current) {
            inputRef.current.value = qrText;
          }
        });
      }
    };

    const abortController = new AbortController();
    window.addEventListener('popstate', handlePopState, {
      signal: abortController.signal,
    });

    return () => {
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    if (state.isQuine) {
      updateState({ isQuine: false, text: window.location.href });
      if (inputRef.current) {
        inputRef.current.value = window.location.href;
      }
    }
    window.history.replaceState(
      { ...window.history.state, qrText: state.text },
      '',
      state.linkUrl,
    );
  }, [state.linkUrl, state.text, state.isQuine]);

  const setText = useCallback(
    (newText: string) => {
      updateState({ text: newText, buttonText: INITIAL_TEXT });
      if (resetRef.current) {
        resetRef.current();
      }
    },
    [updateState],
  );

  const resetText = useCallback(() => {
    setText('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [setText]);

  const copyToClipboard = useCallback(async () => {
    if (!ref.current) {
      return;
    }

    try {
      const blob = nullToError(
        toBlob(ref.current as unknown as HTMLElement, {
          pixelRatio: 1,
          skipFonts: true,
          ...state.pxSize,
        }),
        'Failed to render QR code image',
      );
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      startTransition(() => {
        updateState({ buttonText: SUCCESS_TEXT });
      });

      window.history.pushState(
        { ...window.history.state, qrText: state.text },
        '',
        state.linkUrl,
      );
    } catch (error) {
      startTransition(() => {
        console.error(error);
        updateState({ buttonText: FAILED_TEXT });
      });
    }
  }, [state, updateState]);

  return (
    <form className="flex items-center flex-col">
      <input
        type="text"
        defaultValue={state.initialText}
        onChange={(e) => startTransition(() => setText(e.target.value))}
        placeholder="Paste your text here"
        className="border-2 border-gray-300 rounded-md p-2 mb-4 grid-cols-centre w-full"
        ref={inputRef}
        data-testid="qr-code-input"
      />
      <TextContext
        value={{
          resetText,
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
            setDimensions={useCallback(
              (unitSize: Size) => updateState({ unitSize }),
              [updateState],
            )}
          />
          <button
            type="button"
            onClick={() => startTransition(copyToClipboard)}
            className="bg-blue-500 text-white rounded-md p-2 mt-4 w-full"
          >
            {state.buttonText}
          </button>
        </ErrorBoundary>
      </TextContext>
    </form>
  );
}
