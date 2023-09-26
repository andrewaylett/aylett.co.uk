import * as React from 'react';

import { PageStructure, TitleHeader } from '../../page-structure';

import type { Metadata } from 'next';

import 'server-only';

// noinspection JSUnusedGlobalSymbols
export const metadata: Metadata = {
  title: 'Schemas',
};

// noinspection JSUnusedGlobalSymbols
export default function Schema(): React.ReactNode {
  return (
    <PageStructure breadcrumbs={[]} header={<TitleHeader>Schemas</TitleHeader>}>
      <p>
        Totally non-standard, provided for convenience. Maintained as part of
        the{' '}
        <a href="https://github.com/andrewaylett/aylett.co.uk/tree/main/public/schema">
          website project on GitHub.
        </a>
      </p>
      <p>
        If you&apos;re using any of them, please let me know. And please feel
        free to submit PRs to update/enhance/fix them.
      </p>
      <p>
        <ol>
          <li>
            <a href="/schema/clientConfig-1.1.xsd">
              Autoconfig schema for email
            </a>
          </li>
          <li>
            <a href="/schema/drone-0.8.json">
              Schema for <code>.drone.yml</code> files targeting Drone 0.8
            </a>
          </li>
        </ol>
      </p>
    </PageStructure>
  );
}
