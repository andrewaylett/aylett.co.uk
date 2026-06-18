'use client';

import React, {
  Activity,
  type Dispatch,
  type SetStateAction,
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

import { Input } from '@/client/puzzles/friends/Input';
import { Board } from '@/client/puzzles/friends/Board';
import { FoundWords } from '@/client/puzzles/friends/FoundWords';

export interface PuzzleProps {
  puzzle?: Puzzle;
  found: string[];
  setFoundAction?: Dispatch<SetStateAction<string[]>>;
  newPuzzleAction: () => void;
  isLoading: boolean;
}

export function PuzzleView({
  puzzle: puzzleState,
  found,
  setFoundAction,
  newPuzzleAction,
  isLoading,
}: PuzzleProps): JSX.Element {
  const [input, setInput] = useState('');
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const puzzle = useDeferredValue(puzzleState);

  const allWords: (keyof WordsRecord)[] = useMemo(
    () => (puzzle ? Object.keys(puzzle.words) : []),
    [puzzle],
  );
  const total = useMemo(() => allWords.length, [allWords]);

  const submit = useCallback(() => {
    const w = input.trim().toUpperCase();
    if (!w) {
      if (found.length === total) {
        newPuzzleAction();
      }
      return;
    }
    if (!puzzle) {
      return;
    }
    if (puzzle.words[w] && !found.includes(w)) {
      setFoundAction?.((f) => [...f, w]);
      setInput('');
      setFlash(true);
      setTimeout(() => {
        setFlash(false);
      }, 500);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [input, puzzle, found, total, newPuzzleAction, setFoundAction]);

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

  return (
    <div className="flex gap-5 flex-wrap items-start mb-5 w-full overflow-x-auto">
      {/* Board + input */}
      <div className="flex gap-5 flex-col flex-3">
        <Board
          puzzle={puzzle}
          edgeCount={edgeCount}
          letterCount={letterCount}
          isLoading={isLoading}
        />
        <Input
          input={input}
          inputRef={inputRef}
          setInput={setInput}
          submit={submit}
          isLoading={isLoading}
          flash={flash}
          puzzle={puzzle}
          edgeCount={edgeCount}
          letterCount={letterCount}
          found={found}
        />

        <Activity
          mode={total > 0 && found.length === total ? 'visible' : 'hidden'}
        >
          <div
            className={[
              'mt-3.5',
              'bg-green-100',
              'dark:bg-green-900/40',
              'border',
              'border-green-400',
              'dark:border-green-600',
              'text-green-800',
              'dark:text-green-300',
              'rounded-xl',
              'p-3',
              'font-semibold',
              'text-center',
            ].join(' ')}
          >
            Board cleared — every word found!
          </div>
        </Activity>
      </div>
      <FoundWords found={found} total={total} maxLen={maxLen} />
    </div>
  );
}
