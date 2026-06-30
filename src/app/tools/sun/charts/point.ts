import type { ComponentType } from 'react';

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
  type TooltipProps,
  type LineProps,
  type XAxisProps,
  type YAxisProps,
} from 'recharts';

export interface Point {
  day: number;
  label: string;
  valB?: number;
  diff?: number;
  valA?: number;
  lngDiff: number;
  latDiff?: number;
  dayLengthA: number;
  dayLengthB: number;
}

export const tooltipWrapperClassName =
  'bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-50';

export const Typed: {
  CartesianGrid: typeof CartesianGrid;
  Legend: typeof Legend;
  Line: ComponentType<LineProps<Point, number>>;
  LineChart: typeof LineChart<Point>;
  ReferenceLine: typeof ReferenceLine<number, number>;
  Tooltip: ComponentType<TooltipProps<number, keyof Point>>;
  XAxis: ComponentType<XAxisProps<Point, number>>;
  YAxis: ComponentType<YAxisProps<Point, number>>;
} = createHorizontalChart<Point, number>()({
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
});
