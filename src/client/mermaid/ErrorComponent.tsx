'use client';

import type { JSX } from 'react';

import type { ErrorInfo } from 'next/dist/client/components/error-boundary';

export function ErrorComponent({ error }: ErrorInfo): JSX.Element {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String(error.message)
      : 'An unknown error occurred';

  return <>Error loading diagram: {message}</>;
}
