import { NextResponse } from 'next/server';
import RSS from 'rss';

import { asyncSortByKey } from '../../../sort_by';
import { allThoughts } from '../thoughts';

export async function GET() {
  // Create RSS XML
  const feed = new RSS({
    title: 'Thoughts - aylett.co.uk',
    site_url: 'https://www.aylett.co.uk/thoughts',
    feed_url: 'https://www.aylett.co.uk/thoughts/rss',
  });

  const articles = await allThoughts();

  const sorted = await asyncSortByKey(
    articles,
    async (page) => (await page.metadata).date,
  );

  for (const article of sorted) {
    const metadata = await article.metadata;
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
