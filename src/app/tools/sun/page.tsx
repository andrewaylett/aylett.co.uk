import 'server-only';

import React from 'react';

import { type Metadata } from 'next';

import { PageStructure } from '@/components/PageStructure';
import { TitleHeader } from '@/components/TitleHeader';
import { SunriseSunset } from '@/app/tools/sun/sunriseSunset';

const TITLE = 'Sunrise & Sunset';

export const metadata: Metadata = {
  title: TITLE,
  description: 'Compare sunrise and sunset times across UK locations',
} as const;

export default function SunPage() {
  return (
    <PageStructure
      breadcrumbs={[{ href: '/tools', text: 'Tools' }]}
      header={<TitleHeader>{TITLE}</TitleHeader>}
      schemaType="Item"
      resource="/tools/sun"
    >
      <SunriseSunset />
    </PageStructure>
  );
}
