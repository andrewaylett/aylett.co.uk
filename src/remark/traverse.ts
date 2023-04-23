import * as path from 'node:path';
import { readdir, stat } from 'node:fs/promises';

import { ReactElement } from 'react';

import { read } from 'to-vfile';
import { parse } from 'yaml';
import { validate } from 'revalidator';
import { JSONSchema7 } from 'json-schema';

import { TypeFrom } from '../types';

import { intoReact } from './process_markdown';

import type { VFile } from 'vfile';

import JSONSchema = Revalidator.JSONSchema;

type MDFile = {
  path: string;
  id: string;
  vfile: Promise<VFile>;
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

export async function traverse(dir: string): Promise<MDFile[]> {
  const app = path.resolve(await findProjectDirectory(), 'src/app');
  const target = path.join(app, dir);
  const filenames = await readdir(target);
  const filesAndStats = await Promise.all(
    filenames.map(async (filename) => {
      const fullPath = path.join(target, filename);
      const { ext, name } = path.parse(filename);
      return { ext, fullPath, name, stats: await stat(fullPath) };
    })
  );
  function* gen() {
    for (const { ext, fullPath, name, stats } of filesAndStats.flat()) {
      if (ext.startsWith('.md') && stats.isFile()) {
        yield {
          path: fullPath,
          id: name,
          vfile: read(fullPath),
        };
      }
    }
  }

  return [...gen()];
}

export class Markdown<
  Schema extends JSONSchema7,
  Metadata extends TypeFrom<Schema> = TypeFrom<Schema>
> {
  constructor(private mdFile: MDFile, schema: Schema) {
    this.id = mdFile.id;
    const vfile = mdFile.vfile.then(intoReact);
    this.content = vfile.then((v) => v.result);
    this.metadata = vfile.then((v) => {
      const node = v.data.frontMatter;

      if (node) {
        const parsed: unknown = parse(node.value);
        const { errors, valid } = validate(
          parsed,
          schema as JSONSchema<unknown>
        );
        if (valid) {
          return parsed as Metadata;
        } else {
          throw new Error(`Invalid YAML: ${errors}`);
        }
      } else {
        throw new Error('No metadata found');
      }
    });
  }

  id: string;
  content: Promise<ReactElement<unknown>>;
  metadata: Promise<Metadata>;
}

export async function findMarkdown<T extends JSONSchema7>(
  dir: string,
  schema: T
): Promise<Markdown<T>[]> {
  const mdFiles = await traverse(dir);

  return mdFiles.map((f) => new Markdown(f, schema));
}
