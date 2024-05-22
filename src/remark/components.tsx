import * as React from 'react';
import { use } from 'react';

import Link from 'next/link';

import { Mermaid } from '../client/mermaid';

import type { Components } from 'rehype-react';

// noinspection JSUnusedGlobalSymbols
export const components = {
  code: ({ children, ...props }) => {
    if (props.className === 'language-mermaid') {
      return <Mermaid>{children}</Mermaid>;
    }
    return <code {...props}>{children}</code>;
  },
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
