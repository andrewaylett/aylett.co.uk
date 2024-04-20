'use client';

import { useState, useEffect, useMemo } from 'react';

import 'client-only';

export function useDarkMode() {
  const mediaQuery = useMemo(
    () =>
      typeof globalThis.matchMedia === 'function'
        ? globalThis.matchMedia('(prefers-color-scheme: dark)')
        : undefined,
    [globalThis],
  );

  const [isDarkMode, setIsDarkMode] = useState(mediaQuery?.matches);

  useEffect(() => {
    const handleMediaQueryChange = (event: MediaQueryListEvent) => {
      setIsDarkMode(event.matches);
    };

    mediaQuery?.addEventListener('change', handleMediaQueryChange);

    return () => {
      mediaQuery?.removeEventListener('change', handleMediaQueryChange);
    };
  }, [mediaQuery]);

  return isDarkMode;
}
