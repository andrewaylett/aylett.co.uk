import React from 'react';

import Link from 'next/link';

export function Description({
  data,
}: {
  data: { description: string };
}): React.JSX.Element {
  return (
    <blockquote>
      <span property="abstract">{data.description}</span>
      <sup>
        <Link href="/thoughts/descriptions">?</Link>
      </sup>
    </blockquote>
  );
}
