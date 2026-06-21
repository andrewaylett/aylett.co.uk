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
        svgStdDeviation={3.066_669}
        placeholder={
          <svg
            viewBox="0 0 256 192"
            preserveAspectRatio="xMidYMid slice"
            width="100%"
            height="100%"
          >
            <defs>
              <filter id="night-blur">
                <feGaussianBlur stdDeviation={3.066_669} />
              </filter>
            </defs>
            <g filter="url(#night-blur)">
              <rect width="256" height="192" fill="#0a1323" />
              <polygon
                points="-2,123 0,195 251,195"
                fill="#000000"
                fillOpacity={1}
              />
              <polygon
                points="259,10 -2,51 252,119"
                fill="#2e3f5f"
                fillOpacity={0.99}
              />
              <polygon
                points="259,41 -4,68 235,114"
                fill="#a7dfff"
                fillOpacity={0.45}
              />
              <polygon
                points="215,-4 14,15 226,147"
                fill="#acffff"
                fillOpacity={0.17}
              />
              <polygon
                points="259,66 -4,83 258,106"
                fill="#ffffec"
                fillOpacity={0.64}
              />
              <polygon
                points="205,94 175,106 54,112"
                fill="#f0ffff"
                fillOpacity={1}
              />
              <polygon
                points="259,92 -4,129 259,195"
                fill="#000000"
                fillOpacity={0.74}
              />
              <polygon
                points="213,93 224,95 134,97"
                fill="#030300"
                fillOpacity={0.95}
              />
            </g>
          </svg>
        }
      />
      <FullBackgroundImage
        src={field}
        isDark={false}
        svgStdDeviation={1.640_433}
        placeholder={
          <svg
            viewBox="0 0 256 192"
            preserveAspectRatio="xMidYMid slice"
            width="100%"
            height="100%"
          >
            <defs>
              <filter id="field-blur">
                <feGaussianBlur stdDeviation={1.640_433} />
              </filter>
            </defs>
            <g filter="url(#field-blur)">
              <rect width="256" height="192" fill="#394630" />
              <polygon
                points="-1,4 257,48 1,131"
                fill="#e3f8ff"
                fillOpacity={0.58}
              />
              <polygon
                points="252,58 19,157 257,193"
                fill="#162717"
                fillOpacity={0.73}
              />
              <polygon
                points="84,18 -2,130 245,139"
                fill="#d9cec9"
                fillOpacity={0.96}
              />
              <polygon
                points="250,153 2,166 248,169"
                fill="#d7eb6d"
                fillOpacity={0.25}
              />
              <polygon
                points="253,58 128,69 254,141"
                fill="#ffbe00"
                fillOpacity={0.96}
              />
              <polygon
                points="255,-1 -2,0 257,142"
                fill="#5494e2"
                fillOpacity={0.81}
              />
              <polygon
                points="66,37 31,91 257,147"
                fill="#3c00b2"
                fillOpacity={0.11}
              />
              <polygon
                points="69,55 211,140 128,142"
                fill="#aeb9cb"
                fillOpacity={0.89}
              />
            </g>
          </svg>
        }
      />
    </div>
  );
}
