import { NextResponse } from 'next/server';
import RSS from 'rss';

import { allThoughts } from '../thoughts';
import { asyncSortByKey } from '../../../sort_by';

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
    const content = await article.content;
    const metadata = await article.metadata;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const description = renderToStaticMarkup(content);
    const { date, tags: categories, title, uuid: guid } = metadata;

    feed.item({
      author: 'Andrew Aylett',
      categories,
      date,
      description,
      guid,
      title,
      url: `https://www.aylett.co.uk/thoughts/${article.id}`,
    });
  }

  // Return the feed
  return new NextResponse(feed.xml({ indent: true }));
}
