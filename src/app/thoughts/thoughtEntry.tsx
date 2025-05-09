import React, { use } from 'react';

import Link from 'next/link';

import { Description } from '../../remark/components';
import { type ThoughtSchema, type TypeFrom } from '../../types';

export function ThoughtEntry({
  metadata,
  name,
}: {
  metadata: Promise<TypeFrom<ThoughtSchema>>;
  name: string;
}) {
  return (
    <div property="itemListElement" typeof="Article">
      <p>
        <Link property="url" href={`/thoughts/${name}`}>
          <span property="name">{use(metadata).title}</span>
        </Link>
      </p>
      <Description metadata={metadata} />
    </div>
  );
}
