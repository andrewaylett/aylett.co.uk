import { useContext, useEffect } from 'react';

import { QRCodeErrorContext } from './QRCodeErrorContext';

import type {
  ErrorComponent,
  ErrorInfo,
} from 'next/dist/client/components/error-boundary';

export const QRCodeError: ErrorComponent = ({ error, reset }: ErrorInfo) => {
  const context = useContext(QRCodeErrorContext);
  if (!context) {
    throw new Error(
      'QRCodeError must be used within a QRCodeErrorContext provider',
    );
  }
  const { resetText, updateResetRef } = context;
  useEffect(() => {
    updateResetRef(reset);
  }, [reset, updateResetRef]);

  const message =
    typeof error === 'object' && error && 'message' in error
      ? String(error.message)
      : 'An unknown error occurred';

  return (
    <div className="w-full">
      <h2 className="text-red-500">Error generating QR code</h2>
      <p>{message}</p>
      <button
        type="button"
        onClick={resetText}
        className="bg-blue-500 text-white rounded-md p-2 mt-4 w-full"
      >
        Reset
      </button>
    </div>
  );
};
