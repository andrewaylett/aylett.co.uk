import React from 'react';

import Link from 'next/link';

import { PageStructure, TitleHeader } from '../../page-structure';

import { allTags } from './allTags';

export default async function TagsPage() {
  const tags = await allTags();

  const sortedTags = Array.from(tags).sort();

  return (
    <PageStructure
      schemaType="ItemList"
      resource="/tags"
      breadcrumbs={[]}
      header={<TitleHeader>Tags</TitleHeader>}
    >
      <div className="flex flex-row flex-wrap gap-x-[1ch]">
        {sortedTags.map((tag) => (
          <span key={tag}>
            <Link href={`/tags/${tag}`}>{tag}</Link>
          </span>
        ))}
      </div>
    </PageStructure>
  );
}
