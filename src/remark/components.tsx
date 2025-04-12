import * as React from 'react';
import { use } from 'react';

import Link from 'next/link';
import { type Components } from 'rehype-react';

import { Mermaid } from '../client/mermaid';
import { memo } from '../types';

export const components = {
  code: ({ children, ...props }: React.JSX.IntrinsicElements['code']) => {
    if (props.className === 'language-mermaid') {
      return <Mermaid>{children}</Mermaid>;
    }
    return <code {...props}>{children}</code>;
  },
} satisfies Partial<Components>;

export const Description = memo(function Description({
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
});

export const Optional = memo(function Optional({
  children,
  text,
}: React.PropsWithChildren<{ text?: string }>) {
  return text ? <span>{children}</span> : null;
});

export const TitleSeparator = memo(function TitleSeparator() {
  return <hr className="mx-[15%]" />;
});
