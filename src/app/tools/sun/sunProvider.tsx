'use client';

import React, { type ReactNode, useState } from 'react';

import { type SunriseOrSunset } from '@/app/tools/sun/sunriseSunsetInner';
import { type Loc, PRESET_LOCATIONS } from '@/app/tools/sun/locations';
import { solarTimes } from '@/app/tools/sun/solarTimes';
import {
  type CustomLoc,
  type LocState,
  SunContext,
} from '@/app/tools/sun/sunContext';

function useLoc(initial: Loc, date: string): LocState {
  const [loc, setLoc] = useState<Loc>(initial);
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [custom, setCustom] = useState<CustomLoc>({
    name: '',
    lat: '',
    lng: '',
  });

  const day = { date, ...solarTimes(date, loc.lat, loc.lng) };

  return {
    loc,
    day,
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
  const today = new Date().toLocaleDateString('en-CA');
  const thisYear = new Date().getFullYear();

  const [date, setDate] = useState(today);
  const [year, setYear] = useState(thisYear);
  const [metric, setMetric] = useState<SunriseOrSunset>('sunset');

  const a = useLoc(PRESET_LOCATIONS[0], date);
  const b = useLoc(PRESET_LOCATIONS[1], date);

  const diff = (() => {
    if (!a.day || !b.day) return null;
    const kA = a.day[metric];
    const kB = b.day[metric];
    return kA != null && kB != null ? kA - kB : null;
  })();

  return (
    <SunContext.Provider
      value={{
        a,
        b,
        date,
        year,
        metric,
        diff,
        setDate,
        setYear,
        setMetric,
      }}
    >
      {children}
    </SunContext.Provider>
  );
}
