import { type RefObject, useMemo, useRef } from 'react';

export interface DarkModeStore {
  subscribe: (onStoreChange: () => void) => () => void;
  snapshot: () => boolean;
}

const getMediaQuery = (mediaQuery: RefObject<MediaQueryList | undefined>) =>
  (mediaQuery.current ??= globalThis.matchMedia(
    `(prefers-color-scheme: dark)`,
  ));

export function useDarkModeStore(): DarkModeStore {
  const mediaQuery = useRef<MediaQueryList>(undefined);

  return useMemo<DarkModeStore>(() => {
    return {
      subscribe: (onStoreChange) => {
        const abortController = new AbortController();

        getMediaQuery(mediaQuery).addEventListener('change', onStoreChange, {
          passive: true,
          signal: abortController.signal,
        });

        return () => {
          abortController.abort();
          mediaQuery.current = undefined;
        };
      },
      snapshot: () => getMediaQuery(mediaQuery).matches,
    };
  }, []);
}
