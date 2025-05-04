'use client';

import React, {
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';

import { toBlob } from 'html-to-image';
import {
  ErrorBoundary,
  type ErrorComponent,
} from 'next/dist/client/components/error-boundary';
import { QRCodeSVG } from 'qrcode.react';

import { memo } from '../types';

interface TextContextProps {
  setText: (text: string) => void;
  resetRef: RefObject<(() => void) | null>;
}
const TextContext = createContext<null | TextContextProps>(null);

const INITIAL_TEXT = 'Copy to clipboard';
const FAILED_TEXT = 'Failed to copy';
const SUCCESS_TEXT = 'Copied to clipboard!';

async function nullToError<T>(
  value: Promise<T | null>,
  message?: string,
): Promise<T> {
  const result = await value;
  if (result === null) {
    throw new Error(message ?? 'value is null');
  }
  return result;
}

export const QRCodeForm = memo(function QRCodeForm() {
  const [text, setText] = React.useState('');
  const [buttonText, setButtonText] = React.useState(INITIAL_TEXT);
  const ref = useRef<SVGSVGElement>(null);
  const resetRef = useRef<() => void>(null);

  const [dimensions, setDimensions] = React.useState({
    width: 64,
    height: 64,
  });

  useEffect(() => {
    if (ref.current) {
      const svgElement = ref.current;
      const viewBox = svgElement.getAttribute('viewBox');
      const viewBoxValues = viewBox?.split(' ');
      const width = viewBoxValues ? parseInt(viewBoxValues[2], 10) : 64;
      const height = viewBoxValues ? parseInt(viewBoxValues[3], 10) : 64;
      setDimensions({ width, height });
    }
  }, [ref, text]);

  const { height, width } = dimensions;

  const setTextAndReset = useCallback(
    (newText: string) => {
      setText(newText);
      setButtonText(INITIAL_TEXT);
      if (resetRef.current) {
        resetRef.current();
      }
    },
    [setText, setButtonText, resetRef],
  );

  const copyToClipboard = useCallback(async () => {
    if (!ref.current) {
      return;
    }

    try {
      const blob = nullToError(
        toBlob(ref.current as unknown as HTMLElement, {
          pixelRatio: 1,
          skipFonts: true,
          width: width * 4,
        }),
        'Failed to render QR code image',
      );
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setButtonText(SUCCESS_TEXT);
    } catch (error) {
      console.error(error);
      setButtonText(FAILED_TEXT);
    }
  }, [ref, setButtonText]);

  return (
    <form>
      <input
        type="text"
        value={text}
        onChange={(e) => setTextAndReset(e.target.value)}
        placeholder="Paste your text here"
        className="border-2 border-gray-300 rounded-md p-2 mb-4 grid-cols-centre"
      />
      <TextContext.Provider value={{ setText: setTextAndReset, resetRef }}>
        <ErrorBoundary errorComponent={QRCodeError}>
          <QRCodeSVG
            value={text}
            marginSize={4}
            ref={ref}
            size={512}
            height={height * 4}
            width={width * 4}
          />
          <button
            type="button"
            onClick={copyToClipboard}
            className="bg-blue-500 text-white rounded-md p-2 mt-4"
          >
            {buttonText}
          </button>
        </ErrorBoundary>
      </TextContext.Provider>
    </form>
  );
});

const QRCodeError: ErrorComponent = memo(function QRCodeError({
  error,
  reset,
}) {
  const textContext = useContext(TextContext);
  if (textContext === null || !reset) {
    throw new Error('No text context or no reset function provided');
  }
  const { resetRef, setText } = textContext;
  resetRef.current = reset;
  return (
    <div>
      <h2 className="text-red-500">Error generating QR code</h2>
      <p>{error.message}</p>
      <button
        type="button"
        onClick={() => setText('')}
        className="bg-blue-500 text-white rounded-md p-2 mt-4"
      >
        Reset
      </button>
    </div>
  );
} satisfies ErrorComponent);
