import { cache } from 'react';

import { notFound } from 'next/navigation';

import { ThoughtSchema } from '../../types';
import { findMarkdown } from '../../remark/traverse';

import 'server-only';

import type { Markdown } from '../../remark/traverse';

export async function thoughtForId(
  params: Promise<{ id: string }>,
): Promise<Markdown<ThoughtSchema>> {
  const pages = await allThoughts();
  const id = (await params).id;
  return pages.find((page) => page.id === id) ?? notFound();
}

export const allThoughts = cache(() => findMarkdown('thoughts', ThoughtSchema));
