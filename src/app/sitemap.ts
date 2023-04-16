import { MetadataRoute } from 'next';

import { allArticles } from './articles/articles';
import { allThoughts } from './thoughts/thoughts';

// noinspection JSUnusedGlobalSymbols
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, thoughts] = await Promise.all([
    allArticles(),
    allThoughts(),
  ]);

  const extras = ['/', '/articles', '/links', '/schema', '/thoughts'];

  return [
    ...extras.map((u) => ({ url: u })),
    ...articles.map((a) => ({ url: `/articles/${a.id}` })),
    ...thoughts.map((t) => ({ url: `/thoughts/${t.id}` })),
  ];
}
