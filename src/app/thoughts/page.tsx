import * as React from 'react';
import { Suspense, use } from 'react';

import Link from 'next/link';

import { Description } from '../../remark/components';
import { ThoughtSchema, TypeFrom } from '../../types';
import { Markdown } from '../../remark/traverse';
import { asyncSortByKey } from '../../sort_by';
import { PageStructure, TitleHeader } from '../../page-structure';

import { allThoughts } from './thoughts';

import type { Metadata } from 'next';

import 'server-only';

//noinspection JSUnusedGlobalSymbols
export const metadata: Metadata = {
  title: 'Thoughts',
  description: 'Some of the things that Andrew has been thinking about',
};

// noinspection JSUnusedGlobalSymbols
export default function thoughts(): React.ReactNode {
  const pages = allThoughts();
  return (
    <PageStructure
      breadcrumbs={[]}
      header={<TitleHeader>Thoughts</TitleHeader>}
    >
      <Thoughts pages={pages} />
    </PageStructure>
  );
}

function Thoughts({ pages }: { pages: Promise<Markdown<ThoughtSchema>[]> }) {
  const resolved = use(pages);
  const sorted = use(
    asyncSortByKey(resolved, async (page) => (await page.metadata).date),
  );
  return (
    <>
      <p>
        <Link href="/articles/thoughts">What is this?</Link>
      </p>
      {sorted.reverse().map(({ id: name, metadata }) => (
        <Suspense key={name}>
          <Entry name={name} metadata={metadata} />
        </Suspense>
      ))}
    </>
  );
}

function Entry({
  metadata,
  name,
}: {
  metadata: Promise<TypeFrom<ThoughtSchema>>;
  name: string;
}) {
  return (
    <>
      <p>
        <Link href={`/thoughts/${name}`}>{use(metadata).title}</Link>
      </p>
      <Description metadata={metadata} />
    </>
  );
}
