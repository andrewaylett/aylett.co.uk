'use client';

import 'client-only';

import { useEffect, useMemo, useState } from 'react';

export function useDarkMode(): boolean {
  const mediaQuery = useMemo(
    () =>
      typeof globalThis.matchMedia === 'function'
        ? globalThis.matchMedia('(prefers-color-scheme: dark)')
        : undefined,
    [],
  );

  const [isDarkMode, setIsDarkMode] = useState(
    () => mediaQuery?.matches ?? false,
  );

  useEffect(() => {
    const handleMediaQueryChange = (event: MediaQueryListEvent) => {
      setIsDarkMode(event.matches);
    };

    const abortController = new AbortController();

    if (mediaQuery) {
      mediaQuery.addEventListener('change', handleMediaQueryChange, {
        passive: true,
        signal: abortController.signal,
      });
    }

    return () => {
      abortController.abort();
    };
  }, [mediaQuery]);

  return isDarkMode;
}
