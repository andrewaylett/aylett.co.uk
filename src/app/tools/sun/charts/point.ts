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

export const Typed = createHorizontalChart<Point, number>()({
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
});
