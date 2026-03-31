'use client';

import React, { useDeferredValue } from 'react';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { type Loc } from '@/app/tools/sun/locations';
import { type Point } from '@/app/tools/sun/charts/point';
import { useSun } from '@/app/tools/sun/sunContext';
import { buildYearData, type DayTimes } from '@/app/tools/sun/buildYearData';
import { ChartCard } from '@/app/tools/sun/charts/chartCard';
import { COL_A, COL_B } from '@/app/tools/sun/colours';
import { minutesToHHMM } from '@/app/tools/sun/minutesToHHMM';
import { DiffTooltip } from '@/app/tools/sun/charts/diffTooltip';
import { minsToTime } from '@/app/tools/sun/minsToTime';
import { minsToHuman } from '@/app/tools/sun/minsToHuman';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function useYearData(loc: Loc): DayTimes[] {
  return buildYearData(loc.lat, loc.lng, useSun().year);
}

/** Charts for time-of-day metrics: diff, absolute times, and day length. */
export function DayCharts(): React.JSX.Element {
  const sun = useSun();

  const locA = useDeferredValue(sun.a);
  const locB = useDeferredValue(sun.b);
  const year = useDeferredValue(sun.year);
  const metric = useDeferredValue(sun.metric);

  const isPending =
    locA !== sun.a ||
    locB !== sun.b ||
    year !== sun.year ||
    metric !== sun.metric;

  const rA = useYearData(locA);
  const rB = useYearData(locB);
  const mapB: Partial<Record<string, DayTimes>> = Object.fromEntries(
    rB.map((r) => [r.date, r]),
  );
  const data = rA
    .flatMap((a, i): Point[] => {
      const b = mapB[a.date];
      if (!b) return [];
      const valA = a[metric];
      const valB = b[metric];
      const diff = valA != null && valB != null ? valA - valB : undefined;
      // Longitude component: purely east-west offset, 4 min/degree, constant through the year.
      // Further east → earlier solar noon → earlier sunrise & sunset (in the same timezone).
      // lngDiff > 0 means A is further west, so A's times are later.
      const lngDiff = Math.round((locA.lng - locB.lng) * -4);
      const latDiff = diff == null ? undefined : diff - lngDiff;
      const [, mo, d] = a.date.split('-').map(Number);
      return [
        {
          date: a.date,
          label: `${d} ${MONTHS[mo - 1]}`,
          diff,
          valA,
          valB,
          lngDiff,
          latDiff,
          dayLengthA: rA[i].dayLength,
          dayLengthB: b.dayLength,
        },
      ];
    })
    .filter(Boolean);

  const tickDates = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });

  return (
    <div style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      <ChartCard>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
          <span style={{ color: COL_A }}>{locA.name}</span> {metric} minus{' '}
          <span style={{ color: COL_B }}>{locB.name}</span> {metric} · {year}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          Positive = A later · Negative = B later
        </p>
        <LineChart
          data={data}
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          responsive
          style={{
            width: '100%',
            maxHeight: '80vh',
            aspectRatio: 1.618,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            ticks={tickDates}
            tickFormatter={(d: string) =>
              MONTHS[Number.parseInt(d.split('-')[1], 10) - 1]
            }
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
          />
          <YAxis
            tickFormatter={minutesToHHMM}
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            width={72}
          />
          <Tooltip content={DiffTooltip} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
          <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="4 2" />
          <Line
            type="monotone"
            dataKey="diff"
            dot={false}
            stroke={COL_A}
            strokeWidth={2}
            name="Total"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="lngDiff"
            dot={false}
            stroke="#6b7280"
            strokeWidth={1}
            strokeDasharray="4 2"
            name="Longitude"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="latDiff"
            dot={false}
            stroke="#a78bfa"
            strokeWidth={1}
            strokeDasharray="2 3"
            name="Latitude"
            isAnimationActive={false}
          />
        </LineChart>
      </ChartCard>
      <ChartCard>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Absolute {metric} times · {year}
        </p>
        <LineChart
          data={data}
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          responsive
          style={{
            width: '100%',
            maxHeight: '80vh',
            aspectRatio: 1.618,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            ticks={tickDates}
            tickFormatter={(d: string) =>
              MONTHS[Number.parseInt(d.split('-')[1], 10) - 1]
            }
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
          />
          <YAxis
            tickFormatter={minsToTime}
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            width={48}
          />
          <Tooltip
            formatter={(v: number | undefined, n: string | undefined) => [
              minsToTime(v),
              n,
            ]}
            contentStyle={{
              background: '#111827',
              border: '1px solid #374151',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
          <Line
            type="monotone"
            dataKey="valA"
            name={locA.name}
            dot={false}
            stroke={COL_A}
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="valB"
            name={locB.name}
            dot={false}
            stroke={COL_B}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartCard>
      <ChartCard>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Day length · {year}
        </p>
        <LineChart
          data={data}
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          responsive
          style={{
            width: '100%',
            maxHeight: '80vh',
            aspectRatio: 1.618,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            ticks={tickDates}
            tickFormatter={(d: string) =>
              MONTHS[Number.parseInt(d.split('-')[1], 10) - 1]
            }
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
          />
          <YAxis
            tickFormatter={minsToHuman}
            stroke="#6b7280"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            width={56}
          />
          <Tooltip
            formatter={(v: number | undefined, n: string | undefined) => [
              minsToHuman(v),
              n,
            ]}
            contentStyle={{
              background: '#111827',
              border: '1px solid #374151',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
          <Line
            type="monotone"
            dataKey="dayLengthA"
            name={locA.name}
            dot={false}
            stroke={COL_A}
            strokeWidth={1}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="dayLengthB"
            name={locB.name}
            dot={false}
            stroke={COL_B}
            strokeWidth={1}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartCard>
    </div>
  );
}
