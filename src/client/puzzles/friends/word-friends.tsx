'use client';

import React, {
  type SetStateAction,
  startTransition,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { PuzzleView } from './Puzzle';

import {
  buildPuzzle,
  type Puzzle,
} from '@/client/puzzles/friends/gen/build-puzzle';

// ---------------- Component ----------------

const GAME_STATE_KEY = 'game-state-v2';
const FOUND_STATE_KEY = 'found-state-v1';

const SERVER_RENDER = Symbol('SERVER_RENDER');
const EMPTY_ARRAY: string[] = [];

export default function LineTraceWordGame(): React.JSX.Element {
  const stateRef = useRef<Promise<Puzzle> | symbol>(undefined);
  const foundRef = useRef<string[] | symbol>(undefined);
  const savedGameState = useSyncExternalStore<
    Promise<Puzzle> | symbol | undefined
  >(
    () => () => {
      /* empty */
    },
    () => {
      if (stateRef.current === undefined) {
        const raw = JSON.parse(
          localStorage.getItem(GAME_STATE_KEY) ?? 'undefined',
        ) as Puzzle | undefined;
        if (raw !== undefined) {
          stateRef.current = Promise.resolve(raw);
        }
      }
      return stateRef.current;
    },
    () => SERVER_RENDER,
  );

  const savedFoundState = useSyncExternalStore<string[] | symbol>(
    () => () => {
      /* empty */
    },
    () => {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      if (!foundRef.current) {
        foundRef.current = JSON.parse(
          localStorage.getItem(FOUND_STATE_KEY) ?? '[]',
        ) as string[];
      }
      return foundRef.current;
    },
    () => SERVER_RENDER,
  );

  const [foundInternalState, setFound] = useState<string[] | undefined>();
  const [puzzleInternalState, setPuzzleState] = useState<
    Promise<Puzzle> | undefined
  >();
  const [generation, setGeneration] = useState(0);

  const found: string[] =
    foundInternalState ??
    (typeof savedFoundState === 'symbol' ? EMPTY_ARRAY : savedFoundState);
  const puzzleState: Promise<Puzzle> | undefined =
    puzzleInternalState ??
    (typeof savedGameState === 'symbol' ? undefined : savedGameState);

  const newPuzzle = () => {
    startTransition(() => {
      setPuzzleState(buildPuzzle());
      setFound([]);
      setGeneration((g) => g + 1);
    });
  };

  useEffect(() => {
    async function apply() {
      try {
        localStorage.setItem(GAME_STATE_KEY, JSON.stringify(await puzzleState));
      } catch {
        // Storage failure is non-fatal.
      }
    }

    if (savedGameState !== SERVER_RENDER) {
      if (puzzleState) {
        void apply();
      } else {
        newPuzzle();
      }
    }
  }, [savedGameState, puzzleState]);

  useEffect(() => {
    try {
      localStorage.setItem(FOUND_STATE_KEY, JSON.stringify(found));
    } catch {
      // Storage failure is non-fatal.
    }
  }, [found]);

  return (
    <>
      <div className="max-w-200 mx-auto">
        <div className="flex justify-between flex-wrap gap-2 mb-3">
          <p className="text-slate-500 dark:text-slate-400 text-sm my-0 mb-4">
            Trace along the lines to find words of 4+ letters. Letters that are
            no longer needed turn into friends; lines fade away when
            they&apos;re spent.
          </p>
          <button onClick={newPuzzle}>New puzzle</button>
        </div>

        <PuzzleView
          key={generation}
          puzzle={puzzleState}
          found={found}
          setFound={(f: SetStateAction<string[]>) => {
            setFound((prev) => {
              if (typeof f === 'function') {
                if (savedFoundState !== SERVER_RENDER) {
                  return f(prev ?? (savedFoundState as string[]));
                }
                return f(prev ?? []);
              }
              return f;
            });
          }}
        />
      </div>
    </>
  );
}
