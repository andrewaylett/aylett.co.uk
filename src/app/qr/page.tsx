import 'server-only';

import type { JSX } from 'react';

import type { Metadata } from 'next';

import { QRCodeForm } from '@/client/qr/QRCodeForm';
import { PageStructure } from '@/components/PageStructure';
import { TitleHeader } from '@/components/TitleHeader';

export const dynamic = 'error';

const TITLE = 'QR Code Generator';

export const metadata: Metadata = {
  title: TITLE,
  description: 'Pure JS QR Code Generator',
} as const;

export default function QRPage(): JSX.Element {
  return (
    <PageStructure
      breadcrumbs={[]}
      header={<TitleHeader>{TITLE}</TitleHeader>}
      schemaType="Item"
      resource="/qr"
    >
      <QRCodeForm />
    </PageStructure>
  );
}
