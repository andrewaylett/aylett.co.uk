import React from 'react';

import { ListingEntry } from '@/components/ListingEntry';
import { PageStructure } from '@/components/PageStructure';
import { TitleHeader } from '@/components/TitleHeader';
import { type Metadata } from '@/remark/traverse';
import { type Article, type Thought } from '@/types';

export function TagPageContent({
  filteredArticles,
  filteredThoughts,
  tag,
  unmangledTag,
}: {
  tag: string;
  filteredArticles: Metadata<Article>[];
  filteredThoughts: Metadata<Thought>[];
  unmangledTag: string;
}) {
  const articles =
    filteredArticles.length > 0 ? (
      <>
        <h2>Articles</h2>
        <ul>
          {filteredArticles.map((article) => (
            <li key={article.id}>
              <ListingEntry metadata={article.data} name={article.id} />
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
              <ListingEntry metadata={thought.data} name={thought.id} />
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
