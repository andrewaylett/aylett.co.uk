import 'server-only';

import type { JSX } from 'react';

import type { Metadata } from 'next';

import { PageStructure } from '@/components/PageStructure';
import LineTraceWordGame from '@/client/puzzles/friends/word-friends';

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
        <LineTraceWordGame />
      </main>
    </PageStructure>
  );
}
