import 'server-only';

import type { JSX } from 'react';

import Link from 'next/link';

import type { Metadata } from 'next';

import { StaticPageStructure } from '@/components/PageStructure';

const TITLE = 'Puzzles';

export const metadata: Metadata = {
  title: TITLE,
  description: 'Miscellaneous puzzles',
} as const;

export default function PuzzlesPage(): JSX.Element {
  return (
    <StaticPageStructure
      breadcrumbs={[]}
      header={<h1 className="text-center">{TITLE}</h1>}
      schemaType="Item"
      resource="/puzzles"
    >
      <main
        vocab="https://schema.org/"
        typeof="ItemList"
        resource="/"
        className="flex flex-col justify-center items-center text-center *:text-xl"
      >
        <p>
          <Link href="/puzzles/word-friends/">
            <span property="name">Word Friends</span>
          </Link>
        </p>
      </main>
    </StaticPageStructure>
  );
}
