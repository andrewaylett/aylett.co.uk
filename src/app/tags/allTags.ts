import assert from 'node:assert';

import { cache } from 'react';

import { allArticles } from '../articles/articles';
import { allThoughts } from '../thoughts/thoughts';

import {
  type Article,
  type Thought,
  type Content,
  ArticleSchema,
  ThoughtSchema,
  type Identified,
} from '@/types';
import { Metadata } from '@/remark/traverse';
import { yieldWhenResolved } from '@/yieldWhenResolved';

export interface TagDetails {
  data: Identified<Content>[];
  tagName: string;
  tagUriSegment: string;
}

/**
 * Retrieves all tags from articles and thoughts, grouping them by lowercase tag name.
 * Returns a map where keys are lowercase tag names and values are arrays of identified content.
 */
export const allTags: () => Promise<Map<string, TagDetails>> = cache(
  async function allTags(): Promise<Map<string, TagDetails>> {
    const articles = await allArticles();
    const thoughts = await allThoughts();

    const tags = new Map<string, TagDetails>();
    const allMetadata = yieldWhenResolved<Identified<Content>>([
      ...articles.map(async (a) => ({
        ...(await new Metadata<Article>(a, ArticleSchema).data),
        id: a.id,
      })),
      ...thoughts.map(async (t) => ({
        ...(await new Metadata<Thought>(t, ThoughtSchema).data),
        id: t.id,
      })),
    ]);
    for await (const metadata of allMetadata) {
      for (const tag of metadata.tags) {
        const lower = tag.toLowerCase();
        const existing = tags.get(lower);
        if (existing) {
          assert.ok(
            existing.tagName === tag,
            'Tag name mismatch for same lowercase tag',
          );
          existing.data.push(metadata);
        } else {
          tags.set(lower, {
            data: [metadata],
            tagName: tag,
            tagUriSegment: lower,
          });
        }
      }
    }
    return tags;
  },
);
