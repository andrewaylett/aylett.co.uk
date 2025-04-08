import { PropsWithChildren, use } from 'react';
import React, { Suspense } from 'react';

import Link from 'next/link';
import { JSONSchema7 } from 'json-schema';

import Footer, { FooterProps } from './app/footer';
import { Markdown } from './remark/traverse';

export interface PageStructureProps<T extends Promise<Markdown<JSONSchema7>>>
  extends FooterProps {
  breadcrumbs: { href: string; text: string }[];
  header: React.JSX.Element;
  lifecycle?: T extends Promise<Markdown<infer U>>
    ? U extends {
        properties: {
          lifecycle: {
            enum: infer V extends string[];
          };
        };
      }
      ? Promise<V[number]>
      : never
    : never;
  schemaType: string;
  resource: string;
}

export function TitleHeader({
  children,
}: PropsWithChildren): React.JSX.Element {
  return (
    <header>
      <h1 property="name">{children}</h1>
    </header>
  );
}

export function PageStructure<T extends Promise<Markdown<JSONSchema7>>>({
  author,
  breadcrumbs,
  children,
  copyright,
  header,
  keywords,
  lifecycle,
  resource,
  schemaType,
}: PropsWithChildren<PageStructureProps<T>>): React.JSX.Element {
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
}
