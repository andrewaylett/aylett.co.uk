import { cache } from 'react';

import { notFound } from 'next/navigation';

import { ThoughtSchema } from '../../types';
import { findMarkdown, Markdown } from '../../remark/traverse';

import 'server-only';

export async function thoughtForId(
  id: string,
): Promise<Markdown<ThoughtSchema>> {
  const pages = await allThoughts();
  return pages.find((page) => page.id === id) ?? notFound();
}

export const allThoughts = cache(() => findMarkdown('thoughts', ThoughtSchema));
