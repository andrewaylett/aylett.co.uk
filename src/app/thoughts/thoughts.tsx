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
import gfm from 'remark-gfm';

import { Thought, ThoughtMetadata } from '../types';
import sortBy from '../sort_by';

import type { YAML } from 'mdast';

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

async function findThoughtsPath() {
  let wd = process.cwd();
  do {
    if (
      (await exists(path.join(wd, 'package.json'))) &&
      (await exists(path.join(wd, 'src/app/thoughts/page.tsx')))
    ) {
      return path.join(wd, 'src', 'app', 'thoughts');
    }
    wd = path.resolve(wd, '..');
  } while (wd !== '/');

  throw new Error('No package.json found');
}

let thoughts: undefined | Promise<Thought[]>;

export async function thoughtForId(id: string): Promise<Thought> {
  const pages = await allThoughts();
  return pages.find((page) => page.id === id) ?? notFound();
}

export const allThoughts = () => {
  if (!thoughts) {
    thoughts = findThoughts();
  }
  return thoughts;
};

const findThoughts = async () => {
  const THOUGHTS_PATH = await findThoughtsPath();
  const items = await readdir(THOUGHTS_PATH);
  const promises: Array<Promise<Thought[]>> = items.map(
    async (item: string): Promise<Thought[]> => {
      const filePath = path.join(THOUGHTS_PATH, item);
      const { ext, name } = path.parse(filePath);
      // Only process markdown/mdx files that are not index.tsx pages
      if (
        name.indexOf('.') === -1 &&
        ext.startsWith('.md') &&
        name !== 'index'
      ) {
        const file = await readFile(filePath);

        const metadata: ThoughtMetadata & Partial<Record<string, string>> = {
          title: name,
          author: 'Andrew Aylett',
          date: '',
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
            .use(gfm)
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

  const entries: Thought[] = (await Promise.all(promises)).flat(1);

  return sortBy(entries, (entry) => entry.metadata.date);
};
