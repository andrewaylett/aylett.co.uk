'use client';

import React from 'react';

import { useSun } from '@/app/tools/sun/sunContext';
import { COL_NEG, COL_POS } from '@/app/tools/sun/colours';
import { minutesToHHMM } from '@/app/tools/sun/minutesToHHMM';

export function SunDifference(): React.JSX.Element {
  const { a, b, date, metric, diff } = useSun();
  if (diff === null) {
    return <></>;
  }
  return (
    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
        {metric === 'sunrise' ? 'Sunrise' : 'Sunset'} difference on{' '}
        {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
      <p
        className="font-mono text-2xl"
        style={{ color: diff >= 0 ? COL_POS : COL_NEG }}
      >
        {minutesToHHMM(diff)}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {diff >= 0 ? a.loc.name : b.loc.name} has the later {metric}.
      </p>
    </div>
  );
}
