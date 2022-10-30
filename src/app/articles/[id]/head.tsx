import * as React from 'react';

import { notFound } from 'next/navigation';

import { allArticles } from '../../../ssr/articles';

// noinspection JSUnusedGlobalSymbols
export default async function Head({ params }: { params: { id: string } }): Promise<React.ReactNode> {
  const pages = await allArticles();

  const page = pages.find((page) => page.id === params.id);

  if (!page) {
    notFound();
  }

  const { metadata } = page;

  return (
    <head>
      <title>{metadata.title} - aylett.co.uk</title>
      <link rel="icon" href="/favicon.ico" />
    </head>
  );
}
