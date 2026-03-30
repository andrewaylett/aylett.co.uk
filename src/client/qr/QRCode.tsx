import React, { type PropsWithChildren, type RefObject, useMemo } from 'react';

import {
  QRCodeSVGDetails,
  useDebugDetails,
  useQRCode,
} from '@/client/qr/thirdparty/qrcode.react';

export interface QRCodeState {
  text: string;
  buttonText: ButtonText;
  shouldOptimiseUrl: boolean;
  generation: number;
}

export const BUTTON_TEXT = {
  INITIAL_TEXT: 'Copy to clipboard',
  FAILED_TEXT: 'Failed to copy',
  SUCCESS_TEXT: 'Copied to clipboard!',
} as const;
export type ButtonText = (typeof BUTTON_TEXT)[keyof typeof BUTTON_TEXT];

export const URL_SPLITTER =
  /^(?<start>https?:\/\/[a-z0-9._-]+\/?)(?<rest>.*)$/i;

function useQrValue(text: string, shouldOptimiseUrl: boolean): string {
  return useMemo(() => {
    const match = URL_SPLITTER.exec(text);
    if (shouldOptimiseUrl && match?.groups?.start) {
      const start = match.groups.start.toUpperCase();
      const rest = match.groups.rest;
      return start + rest;
    }
    return text;
  }, [shouldOptimiseUrl, text]);
}

function useOptimisedQr(state: QRCodeState) {
  const qrValue: string = useQrValue(state.text, state.shouldOptimiseUrl);

  const nonOptimisedQr = useQRCode({
    value: state.text,
    level: 'L',
    minVersion: 1,
  });
  const optimisedQr = useQRCode({
    value: qrValue,
    level: 'L',
    minVersion: 1,
  });

  if (nonOptimisedQr instanceof Error) {
    throw nonOptimisedQr;
  }

  const willUseOptimisedQr =
    !(optimisedQr instanceof Error) &&
    state.shouldOptimiseUrl &&
    (optimisedQr.qrcode.version < nonOptimisedQr.qrcode.version ||
      optimisedQr.qrcode.errorCorrectionLevel.ordinal >
        nonOptimisedQr.qrcode.errorCorrectionLevel.ordinal);

  const qrDetails = willUseOptimisedQr ? optimisedQr : nonOptimisedQr;
  const optimisedQrErrorMessage =
    optimisedQr instanceof Error && optimisedQr.message;

  const canOptimiseUrl = URL_SPLITTER.test(state.text);
  const willAttemptOptimisation = state.shouldOptimiseUrl && canOptimiseUrl;
  const debugMessage = () =>
    `${
      canOptimiseUrl
        ? state.shouldOptimiseUrl
          ? willUseOptimisedQr
            ? 'Optimised'
            : "Optimisation doesn't help"
          : 'Optimisation manually disabled'
        : 'Not able to optimise this input'
    }${
      willAttemptOptimisation && optimisedQrErrorMessage
        ? ` and rendering the optimised form gave an error: ${optimisedQrErrorMessage}`
        : ''
    }`;

  return {
    qrValue,
    willUseOptimisedQr,
    qrDetails,
    debugMessage,
  };
}

export function QRCode({
  state,
  ref,
  showDebug = false,
  children,
}: PropsWithChildren<{
  state: QRCodeState;
  showDebug?: boolean;
  ref: RefObject<HTMLDivElement | null>;
}>) {
  const { qrValue, qrDetails, debugMessage } = useOptimisedQr(state);
  const qrDebugDetails = useDebugDetails(qrDetails);

  return (
    <>
      <div className="w-min h-min border-2 border-slate-800" ref={ref}>
        <QRCodeSVGDetails
          details={qrDetails}
          cellSize={4}
          data-testid="qr-code"
          className="transition-[height,width] duration-300 ease even:transition-all even:duration-300 even:ease max-w-screen max-h-[100vw]"
          aria-description={`A QR code that contains the text: ${state.text}`}
        />
      </div>
      {children}
      {showDebug && (
        <details className="p-2 mt-4 w-full">
          <summary>Debug Information</summary>
          <dl className="columns-half-width">
            <dt>Module count</dt>
            <dd>{qrDebugDetails.moduleCount}</dd>
            <dt>QR Version</dt>
            <dd>{qrDebugDetails.qrVersion}</dd>
            <dt>Error Correction Level</dt>
            <dd>{qrDebugDetails.level}</dd>
            <dt>Rendered value</dt>
            <dd>{'"' + qrValue + '"'}</dd>
            <dt>Render Generation</dt>
            <dd>{state.generation}</dd>
            <dt>Optimisation</dt>
            <dd>{debugMessage()}</dd>
            <dt>Segments</dt>
            <dd>
              {qrDebugDetails.segments
                .map((s) => `${s.mode.toString()}(${s.numChars})`)
                .join(', ')}
            </dd>
          </dl>
        </details>
      )}
    </>
  );
}
