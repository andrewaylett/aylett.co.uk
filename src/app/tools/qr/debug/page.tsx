import 'server-only';

import type { JSX } from 'react';

import Link from 'next/link';

import type { Metadata } from 'next';

import { QRDebuggerForm } from '@/client/qr/debug/QRDebuggerForm';

const TITLE = 'QR Code Debugger';

export const metadata: Metadata = {
  title: TITLE,
  description:
    'Decode a QR code from your camera or an image and see exactly how it was made: version, error correction, mask, encoding segments, and which modules needed correcting.',
} as const;

export default function QRDebugPage(): JSX.Element {
  return (
    <>
      <QRDebuggerForm />
      <p className="mt-4 text-center">
        Want to make one instead? Try the{' '}
        <Link href="/qr/">QR code generator</Link>.
      </p>
    </>
  );
}
