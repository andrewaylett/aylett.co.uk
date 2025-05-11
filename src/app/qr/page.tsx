import 'server-only';

import React from 'react';

import { type Metadata } from 'next';

import { QRCodeForm } from '@/client/qr/QRCodeForm';
import { PageStructure } from '@/components/PageStructure';
import { TitleHeader } from '@/components/TitleHeader';

export const metadata = {
  title: 'QR Code Generator',
  description: 'Pure JS QR Code Generator',
} satisfies Metadata;

export default function QRPage() {
  return (
    <PageStructure
      breadcrumbs={[]}
      header={<TitleHeader>{metadata.title}</TitleHeader>}
      schemaType="Item"
      resource="/qr"
    >
      <QRCodeForm />
    </PageStructure>
  );
}
