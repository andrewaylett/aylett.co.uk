'use client';

import React from 'react';

import { useSun } from '@/app/tools/sun/sunContext';

export function DatePicker(): React.JSX.Element {
  const { date, setDate } = useSun();
  return (
    <div className="mb-4">
      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
        Date
      </label>
      <input
        type="date"
        value={date}
        onChange={(e) => {
          setDate(e.target.value);
        }}
        className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md px-2.5 py-1 text-sm"
      />
    </div>
  );
}
