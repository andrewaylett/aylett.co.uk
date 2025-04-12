import React, { type ReactNode } from 'react';

import { type Metadata } from 'next';

import { PageStructure, TitleHeader } from '../../page-structure';
import { memo } from '../../types';

import 'server-only';

export const metadata: Metadata = {
  title: 'Links',
};

const Links = memo(function Links(): ReactNode {
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
});

export default Links;
