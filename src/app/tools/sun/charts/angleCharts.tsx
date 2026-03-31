'use client';

import React, { useDeferredValue } from 'react';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useDeclinations, useSun } from '@/app/tools/sun/sunContext';
import {
  buildAngleData,
  solarElevationRange,
} from '@/app/tools/sun/buildAngleData';
import { COL_A, COL_B } from '@/app/tools/sun/colours';
import { ChartCard } from '@/app/tools/sun/charts/chartCard';

/** Chart for hours above a given solar elevation angle across the year. */
export function AngleCharts(): React.JSX.Element {
  const sun = useSun();

  const locA = useDeferredValue(sun.a.loc);
  const locB = useDeferredValue(sun.b.loc);
  const year = useDeferredValue(sun.year);
  const declinations = useDeferredValue(useDeclinations());

  // Compute the union of both locations' annual elevation ranges so both
  // lines share the same x-axis.
  const rangeA = solarElevationRange(locA.lat, declinations);
  const rangeB = solarElevationRange(locB.lat, declinations);
  const minAngle = Math.min(rangeA.minAngle, rangeB.minAngle);
  const maxAngle = Math.max(rangeA.maxAngle, rangeB.maxAngle);
  const adA = buildAngleData(locA.lat, year, minAngle, maxAngle);
  const adB = buildAngleData(locB.lat, year, minAngle, maxAngle);
  const angleData = adA.map((p, i) => ({
    angle: p.angle,
    hoursA: p.hours,
    hoursB: adB[i].hours,
  }));

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
    <ChartCard>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Hours above elevation · {year}
      </p>
      <LineChart
        data={angleData}
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
          strokeWidth={1}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="hoursB"
          name={locB.name}
          dot={false}
          stroke={COL_B}
          strokeWidth={1}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartCard>
  );
}
