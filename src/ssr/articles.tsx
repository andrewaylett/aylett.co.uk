import path from 'path';

import type { GetStaticProps } from 'next';
import fs from 'fs-extra';
import { PathReporter } from 'io-ts/PathReporter';

import sortBy from '../sort_by';
import type { ArticlesProps, Page } from '../types';
import { PageMetadata } from '../types';

export const getStaticProps: GetStaticProps<ArticlesProps> = async () => {
  const ARTICLES_PATH = path.join(process.cwd(), 'src', 'pages', 'articles');
  const items = await fs.readdir(ARTICLES_PATH);
  const promises: Array<Promise<Page[]>> = items.map(async (item) => {
    const filePath = path.join(ARTICLES_PATH, item);
    const { ext, name } = path.parse(filePath);
    // Only process markdown/mdx files that are not index.tsx pages
    if (ext.startsWith('.md') && name !== 'index') {
      const article = await import(`../pages/articles/${item}`);
      const maybeMetadata = PageMetadata.decode(article.metadata);
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
