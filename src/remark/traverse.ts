/**
 * Filesystem traversal for markdown content.
 *
 * Discovers `.md` files under `src/app/<dir>`, processes them through the
 * unified pipeline, and exposes parsed metadata and rendered React content
 * as lazy promises via the {@link Markdown} class.
 */
import { readdir, stat } from 'node:fs/promises';
import * as path from 'node:path';

import type { ReactElement } from 'react';

import { parse } from 'yaml';
import { read } from 'to-vfile';

import type { VFile } from 'vfile';
import type { ZodType } from 'zod';
import type { Content } from '@/types';

import { intoReact, metadataProcessor } from '@/remark/process_markdown';

export interface MDFile {
  path: string;
  id: string;
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

/** Reads a directory under `md/` and returns all `.md` files with lazy-loaded vfile promises. */
export async function traverse(dir: string): Promise<MDFile[]> {
  const app = path.resolve(await findProjectDirectory(), 'md');
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
        };
      }
    }
  }

  return [...gen()];
}

async function extractMetadata<P extends Content>(
  vfile: Promise<VFile>,
  schema: ZodType<P>,
): Promise<P> {
  const node = (await vfile).data.frontMatter;

  if (node) {
    const raw: unknown = parse(node.value);
    return schema.parse(raw);
  } else {
    throw new Error(`No metadata found in ${(await vfile).path}`);
  }
}

async function extractResult(vfile: Promise<VFile>): Promise<ReactElement> {
  return (await vfile).result as ReactElement;
}

/** Wraps a markdown file with lazy promises for its rendered React content and validated frontmatter metadata. */
export class Markdown<out P extends Content> {
  constructor(mdFile: MDFile, schema: ZodType<P>) {
    this.id = mdFile.id;
    const vfile = read(mdFile.path).then((v) => intoReact.process(v));
    this.content = extractResult(vfile);
    this.metadata = extractMetadata(vfile, schema);
  }

  id: string;
  content: Promise<ReactElement>;
  metadata: Promise<P>;
}

export class Metadata<out P extends Content> {
  constructor(mdFile: MDFile, schema: ZodType<P>) {
    this.id = mdFile.id;
    const vfile = read(mdFile.path).then((v) => metadataProcessor.process(v));
    this.data = extractMetadata(vfile, schema);
  }

  id: string;
  data: Promise<P>;
}
