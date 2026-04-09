'use client';
import type { JSX } from 'react';

export function ErrorComponent({ error }: { error: Error }): JSX.Element {
  return <>Error loading diagram: {error.message}</>;
}
