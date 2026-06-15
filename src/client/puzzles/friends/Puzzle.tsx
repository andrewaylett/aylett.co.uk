import React, {
  type Dispatch,
  type SetStateAction,
  use,
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from 'react';

import type {
  Puzzle,
  WordsRecord,
} from '@/client/puzzles/friends/gen/build-puzzle';

export interface PuzzleProps {
  puzzle?: Promise<Puzzle>;
  found: string[];
  setFound: Dispatch<SetStateAction<string[]>>;
  startNewPuzzle: () => void;
}

const cx = (i: number): number => 50 + (i & 3) * 93;
const cy = (i: number): number => 50 + (i >> 2) * 93;

export function PuzzleView({
  puzzle: puzzleState,
  found,
  setFound,
  startNewPuzzle,
}: PuzzleProps): JSX.Element {
  const [input, setInput] = useState('');
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const deferredPuzzleState = useDeferredValue(puzzleState);
  const puzzle = deferredPuzzleState ? use(deferredPuzzleState) : undefined;

  const isLoadingPuzzle = deferredPuzzleState !== puzzleState;

  const allWords: (keyof WordsRecord)[] = useMemo(
    () => (puzzle ? Object.keys(puzzle.words) : []),
    [puzzle],
  );
  const total = allWords.length;
  const done = total > 0 && found.length === total;

  const submit = useCallback(() => {
    const w = input.trim().toUpperCase();
    if (!w) {
      if (done) {
        startNewPuzzle();
      }
      return;
    }
    if (!puzzle) {
      return;
    }
    if (puzzle.words[w] && !found.includes(w)) {
      setFound((f) => [...f, w]);
      setInput('');
      setFlash(true);
      setTimeout(() => {
        setFlash(false);
      }, 500);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [input, puzzle, found, setFound, done, startNewPuzzle]);

  const maxLen = useMemo(
    () =>
      allWords.length > 0 ? Math.max(...allWords.map((w) => w.length)) : 0,
    [allWords],
  );

  const { letterCount, edgeCount } = useMemo(() => {
    if (!puzzle) {
      return { letterCount: [], edgeCount: {} };
    }
    const lc = Array.from({ length: 16 }).fill(0) as number[];
    const ec: Record<string, number> = {};
    for (const k of puzzle.edges) {
      ec[k] = 0;
    }
    for (const w of allWords) {
      if (found.includes(w)) {
        continue;
      }
      const entry = puzzle.words[w];
      if (!entry) {
        continue;
      }
      for (const c of entry.cells) {
        lc[c]++;
      }
      for (const k of entry.edges) {
        ec[k]++;
      }
    }
    return { letterCount: lc, edgeCount: ec };
  }, [puzzle, allWords, found]);

  const prefix = input.trim().toUpperCase();
  const matchesFound = found.includes(prefix);
  const prefixCanMatch = (() => {
    if (!puzzle || prefix.length === 0) {
      return true;
    }
    const adj: number[][] = Array.from({ length: 16 }, () => []);
    for (const k of puzzle.edges) {
      if (edgeCount[k] > 0) {
        const [a, b] = k.split('-').map(Number);
        adj[a].push(b);
        adj[b].push(a);
      }
    }
    const dfs = (
      cell: number,
      depth: number,
      visited: Set<number>,
    ): boolean => {
      if (depth === prefix.length) {
        return true;
      }
      for (const nb of adj[cell]) {
        if (!visited.has(nb) && puzzle.letters[nb] === prefix[depth]) {
          visited.add(nb);
          if (dfs(nb, depth + 1, visited)) {
            return true;
          }
          visited.delete(nb);
        }
      }
      return false;
    };
    for (let i = 0; i < 16; i++) {
      if (letterCount[i] > 0 && puzzle.letters[i] === prefix[0]) {
        if (prefix.length === 1) {
          return true;
        }
        if (dfs(i, 1, new Set([i]))) {
          return true;
        }
      }
    }
    return false;
  })();

  return (
    <div className="flex gap-5 flex-wrap items-start mb-2">
      {/* Board + input */}
      <div className="flex-[1_1_340px] min-w-0 max-w-105">
        <div className="w-[min(100%,60dvh)] mx-auto">
          <svg
            viewBox="0 0 379 379"
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            {puzzle?.edges.map((k) => {
              const [a, b] = k.split('-').map(Number);
              const alive = edgeCount[k] > 0;
              return (
                <line
                  key={k}
                  className="transition-opacity duration-1100 ease-linear stroke-blue-400 dark:stroke-blue-500"
                  x1={cx(a)}
                  y1={cy(a)}
                  x2={cx(b)}
                  y2={cy(b)}
                  strokeWidth={3}
                  strokeLinecap="round"
                  opacity={alive ? 0.6 : 0}
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
                  {spent ? (
                    <text
                      className="animate-pop"
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

          <div className="flex gap-2 mt-3.5">
            <input
              ref={inputRef}
              value={input}
              disabled={isLoadingPuzzle}
              onChange={(e) => {
                setInput(e.target.value.replaceAll(/[^a-zA-Z]/g, ''));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submit();
                }
              }}
              placeholder="Type a word…"
              autoFocus
              className={[
                'flex-1 px-3.5 py-2.5 tracking-widest uppercase',
                'rounded-lg outline-none',
                'placeholder:text-slate-400 dark:placeholder:text-slate-500',
                'transition-[border,box-shadow] duration-300',
                flash
                  ? 'border border-green-400 shadow-[0_0_12px_rgba(74,222,128,0.4)]'
                  : 'border border-slate-300 dark:border-slate-600',
                prefixCanMatch
                  ? matchesFound
                    ? 'bg-green-100 dark:bg-green-800'
                    : 'bg-white dark:bg-slate-800'
                  : 'bg-red-200 dark:bg-red-700',
              ].join(' ')}
            />
            <button onClick={submit}>Enter</button>
          </div>

          {done && (
            <div className="mt-3.5 bg-green-100 dark:bg-green-900/40 border border-green-400 dark:border-green-600 text-green-800 dark:text-green-300 rounded-xl p-3 font-semibold text-center">
              Board cleared — every word found!
            </div>
          )}
        </div>
      </div>

      {/* Found words */}
      <div className="flex-[1_1_220px] min-w-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 min-h-50">
        <div className="flex justify-between items-baseline mb-2.5">
          <strong className="text-[0.95rem] text-blue-700 dark:text-blue-300">
            Found words
          </strong>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {found.length} / {total}
          </span>
        </div>
        {found.length === 0 ? (
          <div className="text-slate-400 dark:text-slate-500 text-sm">
            Nothing yet — start tracing!
          </div>
        ) : (
          <ul className="list-none m-0 p-0 max-h-90 overflow-y-auto">
            {[...found].reverse().map((w) => (
              <li
                key={w}
                className={[
                  'animate-fade-in px-2 py-1.5 rounded-lg mb-1 text-[0.95rem] tracking-[0.06em]',
                  'flex justify-between',
                  w.length === maxLen
                    ? 'bg-yellow-100 dark:bg-yellow-900/30'
                    : 'bg-white/60 dark:bg-white/5',
                ].join(' ')}
              >
                <span>{w}</span>
                {w.length === maxLen && <span>★</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
