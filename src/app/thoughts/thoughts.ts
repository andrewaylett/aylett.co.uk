import { notFound } from 'next/navigation';

import { Thought, ThoughtSchema } from '../../types';
import sortBy from '../../sort_by';
import { findMarkdown } from '../../remark/traverse';

import 'server-only';

let thoughts: undefined | Promise<Thought[]>;

export async function thoughtForId(id: string): Promise<Thought> {
  const pages = await allThoughts();
  return pages.find((page) => page.id === id) ?? notFound();
}

export const allThoughts = () => {
  if (!thoughts) {
    thoughts = findThoughts();
  }
  return thoughts;
};

const findThoughts = async () => {
  const entries = await findMarkdown('thoughts', ThoughtSchema);

  return sortBy(entries, (entry) => entry.metadata.date);
};
