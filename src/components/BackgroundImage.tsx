'use client';

import type { JSX } from 'react';

import Image from 'next/image';

import field from '../../public/PXL_20220610_201053680~2.jpg';
import night from '../../public/PXL_20250407_202232580.NIGHT.jpg';

export function BackgroundImage(): JSX.Element {
  return (
    <div className="fixed w-full h-full -z-50">
      <Image
        key="night"
        src={night}
        placeholder="blur"
        alt=""
        style={{
          objectFit: 'cover',
        }}
        fill={true}
        sizes="calc(max(100vw, 133vh))"
        className="hidden dark:block"
        loading="lazy"
        fetchPriority="low"
      />
      <Image
        key="day"
        src={field}
        placeholder="blur"
        alt=""
        style={{
          objectFit: 'cover',
        }}
        fill={true}
        sizes="calc(max(100vw, 133vh))"
        className="block dark:hidden"
        loading="lazy"
        fetchPriority="low"
      />
    </div>
  );
}
