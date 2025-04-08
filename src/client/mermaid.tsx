'use client';

import React, { lazy, PropsWithChildren, Suspense } from 'react';

import 'client-only';

import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { MermaidConfig } from 'mermaid';

export interface MermaidProps {
  name?: string;
  config?: MermaidConfig;
}

const MermaidInner = lazy(() => import('./mermaid-inner'));

export const Mermaid: React.FC<PropsWithChildren<MermaidProps>> = ({
  ...props
}) => {
  return (
    <ErrorBoundary errorComponent={() => <>Error loading diagram</>}>
      <Suspense fallback={<>Loading...</>}>
        <MermaidInner {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};
