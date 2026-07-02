import 'server-only';

import type { JSX } from 'react';

import { PageStructure } from '@/components/PageStructure';
import { TitleHeader } from '@/components/TitleHeader';

export default function Layout({ children }: LayoutProps<'/qr'>): JSX.Element {
  return (
    <PageStructure
      breadcrumbs={[]}
      header={<TitleHeader>QR Code Generator</TitleHeader>}
      schemaType="Item"
      resource="/qr"
    >
      {children}
    </PageStructure>
  );
}
