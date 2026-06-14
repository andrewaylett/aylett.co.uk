import type { JSX } from 'react';

import Link from 'next/link';

import { allTags } from './allTags';

import { PageStructure } from '@/components/PageStructure';
import { TitleHeader } from '@/components/TitleHeader';

export default async function TagsPage(): Promise<JSX.Element> {
  const tags = await allTags();

  const sortedTags = [...tags].sort();

  return (
    <PageStructure
      schemaType="ItemList"
      resource="/tags"
      breadcrumbs={[]}
      header={<TitleHeader>Tags</TitleHeader>}
    >
      <div className="flex flex-row flex-wrap gap-x-[1ch]">
        {sortedTags.map((tag) => {
          const encoded = encodeURIComponent(tag[0].toLowerCase());
          return (
            <span key={tag[0]}>
              <Link href={`/tags/${encoded}`}>{tag[0]}</Link>
            </span>
          );
        })}
      </div>
    </PageStructure>
  );
}
