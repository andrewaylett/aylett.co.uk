import { notFound } from 'next/navigation';

import { findMarkdown, Markdown } from '../../remark/traverse';
import { ArticleSchema } from '../../types';

import 'server-only';

let articles: undefined | Promise<Markdown<ArticleSchema>[]>;

export async function articleForId(
  id: string,
): Promise<Markdown<ArticleSchema>> {
  const articles = await allArticles();
  return articles.find((article) => article.id === id) ?? notFound();
}

export function allArticles(): Promise<Markdown<ArticleSchema>[]> {
  if (!articles) {
    articles = findMarkdown('articles', ArticleSchema);
  }
  return articles;
}
