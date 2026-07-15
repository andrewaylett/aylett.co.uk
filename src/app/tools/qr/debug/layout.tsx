import 'server-only';

import type { JSX } from 'react';

import { PageStructure } from '@/components/PageStructure';
import { TitleHeader } from '@/components/TitleHeader';

export default function Layout({
  children,
}: LayoutProps<'/tools/qr/debug'>): JSX.Element {
  return (
    <PageStructure
      breadcrumbs={[]}
      header={<TitleHeader>QR Code Debugger</TitleHeader>}
      schemaType="Item"
      resource="/tools/qr/debug"
    >
      {children}
    </PageStructure>
  );
}
