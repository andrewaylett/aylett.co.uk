import { Configuration, OpenAIApi } from 'openai';
import { parse, stringify } from 'yaml';
import { CreateChatCompletionResponse } from 'openai/api';
import { VFile } from 'vfile';
import { Root } from 'mdast';
import { write } from 'to-vfile';
import remarkStringify from 'remark-stringify';

import { baseProcessor, intoText } from '../../../remark/process_markdown';
import { traverse } from '../../../remark/traverse';

export type Entry = {
  title: string;
  description: string;
  tags: string[];
  url: string;
};

export async function* run(): AsyncGenerator<Entry, void, never> {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  yield* processDirectory('thoughts', openai);
  yield* processDirectory('articles', openai);
}

class VisiblePromise<T> implements Promise<T> {
  readonly #promise: Promise<T>;
  #resolved = false;
  readonly [Symbol.toStringTag] = 'VisiblePromise';

  get resolved() {
    return this.#resolved;
  }

  #resolve() {
    this.#resolved = true;
  }

  readonly then: (typeof Promise<T>)['prototype']['then'];
  readonly catch: (typeof Promise<T>)['prototype']['catch'];
  readonly finally: (typeof Promise<T>)['prototype']['finally'];

  constructor(promise: PromiseLike<T>) {
    this.#promise = Promise.resolve(promise);
    this.#promise.then(this.#resolve.bind(this));

    this.then = this.#promise.then.bind(this.#promise);
    this.catch = this.#promise.catch.bind(this.#promise);
    this.finally = this.#promise.finally.bind(this.#promise);
  }
}

type Accum<T> = [null | VisiblePromise<T>, VisiblePromise<T>[]];

function makeVisible<T>(orig: PromiseLike<T>): VisiblePromise<T> {
  if (orig instanceof VisiblePromise) {
    return orig;
  } else {
    return new VisiblePromise<T>(orig);
  }
}

async function nextResolved<T>(
  input: PromiseLike<T>[],
): Promise<[T, Promise<T>[]]> {
  return nextResolvedImpl(input, false);
}

async function nextResolvedImpl<T>(
  input: PromiseLike<T>[],
  recursing: boolean,
): Promise<[T, Promise<T>[]]> {
  // Safety check
  if (input.length == 0) {
    // Match the behaviour of Promise.any()
    throw new AggregateError([], 'No promises were passed in');
  }

  const visible = input.map(makeVisible);

  const [val, rest] = visible.reduce(
    ([val, rest]: Accum<T>, next): Accum<T> => {
      if (val) {
        return [val, [...rest, next]];
      }

      if (next.resolved) {
        return [next, rest];
      }

      return [null, [...rest, next]];
    },
    [null, []],
  );

  if (val) {
    return [await val, rest];
  }

  // Safety check
  if (recursing) {
    throw new Error('Failed to find a resolved promise after Promise.any()');
  }

  await Promise.any(rest);

  // Recursion: as least one of `rest` has now resolved, so we will exit early
  return nextResolvedImpl(rest, true);
}

async function* yieldWhenResolved<T>(
  input: PromiseLike<T>[],
): AsyncGenerator<T, void, never> {
  let [next, rest] = await nextResolved(input);
  yield next;
  while (rest.length > 0) {
    [next, rest] = await nextResolved(rest);
    yield next;
  }
}

async function* processDirectory(
  dir: string,
  openai: OpenAIApi,
): AsyncGenerator<Entry, void, never> {
  const mdFiles = await traverse(dir);
  const mdPromises = mdFiles.map(async (mdFile): Promise<Entry> => {
    const vfile = await intoText.process(await mdFile.vfile);
    const { frontMatter } = vfile.data;

    const metadata = parse(frontMatter?.value ?? '');
    metadata.url = `/${dir}/${mdFile.id}`;

    if (
      process.env.NODE_ENV === 'development' &&
      (!metadata.title || !metadata.description || !metadata.tags)
    ) {
      const markdown = vfile.value.toString();

      console.log(markdown);

      const completion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are an editor for a software engineer called Andrew.  You help him to prepare to publish on his website.',
          },
          {
            role: 'assistant',
            content:
              'Give me some text, and I will return suitable metadata for it.',
          },
          {
            role: 'user',
            content: markdown,
          },
          {
            role: 'assistant',
            content:
              'Here\'s the metadata, as a plain YAML object, with key "title" containing a suitable title, key "description" containing a description suitable for SEO, key "tags" containing a list of up to four appropriate tags:',
          },
        ],
      });

      const response: CreateChatCompletionResponse = completion.data;
      const choice = response.choices.pop();
      if (!choice || response.choices.length !== 0) {
        const length = response.choices.length + (choice ? 1 : 0);
        throw new Error(
          `Unexpected response, expected 1 choice, got ${length}`,
        );
      }
      if (!choice.message) {
        throw new Error('No message in response');
      }
      const yamlblock = choice.message.content;
      const lines = yamlblock.split('\n');
      // GPT has a habit of returning YAML in a Markdown block
      const yamlLines = lines.filter((line) => !line.startsWith('```'));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let yaml: any;
      try {
        yaml = parse(yamlLines.join('\n'));
      } catch (e) {
        throw new Error(`Could not parse YAML from ${yamlLines}`, { cause: e });
      }
      const replacementMetadata: Entry = { ...metadata, ...yaml, ...metadata };
      const replacementYaml = stringify(replacementMetadata);
      vfile.data.frontMatter = {
        type: 'yaml',
        value: replacementYaml,
      };

      await baseProcessor()
        .use(() => (tree: Root, file: VFile) => {
          const frontMatter = file.data.frontMatter;
          if (frontMatter) {
            tree.children.unshift(frontMatter);
          }
        })
        .use(remarkStringify)
        .process(vfile);

      await write(vfile);
      return replacementMetadata;
    } else {
      return metadata;
    }
  });
  yield* yieldWhenResolved(mdPromises);
}
