'use client';

import React, { type ReactNode, useState } from 'react';

import { Temporal } from 'temporal-polyfill';

import { type SunriseOrSunset } from '@/app/tools/sun/sunriseSunsetInner';
import {
  type Loc,
  type LocationRef,
  PRESET_LOCATIONS,
} from '@/app/tools/sun/locations';
import { SunContext } from '@/app/tools/sun/sunContext';

export function SunProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [date, setDate] = useState<Temporal.PlainDate>(() =>
    Temporal.Now.plainDateISO(),
  );
  const [metric, setMetric] = useState<SunriseOrSunset>('sunset');

  const [a, setA] = useState(PRESET_LOCATIONS[0]);
  const [b, setB] = useState(PRESET_LOCATIONS[1]);

  function setLoc(locRef: LocationRef, loc: Loc | ((loc: Loc) => Loc)) {
    switch (locRef) {
      case 'A': {
        setA(loc);
        break;
      }
      case 'B': {
        setB(loc);
        break;
      }
      default: {
        throw new Error('Invalid location reference');
      }
    }
  }

  return (
    <SunContext.Provider
      value={{
        a,
        b,
        date,
        metric,
        setDate,
        setMetric,
        setLoc,
      }}
    >
      {children}
    </SunContext.Provider>
  );
}
