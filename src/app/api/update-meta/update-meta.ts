import { Configuration, OpenAIApi } from 'openai';
import { parse, stringify } from 'yaml';
import { CreateChatCompletionResponse } from 'openai/api';
import { VFile } from 'vfile';
import { Root } from 'mdast';
import { write } from 'to-vfile';
import remarkStringify from 'remark-stringify';

import { baseProcessor, intoText } from '../../../remark/process_markdown';
import { traverse } from '../../../remark/traverse';

export async function run() {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  return [
    ...(await processDirectory('thoughts', openai)),
    ...(await processDirectory('articles', openai)),
  ];
}

async function processDirectory(dir: string, openai: OpenAIApi) {
  const mdFiles = traverse(dir);
  const entries: { title: string; description: string; tags: string[] }[] = [];
  for await (const mdFile of mdFiles) {
    const vfile = await intoText(mdFile.vfile);
    const { frontMatter } = vfile.data;

    const metadata = parse(frontMatter?.value ?? '');

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
          `Unexpected response, expected 1 choice, got ${length}`
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
      const replacementMetadata = { ...metadata, ...yaml, ...metadata };
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
      entries.push(replacementMetadata);
    } else {
      entries.push(metadata);
    }
  }
  return entries;
}
