'use client';

import { createContext, useContext } from 'react';

import { type Temporal } from 'temporal-polyfill';

import { type SunriseOrSunset } from '@/app/tools/sun/sunriseSunsetInner';
import { type Loc, type LocationRef } from '@/app/tools/sun/locations';

interface SunState {
  a: Loc;
  b: Loc;
  date: Temporal.PlainDate;
  metric: SunriseOrSunset;
  setDate: (date: Temporal.PlainDate) => void;
  setMetric: (metric: SunriseOrSunset) => void;

  setLoc(
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    this: void,
    locRef: LocationRef,
    loc: Loc | ((loc: Loc) => Loc),
  ): void;
}

export const SunContext = createContext<SunState | undefined>(undefined);

export function useSun(): SunState {
  const ctx = useContext(SunContext);
  if (!ctx) throw new Error('useSun must be used within SunProvider');
  return ctx;
}

export function useLoc(
  locRef: LocationRef,
): [Loc, (loc: Loc | ((loc: Loc) => Loc)) => void] {
  const { a, b, setLoc } = useSun();
  switch (locRef) {
    case 'A': {
      return [
        a,
        (loc) => {
          setLoc('A', loc);
        },
      ];
    }
    case 'B': {
      return [
        b,
        (loc) => {
          setLoc('B', loc);
        },
      ];
    }
    default: {
      throw new Error('Invalid location reference');
    }
  }
}
