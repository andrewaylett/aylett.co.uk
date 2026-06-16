import 'server-only';

import type { JSX } from 'react';

import type { Metadata } from 'next';

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

export default function articles(): JSX.Element {
  return (
    <PageStructure
      schemaType="ItemList"
      resource="/articles"
      breadcrumbs={[]}
      header={<TitleHeader>Articles</TitleHeader>}
    >
      <Articles />
    </PageStructure>
  );
}
