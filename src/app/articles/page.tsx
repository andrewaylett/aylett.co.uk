import * as React from 'react';

import Link from 'next/link';
import Head from 'next/head';

import Footer from '../../footer';
import { allArticles } from '../../ssr/articles';

import style from '../../articles.module.css';

import 'server-only';

export default async function Articles() {
  const pages = await allArticles();
  return (
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
        {pages.map(({ id: name, metadata }) => (
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
      <Footer author="Andrew Aylett" />
    </div>
  );
}
