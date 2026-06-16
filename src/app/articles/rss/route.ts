import { NextResponse } from 'next/server';
import RSS from 'rss';

import { allArticles } from '../articles';

import { sortByKey } from '@/utilities';
import { buildMetadata } from '@/remark/traverse';
import { ArticleSchema } from '@/types';

async function buildRSSXML() {
  'use cache';

  // Create RSS XML
  const feed = new RSS({
    title: 'Articles - aylett.co.uk',
    site_url: 'https://www.aylett.co.uk/articles',
    feed_url: 'https://www.aylett.co.uk/articles/rss',
  });

  const articleFiles = await allArticles();

  const articles = await Promise.all(
    articleFiles.map((f) => buildMetadata(f, ArticleSchema)),
  );

  const sorted = sortByKey(articles, (page) => page.data.revised);

  for (const article of sorted) {
    const metadata = article.data;
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

  return feed.xml({ indent: true });
}

export async function GET(): Promise<NextResponse> {
  const body = await buildRSSXML();
  // Return the feed
  const response = new NextResponse(body);
  response.headers.set('Content-Type', 'application/rss+xml');
  return response;
}
