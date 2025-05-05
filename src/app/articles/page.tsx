import React, { type ReactNode, Suspense, use } from 'react';

import { type Metadata } from 'next';

import { PageStructure, TitleHeader } from '../../page-structure';
import { type Markdown } from '../../remark/traverse';
import { asyncSortByKey } from '../../sort_by';
import { type ArticleSchema } from '../../types';

import { ArticleEntry } from './articleEntry';
import { allArticles } from './articles';

import 'server-only';

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
    asyncSortByKey(resolved, async (page) => (await page.metadata).title),
  );
  return (
    <>
      {sorted.map(({ id: name, metadata }) => (
        <Suspense key={name}>
          <ArticleEntry name={name} metadata={metadata} />
        </Suspense>
      ))}
    </>
  );
}
