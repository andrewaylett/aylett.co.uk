/**
 * Unified markdown processing pipeline.
 *
 * The pipeline has three stages:
 * 1. Parse markdown and extract YAML frontmatter via `shiftIf`
 * 2. Convert to natural language (retext) for smart-quote and dash processing,
 *    then convert back to mdast
 * 3. Convert to either React elements ({@link intoReact}) or plain text ({@link intoText})
 */
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

/** Shared base processor: parses markdown, extracts frontmatter, applies smartypants and dash conversion. */
export const baseProcessor: Processor = unified()
  .use([
    // First we split off the frontmatter
    remarkParse,
    remarkFrontmatter,
    () =>
      (tree: Root, file: VFile): Root => {
        const index = tree.children.findIndex((node) =>
          is<'yaml'>(node, 'yaml'),
        );
        if (index === -1) {
          return tree;
        }
        if (index !== 0) {
          file.message(
            `YAML frontmatter found at position ${index}, expected position 0`,
          );
        }
        const [yamlNode] = tree.children.splice(index, 1);
        file.data.frontMatter = yamlNode as Yaml;
        return tree;
      },
  ])
  .freeze();

export const metadataProcessor: Processor = baseProcessor()
  .use([
    function nullCompiler(this: Processor) {
      this.compiler = () => 'no output';
    },
  ])
  .freeze();

export const baseContentProcessor: Processor = baseProcessor()
  .use([
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

/** Extends base processor to produce React elements via rehype, with component overrides for Mermaid diagrams. */
export const intoReact: Processor = baseContentProcessor()
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

/** Extends base processor to serialize back to plain markdown text. */
export const intoText: Processor = baseContentProcessor()
  .use([remarkStringify])
  .freeze();
