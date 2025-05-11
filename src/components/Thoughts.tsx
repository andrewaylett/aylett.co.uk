import React, { type ReactNode, Suspense, use } from 'react';

import Link from 'next/link';

import { type Markdown } from '../remark/traverse';
import { type ThoughtSchema } from '../types';
import { asyncSortByKey } from '../utilities';

import { ListingEntry } from './ListingEntry';
import { PageStructure } from './PageStructure';
import { TitleHeader } from './TitleHeader';

export function Thoughts({
  pages,
}: {
  pages: Promise<Markdown<ThoughtSchema>[]>;
}): ReactNode {
  const resolved = use(pages);
  const sorted = use(
    asyncSortByKey(resolved, async (page) => (await page.metadata).date),
  );
  return (
    <PageStructure
      schemaType="ItemList"
      resource="/thoughts"
      breadcrumbs={[]}
      header={<TitleHeader>Thoughts</TitleHeader>}
    >
      <p>
        <Link property="subjectOf" href="/articles/thoughts">
          What is this?
        </Link>
      </p>
      {sorted.reverse().map(({ id: name, metadata }) => (
        <Suspense key={name}>
          <ListingEntry name={name} metadata={metadata} />
        </Suspense>
      ))}
    </PageStructure>
  );
}
