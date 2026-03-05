'use client';

import { createContext, useContext } from 'react';

import { type DayTimes } from '@/app/tools/sun/buildYearData';
import { type Loc } from '@/app/tools/sun/locations';

export interface CustomLoc {
  name: string;
  lat: string;
  lng: string;
}

export interface LocState {
  loc: Loc;
  day: DayTimes | undefined;
  setLoc: (loc: Loc) => void;
  mode: 'preset' | 'custom';
  setMode: (mode: 'preset' | 'custom') => void;
  custom: CustomLoc;
  setCustomField: (key: keyof CustomLoc, value: string) => void;
}

interface SunState {
  a: LocState;
  b: LocState;
  date: string;
  year: number;
  metric: 'sunrise' | 'sunset';
  diff: number | null;
  setDate: (date: string) => void;
  setYear: (year: number) => void;
  setMetric: (metric: 'sunrise' | 'sunset') => void;
}

export const SunContext = createContext<SunState | undefined>(undefined);

export function useSun(): SunState {
  const ctx = useContext(SunContext);
  if (!ctx) throw new Error('useSun must be used within SunProvider');
  return ctx;
}
