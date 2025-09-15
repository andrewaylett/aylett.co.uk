import { type Root, type Yaml } from 'mdast';
import * as dev from 'react/jsx-dev-runtime';
import * as prod from 'react/jsx-runtime';
import rehypeFormat from 'rehype-format';
import rehypeReact from 'rehype-react';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import gfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import retextSmartypants from 'retext-smartypants';
import remarkRehype from 'remark-rehype';
import remarkStringify from 'remark-stringify';
import { type Processor, unified } from 'unified';
import { is } from 'unist-util-is';
import { visit } from 'unist-util-visit';
import { visitParents, SKIP } from 'unist-util-visit-parents';
import { type VFile } from 'vfile';
import { type Element } from 'hast';

import { components } from './components';
import retextRemark from './retextRemark';
import remarkRetextEnglish from './remarkRetextEnglish';

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
  if (first !== undefined && !consumer(first)) {
    array.unshift(first);
  }
}

export const baseProcessor: Processor = unified()
  .use([
    // First we split off the frontmatter
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
    // Then we convert the markdown back to text, to process the text
    remarkRetextEnglish,
    [retextSmartypants, { dashes: false, quotes: true }],
    // Last we convert the text back to markdown
    retextRemark,
    () =>
      (tree: Root): Root => {
        visit(tree, 'text', (node) => {
          node.value = node.value.replaceAll(/\s+--\s+/g, ' — ');
        });
        return tree;
      },
    gfm,
  ])
  .freeze();

const development = process.env.NODE_ENV !== 'production';

const prodJsx = { Fragment: prod.Fragment, jsx: prod.jsx, jsxs: prod.jsxs };

const devJsx = { jsxDEV: dev.jsxDEV };

export const intoReact: Processor = baseProcessor()
  .use([
    remarkRehype,
    () =>
      (tree: Root): Root => {
        visitParents(
          tree,
          { type: 'element', tagName: 'code' },
          (node: Element, parents: Element[]) => {
            // A `language-mermaid` code block will be transformed by `rehype-react` into a
            // `Mermaid` component, so the parent `<pre>` element is redundant.
            const className = node.properties.className;
            if (className === undefined || !Array.isArray(className)) {
              return;
            }
            if (!className.includes('language-mermaid')) {
              return;
            }
            const parent = parents.at(-1);
            if (!is(parent, { type: 'element', tagName: 'pre' })) {
              return;
            }
            if (parent.children.length !== 1) {
              // We expect the parent to only have one child, the code block.
              return;
            }
            const grandParent = parents.at(-2);
            if (!is(grandParent, {})) {
              return;
            }
            const index = grandParent.children.indexOf(parent);
            if (index !== -1) {
              grandParent.children.splice(index, 1, node);
            }
            return [SKIP, -1];
          },
        );
        return tree;
      },
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
  ])
  .freeze();

export const intoText: Processor = baseProcessor()
  .use([remarkStringify])
  .freeze();
