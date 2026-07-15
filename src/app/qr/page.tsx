import 'server-only';

import type { JSX } from 'react';

import Link from 'next/link';

import type { Metadata } from 'next';

import { QRCodeForm } from '@/client/qr/QRCodeForm';

const TITLE = 'QR Code Generator';

export const metadata: Metadata = {
  title: TITLE,
  description: 'Pure JS QR Code Generator',
} as const;

export default function QRPage(): JSX.Element {
  return (
    <>
      <QRCodeForm />
      <p className="mt-4 text-center">
        Got a QR code you want to pick apart? Try the{' '}
        <Link href="/tools/qr/debug/">QR code debugger</Link>.
      </p>
    </>
  );
}
