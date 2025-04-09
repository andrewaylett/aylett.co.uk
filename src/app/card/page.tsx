import 'server-only';
import * as React from 'react';

import Link from 'next/link';

import { PageStructure, TitleHeader } from '../../page-structure';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QR Code',
};

export default function Card(): React.ReactElement {
  return (
    <PageStructure
      schemaType="Organization"
      resource="/card"
      breadcrumbs={[]}
      header={<TitleHeader>Andrew and Lizzie Aylett</TitleHeader>}
    >
      <p>Thank you for scanning one of our cards!</p>
      <p>You might be interested in our online presence:</p>
      <ul>
        <li>
          <Link href="/">This website</Link> has some stuff, mostly written by
          Andrew.
        </li>
        <li>
          Lizzie is active on{' '}
          <a href="https://www.facebook.com/lizzie.aylett/">Facebook</a>.
        </li>
        <li>
          Andrew uses{' '}
          <a href="https://bsky.app/profile/andrew.aylett.co.uk">BlueSky</a>.
        </li>
        <li>
          Our email addresses, phone number, and postal address are on the card.
          If you didn't keep it, you can build our email addresses with "andrew"
          or "lizzie" at our family domain, "aylett.co.uk"
        </li>
        <li>
          If you're curious about how many other people have visited this page,
          our{' '}
          <a href="https://plausible.io/aylett.co.uk?page=%2Fcard">analytics</a>{' '}
          are publicly-viewable.
        </li>
      </ul>
    </PageStructure>
  );
}
