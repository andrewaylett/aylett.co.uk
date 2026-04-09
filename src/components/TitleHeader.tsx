import type { PropsWithChildren, JSX } from 'react';

export function TitleHeader({ children }: PropsWithChildren): JSX.Element {
  return (
    <header className="contain-content">
      <h1 property="name">{children}</h1>
    </header>
  );
}
