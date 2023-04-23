import { createElement, Fragment, ReactElement } from 'react';

import { Compatible, VFile } from 'vfile';
import { Processor, unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import { Root, YAML } from 'mdast';
import { is } from 'unist-util-is';
import gfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeReact, { Options as ComponentOptions } from 'rehype-react';
import rehypeFormat from 'rehype-format';

import { components } from './components';

declare module 'vfile' {
  // Extends the interface used by Unified, so we can use it for our own data
  // noinspection JSUnusedGlobalSymbols
  interface DataMap {
    frontMatter: YAML;
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
        if (is<YAML>(yamlnode, 'yaml')) {
          file.data.frontMatter = yamlnode;
          return true;
        }
        return false;
      });
      return tree;
    })
    .use(gfm);
}

export const intoReact: (
  file: Compatible
) => Promise<VFile & { result: ReactElement<unknown> }> = baseProcessor()
  .use(remarkRehype)
  .use(rehypeFormat)
  .use(rehypeReact, {
    createElement,
    Fragment,
    passNode: true,
    components,
  } as ComponentOptions).process;

export const intoText: (file: Compatible) => Promise<VFile> =
  baseProcessor().use(remarkStringify).process;
