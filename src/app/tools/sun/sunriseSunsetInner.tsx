'use client';

import { useTransition } from 'react';

import { useSun } from '@/app/tools/sun/sunContext';

export type SunriseOrSunset = 'sunrise' | 'sunset' | 'dawn' | 'dusk';
const sunriseAndSunset: SunriseOrSunset[] = [
  'dawn',
  'sunrise',
  'sunset',
  'dusk',
];

export function SunriseSunsetInner(): JSX.Element {
  const [_, startTransition] = useTransition();
  const { date, metric, setDate, setMetric } = useSun();

  return (
    <>
      <div>
        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
          Year
        </label>
        <input
          type="number"
          value={date.year}
          min={2000}
          max={2099}
          onChange={(e) => {
            startTransition(() => {
              setDate(date.with({ year: Number.parseInt(e.target.value, 10) }));
            });
          }}
          className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md px-2.5 py-1 text-sm w-24"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
          Metric
        </label>
        <div className="flex gap-2">
          {sunriseAndSunset.map((m) => (
            <button
              key={m}
              onClick={() => {
                startTransition(() => {
                  setMetric(m);
                });
              }}
              className={`text-xs px-3 py-1 rounded-md cursor-pointer bg-transparent border ${
                metric === m
                  ? 'border-amber-400 text-amber-400'
                  : 'border-slate-500 text-slate-500'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
