/**
 * Custom component overrides for rehype-react.
 *
 * Intercepts `<code>` elements with `language-mermaid` class and renders them
 * via a dynamically imported Mermaid client component instead.
 */
import type { JSX } from 'react';

import dynamic from 'next/dynamic';

import type { Components } from 'rehype-react';

import { LoadingComponent } from '@/client/mermaid/LoadingComponent';

const Mermaid = dynamic(() => import('@/client/mermaid/Mermaid'), {
  loading: LoadingComponent,
});

export const components: Partial<Components> = {
  code: ({
    children,
    ...props
  }: React.JSX.IntrinsicElements['code']): JSX.Element => {
    if (props.className?.includes('language-mermaid')) {
      return <Mermaid>{children}</Mermaid>;
    }
    return <code {...props}>{children}</code>;
  },
} as const;
