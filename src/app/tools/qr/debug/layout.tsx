import 'server-only';

import type { JSX } from 'react';

import { StaticPageStructure } from '@/components/PageStructure';
import { TitleHeader } from '@/components/TitleHeader';

export default function Layout({
  children,
}: LayoutProps<'/tools/qr/debug'>): JSX.Element {
  return (
    <StaticPageStructure
      breadcrumbs={[{ href: '/tools', text: 'Tools' }]}
      header={<TitleHeader>QR Code Debugger</TitleHeader>}
      schemaType="Item"
      resource="/tools/qr/debug"
    >
      {children}
    </StaticPageStructure>
  );
}
