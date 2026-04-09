import 'server-only';

import type { JSX } from 'react';

import Link from 'next/link';

import type { Metadata } from 'next';

import { PageStructure } from '@/components/PageStructure';

const TITLE = 'Tools';

export const metadata: Metadata = {
  title: TITLE,
  description: 'Miscellaneous tools',
} as const;

export default function ToolsPage(): JSX.Element {
  return (
    <PageStructure
      breadcrumbs={[]}
      header={<h1 className="text-center">{TITLE}</h1>}
      schemaType="Item"
      resource="/tools"
    >
      <main
        vocab="https://schema.org/"
        typeof="ItemList"
        resource="/"
        className="flex flex-col justify-center items-center text-center *:text-xl"
      >
        <p>
          <Link href="/qr/">
            <span property="name">QR Code Generator</span>
          </Link>
        </p>
        <p>
          <Link href="/tools/sun/">
            <span property="name">Sunrise and Sunset</span>
          </Link>
        </p>
      </main>
    </PageStructure>
  );
}
