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
    <PageStructure
      schemaType="ItemList"
      resource="/schema"
      breadcrumbs={[]}
      header={<TitleHeader>Schemas</TitleHeader>}
    >
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
            <a
              property="item"
              typeof="SoftwareSourceCode"
              href="/schema/clientConfig-1.1.xsd"
            >
              <span property="description">Autoconfig schema for email</span>
            </a>
          </li>
          <li>
            <a
              property="item"
              typeof="SoftwareSourceCode"
              href="/schema/drone-0.8.json"
            >
              <span property="description">
                Schema for <code>.drone.yml</code> files targeting Drone 0.8
              </span>
            </a>
          </li>
        </ol>
      </p>
    </PageStructure>
  );
}
