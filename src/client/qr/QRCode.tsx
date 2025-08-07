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
const QR_ALPHANUMERIC_CHARACTERS = /^[A-Z0-9 $%*+./:-]*$/;

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
  const canOptimiseUrl = useMemo(() => {
    return URL_SPLITTER.test(state.text);
  }, [state.text]);

  const qrValueArray: string[] = useMemo(() => {
    const match = URL_SPLITTER.exec(state.text);
    if (state.shouldOptimiseUrl && match?.groups?.start) {
      const start = match.groups.start.toUpperCase();
      const rest = match.groups.rest;
      if (QR_ALPHANUMERIC_CHARACTERS.test(rest)) {
        return [start + rest];
      }
      return [start, rest];
    }
    return [state.text];
  }, [state.shouldOptimiseUrl, state.text]);

  const nonOptimisedQr = useQRCode({
    value: [state.text],
    level: 'L',
    minVersion: 1,
  });
  const willAttemptOptimisation = state.shouldOptimiseUrl && canOptimiseUrl;
  const optimisedQr = useQRCode({
    value: qrValueArray,
    level: 'L',
    minVersion: 1,
    justError: !willAttemptOptimisation,
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
            <dd>
              {'[' +
                (willUseOptimisedQr
                  ? qrValueArray.map((v) => '"' + v + '"').join(', ')
                  : '"' + state.text + '"') +
                ']'}
            </dd>
            <dt>Render Generation</dt>
            <dd>{state.generation}</dd>
            <dt>Optimisation</dt>
            <dd>
              {canOptimiseUrl
                ? state.shouldOptimiseUrl
                  ? willUseOptimisedQr
                    ? 'Optimised'
                    : "Optimisation doesn't help"
                  : 'Optimisation manually disabled'
                : 'Not able to optimise this input'}{' '}
              {willAttemptOptimisation &&
                optimisedQr instanceof Error &&
                ` and rendering the optimised form gave an error: ${optimisedQr.message}`}
            </dd>
          </dl>
        </details>
      )}
    </>
  );
}
