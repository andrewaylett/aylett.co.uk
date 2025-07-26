import React from 'react';

import { type Components } from 'rehype-react';
import dynamic from 'next/dynamic';

import { LoadingComponent } from '@/client/mermaid/LoadingComponent';

const Mermaid = dynamic(() => import('@/client/mermaid/Mermaid'), {
  loading: LoadingComponent,
});

export const components = {
  code: ({ children, ...props }: React.JSX.IntrinsicElements['code']) => {
    if (props.className?.includes('language-mermaid')) {
      return <Mermaid>{children}</Mermaid>;
    }
    return <code {...props}>{children}</code>;
  },
} satisfies Partial<Components>;
