'use client';

import { useDeferredValue } from 'react';

import type { Loc } from '@/app/tools/sun/locations';

import { type DayTimes, buildYearData } from '@/app/tools/sun/buildYearData';
import { type Point, Typed } from '@/app/tools/sun/charts/point';
import { useSun } from '@/app/tools/sun/sunContext';
import { COL_A, COL_B } from '@/app/tools/sun/colours';
import { PointLineChart } from '@/app/tools/sun/charts/pointLineChart';
import { minsToTime } from '@/app/tools/sun/minsToTime';
import { minsToHuman, minsToHumanHours } from '@/app/tools/sun/minsToHuman';

function useYearData(loc: Loc): DayTimes[] {
  return buildYearData(loc.lat, loc.lng, useSun().date.year);
}

/** Charts for time-of-day metrics: diff, absolute times, and day length. */
export function DayCharts(): JSX.Element {
  const sun = useSun();

  const locA = useDeferredValue(sun.a);
  const locB = useDeferredValue(sun.b);
  const year = useDeferredValue(sun.date.year);
  const metric = useDeferredValue(sun.metric);

  const isPending =
    locA !== sun.a ||
    locB !== sun.b ||
    year !== sun.date.year ||
    metric !== sun.metric;

  const rA = useYearData(locA);
  const rB = useYearData(locB);

  const data = rA
    .flatMap((a, i): Point[] => {
      const b = rB[i];
      console.assert(
        a.date.dayOfYear === b.date.dayOfYear,
        `Year data must be in chronological order, got ${a.date.toString()} !== ${b.date.toString()}`,
      );
      const valA = a[metric];
      const valB = b[metric];
      const diff = valA != null && valB != null ? valA - valB : undefined;
      // Longitude component: purely east-west offset, 4 min/degree, constant through the year.
      // Further east → earlier solar noon → earlier sunrise & sunset (in the same timezone).
      // lngDiff > 0 means A is further west, so A's times are later.
      const lngDiff = Math.round((locA.lng - locB.lng) * -4);
      const latDiff = diff == null ? undefined : diff - lngDiff;
      return [
        {
          day: a.date.dayOfYear,
          label: a.date.toLocaleString('en-GB', {
            month: 'short',
            day: 'numeric',
          }),
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

  return (
    <div style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      <p className="text-xs mb-0.5">
        <span style={{ color: COL_A }}>{locA.name}</span> {metric} minus{' '}
        <span style={{ color: COL_B }}>{locB.name}</span> {metric} · {year}
      </p>
      <p className="text-xs mb-3">
        Positive = <span style={{ color: COL_A }}>{locA.name}</span> later ·
        Negative = <span style={{ color: COL_B }}>{locB.name}</span> later
      </p>
      <PointLineChart data={data} tickFormatter={minsToHuman}>
        <Typed.ReferenceLine y={0} />
        <Typed.Line
          type="monotone"
          dataKey={(p) => p.diff ?? Number.NaN}
          dot={false}
          stroke={COL_A}
          strokeWidth={1}
          name="Total Δ"
          isAnimationActive={false}
        />
        <Typed.Line
          type="monotone"
          dataKey={(p) => p.lngDiff}
          dot={false}
          strokeWidth={1}
          strokeDasharray="4 2"
          name="Longitude Δ"
          isAnimationActive={false}
        />
        <Typed.Line
          type="monotone"
          dataKey={(p) => p.latDiff ?? Number.NaN}
          dot={false}
          strokeWidth={1}
          strokeDasharray="2 3"
          name="Latitude Δ"
          isAnimationActive={false}
        />
      </PointLineChart>
      <p className="text-xs mb-3">
        Absolute {metric} times · {year}
      </p>
      <PointLineChart data={data} tickFormatter={minsToTime}>
        <Typed.Line
          type="monotone"
          dataKey={(p) => p.valA ?? Number.NaN}
          name={locA.name}
          dot={false}
          stroke={COL_A}
          strokeWidth={1}
          isAnimationActive={false}
        />
        <Typed.Line
          type="monotone"
          dataKey={(p) => p.valB ?? Number.NaN}
          name={locB.name}
          dot={false}
          stroke={COL_B}
          strokeWidth={1}
          isAnimationActive={false}
        />
      </PointLineChart>
      <p className="text-xs mb-3">Day length · {year}</p>
      <PointLineChart
        data={data}
        tickFormatter={minsToHumanHours}
        tooltipValueFormatter={minsToHuman}
      >
        <Typed.Line
          type="monotone"
          dataKey={(p) => p.dayLengthA}
          name={locA.name}
          dot={false}
          stroke={COL_A}
          strokeWidth={1}
          isAnimationActive={false}
        />
        <Typed.Line
          type="monotone"
          dataKey={(p) => p.dayLengthB}
          name={locB.name}
          dot={false}
          stroke={COL_B}
          strokeWidth={1}
          isAnimationActive={false}
        />
      </PointLineChart>
    </div>
  );
}
