'use client';
import 'client-only';

import React, { type PropsWithChildren, Suspense } from 'react';

import { type MermaidConfig } from 'mermaid';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import dynamic from 'next/dynamic';

export interface MermaidProps {
  name?: string;
  config?: MermaidConfig;
}

const MermaidInner = dynamic({
  loader: () => import('./mermaid-inner'),
  ssr: false,
});

export function Mermaid({ ...props }: PropsWithChildren<MermaidProps>) {
  return (
    <ErrorBoundary errorComponent={() => <>Error loading diagram</>}>
      <Suspense fallback={<>Loading...</>}>
        <MermaidInner {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
