import 'server-only';

import React, { type ReactNode } from 'react';

import { type Metadata } from 'next';

import { allArticles, articleForId } from '../articles';

import { ArticlePage } from './ArticlePage';

export const dynamicParams = false;
export const dynamic = 'error';

interface ArticleProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ArticleProps): Promise<Metadata> {
  const page = await articleForId(await params);

  const metadata = await page.metadata;

  const robots =
    metadata.lifecycle === 'draft'
      ? {
          index: false,
        }
      : {};

  return {
    title: metadata.title,
    authors: [{ name: metadata.author }],
    description: metadata.description,
    keywords: metadata.tags,
    openGraph: {
      type: 'article',
      authors: [metadata.author],
      description: metadata.description,
      expirationTime: metadata.expires,
      locale: 'en_GB',
      publishedTime: metadata.revised,
      tags: metadata.tags,
      title: metadata.title,
    },
    robots,
  };
}

export async function generateStaticParams() {
  const pages = await allArticles();
  return pages.map((page) => ({
    id: page.id,
  }));
}

export default async function Page({
  params,
}: ArticleProps): Promise<ReactNode> {
  const { id } = await params;
  const page = articleForId(await params);
  return <ArticlePage page={page} id={id} />;
}
