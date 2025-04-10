import { Root as MdastRoot } from 'mdast';
import { Root as NlcstRoot } from 'nlcst';
import { ParseEnglish } from 'parse-english';
import { toMarkdown } from 'mdast-util-to-markdown';

import type { Nodes, Paragraph, Root, Sentence } from 'nlcst';
import type { Processor } from 'unified';

// See `parse-latin`.
type Extension<Node extends Nodes> = (node: Node) => undefined | void;

// Add custom data supported when `retext-english` is added.
declare module 'unified' {
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
  }
}

export default function remarkRetextEnglish(
  this: Processor,
): (value: MdastRoot) => NlcstRoot {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
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
        // Note: this option is not in the readme.
        // The goal is for it to be set by plugins on `data` instead of being
        // passed by users.
        extensions: processor.data('toMarkdownExtensions') ?? [],
      }),
    );
  }

  return transformer;
}

function add<T>(list: T[], values: T[] | undefined) {
  if (values) list.unshift(...values);
}
