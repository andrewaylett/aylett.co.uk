import { Suspense, type JSX } from 'react';

import Link from 'next/link';

import { ListingEntry } from './ListingEntry';
import { PageStructure } from './PageStructure';
import { TitleHeader } from './TitleHeader';

import { buildMetadata, type MDFile } from '@/remark/traverse';
import { ThoughtSchema } from '@/types';
import { sortByKey } from '@/utilities';

export async function Thoughts({
  files,
}: {
  files: MDFile[];
}): Promise<JSX.Element> {
  const pages = await Promise.all(
    files.map((f) => buildMetadata(f, ThoughtSchema)),
  );
  const sorted = sortByKey(pages, (page) => page.data.date);
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
        <Suspense key={name}>
          <ListingEntry name={name} data={data} />
        </Suspense>
      ))}
    </PageStructure>
  );
}
