import * as React from 'react';
import { Fragment, Suspense, useMemo, use } from 'react';

import Link from 'next/link';
import { stringify } from 'yaml';

import { type Entry, run } from './update-meta';

import 'server-only';

function M({ m }: { m: AsyncGenerator<Entry, void, never> }) {
  const [cur, next] = useMemo(() => [m.next(), m], [m]);
  const { done, value } = use(cur);
  if (done) {
    return <Fragment />;
  }
  return (
    <>
      <Entry value={value} />
      <Suspense fallback="Loading">
        <M m={next} />
      </Suspense>
    </>
  );
}

function Entry({ value }: { value: Entry }) {
  const { description, tags, title, url, ...rest } = value;
  return (
    <>
      <h1>
        <Link href={url}>{title}</Link>
      </h1>
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

export default function Meta(): React.ReactElement {
  const meta = run();
  return (
    <Suspense fallback={'Loading'}>
      <M m={meta} />
    </Suspense>
  );
}
