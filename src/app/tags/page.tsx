import type { JSX } from 'react';

import Link from 'next/link';

import { allTags } from './allTags';

import { StaticPageStructure } from '@/components/PageStructure';
import { TitleHeader } from '@/components/TitleHeader';

export default async function TagsPage(): Promise<JSX.Element> {
  const tags = await allTags();

  const sortedTags = [...tags].sort();

  return (
    <StaticPageStructure
      schemaType="ItemList"
      resource="/tags"
      breadcrumbs={[]}
      header={<TitleHeader>Tags</TitleHeader>}
    >
      <div className="flex flex-row flex-wrap gap-x-[1ch]">
        {sortedTags.map((tag) => {
          const encoded = encodeURIComponent(tag.toLowerCase());
          return (
            <span key={tag}>
              <Link href={`/tags/${encoded}`}>{tag}</Link>
            </span>
          );
        })}
      </div>
    </StaticPageStructure>
  );
}
