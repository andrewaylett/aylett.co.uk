import { fromMarkdown } from 'mdast-util-from-markdown';
import { Processor } from 'unified';
import { Root as MdastRoot } from 'mdast';
import { Root as NclstRoot } from 'nlcst';
import { toString } from 'nlcst-to-string';

export default function retextRemark(
  this: Processor,
): (doc: NclstRoot) => MdastRoot {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const self = this;

  function transformer(doc: NclstRoot): MdastRoot {
    return fromMarkdown(toString(doc), {
      ...self.data('settings'),
      // Note: these options are not in the readme.
      // The goal is for them to be set by plugins on `data` instead of being
      // passed by users.
      extensions: self.data('micromarkExtensions') ?? [],
      mdastExtensions: self.data('fromMarkdownExtensions') ?? [],
    });
  }

  return transformer;
}
