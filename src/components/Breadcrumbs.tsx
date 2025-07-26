import React from 'react';

import Link from 'next/link';

export interface Breadcrumb {
  href: string;
  text: string;
}

export type Breadcrumbs = Breadcrumb[];

export interface BreadcrumbsProps {
  breadcrumbs: Breadcrumbs;
}

export function Breadcrumbs({ breadcrumbs }: BreadcrumbsProps) {
  return (
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
  );
}
