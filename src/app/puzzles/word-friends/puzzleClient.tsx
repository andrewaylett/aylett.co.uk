'use client';

import React, { type JSX } from 'react';

import { ErrorBoundary } from 'next/dist/client/components/error-boundary';

import { LineTraceErrorComponent } from '@/app/puzzles/word-friends/LineTraceErrorComponent';
import { LineTraceWordGame } from '@/client/puzzles/friends/LineTraceWordGame';

export function PuzzleClient(): JSX.Element {
  return (
    <ErrorBoundary errorComponent={LineTraceErrorComponent}>
      <LineTraceWordGame />
    </ErrorBoundary>
  );
}
