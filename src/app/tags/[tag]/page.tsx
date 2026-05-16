import type { JSX } from 'react';

import { notFound } from 'next/navigation';

import { allTags } from '../allTags';

import { TagPageContent } from '@/app/tags/[tag]/TagPageContent';

export async function generateStaticParams(): Promise<{ tag: string }[]> {
  const tags = await allTags();
  return [...tags.values()].map((tag) => ({
    tag: encodeURIComponent(tag.tagUriSegment),
  }));
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<JSX.Element> {
  const { tag: encodedTag } = await params;
  const requested = decodeURIComponent(encodedTag);
  const tagMap = await allTags();

  const tag = tagMap.get(requested);
  if (tag && tag.data.length > 0) {
    return <TagPageContent tag={tag} />;
  }

  // Didn't find the tag, so why are we trying to render the page?
  notFound();
}
