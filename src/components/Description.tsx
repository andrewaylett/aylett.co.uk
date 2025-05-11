import React, { use } from 'react';

import Link from 'next/link';

export function Description({
  metadata,
}: {
  metadata: Promise<{ description: string }>;
}): React.JSX.Element {
  return (
    <blockquote>
      <span property="abstract">{use(metadata).description}</span>
      <sup>
        <Link href="/thoughts/descriptions">?</Link>
      </sup>
    </blockquote>
  );
}
