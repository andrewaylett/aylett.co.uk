import React from 'react';

import { PageStructure, TitleHeader } from '../../../page-structure';
import { type Markdown } from '../../../remark/traverse';
import { type ArticleSchema, type ThoughtSchema } from '../../../types';
import { allArticles } from '../../articles/articles';
import { ArticleEntry } from '../../articles/page';
import { ThoughtEntry } from '../../thoughts/page';
import { allThoughts } from '../../thoughts/thoughts';
import { allTags } from '../allTags';

export async function generateStaticParams() {
  const tags = await allTags();
  return Array.from(tags).map((tag) => ({ tag }));
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

  const filteredArticles: Markdown<ArticleSchema>[] = [];
  for (const article of articles) {
    const metadata = await article.metadata;
    if (metadata.tags.includes(tag)) {
      filteredArticles.push(article);
    }
  }

  const filteredThoughts: Markdown<ThoughtSchema>[] = [];
  for (const thought of thoughts) {
    const metadata = await thought.metadata;
    if (metadata.tags.includes(tag)) {
      filteredThoughts.push(thought);
    }
  }

  return (
    <TagPageContent
      tag={tag}
      filteredArticles={filteredArticles}
      filteredThoughts={filteredThoughts}
    />
  );
}

function TagPageContent({
  filteredArticles,
  filteredThoughts,
  tag,
}: {
  tag: string;
  filteredArticles: Markdown<ArticleSchema>[];
  filteredThoughts: Markdown<ThoughtSchema>[];
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
      header={<TitleHeader>Tag: {tag}</TitleHeader>}
    >
      {articles}
      {thoughts}
    </PageStructure>
  );
}
