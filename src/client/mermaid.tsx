'use client';

import React, { lazy, type PropsWithChildren, Suspense } from 'react';

import { type MermaidConfig } from 'mermaid';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';

import { memo } from '../types';

import 'client-only';

export interface MermaidProps {
  name?: string;
  config?: MermaidConfig;
}

const MermaidInner = lazy(() => import('./mermaid-inner'));

export const Mermaid = memo(function Mermaid({
  ...props
}: PropsWithChildren<MermaidProps>) {
  return (
    <ErrorBoundary errorComponent={() => <>Error loading diagram</>}>
      <Suspense fallback={<>Loading...</>}>
        <MermaidInner {...props} />
      </Suspense>
    </ErrorBoundary>
  );
});
