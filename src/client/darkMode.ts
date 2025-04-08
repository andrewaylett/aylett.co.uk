'use client';

import { useState, useEffect, useMemo } from 'react';

import 'client-only';

export function useDarkMode(): boolean {
  const mediaQuery = useMemo(
    () =>
      typeof globalThis.matchMedia === 'function'
        ? globalThis.matchMedia('(prefers-color-scheme: dark)')
        : undefined,
    [globalThis],
  );

  const [isDarkMode, setIsDarkMode] = useState(mediaQuery?.matches ?? false);

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

    return () => abortController.abort();
  }, [mediaQuery]);

  return isDarkMode;
}
