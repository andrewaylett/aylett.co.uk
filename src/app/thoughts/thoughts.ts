import 'server-only';

import { cache } from 'react';

import { notFound } from 'next/navigation';

import { type Thought, ThoughtSchema } from '@/types';
import { type MDFile, Markdown, traverse } from '@/remark/traverse';

export async function thoughtForId(
  params: Promise<{ id: string }>,
): Promise<Markdown<Thought>> {
  const pages = await allThoughts();
  const { id } = await params;
  return new Markdown(
    pages.find((page) => page.id === id) ?? notFound(),
    ThoughtSchema,
  );
}

export const allThoughts: () => Promise<MDFile[]> = cache(() =>
  traverse('thoughts/md'),
);
