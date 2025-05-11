import React from 'react';

import { notFound } from 'next/navigation';

import { allTags } from '../allTags';

import { allArticles } from '@/app/articles/articles';
import { TagPageContent } from '@/app/tags/[tag]/TagPageContent';
import { allThoughts } from '@/app/thoughts/thoughts';
import { type Markdown } from '@/remark/traverse';
import { type ArticleSchema, type ThoughtSchema } from '@/types';

export async function generateStaticParams() {
  const tags = await allTags();
  return Array.from(tags).map((tag) => ({
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

  const filteredArticles: Markdown<ArticleSchema>[] = [];
  for (const article of articles) {
    const metadata = await article.metadata;
    if ((recalledTag = metadata.tags.find((s) => s.toLowerCase() === tag))) {
      originalTag = recalledTag;
      filteredArticles.push(article);
    }
  }

  const filteredThoughts: Markdown<ThoughtSchema>[] = [];
  for (const thought of thoughts) {
    const metadata = await thought.metadata;
    if ((recalledTag = metadata.tags.find((s) => s.toLowerCase() === tag))) {
      originalTag = recalledTag;
      filteredThoughts.push(thought);
    }
  }

  if (!originalTag) {
    // Didn't find the tag, so why are we trying to render the page?
    throw notFound();
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
