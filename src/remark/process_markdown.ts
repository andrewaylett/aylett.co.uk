import { createElement, Fragment } from 'react';

import { VFile } from 'vfile';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import { Root, YAML } from 'mdast';
import { is } from 'unist-util-is';
import gfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeReact, { Options as ComponentOptions } from 'rehype-react';

import { components } from './components';

declare module 'vfile' {
  interface DataMap {
    // `file.data.name` is typed as `string`
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

export function baseProcessor() {
  return unified()
    .use(remarkParse)
    .use([remarkFrontmatter])
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

export const intoReact = baseProcessor()
  .use(remarkRehype)
  .use(rehypeReact, {
    createElement,
    Fragment,
    passNode: true,
    components,
  } as ComponentOptions).process;

export const intoText = baseProcessor().use(remarkStringify).process;
