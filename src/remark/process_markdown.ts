import * as prod from 'react/jsx-runtime';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import { is } from 'unist-util-is';
import gfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeReact from 'rehype-react';
import rehypeFormat from 'rehype-format';

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

export function baseProcessor(): Processor<Root, Root, Root> {
  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(() => (tree: Root, file: VFile): Root => {
      shiftIf(tree.children, (yamlnode) => {
        if (is<'yaml'>(yamlnode, 'yaml')) {
          file.data.frontMatter = yamlnode;
          return true;
        }
        return false;
      });
      return tree;
    })
    .use(gfm);
}

// @ts-expect-error: the React types are missing.
const production = { Fragment: prod.Fragment, jsx: prod.jsx, jsxs: prod.jsxs };

export const intoReact = baseProcessor()
  .use(remarkRehype)
  .use(rehypeFormat)
  .use(rehypeReact, {
    components,
    development: false,
    ...production,
  });

export const intoText = baseProcessor().use(remarkStringify);
