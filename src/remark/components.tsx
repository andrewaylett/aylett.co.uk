import * as React from 'react';

import { ComponentsWithNodeOptions } from 'rehype-react/lib/complex-types';
import Link from 'next/link';

// noinspection JSUnusedGlobalSymbols
export const components: ComponentsWithNodeOptions['components'] = {
  h1: ({ children, node }) => (
    <h1
      id={node.content
        ?.toString()
        .replaceAll(/[ ]/g, '-')
        .toLowerCase()
        .replaceAll(/[^a-z0-9-]/g, '')}
    >
      {children}
    </h1>
  ),
};

export function Description({
  metadata,
}: {
  metadata: { description: string };
}): JSX.Element {
  return (
    <blockquote>
      {metadata.description}
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
