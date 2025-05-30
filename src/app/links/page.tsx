import 'server-only';

import React, { type ReactNode } from 'react';

import { type Metadata } from 'next';

import { PageStructure } from '@/components/PageStructure';
import { TitleHeader } from '@/components/TitleHeader';

export const metadata: Metadata = {
  title: 'Links',
};

function Links(): ReactNode {
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

export default Links;
