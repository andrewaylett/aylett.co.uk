import 'server-only';

import React, { type ReactNode } from 'react';

import { type Metadata } from 'next';
import Link from 'next/link';

import { PageStructure } from '@/components/PageStructure';

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

function Home(): ReactNode {
  return (
    <PageStructure
      header={
        <>
          <h1 className="text-center">Welcome to aylett.co.uk</h1>
          <p className="text-center">
            Insert &apos;90s &ldquo;site under construction&rdquo; gif here.
          </p>
        </>
      }
      schemaType={''}
      resource={''}
    >
      <main
        vocab="https://schema.org/"
        typeof="ItemList"
        resource="/"
        className="flex flex-col justify-center items-center text-center *:text-xl"
      >
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
        <p>
          <Link property="item" typeof="WebPage" href="qr">
            <span property="name">QR Code Generator</span>
          </Link>
        </p>
      </main>
    </PageStructure>
  );
}

export default Home;
