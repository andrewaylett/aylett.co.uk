import { NextResponse } from 'next/server';
import RSS from 'rss';

import { allThoughts } from '../thoughts';

import { sortByKey } from '@/utilities';
import { ThoughtSchema } from '@/types';
import { buildMetadata } from '@/remark/traverse';

async function buildRSSXML() {
  'use cache';

  // Create RSS XML
  const feed = new RSS({
    title: 'Thoughts - aylett.co.uk',
    site_url: 'https://www.aylett.co.uk/thoughts',
    feed_url: 'https://www.aylett.co.uk/thoughts/rss',
  });

  const thoughtFiles = await allThoughts();
  const thoughts = await Promise.all(
    thoughtFiles.map((file) => buildMetadata(file, ThoughtSchema)),
  );

  const sorted = sortByKey(thoughts, (thought) => thought.data.date);

  for (const article of sorted) {
    const metadata = article.data;
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

  return feed.xml({ indent: true });
}

export async function GET(): Promise<NextResponse> {
  const body = await buildRSSXML();
  // Return the feed
  const response = new NextResponse(body);
  response.headers.set('Content-Type', 'application/rss+xml');
  return response;
}
