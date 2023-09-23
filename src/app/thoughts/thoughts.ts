import { notFound } from 'next/navigation';

import { ThoughtSchema } from '../../types';
import { findMarkdown, Markdown } from '../../remark/traverse';

import 'server-only';

let thoughts: undefined | Promise<Markdown<ThoughtSchema>[]>;

export async function thoughtForId(
  id: string,
): Promise<Markdown<ThoughtSchema>> {
  const pages = await allThoughts();
  return pages.find((page) => page.id === id) ?? notFound();
}

export const allThoughts = () => {
  if (!thoughts) {
    thoughts = findMarkdown('thoughts', ThoughtSchema);
  }
  return thoughts;
};
