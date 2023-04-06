import * as React from 'react';
import { Fragment } from 'react';

import Link from 'next/link';

import Footer from '../footer';
import { Description } from '../../remark/components';

import { allArticles } from './articles';

import type { Metadata } from 'next';

import style from './articles.module.css';

import 'server-only';

// noinspection JSUnusedGlobalSymbols
export const metadata: Metadata = {
  title: 'Articles',
};

// noinspection JSUnusedGlobalSymbols
export default async function Articles(): Promise<React.ReactNode> {
  const pages = await allArticles();
  return (
    <div className={style.page}>
      <nav>
        <Link href="/">Home</Link>
      </nav>
      <header>
        <h1>Articles</h1>
      </header>
      <main>
        {pages.map(({ id: name, metadata }) => (
          <Fragment key={name}>
            <div className={style.entry}>
              <span>
                <Link href={`/articles/${name}`}>{metadata.title}</Link>
                {metadata.author ? ` - ${metadata.author}` : ''}
              </span>
              <span>
                <span className={style.revision}>
                  {metadata.revision ? `v${metadata.revision}, ` : ''}
                  {metadata.revised.split('/')[0]}
                </span>
                {metadata.abstract ? ':' : ''}
              </span>
              {metadata.abstract ? <span>{metadata.abstract}</span> : ''}
            </div>
            <Description metadata={metadata} />
          </Fragment>
        ))}
      </main>
      <Footer author="Andrew Aylett" />
    </div>
  );
}
