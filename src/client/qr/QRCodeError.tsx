import React, { useContext, useEffect } from 'react';

import { type ErrorComponent } from 'next/dist/client/components/error-boundary';

import { QRCodeErrorContext } from './QRCodeErrorContext';

export const QRCodeError = function QRCodeError({ error, reset }) {
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

  return (
    <div className="w-full">
      <h2 className="text-red-500">Error generating QR code</h2>
      <p>{error.message}</p>
      <button
        type="button"
        onClick={resetText}
        className="bg-blue-500 text-white rounded-md p-2 mt-4 w-full"
      >
        Reset
      </button>
    </div>
  );
} satisfies ErrorComponent;
