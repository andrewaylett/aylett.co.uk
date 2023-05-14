import * as React from 'react';
import { Suspense, use } from 'react';

import Link from 'next/link';

import Footer from '../footer';
import { Description } from '../../remark/components';
import { ArticleSchema, TypeFrom } from '../../types';
import { Markdown } from '../../remark/traverse';
import { asyncSortByKey } from '../../sort_by';

import { allArticles } from './articles';

import type { Metadata } from 'next';

import style from './articles.module.css';

import 'server-only';

// noinspection JSUnusedGlobalSymbols
export const metadata: Metadata = {
  title: 'Articles',
};

// noinspection JSUnusedGlobalSymbols
export default function articles(): React.ReactNode {
  const pages = allArticles();
  return (
    <div className={style.page}>
      <nav>
        <Link href="/">Home</Link>
      </nav>
      <header>
        <h1>Articles</h1>
      </header>
      <Suspense fallback="Rendering...">
        <Articles pages={pages} />
      </Suspense>
      <Footer author="Andrew Aylett" />
    </div>
  );
}

function Articles({ pages }: { pages: Promise<Markdown<ArticleSchema>[]> }) {
  const resolved = use(pages);
  const sorted = use(
    asyncSortByKey(resolved, async (page) => (await page.metadata).title)
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
      <div className={style.entry}>
        <span>
          <Link href={`/articles/${name}`}>{resolved.title}</Link>
          {resolved.author && ` - ${resolved.author}`}
        </span>
        <span>
          <span className={style.revision}>
            {resolved.revision && `v${resolved.revision}, `}
            {resolved.revised.split('/')[0]}
          </span>
          {resolved.abstract && ':'}
        </span>
        {resolved.abstract && <span>{resolved.abstract}</span>}
      </div>
      <Description metadata={metadata} />
    </>
  );
}
