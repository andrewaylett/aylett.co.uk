import React from 'react';

import { type Components } from 'rehype-react';

import { Mermaid } from '../client/mermaid';

export const components = {
  code: ({ children, ...props }: React.JSX.IntrinsicElements['code']) => {
    if (props.className?.includes('language-mermaid')) {
      return <Mermaid>{children}</Mermaid>;
    }
    return <code {...props}>{children}</code>;
  },
} satisfies Partial<Components>;
