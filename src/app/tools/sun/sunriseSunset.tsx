import React, { Suspense } from 'react';

import { SunProvider } from '@/app/tools/sun/sunProvider';
import { SunriseSunsetInner } from '@/app/tools/sun/sunriseSunsetInner';
import { LocationPickers } from '@/app/tools/sun/locationPickers';
import { DatePicker } from '@/app/tools/sun/datePicker';
import { DayCards } from '@/app/tools/sun/dayCards';
import { SunDifference } from '@/app/tools/sun/sunDifference';
import { AngleCharts } from '@/app/tools/sun/charts/angleCharts';
import { DayCharts } from '@/app/tools/sun/charts/dayCharts';
import { BasicFallback } from '@/components/BasicFallback';

export function SunriseSunset(): React.JSX.Element {
  return (
    <SunProvider>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
        UK local time (GMT/BST). Calculated locally — no network required.
      </p>
      <Suspense fallback={<BasicFallback />}>
        <LocationPickers />
        <DatePicker />
        <DayCards />
        <SunDifference />
        <SunriseSunsetInner />
        <DayCharts />
        <AngleCharts />
      </Suspense>
      <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
        Solar position via Meeus / NOAA algorithm · accuracy ±1–2 min
      </p>
    </SunProvider>
  );
}
