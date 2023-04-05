import * as React from 'react';

import { ComponentsWithNodeOptions } from 'rehype-react/lib/complex-types';

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
