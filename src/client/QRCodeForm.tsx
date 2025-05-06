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
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

interface TextContextProps {
  resetText: () => void;
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

export function QRCodeForm() {
  const [_isPending, startTransition] = React.useTransition();
  const searchParams = useSearchParams();
  const [text, setText] = React.useState(() =>
    decodeURIComponent(searchParams?.get('text') ?? ''),
  );
  const [buttonText, setButtonText] = React.useState(INITIAL_TEXT);
  const ref = useRef<SVGSVGElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resetRef = useRef<() => void>(null);
  const [dimensions, setDimensions] = React.useState({
    width: 29,
    height: 29,
  });

  const setTextAndReset = useCallback((newText: string) => {
    setText(newText);
    setButtonText(INITIAL_TEXT);
    if (resetRef.current) {
      resetRef.current();
    }
  }, []);

  const resetText = useCallback(() => {
    setText('');
    setButtonText(INITIAL_TEXT);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!ref.current) {
      return;
    }

    try {
      const blob = nullToError(
        toBlob(ref.current as unknown as HTMLElement, {
          pixelRatio: 1,
          skipFonts: true,
          width: dimensions.width * 4,
          height: dimensions.height * 4,
        }),
        'Failed to render QR code image',
      );
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      startTransition(() => {
        setButtonText(SUCCESS_TEXT);
      });
    } catch (error) {
      startTransition(() => {
        console.error(error);
        setButtonText(FAILED_TEXT);
      });
    }
  }, [dimensions]);

  return (
    <form className="flex items-center flex-col">
      <input
        type="text"
        defaultValue={text}
        onChange={(e) => startTransition(() => setTextAndReset(e.target.value))}
        placeholder="Paste your text here"
        className="border-2 border-gray-300 rounded-md p-2 mb-4 grid-cols-centre w-full"
        ref={inputRef}
      />
      <TextContext.Provider value={{ resetText, resetRef }}>
        <ErrorBoundary errorComponent={QRCodeError}>
          <QRCodeSVGWrapper
            value={text}
            marginSize={4}
            ref={ref}
            size={512}
            setDimensions={setDimensions}
          />
          <button
            type="button"
            onClick={() => startTransition(() => copyToClipboard())}
            className="bg-blue-500 text-white rounded-md p-2 mt-4 w-full"
          >
            {buttonText}
          </button>
        </ErrorBoundary>
      </TextContext.Provider>
    </form>
  );
}

const QRCodeError = function QRCodeError({ error, reset }) {
  const textContext = useContext(TextContext);
  if (textContext === null || !reset) {
    throw new Error('No text context or no reset function provided');
  }
  const { resetRef, resetText } = textContext;
  resetRef.current = reset;
  return (
    <div className="w-full">
      <h2 className="text-red-500">Error generating QR code</h2>
      <p>{error.message}</p>
      <button
        type="button"
        onClick={() => resetText()}
        className="bg-blue-500 text-white rounded-md p-2 mt-4 w-full"
      >
        Reset
      </button>
    </div>
  );
} satisfies ErrorComponent;

type QRCodeSVGProps =
  typeof QRCodeSVG extends React.ForwardRefExoticComponent<infer T> ? T : never;

function QRCodeSVGWrapper({
  ref: outerRef,
  setDimensions: outerSetDimensions,
  ...props
}: Omit<QRCodeSVGProps, 'ref'> & {
  ref: RefObject<SVGSVGElement | null>;
  setDimensions: ({ height, width }: { height: number; width: number }) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = React.useState({
    width: 29,
    height: 29,
  });

  useEffect(() => {
    if (outerRef) {
      outerRef.current = ref.current;
    }
    return () => {
      outerRef.current = null;
    };
  });

  useEffect(() => {
    if (!ref.current) return;

    const callback = (element: SVGSVGElement) => {
      const viewBox = element.getAttribute('viewBox');
      const viewBoxValues = viewBox?.split(' ');
      const width = viewBoxValues ? parseInt(viewBoxValues[2], 10) : 64;
      const height = viewBoxValues ? parseInt(viewBoxValues[3], 10) : 64;
      setDimensions({ width, height });
      outerSetDimensions({ width, height });
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        callback(mutation.target as SVGSVGElement);
      });
    });
    observer.observe(ref.current, {
      attributes: true,
      attributeFilter: ['viewBox'],
    });

    callback(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [outerSetDimensions]);

  const height = dimensions.height * 4;
  const width = dimensions.width * 4;

  return <QRCodeSVG {...props} height={height} width={width} ref={ref} />;
}
