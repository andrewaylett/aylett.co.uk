import 'server-only';

import React, { type JSX } from 'react';

import type { Metadata } from 'next';

import { PuzzleClient } from '@/app/puzzles/word-friends/puzzleClient';

const TITLE = 'Word Friends';

export const metadata: Metadata = {
  title: TITLE,
  description: 'A words puzzle with friends',
} as const;

export default function PuzzlesPage(): JSX.Element {
  return (
    <>
      <p>
        Trace along the lines to find words of 4+ letters. Letters that are no
        longer needed turn into friends; lines fade away when they&apos;re
        spent.
      </p>
      <PuzzleClient />
    </>
  );
}
