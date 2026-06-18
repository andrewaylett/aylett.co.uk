import React, { useMemo } from 'react';

import type { Puzzle } from '@/client/puzzles/friends/gen/build-puzzle';

export function Input({
  inputRef,
  input,
  puzzle,
  found,
  setInput,
  submit,
  isLoading,
  flash,
  edgeCount,
  letterCount,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  input: string;
  puzzle?: Puzzle;
  found: string[];
  setInput: (input: string) => void;
  submit: () => void;
  isLoading: boolean;
  flash: boolean;
  edgeCount: Record<string, number>;
  letterCount: number[];
}): JSX.Element {
  const prefix = useMemo(() => input.trim().toUpperCase(), [input]);
  const matchesFound = useMemo(() => found.includes(prefix), [found, prefix]);
  const prefixCanMatch = useMemo(() => {
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
  }, [puzzle, prefix, edgeCount, letterCount]);

  return (
    <div className="flex flex-wrap gap-2 h-fit">
      <input
        ref={inputRef}
        value={input}
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
          'flex-1 p-2.5 tracking-widest uppercase h-full min-w-[16ch]',
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
      <button
        onClick={submit}
        disabled={isLoading}
        className="min-w-fit flex-initial"
      >
        Enter
      </button>
    </div>
  );
}
