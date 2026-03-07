'use client';

import React, {
  type PropsWithChildren,
  type ReactElement,
  useEffect,
  useState,
} from 'react';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { buildYearData, type DayTimes } from './buildYearData';
import { DiffTooltip } from './diffTooltip';

import { COL_A, COL_B } from '@/app/tools/sun/colours';
import { minutesToHHMM } from '@/app/tools/sun/minutesToHHMM';
import { minsToTime } from '@/app/tools/sun/minsToTime';
import { useSun } from '@/app/tools/sun/sunContext';

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

export interface Point {
  date: string;
  label: string;
  valB?: number;
  diff?: number;
  valA?: number;
  lngDiff: number;
  latDiff?: number;
}

function Card({ children }: PropsWithChildren): ReactElement {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4">
      {children}
    </div>
  );
}

export function Charts(): React.JSX.Element | null {
  const { a, b, year, metric } = useSun();
  const { loc: locA } = a;
  const { loc: locB } = b;

  const [data, setData] = useState<Point[] | null>(null);

  useEffect(() => {
    const rA = buildYearData(locA.lat, locA.lng, year);
    const rB = buildYearData(locB.lat, locB.lng, year);
    const mapB: Partial<Record<string, DayTimes>> = Object.fromEntries(
      rB.map((r) => [r.date, r]),
    );
    const points: Point[] = rA
      .flatMap((a): Point[] => {
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
          },
        ];
      })
      .filter(Boolean);
    setData(points);
  }, [locA, locB, year, metric]);

  if (!data) {
    return null;
  }

  const tickDates = data.filter((_, i) => i % 30 === 0).map((d) => d.date);

  return (
    <>
      <Card>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
          <span style={{ color: COL_A }}>{locA.name}</span> {metric} minus{' '}
          <span style={{ color: COL_B }}>{locB.name}</span> {metric} · {year}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          Positive = A later · Negative = B later
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={data}
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
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
            />
            <Line
              type="monotone"
              dataKey="lngDiff"
              dot={false}
              stroke="#6b7280"
              strokeWidth={1}
              strokeDasharray="4 2"
              name="Longitude"
            />
            <Line
              type="monotone"
              dataKey="latDiff"
              dot={false}
              stroke="#a78bfa"
              strokeWidth={1}
              strokeDasharray="2 3"
              name="Latitude"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Absolute {metric} times · {year}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={data}
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
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
            />
            <Line
              type="monotone"
              dataKey="valB"
              name={locB.name}
              dot={false}
              stroke={COL_B}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}
