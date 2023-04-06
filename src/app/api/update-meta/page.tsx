import * as React from 'react';
import { Fragment } from 'react';

import { stringify } from 'yaml';

import { run } from './update-meta';

import 'server-only';

function M({
  m,
}: {
  m: { title: string; description: string; tags: string[] };
}) {
  const { description, tags, title, ...rest } = m;
  return (
    <>
      <h1>{title}</h1>
      <dl>
        <dt>Description</dt>
        <dd>{description}</dd>
        <dt>Tags</dt>
        <dd>{tags.join(', ')}</dd>
        {Object.entries(rest).map(([k, v]) => (
          <Fragment key={k}>
            <dt key={`dt${k}`}>{k}</dt>
            <dd key={`dd${k}`}>{stringify(v)}</dd>
          </Fragment>
        ))}
      </dl>
    </>
  );
}

// noinspection JSUnusedGlobalSymbols
export default async function Meta(): Promise<React.ReactNode> {
  const meta = await run();
  return (
    <>
      {meta.map((m) => (
        <M key={m.title} m={m} />
      ))}
    </>
  );
}
