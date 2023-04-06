import * as path from 'node:path';
import { readdir, stat } from 'node:fs/promises';

import { read } from 'to-vfile';
import { parse } from 'yaml';
import { validate } from 'revalidator';
import { JSONSchema7 } from 'json-schema';

import { MDPage, TypeFrom } from '../types';

import { intoReact } from './process_markdown';

import type { VFile } from 'vfile';

import JSONSchema = Revalidator.JSONSchema;

type MDFile = {
  path: string;
  id: string;
  vfile: VFile;
};

async function findProjectDirectory(): Promise<string> {
  let wd = process.cwd();
  do {
    if (
      (await stat(path.join(wd, 'package.json'))).isFile() &&
      (await stat(path.join(wd, 'src/remark/traverse.ts'))).isFile()
    ) {
      return wd;
    }
    wd = path.resolve(wd, '..');
  } while (wd !== '/');
  throw new Error(`Could not find project directory from ${process.cwd()}`);
}

export async function* traverse(dir: string): AsyncGenerator<MDFile> {
  const app = path.resolve(await findProjectDirectory(), 'src/app');
  const target = path.join(app, dir);
  const filenames = await readdir(target);
  for (const filename of filenames) {
    const fullPath = path.join(target, filename);
    const { ext, name } = path.parse(filename);
    const stats = await stat(fullPath);
    if (ext.startsWith('.md') && stats.isFile()) {
      yield {
        path: fullPath,
        id: name,
        vfile: await read(fullPath),
      };
    }
  }
}

export async function findMarkdown<T extends JSONSchema7>(
  dir: string,
  schema: T
): Promise<Array<MDPage<TypeFrom<T>>>> {
  const mdFiles = traverse(dir);
  const entries: MDPage<TypeFrom<T>>[] = [];
  for await (const mdFile of mdFiles) {
    const vfile = await intoReact(mdFile.vfile);
    const reactContent = vfile.result;
    const node = vfile.data.frontMatter;

    if (node) {
      const parsed: unknown = parse(node.value);
      const { errors, valid } = validate(parsed, schema as JSONSchema<unknown>);
      if (valid) {
        entries.push({
          id: mdFile.id,
          content: reactContent,
          metadata: parsed as TypeFrom<T>,
        });
      } else {
        throw new Error(`Invalid YAML: ${errors}`);
      }
    }
  }

  return entries;
}
