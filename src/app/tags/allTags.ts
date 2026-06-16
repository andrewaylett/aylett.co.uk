import { allArticles } from '../articles/articles';
import { allThoughts } from '../thoughts/thoughts';

import { type Content, ArticleSchema, ThoughtSchema } from '@/types';
import { buildMetadata, type Metadata } from '@/remark/traverse';
import { yieldWhenResolved } from '@/yieldWhenResolved';

export async function allTags(): Promise<Set<string>> {
  'use cache';

  const articles = await allArticles();
  const thoughts = await allThoughts();

  const tags = new Set<string>();
  const articleMetadata: Promise<Metadata<Content>>[] = articles.map((a) =>
    buildMetadata(a, ArticleSchema),
  );
  const thoughtsMetadata: Promise<Metadata<Content>>[] = thoughts.map((t) =>
    buildMetadata(t, ThoughtSchema),
  );
  const allMetadata = yieldWhenResolved<Metadata<Content>>([
    ...articleMetadata,
    ...thoughtsMetadata,
  ]);
  for await (const metadata of allMetadata) {
    for (const tag of metadata.data.tags) {
      tags.add(tag);
    }
  }
  return tags;
}
