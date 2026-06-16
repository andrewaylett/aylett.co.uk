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

export async function findProjectDirectory(): Promise<string> {
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

function extractMetadata<P extends Content>(
  vfile: VFile,
  schema: ZodType<P>,
): P {
  const node = vfile.data.frontMatter;

  if (node) {
    const raw: unknown = parse(node.value);
    return schema.parse(raw);
  } else {
    throw new Error(`No metadata found in ${vfile.path}`);
  }
}

function extractResult(vfile: VFile): ReactElement {
  return vfile.result as ReactElement;
}

/** Wraps a markdown file for its rendered React content and validated frontmatter metadata. */
export interface Markdown<out P extends Content> {
  id: string;
  content: ReactElement;
  metadata: P;
}
export async function buildMarkdown<P extends Content>(
  mdFile: MDFile,
  schema: ZodType<P>,
): Promise<Markdown<P>> {
  const v = await read(mdFile.path);
  const vfile = await intoReact.process(v);
  return {
    id: mdFile.id,
    content: extractResult(vfile),
    metadata: extractMetadata(vfile, schema),
  };
}

export interface Metadata<out P extends Content> {
  id: string;
  data: P;
}

export async function buildMetadata<P extends Content>(
  mdFile: MDFile,
  schema: ZodType<P>,
): Promise<Metadata<P>> {
  const v = await read(mdFile.path);
  const vfile = await metadataProcessor.process(v);
  return {
    id: mdFile.id,
    data: extractMetadata(vfile, schema),
  };
}
