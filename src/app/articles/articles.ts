import 'server-only';

import { cache } from 'react';

import { notFound } from 'next/navigation';

import { type Article, ArticleSchema } from '@/types';
import { type MDFile, Markdown, traverse } from '@/remark/traverse';

async function articleForIdFn(params: {
  id: string;
}): Promise<Markdown<Article>> {
  const articles = await allArticles();
  return new Markdown(
    articles.find((article) => article.id === params.id) ?? notFound(),
    ArticleSchema,
  );
}

export const articleForId: (params: {
  id: string;
}) => Promise<Markdown<Article>> = cache(articleForIdFn);

export const allArticles: () => Promise<MDFile[]> = cache(() =>
  traverse('articles/md'),
);
