import * as React from 'react';
import { use } from 'react';

import Link from 'next/link';

import type { Components } from 'rehype-react';

// noinspection JSUnusedGlobalSymbols
export const components = {
  h1: ({ children, node }) =>
    node?.content ? (
      <h1
        /* eslint-disable-next-line @typescript-eslint/no-base-to-string */
        id={node.content
          .toString()
          .replaceAll(/ /g, '-')
          .toLowerCase()
          .replaceAll(/[^a-z0-9-]/g, '')}
      >
        {children}
      </h1>
    ) : (
      <h1>{children}</h1>
    ),
} satisfies Partial<Components>;

export function Description({
  metadata,
}: {
  metadata: Promise<{ description: string }>;
}): React.JSX.Element {
  return (
    <blockquote>
      <span property="abstract">{use(metadata).description}</span>
      <sup>
        <Link href="/thoughts/descriptions">?</Link>
      </sup>
    </blockquote>
  );
}

export function Optional({
  children,
  text,
}: React.PropsWithChildren<{ text?: string }>) {
  return text ? <span>{children}</span> : null;
}

export function TitleSeparator() {
  return <hr className="my-3 mx-[15%]" />;
}
