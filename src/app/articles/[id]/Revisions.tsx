import React from 'react';

import { Optional } from '@/components/Optional';
import { gitHubUrl } from '@/utilities';

export function Revisions({
  expires,
  lifecycle,
  revised,
  revision,
  url,
}: {
  expires?: string;
  lifecycle?: string;
  revised: string;
  revision?: string;
  url: string;
}) {
  return (
    <div className="flex flex-row flex-wrap gap-x-[1ch]">
      <Optional condition={revision}>
        Version:&nbsp;<span property="version">{revision}</span>
      </Optional>
      <span>Status: {lifecycle ?? 'active'}</span>
      <Optional condition={revised}>
        <a
          className="text-inherit underline"
          property="subjectOf"
          typeof="SoftwareSourceCode"
          href={gitHubUrl(url)}
        >
          Last Revised
        </a>
        :&nbsp;<span property="dateModified">{revised}</span>
      </Optional>
      <Optional condition={expires}>
        Expires:&nbsp;<span property="expires">{expires}</span>
      </Optional>
    </div>
  );
}
