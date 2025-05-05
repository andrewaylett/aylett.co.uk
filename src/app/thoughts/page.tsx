import React, { type ReactNode, Suspense, use } from 'react';

import { type Metadata } from 'next';
import Link from 'next/link';

import { PageStructure, TitleHeader } from '../../page-structure';
import { type Markdown } from '../../remark/traverse';
import { asyncSortByKey } from '../../sort_by';
import { type ThoughtSchema } from '../../types';

import { ThoughtEntry } from './thoughtEntry';
import { allThoughts } from './thoughts';

import 'server-only';

//noinspection JSUnusedGlobalSymbols
export const metadata: Metadata = {
  title: 'Thoughts',
  description: 'Some of the things that Andrew has been thinking about',
  alternates: {
    types: {
      'application/rss+xml': [
        { url: '/thoughts/rss', title: 'Thoughts - aylett.co.uk' },
      ],
    },
  },
};

function ThoughtsPage(): ReactNode {
  const pages = allThoughts();
  return (
    <PageStructure
      schemaType="ItemList"
      resource="/thoughts"
      breadcrumbs={[]}
      header={<TitleHeader>Thoughts</TitleHeader>}
    >
      <Thoughts pages={pages} />
    </PageStructure>
  );
}

export default ThoughtsPage;

function Thoughts({
  pages,
}: {
  pages: Promise<Markdown<ThoughtSchema>[]>;
}): ReactNode {
  const resolved = use(pages);
  const sorted = use(
    asyncSortByKey(resolved, async (page) => (await page.metadata).date),
  );
  return (
    <>
      <p>
        <Link property="subjectOf" href="/articles/thoughts">
          What is this?
        </Link>
      </p>
      {sorted.reverse().map(({ id: name, metadata }) => (
        <Suspense key={name}>
          <ThoughtEntry name={name} metadata={metadata} />
        </Suspense>
      ))}
    </>
  );
}
