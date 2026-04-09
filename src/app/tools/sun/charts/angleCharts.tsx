'use client';

import { useDeferredValue } from 'react';

import {
  CartesianGrid,
  createHorizontalChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useSun } from '@/app/tools/sun/sunContext';
import { buildAngleData } from '@/app/tools/sun/buildAngleData';
import { COL_A, COL_B } from '@/app/tools/sun/colours';
import { tooltipWrapperClassName } from '@/app/tools/sun/charts/point';

interface AngleData {
  angle: number;
  hoursA: number;
  hoursB: number;
}

/** Chart for hours above a given solar elevation angle across the year. */
export function AngleCharts(): JSX.Element {
  const sun = useSun();

  const locA = useDeferredValue(sun.a);
  const locB = useDeferredValue(sun.b);
  const year = useDeferredValue(sun.date.year);

  const isPending = locA !== sun.a || locB !== sun.b || year !== sun.date.year;

  // Both datasets cover -90°..90°; merge by index, dropping points where the
  // sun never reaches the angle (both zero) or always exceeds it (both at max).
  const adA = buildAngleData(locA.lat, year);
  const adB = buildAngleData(locB.lat, year);
  const maxHours = adA[0]?.hours ?? 0; // hours at −90° = total hours in year
  const angleData: AngleData[] = adA
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

  const Typed = createHorizontalChart<AngleData, number>()({
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ReferenceLine,
    Tooltip,
    XAxis,
    YAxis,
  });

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
      <p className="text-xs mb-3">Hours above elevation · {year}</p>
      <Typed.LineChart
        data={angleData}
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        responsive
        className="w-full aspect-video intrinsic-h-[calc(var(--column-width-max)/16*9)]"
      >
        <Typed.CartesianGrid />
        <Typed.XAxis
          dataKey={(p) => p.angle}
          type="number"
          ticks={angleTicks}
          tickFormatter={(v: number) => `${v}°`}
          tick={{ fontSize: 11 }}
        />
        <Typed.YAxis
          tickFormatter={(v: number) => `${v}h`}
          tick={{ fontSize: 11 }}
        />
        <Typed.Tooltip
          formatter={(v?: unknown, n?: string | number) => {
            const hours = v as number;
            return [v == null ? '—' : `${Math.round(hours)}h`, n];
          }}
          labelFormatter={(v: unknown) => `${String(v)}° elevation`}
          wrapperClassName={tooltipWrapperClassName}
        />
        <Typed.Legend wrapperStyle={{ fontSize: 11 }} />
        <Typed.Line
          type="monotone"
          dataKey={(p) => p.hoursA}
          name={locA.name}
          dot={false}
          stroke={COL_A}
          strokeWidth={1}
          isAnimationActive={false}
        />
        <Typed.Line
          type="monotone"
          dataKey={(p) => p.hoursB}
          name={locB.name}
          dot={false}
          stroke={COL_B}
          strokeWidth={1}
          isAnimationActive={false}
        />
      </Typed.LineChart>
    </div>
  );
}
