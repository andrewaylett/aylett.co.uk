import 'server-only';

import { cache } from 'react';

import { notFound } from 'next/navigation';

import { findMarkdown, type Markdown } from '@/remark/traverse';
import { ArticleSchema } from '@/types';

async function articleForIdFn(params: {
  id: string;
}): Promise<Markdown<ArticleSchema>> {
  const articles = await allArticles();
  return articles.find((article) => article.id === params.id) ?? notFound();
}

export const articleForId = cache(articleForIdFn);

export const allArticles = cache(() =>
  findMarkdown('articles/md', ArticleSchema),
);
