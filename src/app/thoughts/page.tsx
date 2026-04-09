import 'server-only';

import type { JSX } from 'react';

import { allThoughts } from './thoughts';

import type { Metadata } from 'next';

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

export default async function Page(): Promise<JSX.Element> {
  const files = await allThoughts();
  return <Thoughts files={files} />;
}
