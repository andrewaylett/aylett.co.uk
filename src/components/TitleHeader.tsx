import React, { type PropsWithChildren, type ReactNode } from 'react';

export function TitleHeader({ children }: PropsWithChildren): ReactNode {
  return (
    <header>
      <h1 property="name">{children}</h1>
    </header>
  );
}
