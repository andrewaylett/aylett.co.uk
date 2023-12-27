import React, { Fragment, PropsWithChildren, Suspense } from 'react';

import Link from 'next/link';

import Footer, { FooterProps } from './app/footer';

export type FooterFunc<T> = {
  func: (input: T) => FooterProps;
  input: T;
};

export type PageStructureProps<T> = {
  breadcrumbs: { href: string; text: string }[];
  header: React.JSX.Element;
  footer?: FooterFunc<T>;
  schemaType?: string;
};

export function TitleHeader({
  children,
}: PropsWithChildren): React.JSX.Element {
  return (
    <header>
      <h1>{children}</h1>
    </header>
  );
}

export function PageStructure<T = unknown>({
  breadcrumbs,
  children,
  footer,
  header,
  schemaType,
}: PropsWithChildren<PageStructureProps<T>>): React.JSX.Element {
  const schemaMap = schemaType
    ? { property: 'mainEntity', typeof: schemaType }
    : {};
  return (
    <div className="grid grid-cols-centre p-vmin">
      <nav property="breadcrumb" typeof="BreadcrumbList">
        <span property="itemListElement" typeof="ListItem">
          <Link property="item" typeof="WebPage" href="/">
            <span property="name">Home</span>
          </Link>
          <data property="position" content="1" />
        </span>
        {breadcrumbs.map(({ href, text }, idx) => (
          <Fragment key={idx}>
            {' ▸ '}
            <span property="itemListElement" typeof="ListItem">
              <Link property="item" typeof="WebPage" href={href}>
                <span property="name">{text}</span>
              </Link>
              <data property="position" content={`${idx + 2}`} />
            </span>
          </Fragment>
        ))}
      </nav>
      <div {...schemaMap}>
        {header}
        <main className="hyphens-manual">
          <Suspense fallback="Rendering...">{children}</Suspense>
        </main>
        <Suspense>{footer ? <FooterGen {...footer} /> : <Footer />}</Suspense>
      </div>
    </div>
  );
}

function FooterGen<T>({ func, input }: FooterFunc<T>) {
  return <Footer {...func(input)} />;
}
