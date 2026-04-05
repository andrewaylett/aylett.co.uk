import React, {
  type PropsWithChildren,
  type ReactNode,
  useDeferredValue,
} from 'react';

import { Temporal } from 'temporal-polyfill';
import { type NameType } from 'recharts/types/component/DefaultTooltipContent';
import { type TooltipPayload, type TooltipValueType } from 'recharts';

import {
  type Point,
  tooltipWrapperClassName,
  Typed,
} from '@/app/tools/sun/charts/point';
import { useSun } from '@/app/tools/sun/sunContext';

export function PointLineChart({
  data,
  children,
  tickFormatter,
  tooltipValueFormatter,
}: PropsWithChildren<{
  data: Point[];
  tickFormatter: (value: number) => string;
  tooltipValueFormatter?: (value: number) => string;
}>): React.JSX.Element {
  const year = useDeferredValue(useSun().date.year);

  const tickDates = Array.from({ length: 12 }, (_, i) => {
    const plainDate = Temporal.PlainDate.from({ year, month: i + 1, day: 1 });
    return plainDate.dayOfYear;
  });

  const base = Temporal.PlainDate.from({ year, month: 1, day: 1 }).subtract(
    Temporal.Duration.from({ days: 1 }),
  );

  function dateLabelFormatter(label: ReactNode, payload: TooltipPayload) {
    if (payload.length === 0) {
      return label;
    }
    const d = (payload[0].payload as Point).day;
    return base
      .add(
        Temporal.Duration.from({
          days: d,
        }),
      )
      .toLocaleString('en-GB', {
        month: 'short',
        day: 'numeric',
      });
  }

  return (
    <Typed.LineChart data={data} responsive className="w-full aspect-video">
      <Typed.CartesianGrid />
      <Typed.XAxis
        dataKey="day"
        type="number"
        ticks={tickDates}
        tickFormatter={(d: number) => {
          return base
            .add(
              Temporal.Duration.from({
                days: d,
              }),
            )
            .toLocaleString('en-GB', {
              month: 'short',
            });
        }}
        tick={{ fontSize: 11 }}
      />
      <Typed.YAxis tickFormatter={tickFormatter} tick={{ fontSize: 11 }} />
      <Typed.Tooltip
        formatter={(v?: TooltipValueType, n?: NameType) => [
          (tooltipValueFormatter ?? tickFormatter)(Number(v)),
          n,
        ]}
        labelFormatter={dateLabelFormatter}
        wrapperClassName={tooltipWrapperClassName}
      />
      <Typed.Legend wrapperStyle={{ fontSize: 11 }} />
      {children}
    </Typed.LineChart>
  );
}
