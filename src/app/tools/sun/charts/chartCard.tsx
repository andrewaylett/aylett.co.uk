import React, { type PropsWithChildren, type ReactElement } from 'react';

export function ChartCard({ children }: PropsWithChildren): ReactElement {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4">
      {children}
    </div>
  );
}
