'use client';

import React, {
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';

import { z } from 'zod/v4';

import { PuzzleView } from './PuzzleView';

import type { static_assert } from '@/types';

import {
  buildPuzzle,
  type Puzzle,
} from '@/client/puzzles/friends/gen/build-puzzle';

// ---------------- Schemas ----------------

const WordsValueSchema = z.object({
  cells: z.array(z.number()),
  edges: z.array(z.string()),
});

const PuzzleSchema = z.object({
  letters: z.array(z.string()),
  edges: z.array(z.string()),
  words: z.record(z.string(), WordsValueSchema.optional()),
  seed: z.string(),
  critters: z.array(z.string()),
});

const FoundStateSchema = z.array(z.string());

type _checkPuzzleSchema = static_assert<
  Puzzle extends z.output<typeof PuzzleSchema> ? true : false
>;
type _checkPuzzle = static_assert<
  z.output<typeof PuzzleSchema> extends Puzzle ? true : false
>;

// ---------------- Component ----------------

const GAME_STATE_KEY = 'game-state-v2';
const FOUND_STATE_KEY = 'found-state-v1';

const SERVER_RENDER = Symbol('SERVER_RENDER');
const NO_SAVED_VALUE = Symbol('NO_SAVED_VALUE');
const EMPTY_ARRAY: string[] = [];

export function LineTraceWordGame(): React.JSX.Element {
  const [isPending, startTransition] = useTransition();
  const stateRef = useRef<Puzzle | symbol>(undefined);
  const foundRef = useRef<string[] | symbol>(undefined);
  const savedGameState = useSyncExternalStore<Puzzle | symbol | undefined>(
    () => () => {
      /* empty */
    },
    () => {
      if (stateRef.current === undefined) {
        stateRef.current = NO_SAVED_VALUE;
        const stateValue = localStorage.getItem(GAME_STATE_KEY);
        if (stateValue) {
          const parsed = PuzzleSchema.safeParse(JSON.parse(stateValue));
          if (parsed.success) {
            stateRef.current = parsed.data;
          }
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
      if (foundRef.current === undefined) {
        const stateValue = localStorage.getItem(FOUND_STATE_KEY);
        if (stateValue) {
          const parsed = FoundStateSchema.safeParse(JSON.parse(stateValue));
          foundRef.current = parsed.success ? parsed.data : [];
        } else {
          foundRef.current = [];
        }
      }
      return foundRef.current;
    },
    () => SERVER_RENDER,
  );

  const [foundInternalState, setFound] = useState<string[] | undefined>();
  const [puzzleInternalState, setPuzzleState] = useState<Puzzle | undefined>();

  const found: string[] =
    foundInternalState ??
    (typeof savedFoundState === 'symbol' ? EMPTY_ARRAY : savedFoundState);
  const puzzleState: Puzzle | undefined =
    puzzleInternalState ??
    (typeof savedGameState === 'symbol' ? undefined : savedGameState);

  const newPuzzleAction = useCallback(() => {
    startTransition(async () => {
      setFound([]);
      setPuzzleState(await buildPuzzle());
    });
  }, []);

  useEffect(() => {
    if (savedGameState !== SERVER_RENDER) {
      if (puzzleState) {
        try {
          localStorage.setItem(GAME_STATE_KEY, JSON.stringify(puzzleState));
        } catch {
          // Storage failure is non-fatal.
        }
      } else {
        newPuzzleAction();
      }
    }
  }, [savedGameState, puzzleState, newPuzzleAction]);

  useEffect(() => {
    try {
      localStorage.setItem(FOUND_STATE_KEY, JSON.stringify(found));
    } catch {
      // Storage failure is non-fatal.
    }
  }, [found]);

  return (
    <div
      className={
        'w-full max-w-200 mx-auto' +
        (isPending ? ' cursor-wait opacity-70' : '')
      }
    >
      <div className="flex justify-between flex-wrap gap-2 mb-3">
        <button
          onClick={() => {
            newPuzzleAction();
          }}
          disabled={isPending}
        >
          New puzzle
        </button>
      </div>

      <PuzzleView
        puzzle={puzzleState}
        found={found}
        newPuzzleAction={newPuzzleAction}
        isLoading={isPending}
        setFoundAction={(f: SetStateAction<string[]>) => {
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
  );
}
