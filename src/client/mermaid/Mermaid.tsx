'use client';

import React, { type PropsWithChildren, Suspense } from 'react';

import { type MermaidConfig } from 'mermaid';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import dynamic from 'next/dynamic';

import { ErrorComponent } from './ErrorComponent';
import { LoadingComponent } from './LoadingComponent';

import { useDarkMode } from '@/client/hooks/useDarkMode';

export interface MermaidProps {
  name?: string;
  config?: MermaidConfig;
}

const MermaidInner = dynamic(() => import('./MermaidInner'), {
  loading: LoadingComponent,
});

export default function Mermaid({
  children,
  ...props
}: PropsWithChildren<MermaidProps>) {
  const isDarkMode = useDarkMode();
  return (
    <ErrorBoundary errorComponent={ErrorComponent}>
      <Suspense
        fallback={
          <div>
            Loading...{' '}
            <span className="appear-10s">do you have Javascript enabled?</span>
          </div>
        }
      >
        <MermaidInner
          key={
            // Force re-render on dark mode change
            isDarkMode ? 1 : 0
          }
          {...props}
        >
          {children}
        </MermaidInner>
      </Suspense>
    </ErrorBoundary>
  );
}
