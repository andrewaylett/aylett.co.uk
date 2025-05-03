import React, { type ReactNode, Suspense, use } from 'react';

import { type Metadata } from 'next';
import Link from 'next/link';

import { PageStructure, TitleHeader } from '../../page-structure';
import { Description } from '../../remark/components';
import { type Markdown } from '../../remark/traverse';
import { asyncSortByKey } from '../../sort_by';
import { type ArticleSchema, memo, type TypeFrom } from '../../types';

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

const Articles = memo(function Articles({
  pages,
}: {
  pages: Promise<Markdown<ArticleSchema>[]>;
}) {
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
});

export const ArticleEntry = memo(function Entry({
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
});
