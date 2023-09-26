import * as React from 'react';

import Link from 'next/link';

import type { Metadata } from 'next';

import 'server-only';

export const metadata: Metadata = {
  verification: {
    me: 'https://social.aylett.co.uk/@andrew',
  },
  description: 'Welcome to aylett.co.uk',
};

// noinspection JSUnusedGlobalSymbols
export default function Home(): React.ReactNode {
  return (
    <div className="flex flex-col justify-center items-center px-2 min-h-screen">
      <main className="flex flex-col justify-center items-center text-center text-2xl py-16">
        <h1 className="text-center m-0 text-6xl">Welcome to aylett.co.uk</h1>

        <p>Insert &apos;90s &ldquo;site under construction&rdquo; gif here.</p>
        <p>
          <Link href="articles">Articles</Link>
        </p>
        <p>
          <Link href="thoughts">Thoughts</Link>
        </p>
        <p>
          <Link href="schema">Schemas</Link>
        </p>
        <p className="text-center text-2xl">
          <Link href="links">Links</Link>
        </p>
      </main>
    </div>
  );
}
