'use client';
import React from 'react';

export function ErrorComponent({ error }: { error: Error }) {
  return <>Error loading diagram: {error.message}</>;
}
