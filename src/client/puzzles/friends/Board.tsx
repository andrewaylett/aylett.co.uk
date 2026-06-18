import React from 'react';

import type { Puzzle } from '@/client/puzzles/friends/gen/build-puzzle';

const cx = (i: number): number => 50 + (i & 3) * 93;
const cy = (i: number): number => 50 + (i >> 2) * 93;

export function Board({
  puzzle,
  edgeCount,
  letterCount,
  isLoading,
}: {
  puzzle?: Puzzle;
  edgeCount: Record<string, number>;
  letterCount: number[];
  isLoading: boolean;
}): JSX.Element {
  return (
    <svg
      viewBox="0 0 379 379"
      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
    >
      {puzzle?.edges.map((k) => {
        const [a, b] = k.split('-').map(Number);
        const alive = edgeCount[k] > 0;
        return (
          <line
            key={k}
            className={
              'transition-opacity duration-500 ease-in-out stroke-blue-400 dark:stroke-blue-500' +
              (isLoading ? ' opacity-0' : alive ? ' opacity-60' : ' opacity-0')
            }
            x1={cx(a)}
            y1={cy(a)}
            x2={cx(b)}
            y2={cy(b)}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
      {(puzzle?.letters ?? Array.from({ length: 16 })).map((L, i) => {
        const spent = !letterCount[i];
        return (
          <g key={i}>
            <rect
              x={cx(i) - 33}
              y={cy(i) - 33}
              width={66}
              height={66}
              rx={14}
              className={
                spent
                  ? 'fill-violet-100 dark:fill-violet-900/30 stroke-violet-300 dark:stroke-violet-600 transition-[fill,stroke] duration-700'
                  : 'fill-white/60 dark:fill-white/10 stroke-blue-300 dark:stroke-blue-600 transition-[fill,stroke] duration-700'
              }
              strokeWidth={1.5}
            />
            {spent || isLoading ? (
              <text
                className={
                  isLoading ? 'not-motion-reduce:animate-spin' : 'animate-pop'
                }
                style={{
                  transformOrigin: 'center',
                  transformBox: 'fill-box',
                }}
                x={cx(i)}
                y={cy(i) + 11}
                textAnchor="middle"
                fontSize={32}
              >
                {puzzle?.critters[i]}
              </text>
            ) : (
              <text
                x={cx(i)}
                y={cy(i) + 10}
                textAnchor="middle"
                fontSize={30}
                fontWeight={700}
                className="fill-slate-800 dark:fill-slate-100 select-none"
              >
                {L}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
