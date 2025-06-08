import { readdir, stat } from 'node:fs/promises';
import * as path from 'node:path';

import { type ReactElement } from 'react';

import { type JSONSchema7 } from 'json-schema';
import { read } from 'to-vfile';
import { type VFile } from 'vfile';
import { parse } from 'yaml';

import { assertSchema, type TaggedSchema, type TypeFrom } from '../types';

import { intoReact } from './process_markdown';

interface MDFile {
  path: string;
  id: string;
  vfile: Promise<VFile>;
}

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
    }),
  );
  function* gen() {
    for (const { ext, fullPath, name, stats } of filesAndStats) {
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

async function extractMetadata<Schema extends JSONSchema7 & TaggedSchema>(
  vfile: Promise<VFile>,
  schema: Schema,
): Promise<TypeFrom<Schema>> {
  const node = (await vfile).data.frontMatter;

  if (node) {
    const parsed: unknown = parse(node.value);
    if (typeof parsed === 'object') {
      (parsed as TaggedSchema).tag = schema.tag;
    }
    assertSchema(parsed, schema);
    return parsed;
  } else {
    throw new Error('No metadata found');
  }
}

async function extractResult(vfile: Promise<VFile>): Promise<ReactElement> {
  return (await vfile).result as ReactElement;
}

export class Markdown<Schema extends JSONSchema7 & TaggedSchema> {
  constructor(mdFile: MDFile, schema: Schema) {
    this.id = mdFile.id;
    const vfile = mdFile.vfile.then((v) => intoReact.process(v));
    this.content = extractResult(vfile);
    this.metadata = extractMetadata(vfile, schema);
  }

  id: string;
  content: Promise<ReactElement>;
  metadata: Promise<TypeFrom<Schema>>;
}

export async function findMarkdown<T extends JSONSchema7 & TaggedSchema>(
  dir: string,
  schema: T,
): Promise<Markdown<T>[]> {
  const mdFiles = await traverse(dir);

  return mdFiles.map((f) => new Markdown(f, schema));
}
