import { NextResponse } from 'next/server';
import RSS from 'rss';

import { allThoughts } from '../thoughts';

import { asyncSortByKey } from '@/utilities';
import { ThoughtSchema } from '@/types';
import { Metadata } from '@/remark/traverse';

export async function GET(): Promise<NextResponse> {
  // Create RSS XML
  const feed = new RSS({
    title: 'Thoughts - aylett.co.uk',
    site_url: 'https://www.aylett.co.uk/thoughts',
    feed_url: 'https://www.aylett.co.uk/thoughts/rss',
  });

  const thoughtFiles = await allThoughts();
  const thoughts = thoughtFiles.map(
    (file) => new Metadata(file, ThoughtSchema),
  );

  const sorted = await asyncSortByKey(
    thoughts,
    async (thought) => (await thought.data).date,
  );

  for (const article of sorted) {
    const metadata = await article.data;
    feed.item({
      title: metadata.title,
      url: `https://www.aylett.co.uk/thoughts/${article.id}`,
      guid: `https://www.aylett.co.uk/thoughts/${article.id}`,
      date: new Date(metadata.date).toISOString(),
      description: metadata.description,
      author: 'Andrew Aylett',
      categories: metadata.tags,
    });
  }

  // Return the feed
  const response = new NextResponse(feed.xml({ indent: true }));
  response.headers.set('Content-Type', 'application/rss+xml');
  return response;
}
