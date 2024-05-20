import { OpenAI } from 'openai';
import { parse, stringify } from 'yaml';
import { write } from 'to-vfile';
import remarkStringify from 'remark-stringify';
import { JSONSchema7 } from 'json-schema';

import { baseProcessor, intoText } from '../../../remark/process_markdown';
import { traverse } from '../../../remark/traverse';
import { assertSchema, TypeFrom } from '../../../types';

import type { Root } from 'mdast';
import type { VFile } from 'vfile';
import type { ClientOptions } from 'openai';

export const EntrySchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    url: { type: 'string' },
    description: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
  },
} as const satisfies JSONSchema7;
export type EntrySchema = typeof EntrySchema;

export type Entry = {
  -readonly [k in keyof TypeFrom<EntrySchema>]: TypeFrom<EntrySchema>[k];
};

export async function* run(): AsyncGenerator<Entry, void, never> {
  const configuration = {
    apiKey: process.env.OPENAI_API_KEY,
  } satisfies ClientOptions;

  if (!configuration.apiKey) {
    return;
  }

  const openai = new OpenAI(configuration);

  yield* processDirectory('thoughts', openai);
  yield* processDirectory('articles', openai);
}

class VisiblePromise<T> implements Promise<T>, PromiseLike<T> {
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
    // Resolve on then, not finally, because Promise.any() will reject
    // if every promise passed in has rejected
    void this.#promise.then(this.#resolve.bind(this));

    this.then = this.#promise.then.bind(this.#promise);
    this.catch = this.#promise.catch.bind(this.#promise);
    this.finally = this.#promise.finally.bind(this.#promise);
  }
}

type Accum<T> = [null | VisiblePromise<T>, VisiblePromise<T>[]];

function makeVisible<T>(orig: PromiseLike<T>): VisiblePromise<T> {
  if (orig instanceof VisiblePromise) {
    return orig as VisiblePromise<T>;
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

  // Will reject iff all of `rest` are rejected
  await Promise.any(rest);

  // Recursion: as least one of `rest` has now resolved, so we will exit early
  return nextResolvedImpl<T>(rest, true);
}

async function* yieldWhenResolved<T>(
  input: PromiseLike<T>[],
): AsyncGenerator<T, void, never> {
  let next: T;
  let rest = input;
  while (rest.length > 0) {
    [next, rest] = await nextResolved(rest);
    yield next;
  }
}

async function* processDirectory(
  dir: string,
  openai: OpenAI,
): AsyncGenerator<Entry, void, never> {
  const mdFiles = await traverse(dir);
  const mdPromises = mdFiles.map(async (mdFile): Promise<Entry> => {
    const vfile = await intoText.process(await mdFile.vfile);
    const { frontMatter } = vfile.data;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const metadata: Partial<Entry> = parse(frontMatter?.value ?? '');
    metadata.url = `/${dir}/${mdFile.id}`;

    if (
      process.env.NODE_ENV === 'development' &&
      (!metadata.title || !metadata.description || !metadata.tags)
    ) {
      const markdown = vfile.value.toString();

      console.log(markdown);

      const completion = await openai.chat.completions.create({
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

      const choice = completion.choices.pop();
      if (!choice || completion.choices.length !== 0) {
        const length = completion.choices.length + (choice ? 1 : 0);
        throw new Error(
          `Unexpected response, expected 1 choice, got ${length}`,
        );
      }
      const yamlblock = choice.message.content ?? '';
      const lines = yamlblock.split('\n');
      // GPT has a habit of returning YAML in a Markdown block
      const yamlLines = lines.filter((line) => !line.startsWith('```'));
      let yaml: Partial<Entry>;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        yaml = parse(yamlLines.join('\n'));
      } catch (e) {
        throw new Error(`Could not parse YAML from:\n${yamlLines.join('\n')}`, {
          cause: e,
        });
      }
      const replacementMetadata: Partial<Entry> = {
        ...metadata,
        ...yaml,
        ...metadata,
      };
      assertSchema(replacementMetadata, EntrySchema);
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
      assertSchema(metadata, EntrySchema);
      return metadata;
    }
  });
  yield* yieldWhenResolved(mdPromises);
}
