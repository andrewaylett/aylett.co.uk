import React from 'react';
import { InferGetStaticPropsType } from 'next';
import Link from 'next/link';
import Head from 'next/head';

import style from '../../articles.module.scss';
import Footer from '../../footer';
import { getStaticProps } from '../../ssr/til';
import { ArticlesProps, fcProps } from '../../types';

export { getStaticProps } from '../../ssr/til';

const TIL: React.VoidFunctionComponent<InferGetStaticPropsType<typeof getStaticProps>> = fcProps(
  ({ pages }) => (
    <div className={style.page}>
      <Head>
        <title>Today I Learned - aylett.co.uk</title>
      </Head>
      <nav>
        <Link href="/">Home</Link>
      </nav>
      <header>
        <h1>Today I Learned</h1>
      </header>
      <main>
        {pages.map(({ name, metadata }) => (
          <p key={name}>
            <Link href={`/til/${name}`}>{metadata.title}</Link>
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

export default TIL;
