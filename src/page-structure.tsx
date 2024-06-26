import type { PropsWithChildren } from 'react';
import React, { Suspense } from 'react';

import Link from 'next/link';
import { JSONSchema7 } from 'json-schema';

import Footer from './app/footer';
import { Markdown } from './remark/traverse';

import type { FooterProps } from './app/footer';

export interface FooterFunc<T> {
  func: (input: T) => FooterProps;
  input: T;
}

export interface PageStructureProps<T extends Promise<Markdown<JSONSchema7>>> {
  breadcrumbs: { href: string; text: string }[];
  header: React.JSX.Element;
  footer?: FooterFunc<T>;
  lifecycle?: T extends Promise<Markdown<infer U>>
    ? U extends {
        properties: {
          lifecycle: {
            enum: infer V extends string[];
          };
        };
      }
      ? () => V[number]
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
  breadcrumbs,
  children,
  footer,
  header,
  lifecycle,
  resource,
  schemaType,
}: PropsWithChildren<PageStructureProps<T>>): React.JSX.Element {
  return (
    <>
      {lifecycle && lifecycle() === 'draft' ? <div className="bg-draft" /> : ''}
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
        <Suspense>{footer ? <FooterGen {...footer} /> : <Footer />}</Suspense>
      </div>
    </>
  );
}

function FooterGen<T>({ func, input }: FooterFunc<T>) {
  return <Footer {...func(input)} />;
}
