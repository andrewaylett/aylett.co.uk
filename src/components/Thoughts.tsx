import { use, type JSX } from 'react';

import Link from 'next/link';

import { ListingEntry } from './ListingEntry';
import { PageStructure } from './PageStructure';
import { TitleHeader } from './TitleHeader';

import { type MDFile, Metadata } from '@/remark/traverse';
import { ThoughtSchema } from '@/types';
import { asyncSortByKey } from '@/utilities';

export function Thoughts({ files }: { files: MDFile[] }): JSX.Element {
  const pages = files.map((f) => new Metadata(f, ThoughtSchema));
  const sorted = use(
    asyncSortByKey(pages, async (page) => (await page.data).date),
  );
  return (
    <PageStructure
      schemaType="ItemList"
      resource="/thoughts"
      breadcrumbs={[]}
      header={<TitleHeader>Thoughts</TitleHeader>}
    >
      <p>
        <Link property="subjectOf" href="/articles/thoughts">
          What is this?
        </Link>
      </p>
      {sorted.reverse().map(({ id: name, data }) => (
        <ListingEntry key={name} id={name} content={use(data)} />
      ))}
    </PageStructure>
  );
}
