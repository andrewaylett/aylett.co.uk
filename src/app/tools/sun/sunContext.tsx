'use client';

import { createContext, useContext } from 'react';

import { type Temporal } from 'temporal-polyfill';

import { type SunriseOrSunset } from '@/app/tools/sun/sunriseSunsetInner';
import { type Loc } from '@/app/tools/sun/locations';
import {
  computeDeclinations,
  type Declination,
} from '@/app/tools/sun/buildAngleData';

export interface CustomLoc {
  name: string;
  lat: string;
  lng: string;
}

export interface LocState {
  loc: Loc;
  setLoc: (loc: Loc) => void;
  mode: 'preset' | 'custom';
  setMode: (mode: 'preset' | 'custom') => void;
  custom: CustomLoc;
  setCustomField: (key: keyof CustomLoc, value: string) => void;
}

interface SunState {
  a: LocState;
  b: LocState;
  date: Temporal.PlainDate;
  year: number;
  metric: SunriseOrSunset;
  setDate: (date: Temporal.PlainDate) => void;
  setYear: (year: number) => void;
  setMetric: (metric: SunriseOrSunset) => void;
}

export const SunContext = createContext<SunState | undefined>(undefined);

export function useSun(): SunState {
  const ctx = useContext(SunContext);
  if (!ctx) throw new Error('useSun must be used within SunProvider');
  return ctx;
}

export function useDeclinations(): Declination[] {
  return computeDeclinations(useSun().year);
}
