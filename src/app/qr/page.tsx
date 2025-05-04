import React from 'react';

import { type Metadata } from 'next';

import { QRCodeForm } from '../../client/QRCodeForm';
import { PageStructure, TitleHeader } from '../../page-structure';

import 'server-only';

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
