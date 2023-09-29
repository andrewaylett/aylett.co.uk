import React, { PropsWithChildren, Suspense } from 'react';

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
}: PropsWithChildren<PageStructureProps<T>>): React.JSX.Element {
  return (
    <div className="grid grid-cols-centre p-vmin">
      <nav>
        <Link href="/">Home</Link>
        {breadcrumbs.map(({ href, text }, idx) => (
          <>
            {' ▸ '}
            <Link href={href} key={idx}>
              {text}
            </Link>
          </>
        ))}
      </nav>
      {header}
      <main className="hyphens-manual">
        <Suspense fallback="Rendering...">{children}</Suspense>
      </main>
      <Suspense>{footer ? <FooterGen {...footer} /> : <Footer />}</Suspense>
    </div>
  );
}

function FooterGen<T>({ func, input }: FooterFunc<T>) {
  return <Footer {...func(input)} />;
}
