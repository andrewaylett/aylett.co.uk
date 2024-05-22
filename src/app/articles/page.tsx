import * as React from 'react';
import { Suspense, use } from 'react';

import Link from 'next/link';

import { Description } from '../../remark/components';
import { asyncSortByKey } from '../../sort_by';
import { PageStructure, TitleHeader } from '../../page-structure';

import { allArticles } from './articles';

import type { Markdown } from '../../remark/traverse';
import type { ArticleSchema, TypeFrom } from '../../types';
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
  metadata: Promise<TypeFrom<ArticleSchema>>;
  name: string;
}) {
  const resolved = use(metadata);
  return (
    <div
      property="itemListElement"
      typeof="Article"
      resource={`/articles/${name}`}
    >
      <div className="flex flex-row flex-wrap gap-x-[1ch]">
        <span className="inline-block">
          {resolved.lifecycle === 'draft' ? 'Draft: ' : ''}
          <Link property="url" href={`/articles/${name}`}>
            <span property="headline">{resolved.title}</span>
          </Link>
          {resolved.author && (
            <span
              property="author"
              typeof="Person"
              resource={`#${resolved.author}`}
            >
              {' - '}
              <span property="name">{resolved.author}</span>
            </span>
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
