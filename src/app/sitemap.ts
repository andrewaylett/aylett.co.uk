import { type MetadataRoute } from 'next';

import { allArticles } from './articles/articles';
import { allTags } from './tags/allTags';
import { allThoughts } from './thoughts/thoughts';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, thoughts, tags] = await Promise.all([
    allArticles(),
    allThoughts(),
    allTags(),
  ]);

  const extras = ['/', '/articles', '/links', '/schema', '/thoughts', '/tags'];

  return [
    ...extras.map((u) => ({ url: u })),
    ...articles.map((a) => ({ url: `/articles/${a.id}` })),
    ...thoughts.map((t) => ({ url: `/thoughts/${t.id}` })),
    ...[...tags].map((t) => ({
      url: `/tags/${encodeURIComponent(t.toLowerCase())}`,
    })),
  ];
}
