import path from 'path';

import fs from 'fs-extra';
import { PathReporter } from 'io-ts/PathReporter';

import { Page, PageMetadata } from '../types';
import sortBy from '../sort_by';

export const findPages = async (
  pageDirectoryName: string
): Promise<{
  props: {
    pages: Page[];
  };
}> => {
  const pagesRelativePath = path.join(process.cwd(), 'src', 'pages', pageDirectoryName);
  const items = await fs.readdir(pagesRelativePath);
  const promises: Array<Promise<Page[]>> = items.map(async (item) => {
    const filePath = path.join(pagesRelativePath, item);
    const { ext, name } = path.parse(filePath);
    // Only process markdown/mdx files that are not index.tsx pages
    if (ext.startsWith('.md') && name !== 'index') {
      const module = await import(`../pages/${pageDirectoryName}/${item}`);
      const maybeMetadata = PageMetadata.decode(module.metadata);
      if (maybeMetadata._tag === 'Right') {
        return [{ name, metadata: maybeMetadata.right }];
      }
      throw PathReporter.report(maybeMetadata);
    }
    return [];
  });

  const entries: Page[] = (await Promise.all(promises)).flat(1);

  const sorted: Page[] = sortBy(entries, (entry) => entry.metadata.title);

  return {
    props: {
      pages: sorted,
    },
  };
};
