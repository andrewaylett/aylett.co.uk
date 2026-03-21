import { useSyncExternalStore } from 'react';

export function useDarkMode(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)');

      const abortController = new AbortController();

      mediaQuery.addEventListener('change', callback, {
        passive: true,
        signal: abortController.signal,
      });

      return () => {
        abortController.abort();
      };
    },
    () => globalThis.matchMedia('(prefers-color-scheme: dark)').matches,
    () => false,
  );
}
