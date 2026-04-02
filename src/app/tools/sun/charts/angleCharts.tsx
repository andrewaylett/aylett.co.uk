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
import {
  type NameType,
  type ValueType,
} from 'recharts/types/component/DefaultTooltipContent';

import { useSun } from '@/app/tools/sun/sunContext';
import { buildAngleData } from '@/app/tools/sun/buildAngleData';
import { COL_A, COL_B } from '@/app/tools/sun/colours';
import { ChartCard } from '@/app/tools/sun/charts/chartCard';

/** Chart for hours above a given solar elevation angle across the year. */
export function AngleCharts(): React.JSX.Element {
  const sun = useSun();

  const locA = useDeferredValue(sun.a);
  const locB = useDeferredValue(sun.b);
  const year = useDeferredValue(sun.year);

  // Both datasets cover -90°..90°; merge by index, dropping points where the
  // sun never reaches the angle (both zero) or always exceeds it (both at max).
  const adA = buildAngleData(locA.lat, year);
  const adB = buildAngleData(locB.lat, year);
  const maxHours = adA[0]?.hours ?? 0; // hours at −90° = total hours in year
  const angleData = adA
    .map((pA, i) => ({
      angle: pA.angle,
      hoursA: pA.hours,
      hoursB: adB[i].hours,
    }))
    .filter(
      ({ hoursA, hoursB }) =>
        !(hoursA === 0 && hoursB === 0) &&
        !(hoursA === maxHours && hoursB === maxHours),
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
          formatter={(v: ValueType | undefined, n: NameType | undefined) => [
            v == null ? '—' : `${String(v)}h`,
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
