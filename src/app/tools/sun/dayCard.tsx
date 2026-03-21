import React from 'react';

import { type Temporal } from 'temporal-polyfill';

import { type Loc } from '@/app/tools/sun/locations';
import { solarTimes } from '@/app/tools/sun/solarTimes';
import { minsToTime } from '@/app/tools/sun/minsToTime';
import { minsToHuman } from '@/app/tools/sun/minsToHuman';

export function DayCard({
  loc,
  date,
  color,
}: {
  loc: Loc;
  date: Temporal.PlainDate;
  color: string;
}): React.JSX.Element {
  const { sunrise, sunset, dawn, dusk, dayLength, polar } = solarTimes(
    date,
    loc.lat,
    loc.lng,
  );
  const labels: [string, string][] = [
    ['Dawn', minsToTime(dawn)],
    ['Sunrise', minsToTime(sunrise)],
    ['Sunset', minsToTime(sunset)],
    ['Dusk', minsToTime(dusk)],
    ['Day length', minsToHuman(dayLength)],
  ];
  return (
    <div className="flex-1 min-w-50 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
        {loc.name}
      </p>
      {polar ? (
        <p className="text-slate-500 dark:text-slate-400 italic text-sm">
          {polar}
        </p>
      ) : (
        <div className="flex flex-wrap gap-5">
          {labels.map(([label, val]) => (
            <div key={label}>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {label}
              </p>
              <p
                className="font-mono text-lg"
                style={{
                  color:
                    label === 'Day length'
                      ? undefined
                      : label === 'Dawn' || label === 'Dusk'
                        ? `color-mix(in srgb, ${color} 60%, transparent)`
                        : color,
                }}
              >
                {val}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
