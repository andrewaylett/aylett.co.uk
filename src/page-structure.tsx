import React, { PropsWithChildren, Suspense } from 'react';

import Link from 'next/link';

import Footer, { FooterProps } from './app/footer';

export type PageStructureProps = {
  breadcrumbs: { href: string; text: string }[];
  header: React.JSX.Element;
  footer?: FooterProps;
};

export function TitleHeader({
  children,
}: PropsWithChildren): React.JSX.Element {
  return (
    <header>
      <h1 className="main-title">{children}</h1>
    </header>
  );
}

export function PageStructure({
  breadcrumbs,
  children,
  footer,
  header,
}: PropsWithChildren<PageStructureProps>): React.JSX.Element {
  return (
    <div className="grid grid-cols-centre p-vmin">
      <nav className="flex flex-wrap gap-x-[1ch]">
        <Link href="/">Home</Link>
        {breadcrumbs.map(({ href, text }, idx) => (
          <Link href={href} key={idx}>
            {text}
          </Link>
        ))}
      </nav>
      {header}
      <Suspense fallback="Rendering...">{children}</Suspense>
      <Footer {...footer} />
    </div>
  );
}
