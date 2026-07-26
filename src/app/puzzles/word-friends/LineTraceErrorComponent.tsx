import React from 'react';

import type {
  ErrorComponent,
  ErrorInfo,
} from 'next/dist/client/components/error-boundary';

import { PuzzleView } from '@/client/puzzles/friends/PuzzleView';

export const LineTraceErrorComponent: ErrorComponent = ({
  error,
  reset,
}: ErrorInfo) => {
  const message = error.message;
  return (
    <div className={'w-full max-w-200 mx-auto'}>
      <div className="flex justify-between flex-wrap gap-2 mb-3">
        <p className="text-red-500 flex-1">{message}</p>
        <button
          onClick={() => {
            reset();
          }}
        >
          Reset
        </button>
      </div>

      <PuzzleView found={[]} newPuzzleAction={reset} isLoading={false} />
    </div>
  );
};
