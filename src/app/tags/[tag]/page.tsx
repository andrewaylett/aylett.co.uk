import React from 'react';

import { notFound } from 'next/navigation';

import { allTags } from '../allTags';

import { allArticles } from '@/app/articles/articles';
import { TagPageContent } from '@/app/tags/[tag]/TagPageContent';
import { allThoughts } from '@/app/thoughts/thoughts';
import { Metadata } from '@/remark/traverse';
import {
  type Article,
  ArticleSchema,
  type Thought,
  ThoughtSchema,
} from '@/types';

export async function generateStaticParams() {
  const tags = await allTags();
  return [...tags].map((tag) => ({
    tag: encodeURIComponent(tag.toLowerCase()),
  }));
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: encodedTag } = await params;
  const tag = decodeURIComponent(encodedTag);
  const articles = await allArticles();
  const thoughts = await allThoughts();
  let originalTag;
  let recalledTag;

  const filteredArticles: Metadata<Article>[] = [];
  for (const article of articles) {
    const metadata = new Metadata(article, ArticleSchema);
    const data = await metadata.data;
    if ((recalledTag = data.tags.find((s) => s.toLowerCase() === tag))) {
      originalTag = recalledTag;
      filteredArticles.push(metadata);
    }
  }

  const filteredThoughts: Metadata<Thought>[] = [];
  for (const thought of thoughts) {
    const metadata = new Metadata(thought, ThoughtSchema);
    const data = await metadata.data;
    if ((recalledTag = data.tags.find((s) => s.toLowerCase() === tag))) {
      originalTag = recalledTag;
      filteredThoughts.push(metadata);
    }
  }

  if (!originalTag) {
    // Didn't find the tag, so why are we trying to render the page?
    notFound();
  }

  return (
    <TagPageContent
      tag={tag}
      filteredArticles={filteredArticles}
      filteredThoughts={filteredThoughts}
      unmangledTag={originalTag}
    />
  );
}
