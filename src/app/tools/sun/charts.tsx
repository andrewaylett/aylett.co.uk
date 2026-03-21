'use client';

import React, {
  type PropsWithChildren,
  type ReactElement,
  useDeferredValue,
  useMemo,
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

import { buildAngleData, solarElevationRange } from './buildAngleData';
import { buildYearData, type DayTimes } from './buildYearData';
import { DiffTooltip } from './diffTooltip';

import { COL_A, COL_B } from '@/app/tools/sun/colours';
import { minutesToHHMM } from '@/app/tools/sun/minutesToHHMM';
import { minsToTime } from '@/app/tools/sun/minsToTime';
import { minsToHuman } from '@/app/tools/sun/minsToHuman';
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
  dayLengthA?: number;
  dayLengthB?: number;
}

function Card({ children }: PropsWithChildren): ReactElement {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4">
      {children}
    </div>
  );
}

export function Charts(): React.JSX.Element {
  const { a, b, year, metric } = useSun();
  const { loc: locA } = a;
  const { loc: locB } = b;

  const deferredLocA = useDeferredValue(locA);
  const deferredLocB = useDeferredValue(locB);
  const deferredYear = useDeferredValue(year);
  const deferredMetric = useDeferredValue(metric);

  const isPending =
    deferredLocA !== locA ||
    deferredLocB !== locB ||
    deferredYear !== year ||
    deferredMetric !== metric;

  const data = useMemo<Point[]>(() => {
    const rA = buildYearData(deferredLocA.lat, deferredLocA.lng, deferredYear);
    const rB = buildYearData(deferredLocB.lat, deferredLocB.lng, deferredYear);
    const mapB: Partial<Record<string, DayTimes>> = Object.fromEntries(
      rB.map((r) => [r.date, r]),
    );
    return rA
      .flatMap((a, i): Point[] => {
        const b = mapB[a.date];
        if (!b) return [];
        const valA = a[deferredMetric];
        const valB = b[deferredMetric];
        const diff = valA != null && valB != null ? valA - valB : undefined;
        // Longitude component: purely east-west offset, 4 min/degree, constant through the year.
        // Further east → earlier solar noon → earlier sunrise & sunset (in the same timezone).
        // lngDiff > 0 means A is further west, so A's times are later.
        const lngDiff = Math.round((deferredLocA.lng - deferredLocB.lng) * -4);
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
  }, [deferredLocA, deferredLocB, deferredYear, deferredMetric]);

  const angleData = useMemo(() => {
    // Compute the union of both locations' annual elevation ranges so both
    // lines share the same x-axis.
    const rangeA = solarElevationRange(locA.lat, year);
    const rangeB = solarElevationRange(locB.lat, year);
    const minAngle = Math.min(rangeA.minAngle, rangeB.minAngle);
    const maxAngle = Math.max(rangeA.maxAngle, rangeB.maxAngle);
    const adA = buildAngleData(locA.lat, locA.lng, year, minAngle, maxAngle);
    const adB = buildAngleData(locB.lat, locB.lng, year, minAngle, maxAngle);
    return adA.map((p, i) => ({
      angle: p.angle,
      hoursA: p.hours,
      hoursB: adB[i].hours,
    }));
  }, [locA, locB, year]);

  const tickDates = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const month = String(i + 1).padStart(2, '0');
        return `${deferredYear}-${month}-01`;
      }),
    [deferredYear],
  );

  const angleTicks: number[] = [];
  if (angleData.length > 0) {
    const minAngle = angleData[0].angle;
    const last = angleData.at(-1);
    const maxAngle = last ? last.angle : minAngle;
    for (let t = Math.ceil(minAngle / 10) * 10; t <= maxAngle; t += 10) {
      angleTicks.push(t);
    }
  }

  return (
    <div style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
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
        </ResponsiveContainer>
      </Card>
      <Card>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Day length · {year}
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
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="dayLengthB"
              name={locB.name}
              dot={false}
              stroke={COL_B}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Hours above elevation · {year}
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={angleData}
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="angle"
              ticks={angleTicks}
              tickFormatter={(v: number) => `${v}°`}
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v: number) => `${v}h`}
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              width={48}
            />
            <Tooltip
              formatter={(v: number | undefined, n: string | undefined) => [
                v == null ? '—' : `${v}h`,
                n,
              ]}
              labelFormatter={(v: unknown) => `${String(v)}° elevation`}
              contentStyle={{
                background: '#111827',
                border: '1px solid #374151',
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
            <Line
              type="monotone"
              dataKey="hoursA"
              name={locA.name}
              dot={false}
              stroke={COL_A}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="hoursB"
              name={locB.name}
              dot={false}
              stroke={COL_B}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
