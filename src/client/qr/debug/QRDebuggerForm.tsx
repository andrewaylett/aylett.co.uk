'use client';

import { type JSX, Suspense } from 'react';

import {
  ErrorBoundary,
  type ErrorInfo,
} from 'next/dist/client/components/error-boundary';
import dynamic from 'next/dynamic';

function DebuggerError({ error }: ErrorInfo): JSX.Element {
  return <p role="alert">Error decoding QR code: {error.message}</p>;
}

function Loading(): JSX.Element {
  return <p className="text-center">Loading decoder…</p>;
}

// The decode pipeline (binarizer, locator, Reed–Solomon) is only useful with
// a camera or file in hand, so keep it out of the server render and shared
// bundles entirely, like the Mermaid renderer.
const QRDebuggerInner = dynamic(
  () => import('@/client/qr/debug/QRDebuggerInner'),
  {
    ssr: false,
    loading: Loading,
  },
);

export function QRDebuggerForm(): JSX.Element {
  return (
    <ErrorBoundary errorComponent={DebuggerError}>
      <Suspense fallback={<Loading />}>
        <QRDebuggerInner />
      </Suspense>
    </ErrorBoundary>
  );
}
