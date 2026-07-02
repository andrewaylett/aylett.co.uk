import 'server-only';

import type { JSX } from 'react';

import type { Metadata } from 'next';

import { QRCodeForm } from '@/client/qr/QRCodeForm';

const TITLE = 'QR Code Generator';

export const metadata: Metadata = {
  title: TITLE,
  description: 'Pure JS QR Code Generator',
} as const;

export default function QRPage(): JSX.Element {
  return <QRCodeForm />;
}
