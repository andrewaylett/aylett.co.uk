import * as React from 'react';
import { Suspense, use } from 'react';

import Link from 'next/link';

import { Description } from '../../remark/components';
import { ArticleSchema, TypeFrom } from '../../types';
import { Markdown } from '../../remark/traverse';
import { asyncSortByKey } from '../../sort_by';
import { PageStructure, TitleHeader } from '../../page-structure';

import { allArticles } from './articles';

import type { Metadata } from 'next';

import 'server-only';

// noinspection JSUnusedGlobalSymbols
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

// noinspection JSUnusedGlobalSymbols
export default function articles(): React.ReactNode {
  const pages = allArticles();
  return (
    <PageStructure
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
    <div property="mainEntity" typeof="ItemList">
      {sorted.map(({ id: name, metadata }) => (
        <Suspense key={name}>
          <Entry name={name} metadata={metadata} />
        </Suspense>
      ))}
    </div>
  );
}

function Entry({
  metadata,
  name,
}: {
  metadata: Promise<TypeFrom<ArticleSchema>>;
  name: string;
}) {
  const resolved = use(metadata);
  return (
    <div property="itemListElement" typeof="Article">
      <div className="flex flex-row flex-wrap gap-x-[1ch]">
        <span className="inline-block">
          <Link property="url" href={`/articles/${name}`}>
            <span property="name">{resolved.title}</span>
          </Link>
          {resolved.author && (
            <>
              {' - '}
              <span property="author">{resolved.author}</span>
            </>
          )}
        </span>
        <span className="inline-block">
          <span className="wrap-parens text-smaller">
            {resolved.revision && `v${resolved.revision}, `}
            {resolved.revised.split('/')[0]}
          </span>
          {resolved.abstract && ':'}
        </span>
        {resolved.abstract && (
          <span className="inline-block" property="alternativeHeadline">
            {resolved.abstract}
          </span>
        )}
      </div>
      <Description metadata={metadata} />
    </div>
  );
}
