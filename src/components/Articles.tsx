import { use } from 'react';

import { type MDFile, Metadata } from '@/remark/traverse';
import { ArticleSchema } from '@/types';
import { asyncSortByKey } from '@/utilities';
import { ListingEntry } from '@/components/ListingEntry';

export function Articles({ files }: { files: MDFile[] }): JSX.Element {
  const pages = files.map((f) => new Metadata(f, ArticleSchema));
  const sorted = use(
    asyncSortByKey(pages, async (page) => {
      const { title } = await page.data;
      return title;
    }),
  );
  return (
    <>
      {sorted.map(({ id: name, data }) => (
        <ListingEntry key={name} id={name} content={use(data)} />
      ))}
    </>
  );
}
