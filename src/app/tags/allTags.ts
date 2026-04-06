import { allArticles } from '../articles/articles';
import { allThoughts } from '../thoughts/thoughts';

import {
  type Article,
  ArticleSchema,
  type Thought,
  ThoughtSchema,
  type Content,
} from '@/types';
import { Metadata } from '@/remark/traverse';
import { yieldWhenResolved } from '@/yieldWhenResolved';

export async function allTags() {
  const articles = await allArticles();
  const thoughts = await allThoughts();

  const tags = new Set<string>();
  const allMetadata = yieldWhenResolved<Content>([
    ...articles.map((a) => new Metadata<Article>(a, ArticleSchema).data),
    ...thoughts.map((t) => new Metadata<Thought>(t, ThoughtSchema).data),
  ]);
  for await (const metadata of allMetadata) {
    for (const tag of metadata.tags) tags.add(tag);
  }
  return tags;
}
