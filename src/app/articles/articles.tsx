import * as path from 'node:path';
import * as fs from 'node:fs';
import { promisify } from 'node:util';

import {
  createElement,
  DetailedHTMLProps,
  Fragment,
  HTMLAttributes,
  ReactElement,
} from 'react';
import * as React from 'react';

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import rehypeReact, { Options as ComponentOptions } from 'rehype-react';
import { parse } from 'yaml';
import { notFound } from 'next/navigation';

import { PageMetadata } from '../types';
import sortBy from '../sort_by';

import type { YAML } from 'mdast';
import type { Page } from '../types';

import 'server-only';

const readdir = promisify(fs.readdir);

const readFile = promisify(fs.readFile);

const exists = promisify(fs.exists);

const components: ComponentOptions['components'] = {
  h1: ({
    children,
  }: DetailedHTMLProps<
    HTMLAttributes<HTMLHeadingElement>,
    HTMLHeadingElement
  >) => (
    <h1 id={children?.toString().replaceAll(/[ ']/g, '_').toLowerCase()}>
      {children}
    </h1>
  ),
};

async function findArticlesPath() {
  let wd = process.cwd();
  do {
    if (
      (await exists(path.join(wd, 'package.json'))) &&
      (await exists(path.join(wd, 'src/app/articles/page.tsx')))
    ) {
      return path.join(wd, 'src', 'app', 'articles');
    }
    wd = path.resolve(wd, '..');
  } while (wd !== '/');

  throw new Error('No package.json found');
}

let articles: undefined | Promise<Page[]>;

export async function aritcleForId(id: string): Promise<Page> {
  const pages = await allArticles();
  return pages.find((page) => page.id === id) ?? notFound();
}

export const allArticles = () => {
  if (!articles) {
    articles = findArticles();
  }
  return articles;
};

const findArticles = async () => {
  const ARTICLES_PATH = await findArticlesPath();
  const items = await readdir(ARTICLES_PATH);
  const promises: Array<Promise<Page[]>> = items.map(
    async (item: string): Promise<Page[]> => {
      const filePath = path.join(ARTICLES_PATH, item);
      const { ext, name } = path.parse(filePath);
      // Only process markdown/mdx files that are not index.tsx pages
      if (
        name.indexOf('.') === -1 &&
        ext.startsWith('.md') &&
        name !== 'index'
      ) {
        const file = await readFile(filePath);

        const metadata: PageMetadata & Partial<Record<string, string>> = {
          title: name,
          author: 'Andrew Aylett',
          revision: '',
          revised: '',
        };
        let node: YAML | undefined;

        const reactContent = (
          await unified()
            .use(remarkParse)
            .use([remarkFrontmatter])
            .use(() => (tree) => {
              const yamlnode = tree.children.shift();
              if (yamlnode && yamlnode.type !== 'yaml') {
                tree.children.unshift(yamlnode);
                return tree;
              } else if (!yamlnode) {
                return tree;
              }
              node = yamlnode;
              return tree;
            })
            .use(remarkRehype)
            .use(rehypeReact, {
              createElement,
              Fragment,
              components,
            } as ComponentOptions)
            .process(file)
        ).result as ReactElement;

        if (node) {
          const parsed = parse(node.value);
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'string') {
              metadata[k] = v;
            }
          }
        }

        return [
          {
            id: name,
            content: reactContent,
            metadata: metadata,
          },
        ];
      }
      return [];
    }
  );

  const entries: Page[] = (await Promise.all(promises)).flat(1);

  return sortBy(entries, (entry) => entry.metadata.title);
};
