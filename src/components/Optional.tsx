import type { JSX } from 'react';

export function Optional({
  children,
  condition,
}: React.PropsWithChildren<{ condition?: unknown }>): JSX.Element {
  return condition ? <span>{children}</span> : <></>;
}
