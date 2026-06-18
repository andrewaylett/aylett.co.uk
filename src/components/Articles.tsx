import { Suspense } from 'react';

import { buildMetadata } from '@/remark/traverse';
import { ArticleSchema } from '@/types';
import { ListingEntry } from '@/components/ListingEntry';
import { allArticles } from '@/app/articles/articles';
import { sortByKey } from '@/utilities';

export async function Articles(): Promise<JSX.Element> {
  'use cache';

  const files = await allArticles();
  const pages = await Promise.all(
    files.map((f) => buildMetadata(f, ArticleSchema)),
  );
  const sorted = sortByKey(pages, (page) => page.data.title);
  return (
    <>
      {sorted.map(({ id: name, data }) => (
        <Suspense key={name}>
          <ListingEntry name={name} data={data} />
        </Suspense>
      ))}
    </>
  );
}
