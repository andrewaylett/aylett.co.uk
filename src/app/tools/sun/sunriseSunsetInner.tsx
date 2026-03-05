'use client';

import React from 'react';

import { useSun } from '@/app/tools/sun/sunContext';

export type SunriseOrSunset = 'sunrise' | 'sunset';
const sunriseAndSunset: SunriseOrSunset[] = ['sunrise', 'sunset'];

export function SunriseSunsetInner(): React.JSX.Element {
  const { year, metric, setYear, setMetric } = useSun();

  return (
    <>
      <div className="flex flex-wrap gap-5 items-end mb-4">
        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
            Year
          </label>
          <input
            type="number"
            value={year}
            min={2000}
            max={2099}
            onChange={(e) => {
              setYear(Number.parseInt(e.target.value, 10));
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
                  setMetric(m);
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
      </div>
    </>
  );
}
