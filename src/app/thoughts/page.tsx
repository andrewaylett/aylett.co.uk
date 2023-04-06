import * as React from 'react';
import { Fragment } from 'react';

import Link from 'next/link';

import Footer from '../footer';
import { Description } from '../../remark/components';

import { allThoughts } from './thoughts';

import type { Metadata } from 'next';

import style from '../articles/articles.module.css';

import 'server-only';

//noinspection JSUnusedGlobalSymbols
export const metadata: Metadata = {
  title: 'Thoughts',
  description: 'Some of the things that Andrew has been thinking about',
};

// noinspection JSUnusedGlobalSymbols
export default async function Articles(): Promise<React.ReactNode> {
  const pages = await allThoughts();
  return (
    <div className={style.page}>
      <nav>
        <Link href="/">Home</Link>
      </nav>
      <header>
        <h1>Thoughts</h1>
      </header>
      <main>
        <p>
          <Link href="/articles/thoughts">What is this?</Link>
        </p>
        {pages.map(({ id: name, metadata }) => (
          <Fragment key={name}>
            <p>
              <Link href={`/thoughts/${name}`}>{metadata.title}</Link>
            </p>
            <Description metadata={metadata} />
          </Fragment>
        ))}
      </main>
      <Footer author="Andrew Aylett" />
    </div>
  );
}
