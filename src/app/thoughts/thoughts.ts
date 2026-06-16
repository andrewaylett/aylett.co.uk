import 'server-only';

import { notFound } from 'next/navigation';

import { type Thought, ThoughtSchema } from '@/types';
import {
  type MDFile,
  type Markdown,
  traverse,
  buildMarkdown,
} from '@/remark/traverse';

export async function thoughtForId(id: string): Promise<Markdown<Thought>> {
  'use cache';

  const pages = await allThoughts();
  return buildMarkdown(
    pages.find((page) => page.id === id) ?? notFound(),
    ThoughtSchema,
  );
}

export async function allThoughts(): Promise<MDFile[]> {
  'use cache';

  return await traverse('thoughts');
}
