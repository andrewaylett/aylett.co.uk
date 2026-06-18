import 'server-only';

import React, { type JSX } from 'react';

import { ErrorBoundary } from 'next/dist/client/components/error-boundary';

import type { Metadata } from 'next';

import { PageStructure } from '@/components/PageStructure';
import { LineTraceWordGame } from '@/client/puzzles/friends/LineTraceWordGame';
import { LineTraceErrorComponent } from '@/app/puzzles/word-friends/LineTraceErrorComponent';

const TITLE = 'Word Friends';

export const metadata: Metadata = {
  title: TITLE,
  description: 'A words puzzle with friends',
} as const;

export default function PuzzlesPage(): JSX.Element {
  return (
    <PageStructure
      breadcrumbs={[]}
      header={<h1 className="text-center">{TITLE}</h1>}
      schemaType="Item"
      resource="/puzzles"
    >
      <main className="flex flex-col justify-center items-center">
        <p>
          Trace along the lines to find words of 4+ letters. Letters that are no
          longer needed turn into friends; lines fade away when they&apos;re
          spent.
        </p>
        <ErrorBoundary errorComponent={LineTraceErrorComponent}>
          <LineTraceWordGame />
        </ErrorBoundary>
      </main>
    </PageStructure>
  );
}
