import 'server-only';

import React, { type ReactNode, Suspense, use } from 'react';

import { type Metadata } from 'next';

import { allArticles } from './articles';

import { ListingEntry } from '@/components/ListingEntry';
import { PageStructure } from '@/components/PageStructure';
import { TitleHeader } from '@/components/TitleHeader';
import { type Markdown } from '@/remark/traverse';
import { type ArticleSchema } from '@/types';
import { asyncSortByKey } from '@/utilities';

export const metadata: Metadata = {
  title: 'Articles',
  alternates: {
    types: {
      'application/rss+xml': [
        { url: '/articles/rss', title: 'Articles - aylett.co.uk' },
      ],
    },
  },
};

export default function articles(): ReactNode {
  const pages = allArticles();
  return (
    <PageStructure
      schemaType="ItemList"
      resource="/articles"
      breadcrumbs={[]}
      header={<TitleHeader>Articles</TitleHeader>}
    >
      <Articles pages={pages} />
    </PageStructure>
  );
}

function Articles({ pages }: { pages: Promise<Markdown<ArticleSchema>[]> }) {
  const resolved = use(pages);
  const sorted = use(
    asyncSortByKey(resolved, async (page) => {
      const { title } = await page.metadata;
      return title;
    }),
  );
  return (
    <>
      {sorted.map(({ id: name, metadata }) => (
        <Suspense key={name}>
          <ListingEntry name={name} metadata={metadata} />
        </Suspense>
      ))}
    </>
  );
}
