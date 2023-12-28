import * as React from 'react';

import { PageStructure, TitleHeader } from '../../page-structure';

import type { Metadata } from 'next';

import 'server-only';

// noinspection JSUnusedGlobalSymbols
export const metadata: Metadata = {
  title: 'Links',
};

// noinspection JSUnusedGlobalSymbols
export default function Links(): React.ReactNode {
  return (
    <PageStructure
      schemaType="ItemList"
      resource="/links"
      breadcrumbs={[]}
      header={<TitleHeader>Links</TitleHeader>}
    >
      <p>
        <a
          property="item"
          typeof="WebPage"
          href="https://photos.app.goo.gl/tRwdQNpn5j15PKJJ7"
        >
          <span property="description">Lizzie&apos;s Photos</span>
        </a>
      </p>
    </PageStructure>
  );
}
