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
  const { abstract, author, lifecycle, revised, revision, title } =
    use(metadata);
  return (
    <div
      property="itemListElement"
      typeof="Article"
      resource={`/articles/${name}`}
    >
      <div className="flex flex-row flex-wrap gap-x-[1ch]">
        <span className="inline-block">
          {lifecycle === 'draft' ? 'Draft: ' : ''}
          <Link property="url" href={`/articles/${name}`}>
            <span property="headline">{title}</span>
          </Link>
          {author && (
            <span property="author" typeof="Person" resource={`#${author}`}>
              {' - '}
              <span property="name">{author}</span>
            </span>
          )}
        </span>
        <span className="inline-block">
          <span className="wrap-parens text-smaller">
            {revision && `v${revision}, `}
            {revised.split('/')[0]}
          </span>
          {abstract && ':'}
        </span>
        {abstract && (
          <span className="inline-block" property="alternativeHeadline">
            {abstract}
          </span>
        )}
      </div>
      <Description metadata={metadata} />
    </div>
  );
}
