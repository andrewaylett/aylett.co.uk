import { NextResponse } from 'next/server';
import RSS from 'rss';

import { allArticles } from '../articles';
import { asyncSortByKey } from '../../../sort_by';

export async function GET() {
  // Create RSS XML
  const feed = new RSS({
    title: 'Articles - aylett.co.uk',
    site_url: 'https://www.aylett.co.uk/articles',
    feed_url: 'https://www.aylett.co.uk/articles/rss',
  });

  const articles = await allArticles();

  const sorted = await asyncSortByKey(
    articles,
    async (page) => (await page.metadata).revised,
  );

  for (const article of sorted) {
    const metadata = await article.metadata;
    if (metadata.lifecycle !== 'draft') {
      feed.item({
        title: metadata.title,
        url: `https://www.aylett.co.uk/articles/${article.id}`,
        guid: `https://www.aylett.co.uk/articles/${article.id}`,
        date: new Date(metadata.revised).toISOString(),
        description: metadata.description,
        author: metadata.author,
        categories: metadata.tags,
      });
    }
  }

  // Return the feed
  const response = new NextResponse(feed.xml({ indent: true }));
  response.headers.set('Content-Type', 'application/rss+xml');
  return response;
}
