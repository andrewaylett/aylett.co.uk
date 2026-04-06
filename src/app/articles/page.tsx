import 'server-only';

import React, { type ReactNode } from 'react';

import { type Metadata } from 'next';

import { allArticles } from './articles';

import { PageStructure } from '@/components/PageStructure';
import { TitleHeader } from '@/components/TitleHeader';
import { Articles } from '@/components/Articles';

export const metadata: Metadata = {
  title: 'Articles',
  alternates: {
    types: {
      'application/rss+xml': [
        { url: '/articles/rss', title: 'Articles - aylett.co.uk' },
      ],
    },
  },
};

export default async function articles(): Promise<ReactNode> {
  const files = await allArticles();
  return (
    <PageStructure
      schemaType="ItemList"
      resource="/articles"
      breadcrumbs={[]}
      header={<TitleHeader>Articles</TitleHeader>}
    >
      <Articles files={files} />
    </PageStructure>
  );
}
