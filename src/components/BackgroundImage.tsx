'use client';

import React from 'react';

import Image from 'next/image';

import field from '../../public/PXL_20220610_201053680~2.jpg';
import night from '../../public/PXL_20250407_202232580.NIGHT.jpg';

import { useDarkMode } from '@/client/hooks/useDarkMode';

export function BackgroundImage() {
  const darkMode = useDarkMode();
  return (
    <div className="fixed w-full h-full -z-50">
      {darkMode ? (
        <Image
          key="night"
          src={night}
          placeholder="blur"
          alt=""
          objectFit="cover"
          fill={true}
          sizes="calc(max(100vw, 133vh))"
        />
      ) : (
        <Image
          key="day"
          src={field}
          placeholder="blur"
          alt=""
          objectFit="cover"
          fill={true}
          sizes="calc(max(100vw, 133vh))"
        />
      )}
    </div>
  );
}
