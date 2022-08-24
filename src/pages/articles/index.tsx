import React from 'react';

import Link from 'next/link';
import Head from 'next/head';

import Footer from '../../footer';
import { ArticlesProps, fcProps } from '../../types';

import type { getStaticProps } from '../../ssr/articles';
import type { InferGetStaticPropsType } from 'next';

import style from '../../articles.module.scss';

export { getStaticProps } from '../../ssr/articles';

const Articles: React.VoidFunctionComponent<InferGetStaticPropsType<typeof getStaticProps>> = fcProps(
  ({ pages }) => (
    <div className={style.page}>
      <Head>
        <title>Articles - aylett.co.uk</title>
      </Head>
      <nav>
        <Link href="/">Home</Link>
      </nav>
      <header>
        <h1>Articles</h1>
      </header>
      <main>
        {pages.map(({ metadata, name }) => (
          <p key={name}>
            <Link href={`/articles/${name}`}>{metadata.title}</Link>
            {metadata.author ? ` - ${metadata.author}` : ''}
            <span className={style.revision}>
              {metadata.revision ? `v${metadata.revision}, ` : ''}
              {metadata.revised.split('/')[0]}
            </span>
            {metadata.abstract ? `: ${metadata.abstract}` : ''}
          </p>
        ))}
      </main>
      <Footer />
    </div>
  ),
  ArticlesProps
);

export default Articles;
