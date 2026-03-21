'use client';

import React, { type ReactNode, useState } from 'react';

import { Temporal } from 'temporal-polyfill';

import { type SunriseOrSunset } from '@/app/tools/sun/sunriseSunsetInner';
import { type Loc, PRESET_LOCATIONS } from '@/app/tools/sun/locations';
import {
  type CustomLoc,
  type LocState,
  SunContext,
} from '@/app/tools/sun/sunContext';

function useLoc(initial: Loc): LocState {
  const [loc, setLoc] = useState<Loc>(initial);
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [custom, setCustom] = useState<CustomLoc>({
    name: '',
    lat: '',
    lng: '',
  });

  return {
    loc,
    setLoc,
    mode,
    setMode,
    custom,
    setCustomField: (key, value) => {
      setCustom((prev) => ({ ...prev, [key]: value }));
    },
  };
}

export function SunProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const today = Temporal.Now.plainDateISO();
  const thisYear = today.year;

  const [date, setDate] = useState<Temporal.PlainDate>(today);
  const [year, setYear] = useState<number>(thisYear);
  const [metric, setMetric] = useState<SunriseOrSunset>('sunset');

  const a = useLoc(PRESET_LOCATIONS[0]);
  const b = useLoc(PRESET_LOCATIONS[1]);

  return (
    <SunContext.Provider
      value={{
        a,
        b,
        date,
        year,
        metric,
        setDate,
        setYear,
        setMetric,
      }}
    >
      {children}
    </SunContext.Provider>
  );
}
