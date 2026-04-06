import React, {
  type PropsWithChildren,
  type ReactNode,
  Suspense,
  use,
} from 'react';

import { Footer, type FooterProps } from './Footer';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BasicFallback } from '@/components/BasicFallback';

export interface PageStructureProps extends FooterProps {
  breadcrumbs?: Breadcrumbs;
  header: ReactNode;
  lifecycle?: Promise<string>;
  schemaType: string;
  resource: string;
}

export function PageStructure({
  author,
  breadcrumbs,
  children,
  copyright,
  header,
  keywords,
  lifecycle,
  resource,
  schemaType,
}: PropsWithChildren<PageStructureProps>): ReactNode {
  return (
    <>
      {lifecycle && use(lifecycle) === 'draft' ? (
        <div className="bg-draft" />
      ) : (
        ''
      )}
      <div
        className="flex flex-col min-h-screen grid-cols-centre"
        vocab="https://schema.org/"
        resource={resource}
        typeof={schemaType}
      >
        {breadcrumbs === undefined ? null : (
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        )}
        <div className="contain-content">{header}</div>
        <Suspense fallback={<BasicFallback />}>
          <main className="hyphens-manual">{children}</main>
        </Suspense>
        <div className="grow bg-transparent min-h-[50vh] content-end overflow-visible contain-content">
          <Footer author={author} keywords={keywords} copyright={copyright} />
        </div>
      </div>
    </>
  );
}
