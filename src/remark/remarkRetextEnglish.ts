import { type Root as MdastRoot } from 'mdast';
import {
  type Options as ToMarkdownExtension,
  toMarkdown,
} from 'mdast-util-to-markdown';
import {
  type Nodes,
  type Paragraph,
  type Root,
  type Root as NlcstRoot,
  type Sentence,
} from 'nlcst';
import { ParseEnglish } from 'parse-english';
import { type Plugin, type Processor } from 'unified';

export type Options = Omit<ToMarkdownExtension, 'extensions'>;

// See `parse-latin`.
type Extension<Node extends Nodes> = (node: Node) => undefined | void;

// See `retext-english` and `remark-stringify`.
declare module 'unified' {
  // noinspection JSUnusedGlobalSymbols
  interface Data {
    /**
     * List of extensions to transform paragraph nodes.
     */
    nlcstParagraphExtensions?: Extension<Paragraph>[];
    /**
     * List of extensions to transform root nodes.
     */
    nlcstRootExtensions?: Extension<Root>[];
    /**
     * List of extensions to transform sentence nodes.
     */
    nlcstSentenceExtensions?: Extension<Sentence>[];
    /**
     * List of `mdast-util-to-markdown` extensions to use.
     *
     * This type is registered by `remark-stringify`.
     * Values can be registered by remark plugins that extend
     * `mdast-util-to-markdown`.
     * See {@link ToMarkdownExtension | `Options`} from
     * {@link https://github.com/syntax-tree/mdast-util-to-markdown#options | `mdast-util-to-markdown`}.
     */
    toMarkdownExtensions?: ToMarkdownExtension[];
  }
}

/**
 * The equivalent of `remark-stringify` then `retext-english`, implemented as a transform.
 *
 * Unified processors can only handle a single parser and a single compiler, so when we want to conceptually feed the
 * output of a compiler into a parser, we need a transformer that does both together.
 */
const remarkRetextEnglish: Plugin<
  [(Readonly<Options> | null | undefined)?],
  MdastRoot,
  NlcstRoot
> = function remarkRetextEnglish(
  this: Processor,
  options: Readonly<Options> | null | undefined,
): (value: MdastRoot) => NlcstRoot {
   
  const processor = this;

  function transformer(value: MdastRoot): NlcstRoot {
    const parser = new ParseEnglish();
    add(
      parser.tokenizeParagraphPlugins,
      processor.data('nlcstParagraphExtensions'),
    );
    add(parser.tokenizeRootPlugins, processor.data('nlcstRootExtensions'));
    add(
      parser.tokenizeSentencePlugins,
      processor.data('nlcstSentenceExtensions'),
    );
    return parser.parse(
      toMarkdown(value, {
        ...processor.data('settings'),
        ...options,
        // Note: this option is not in the readme.
        // The goal is for it to be set by plugins on `data` instead of being
        // passed by users.
        extensions: processor.data('toMarkdownExtensions') ?? [],
      }),
    );
  }

  return transformer;
};

function add<T>(list: T[], values: T[] | undefined) {
  if (values) list.unshift(...values);
}

export default remarkRetextEnglish;
