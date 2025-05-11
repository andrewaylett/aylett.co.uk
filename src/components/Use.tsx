import { type ReactNode, type Usable, use } from 'react';

export function Use<T extends ReactNode>({ el }: { el: Usable<T> }): T {
  return use(el);
}
