import { cache } from 'react';

import { notFound } from 'next/navigation';

import { findMarkdown } from '../../remark/traverse';
import { ArticleSchema } from '../../types';

import type { Markdown } from '../../remark/traverse';

import 'server-only';

export async function articleForId(
  params: Promise<{ id: string }>,
): Promise<Markdown<ArticleSchema>> {
  const articles = await allArticles();
  const id = (await params).id;
  return articles.find((article) => article.id === id) ?? notFound();
}

export const allArticles = cache(() => findMarkdown('articles', ArticleSchema));
