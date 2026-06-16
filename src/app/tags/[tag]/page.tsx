import type { JSX } from 'react';

import { notFound } from 'next/navigation';

import { allTags } from '../allTags';

import {
  type Article,
  type Thought,
  ArticleSchema,
  ThoughtSchema,
} from '@/types';
import { allArticles } from '@/app/articles/articles';
import { TagPageContent } from '@/app/tags/[tag]/TagPageContent';
import { allThoughts } from '@/app/thoughts/thoughts';
import { buildMetadata, type Metadata } from '@/remark/traverse';

export async function generateStaticParams(): Promise<{ tag: string }[]> {
  const tags = await allTags();
  return [...tags].map((tag) => ({
    tag: encodeURIComponent(tag.toLowerCase()),
  }));
}

async function TagPage({ tag }: { tag: string }) {
  'use cache';

  const articles = await allArticles();
  const thoughts = await allThoughts();
  let originalTag;
  let recalledTag;

  const filteredArticles: Metadata<Article>[] = [];
  for (const article of articles) {
    const metadata = await buildMetadata(article, ArticleSchema);
    const data = metadata.data;
    if ((recalledTag = data.tags.find((s) => s.toLowerCase() === tag))) {
      originalTag = recalledTag;
      filteredArticles.push(metadata);
    }
  }

  const filteredThoughts: Metadata<Thought>[] = [];
  for (const thought of thoughts) {
    const metadata = await buildMetadata(thought, ThoughtSchema);
    const data = metadata.data;
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

export default async function TagPageBase({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<JSX.Element> {
  const { tag: encodedTag } = await params;
  return <TagPage tag={decodeURIComponent(encodedTag)} />;
}
