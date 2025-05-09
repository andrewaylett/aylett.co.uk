import React from 'react';

import { notFound } from 'next/navigation';

import { PageStructure, TitleHeader } from '../../../page-structure';
import { type Markdown } from '../../../remark/traverse';
import { type ArticleSchema, type ThoughtSchema } from '../../../types';
import { ArticleEntry } from '../../articles/articleEntry';
import { allArticles } from '../../articles/articles';
import { ThoughtEntry } from '../../thoughts/thoughtEntry';
import { allThoughts } from '../../thoughts/thoughts';
import { allTags } from '../allTags';

export async function generateStaticParams() {
  const tags = await allTags();
  return Array.from(tags).map((tag) => ({
    tag: encodeURIComponent(tag.toLowerCase()),
  }));
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: encodedTag } = await params;
  const tag = decodeURIComponent(encodedTag);
  const articles = await allArticles();
  const thoughts = await allThoughts();
  let originalTag;
  let recalledTag;

  const filteredArticles: Markdown<ArticleSchema>[] = [];
  for (const article of articles) {
    const metadata = await article.metadata;
    if ((recalledTag = metadata.tags.find((s) => s.toLowerCase() === tag))) {
      originalTag = recalledTag;
      filteredArticles.push(article);
    }
  }

  const filteredThoughts: Markdown<ThoughtSchema>[] = [];
  for (const thought of thoughts) {
    const metadata = await thought.metadata;
    if ((recalledTag = metadata.tags.find((s) => s.toLowerCase() === tag))) {
      originalTag = recalledTag;
      filteredThoughts.push(thought);
    }
  }

  if (!originalTag) {
    // Didn't find the tag, so why are we trying to render the page?
    throw notFound();
  }

  return (
    <TagPageContent
      tag={tag}
      filteredArticles={filteredArticles}
      filteredThoughts={filteredThoughts}
      unmangledTag={originalTag}
    />
  );
}

function TagPageContent({
  filteredArticles,
  filteredThoughts,
  tag,
  unmangledTag,
}: {
  tag: string;
  filteredArticles: Markdown<ArticleSchema>[];
  filteredThoughts: Markdown<ThoughtSchema>[];
  unmangledTag: string;
}) {
  const articles =
    filteredArticles.length > 0 ? (
      <>
        <h2>Articles</h2>
        <ul>
          {filteredArticles.map((article) => (
            <li key={article.id}>
              <ArticleEntry metadata={article.metadata} name={article.id} />
            </li>
          ))}
        </ul>
      </>
    ) : (
      <></>
    );
  const thoughts =
    filteredThoughts.length > 0 ? (
      <>
        <h2>Thoughts</h2>
        <ul>
          {filteredThoughts.map((thought) => (
            <li key={thought.id}>
              <ThoughtEntry metadata={thought.metadata} name={thought.id} />
            </li>
          ))}
        </ul>
      </>
    ) : (
      <></>
    );
  return (
    <PageStructure
      schemaType="ItemList"
      resource={`/tags/${tag}`}
      breadcrumbs={[{ href: '/tags', text: 'Tags' }]}
      header={<TitleHeader>Tag: {unmangledTag}</TitleHeader>}
    >
      {articles}
      {thoughts}
    </PageStructure>
  );
}
