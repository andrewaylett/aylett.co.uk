import React from 'react';

import { type LocState } from '@/app/tools/sun/sunContext';
import { minsToTime } from '@/app/tools/sun/minsToTime';
import { minsToHuman } from '@/app/tools/sun/minsToHuman';

export function DayCard({
  location,
  color,
}: {
  location: LocState;
  color: string;
}): React.JSX.Element {
  const {
    loc: { name },
    day: data,
  } = location;
  if (!data)
    return (
      <div className="flex-1 min-w-50 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 opacity-40">
        <p className="text-slate-400 dark:text-slate-500 text-xs">{name}</p>
      </div>
    );
  const { sunrise, sunset, dawn, dusk, dayLength, polar } = data;
  const labels: [string, string][] = [
    ['Dawn', minsToTime(dawn)],
    ['Sunrise', minsToTime(sunrise)],
    ['Sunset', minsToTime(sunset)],
    ['Dusk', minsToTime(dusk)],
    ['Day length', minsToHuman(dayLength)],
  ];
  return (
    <div className="flex-1 min-w-50 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{name}</p>
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
