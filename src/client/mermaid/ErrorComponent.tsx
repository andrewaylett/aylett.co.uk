import type { JSX } from 'react';

import type { ErrorInfo } from 'next/dist/client/components/error-boundary';

export function ErrorComponent({ error }: ErrorInfo): JSX.Element {
  return <>Error loading diagram: {error.message}</>;
}
