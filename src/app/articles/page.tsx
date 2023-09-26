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
    <main>
      {sorted.map(({ id: name, metadata }) => (
        <Suspense key={name}>
          <Entry name={name} metadata={metadata} />
        </Suspense>
      ))}
    </main>
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
    <>
      <div className="flex flex-row flex-wrap gap-x-[1ch]">
        <span className="inline-block">
          <Link href={`/articles/${name}`}>{resolved.title}</Link>
          {resolved.author && ` - ${resolved.author}`}
        </span>
        <span className="inline-block">
          <span className="wrap-parens smaller">
            {resolved.revision && `v${resolved.revision}, `}
            {resolved.revised.split('/')[0]}
          </span>
          {resolved.abstract && ':'}
        </span>
        {resolved.abstract && (
          <span className="inline-block">{resolved.abstract}</span>
        )}
      </div>
      <Description metadata={metadata} />
    </>
  );
}
