import React, {
  type PropsWithChildren,
  type ReactNode,
  Suspense,
  use,
} from 'react';

import { type JSONSchema7 } from 'json-schema';
import Link from 'next/link';

import { Footer, type FooterProps } from './app/footer';
import { type Markdown } from './remark/traverse';
import { type LifecycleSchema, memo } from './types';

export interface PageStructureProps<
  T extends Promise<Markdown<JSONSchema7>> | never,
  Schema extends LifecycleSchema = T extends Promise<
    Markdown<infer S extends LifecycleSchema>
  >
    ? S
    : never,
> extends FooterProps {
  breadcrumbs: { href: string; text: string }[];
  header: ReactNode;
  lifecycle?: Promise<Schema['properties']['lifecycle']['enum'][number]>;
  schemaType: string;
  resource: string;
}

export const TitleHeader = memo(function TitleHeader({
  children,
}: PropsWithChildren): ReactNode {
  return (
    <header>
      <h1 property="name">{children}</h1>
    </header>
  );
});

export const PageStructure = memo(function PageStructure<
  T extends Promise<Markdown<JSONSchema7>> | never,
>({
  author,
  breadcrumbs,
  children,
  copyright,
  header,
  keywords,
  lifecycle,
  resource,
  schemaType,
}: PropsWithChildren<PageStructureProps<T>>): ReactNode {
  return (
    <>
      {lifecycle && use(lifecycle) === 'draft' ? (
        <div className="bg-draft" />
      ) : (
        ''
      )}
      <div
        className="grid grid-cols-centre"
        vocab="https://schema.org/"
        resource={resource}
        typeof={schemaType}
      >
        <nav property="breadcrumb" typeof="BreadcrumbList">
          <span property="itemListElement" typeof="ListItem">
            <Link property="item" typeof="WebPage" href="/">
              <span property="name">Home</span>
            </Link>
            <data property="position" content="1" />
          </span>
          {breadcrumbs.map(({ href, text }, idx) => (
            <span property="itemListElement" typeof="ListItem" key={idx}>
              <Link property="item" typeof="WebPage" href={href}>
                <span property="name">{text}</span>
              </Link>
              <data property="position" content={`${idx + 2}`} />
            </span>
          ))}
        </nav>
        {header}
        <main className="hyphens-manual">
          <Suspense fallback="Rendering...">{children}</Suspense>
        </main>
        <Suspense>
          <Footer author={author} keywords={keywords} copyright={copyright} />
        </Suspense>
      </div>
    </>
  );
});
