import * as prod from 'react/jsx-runtime';
import * as dev from 'react/jsx-dev-runtime';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import rehypeSlug from 'rehype-slug';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import { is } from 'unist-util-is';
import gfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeReact from 'rehype-react';
import rehypeFormat from 'rehype-format';
import { visit } from 'unist-util-visit';

import { components } from './components';

import type { Root, Yaml } from 'mdast';
import type { VFile } from 'vfile';
import type { Processor } from 'unified';

declare module 'vfile' {
  // Extends the interface used by Unified, so we can use it for our own data
  // noinspection JSUnusedGlobalSymbols
  interface DataMap {
    frontMatter: Yaml;
  }
}

/// If the consumer returns `true`, the value is removed from the array.
function shiftIf<T>(array: T[], consumer: (val: T) => boolean): void {
  const first = array.shift();
  if (first !== undefined) {
    if (!consumer(first)) {
      array.unshift(first);
    }
  }
}

export function baseProcessor(): Processor {
  return unified().use([
    remarkParse,
    remarkFrontmatter,
    () =>
      (tree: Root, file: VFile): Root => {
        shiftIf(tree.children, (yamlnode) => {
          if (is<'yaml'>(yamlnode, 'yaml')) {
            file.data.frontMatter = yamlnode;
            return true;
          }
          return false;
        });
        return tree;
      },
    () =>
      (tree: Root): Root => {
        visit(tree, 'text', (node) => {
          node.value = node.value.replaceAll(' -- ', ' — ');
        });
        return tree;
      },
    gfm,
  ]);
}

const development = process.env.NODE_ENV !== 'production';

const prodJsx = { Fragment: prod.Fragment, jsx: prod.jsx, jsxs: prod.jsxs };

const devJsx = { jsxDEV: dev.jsxDEV };

export const intoReact: Processor = baseProcessor().use([
  remarkRehype,
  rehypeSlug,
  rehypeFormat,
  [
    rehypeReact,
    {
      components,
      development,
      ...devJsx,
      ...prodJsx,
    },
  ],
]);

export const intoText: Processor = baseProcessor().use([remarkStringify]);
