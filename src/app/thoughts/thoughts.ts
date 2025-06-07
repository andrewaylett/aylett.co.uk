import 'server-only';

import { cache } from 'react';

import { notFound } from 'next/navigation';

import { findMarkdown, type Markdown } from '@/remark/traverse';
import { ThoughtSchema } from '@/types';

export async function thoughtForId(
  params: Promise<{ id: string }>,
): Promise<Markdown<ThoughtSchema>> {
  const pages = await allThoughts();
  const { id } = await params;
  return pages.find((page) => page.id === id) ?? notFound();
}

export const allThoughts = cache(() =>
  findMarkdown('thoughts/md', ThoughtSchema),
);
