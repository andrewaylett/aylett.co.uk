'use client';

import { useEffect, useRef, useState, type JSX } from 'react';

import Image, { type StaticImageData } from 'next/image';

import field from '../../public/PXL_20220610_201053680~2.jpg';
import night from '../../public/PXL_20250407_202232580.NIGHT.jpg';

type AnimState = 'idle' | 'deferred' | 'reveal' | 'sharpen' | 'done';

// SVG viewBox dimensions used in the placeholder SVGs
const SVG_WIDTH = 256;
const SVG_HEIGHT = 192;

function FullBackgroundImage({
  src,
  placeholder,
  isDark,
  svgStdDeviation,
}: {
  src: StaticImageData;
  placeholder: React.ReactNode;
  isDark: boolean;
  // stdDeviation from the SVG feGaussianBlur, in SVG coordinate units
  svgStdDeviation: number;
}): JSX.Element {
  const [state, setState] = useState<AnimState>('idle');
  const stateRef = useRef<AnimState>('idle');

  function advance(next: AnimState) {
    stateRef.current = next;
    setState(next);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (stateRef.current === 'idle') {
        advance('deferred');
      }
    }, 50);
    return () => {
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (state === 'reveal') {
      const t = setTimeout(() => {
        advance('sharpen');
      }, 500);
      return () => {
        clearTimeout(t);
      };
    }
    if (state === 'sharpen') {
      const t = setTimeout(() => {
        advance('done');
      }, 600);
      return () => {
        clearTimeout(t);
      };
    }
  }, [state]);

  function handleLoad() {
    advance(stateRef.current === 'deferred' ? 'reveal' : 'done');
  }

  const visibilityClass = isDark ? 'hidden dark:block' : 'block dark:hidden';

  let imgStyle: React.CSSProperties;
  switch (state) {
    case 'deferred': {
      imgStyle = { opacity: 0.01, filter: 'blur(40px)' };
      break;
    }
    case 'reveal': {
      // Scale SVG stdDeviation to screen pixels: the placeholder uses `cover`
      // behaviour, so the SVG is scaled by whichever axis fills the viewport.
      const scale = Math.max(
        window.innerWidth / SVG_WIDTH,
        window.innerHeight / SVG_HEIGHT,
      );
      imgStyle = {
        opacity: 1,
        filter: `blur(${svgStdDeviation * scale}px)`,
        transition: 'opacity 500ms ease, filter 500ms ease',
      };
      break;
    }
    case 'sharpen': {
      imgStyle = {
        opacity: 1,
        filter: 'blur(0px)',
        transition: 'filter 600ms ease',
      };
      break;
    }
    default: {
      imgStyle = {};
    }
  }

  return (
    <>
      <div className={`${visibilityClass} absolute inset-0 overflow-hidden`}>
        {placeholder}
      </div>
      <Image
        src={src}
        alt=""
        sizes="calc(max(100vw, 133vh))"
        className={`${visibilityClass} absolute inset-0 object-cover h-full w-full`}
        loading="lazy"
        fetchPriority="low"
        style={imgStyle}
        onLoad={handleLoad}
      />
    </>
  );
}

export function BackgroundImage(): JSX.Element {
  return (
    <div className="fixed w-full h-full -z-50" aria-hidden="true">
      <FullBackgroundImage
        src={night}
        isDark={true}
        svgStdDeviation={17.122_871}
        placeholder={
          <svg
            viewBox="0 0 256 192"
            preserveAspectRatio="xMidYMid slice"
            width="100%"
            height="100%"
          >
            <defs>
              <filter id="n">
                <feGaussianBlur stdDeviation="17.122871" />
              </filter>
            </defs>
            <g filter="url(#n)">
              <rect width="256" height="192" fill="#a2003c" />
              <circle cx="92" cy="234" r="259" fill="#120300" />
              <circle cx="61" cy="-43" r="160" fill="#ff84b363" />
              <circle cx="106" cy="155" r="248" fill="#03006c5e" />
              <circle cx="128" cy="75" r="42" fill="#b3c0cbc2" />
              <circle cx="56" cy="69" r="29" fill="#b0d5ff75" />
              <circle cx="176" cy="81" r="26" fill="#f3e7d3ed" />
              <circle cx="222" cy="67" r="41" fill="#dcfeffa8" />
              <circle cx="140" cy="27" r="71" fill="#00e0ff1a" />
            </g>
          </svg>
        }
      />
      <FullBackgroundImage
        src={field}
        isDark={false}
        svgStdDeviation={20.012_892}
        placeholder={
          <svg
            viewBox="0 0 256 192"
            preserveAspectRatio="xMidYMid slice"
            width="100%"
            height="100%"
          >
            <defs>
              <filter id="f">
                <feGaussianBlur stdDeviation="20.012892" />
              </filter>
            </defs>
            <g filter="url(#f)">
              <rect width="256" height="192" fill="#4c6891" />
              <circle cx="216" cy="46" r="42" fill="#004ddafa" />
              <circle cx="167" cy="196" r="166" fill="#1a14008c" />
              <circle cx="151" cy="106" r="39" fill="#e7cdcccf" />
              <circle cx="65" cy="61" r="80" fill="#ff7181e6" />
              <circle cx="215" cy="78" r="64" fill="#f3edff8f" />
              <circle cx="80" cy="52" r="88" fill="#00b7ff99" />
              <polygon points="3,91 180,105 -30,126" fill="#f8dfbf" />
              <circle cx="84" cy="-38" r="80" fill="#00438754" />
            </g>
          </svg>
        }
      />
    </div>
  );
}
