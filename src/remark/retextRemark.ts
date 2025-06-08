// noinspection JSUnusedGlobalSymbols

import { type Root as MdastRoot } from 'mdast';
import {
  type Extension as FromMarkdownExtension,
  fromMarkdown,
  type Options as FromMarkdownOptions,
} from 'mdast-util-from-markdown';
import { type Extension as MicromarkExtension } from 'micromark-util-types';
import { type Root as NclstRoot } from 'nlcst';
import { toString } from 'nlcst-to-string';
import { type Plugin, type Processor } from 'unified';

export type Options = Omit<
  FromMarkdownOptions,
  'extensions' | 'mdastExtensions'
>;

// See `remark-parse`.
declare module 'unified' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Settings extends Options {}

  interface Data {
    /**
     * List of `micromark` extensions to use.
     *
     * This type is registered by `remark-parse`.
     * Values can be registered by remark plugins that extend `micromark` and
     * `mdast-util-from-markdown`.
     * See {@link MicromarkExtension | `Extension`} from
     * {@link https://github.com/micromark/micromark/tree/main/packages/micromark-util-types | `micromark-util-types`}.
     */
    micromarkExtensions?: MicromarkExtension[];

    /**
     * List of `mdast-util-from-markdown` extensions to use.
     *
     * This type is registered by `remark-parse`.
     * Values can be registered by remark plugins that extend `micromark` and
     * `mdast-util-from-markdown`.
     * See {@link FromMarkdownExtension | `Extension`} from
     * {@link https://github.com/syntax-tree/mdast-util-from-markdown#extension | `mdast-util-from-markdown`}.
     */
    fromMarkdownExtensions?: (
      | FromMarkdownExtension[]
      | FromMarkdownExtension
    )[];
  }
}

const retextRemark: Plugin<
  [(Readonly<Options> | null | undefined)?],
  NclstRoot,
  MdastRoot
> = function retextRemark(
  this: Processor,
  options: Readonly<Options> | null | undefined,
): (doc: NclstRoot) => MdastRoot {
  return (doc: NclstRoot): MdastRoot => {
    return fromMarkdown(toString(doc), {
      ...this.data('settings'),
      ...options,
      // Note: these options are not in the readme.
      // The goal is for them to be set by plugins on `data` instead of being
      // passed by users.
      extensions: this.data('micromarkExtensions') ?? [],
      mdastExtensions: this.data('fromMarkdownExtensions') ?? [],
    });
  };
};

export default retextRemark;
