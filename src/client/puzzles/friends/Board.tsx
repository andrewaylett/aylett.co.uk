import React from 'react';

import type { Puzzle } from '@/client/puzzles/friends/gen/build-puzzle';

import { CRITTERS } from '@/client/puzzles/friends/helpers';

const cx = (i: number): number => 50 + (i & 3) * 93;
const cy = (i: number): number => 50 + (i >> 2) * 93;

function Edge({
  edgeKey,
  isLoading,
  alive,
}: {
  edgeKey: string;
  isLoading: boolean;
  alive: boolean;
}) {
  const [a, b] = edgeKey.split('-').map(Number);
  return (
    <line
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
}

function LetterElement({
  letter,
  index,
  spent,
  critter,
  isLoading,
}: {
  letter: string;
  index: number;
  spent: boolean;
  critter: string;
  isLoading: boolean;
}) {
  return (
    <g key={index}>
      <rect
        x={cx(index) - 33}
        y={cy(index) - 33}
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
          x={cx(index)}
          y={cy(index) + 11}
          textAnchor="middle"
          fontSize={32}
        >
          {critter}
        </text>
      ) : (
        <text
          x={cx(index)}
          y={cy(index) + 10}
          textAnchor="middle"
          fontSize={30}
          fontWeight={700}
          className="fill-slate-800 dark:fill-slate-100 select-none"
        >
          {letter}
        </text>
      )}
    </g>
  );
}

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
  const edges = (puzzle?.edges ?? []).map((k): [string, boolean] => {
    const alive = edgeCount[k] > 0;
    return [k, alive];
  });
  const elements = (puzzle?.letters ?? Array.from({ length: 16 })).map(
    (L, i): [string, number, boolean] => {
      const spent = !letterCount[i];
      return [L, i, spent];
    },
  );
  return (
    <svg
      viewBox="0 0 379 379"
      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
    >
      <>
        {edges.map(([key, alive]) => (
          <Edge key={key} edgeKey={key} isLoading={isLoading} alive={alive} />
        ))}
      </>
      <>
        {elements.map(([letter, index, spent]) => (
          <LetterElement
            key={index}
            letter={letter}
            index={index}
            spent={spent}
            critter={puzzle?.critters[index] ?? CRITTERS[index]}
            isLoading={isLoading}
          />
        ))}
      </>
    </svg>
  );
}
