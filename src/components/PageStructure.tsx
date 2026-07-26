import {
  Suspense,
  type PropsWithChildren,
  type JSX,
  type ReactNode,
} from 'react';

import { Footer, type FooterProps } from './Footer';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BasicFallback } from '@/components/BasicFallback';

export interface PageStructureProps extends FooterProps {
  breadcrumbs?: Breadcrumbs;
  header: JSX.Element;
  lifecycle?: string;
  schemaType: string;
  resource: string;
}

export function SuspensePageStructure({
  children,
  fallback,
  ...props
}: PropsWithChildren<
  PageStructureProps & { fallback?: ReactNode }
>): JSX.Element {
  return (
    <BasePageStructure {...props}>
      <Suspense fallback={fallback ?? <BasicFallback />}>
        <main className="hyphens-manual">{children}</main>
      </Suspense>
    </BasePageStructure>
  );
}

export function StaticPageStructure({
  children,
  ...props
}: PropsWithChildren<PageStructureProps>): JSX.Element {
  return (
    <BasePageStructure {...props}>
      <main className="hyphens-manual">{children}</main>
    </BasePageStructure>
  );
}

export function BasePageStructure({
  author,
  breadcrumbs,
  children,
  copyright,
  header,
  keywords,
  lifecycle,
  resource,
  schemaType,
}: PropsWithChildren<PageStructureProps>): JSX.Element {
  return (
    <>
      {lifecycle === 'draft' ? <div className="bg-draft" /> : ''}
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
        <main className="hyphens-manual">{children}</main>
        <div className="grow bg-transparent min-h-[50vh] content-end overflow-visible contain-content">
          <Footer author={author} keywords={keywords} copyright={copyright} />
        </div>
      </div>
    </>
  );
}
