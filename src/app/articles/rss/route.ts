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

    const content = await article.content;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const description = renderToStaticMarkup(content);
    const {
      author,
      revised: date,
      tags: categories,
      title,
      uuid: guid,
    } = metadata;

    feed.item({
      author,
      categories,
      date,
      description,
      guid,
      title,
      url: `https://www.aylett.co.uk/articles/${article.id}`,
    });
  }

  // Return the feed
  return new NextResponse(feed.xml({ indent: true }));
}
