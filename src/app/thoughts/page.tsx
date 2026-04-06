import 'server-only';

import React, { type ReactNode } from 'react';

import { type Metadata } from 'next';

import { allThoughts } from './thoughts';

import { Thoughts } from '@/components/Thoughts';

export const metadata: Metadata = {
  title: 'Thoughts',
  description: 'Some of the things that Andrew has been thinking about',
  alternates: {
    types: {
      'application/rss+xml': [
        { url: '/thoughts/rss', title: 'Thoughts - aylett.co.uk' },
      ],
    },
  },
};

export default async function Page(): Promise<ReactNode> {
  const files = await allThoughts();
  return <Thoughts files={files} />;
}
