import 'server-only';

import React, { type JSX } from 'react';

import { PageStructure } from '@/components/PageStructure';

const TITLE = 'Word Friends';

export default function Layout({
  children,
}: {
  children: JSX.Element;
}): JSX.Element {
  return (
    <PageStructure
      breadcrumbs={[]}
      header={<h1 className="text-center">{TITLE}</h1>}
      schemaType="Item"
      resource="/puzzles"
    >
      <main className="flex flex-col justify-center items-center">
        {children}
      </main>
    </PageStructure>
  );
}
