import React from 'react';

import { type TooltipContentProps } from 'recharts';

import { type Point } from '@/app/tools/sun/charts/point';
import { COL_NEG, COL_POS } from '@/app/tools/sun/colours';
import { minutesToHHMM } from '@/app/tools/sun/minutesToHHMM';
import { minsToTime } from '@/app/tools/sun/minsToTime';

export function DiffTooltip({
  active,
  payload,
}: TooltipContentProps): React.JSX.Element | null {
  if (!active || payload.length === 0) return null;
  const d: Point = (payload[0] as { payload: Point }).payload;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white">
      <p className="font-semibold mb-1">{d.label}</p>
      {d.diff !== undefined && (
        <p style={{ color: d.diff >= 0 ? COL_POS : COL_NEG }}>
          Total Δ {minutesToHHMM(d.diff)}
        </p>
      )}
      <p className="text-slate-400">Longitude {minutesToHHMM(d.lngDiff)}</p>
      {d.latDiff !== undefined && (
        <p className="text-slate-400">Latitude {minutesToHHMM(d.latDiff)}</p>
      )}
      <p className="text-slate-400 mt-1">
        A: {minsToTime(d.valA)} · B: {minsToTime(d.valB)}
      </p>
    </div>
  );
}
