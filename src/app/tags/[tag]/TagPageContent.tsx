import type { JSX } from 'react';

import type { TagDetails } from '@/app/tags/allTags';
import type { Article, Identified, Thought } from '@/types';

import { ListingEntry } from '@/components/ListingEntry';
import { PageStructure } from '@/components/PageStructure';
import { TitleHeader } from '@/components/TitleHeader';

export function TagPageContent({ tag }: { tag: TagDetails }): JSX.Element {
  const filteredArticles: Identified<Article>[] = tag.data.filter(
    (m) => m.tag === 'article',
  );
  const filteredThoughts: Identified<Thought>[] = tag.data.filter(
    (m) => m.tag === 'thought',
  );

  const articles =
    filteredArticles.length > 0 ? (
      <>
        <h2>Articles</h2>
        <ul>
          {filteredArticles.map((article) => (
            <li key={article.id}>
              <ListingEntry content={article} id={article.id} />
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
              <ListingEntry content={thought} id={thought.id} />
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
      resource={`/tags/${encodeURIComponent(tag.tagUriSegment)}`}
      breadcrumbs={[{ href: '/tags', text: 'Tags' }]}
      header={<TitleHeader>Tag: {tag.tagName}</TitleHeader>}
    >
      {articles}
      {thoughts}
    </PageStructure>
  );
}
