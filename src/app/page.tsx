import * as React from 'react';

import { type Metadata } from 'next';
import Link from 'next/link';

import { memo } from '../types';

import 'server-only';

export const metadata: Metadata = {
  verification: {
    me: 'https://social.aylett.co.uk/@andrew',
  },
  description: 'Welcome to aylett.co.uk',
  alternates: {
    types: {
      'application/rss+xml': [
        { url: '/articles/rss', title: 'Articles - aylett.co.uk' },
        { url: '/thoughts/rss', title: 'Thoughts - aylett.co.uk' },
      ],
    },
  },
  openGraph: {
    type: 'website',
    title: 'aylett.co.uk',
    description: 'Welcome to aylett.co.uk',
    url: 'https://www.aylett.co.uk',
    locale: 'en_GB',
  },
};

const Home = memo(function Home(): React.ReactNode {
  return (
    <div className="flex flex-col justify-center items-center px-2 min-h-screen">
      <main
        vocab="https://schema.org/"
        typeof="ItemList"
        resource="/"
        className="flex flex-col justify-center items-center text-center text-2xl py-16"
      >
        <h1 className="text-center m-0 text-6xl">Welcome to aylett.co.uk</h1>

        <p>Insert &apos;90s &ldquo;site under construction&rdquo; gif here.</p>
        <p>
          <Link property="item" typeof="WebPage" href="articles">
            <span property="name">Articles</span>
          </Link>
        </p>
        <p>
          <Link property="item" typeof="WebPage" href="thoughts">
            <span property="name">Thoughts</span>
          </Link>
        </p>
        <p>
          <Link property="item" typeof="WebPage" href="schema">
            <span property="name">Schemas</span>
          </Link>
        </p>
        <p>
          <Link property="item" typeof="WebPage" href="links">
            <span property="name">Links</span>
          </Link>
        </p>
      </main>
    </div>
  );
});

export default Home;
