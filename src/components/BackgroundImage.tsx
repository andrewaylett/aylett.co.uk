import type { JSX } from 'react';

import Image, { type StaticImageData } from 'next/image';

import field from '../../public/PXL_20220610_201053680~2.jpg';
import night from '../../public/PXL_20250407_202232580.NIGHT.jpg';

function FullBackgroundImage({
  src,
  isDark,
}: {
  src: StaticImageData;
  isDark: boolean;
}): JSX.Element {
  return (
    <Image
      src={src}
      alt=""
      sizes="calc(max(100vw, 133vh))"
      className={
        (isDark ? 'hidden dark:block' : 'block dark:hidden') +
        ' object-cover h-full w-full inset-0'
      }
      loading="lazy"
      fetchPriority="low"
      style={{
        background: `url("${src.blurDataURL}") fixed center / cover`,
      }}
    />
  );
}

export function BackgroundImage(): JSX.Element {
  return (
    <div className="fixed w-full h-full -z-50" aria-hidden="true">
      <FullBackgroundImage src={night} isDark={true} />
      <FullBackgroundImage src={field} isDark={false} />
    </div>
  );
}
