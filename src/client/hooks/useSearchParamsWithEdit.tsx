import { type SetStateAction, useCallback, useEffect, useState } from 'react';

import { type ReadonlyURLSearchParams, useSearchParams } from 'next/navigation';

/**
 * Keeps `history.pushState`/`replaceState` behaviour sensible while a
 * component drives the URL search params from a mix of discrete changes
 * (toggle a checkbox, click a button) and continuous edits (typing in a text
 * field).
 *
 * The desired history trail is:
 *
 * - A discrete change pushes a new entry.
 * - Focusing a field to start an edit run pushes one entry capturing the
 *   pre-edit state, so the back button can return to it.
 * - Every change made *during* the run (each keystroke) replaces that same
 *   entry, so the URL bar stays live without spamming history per keystroke.
 * - Blurring the field replaces the entry one final time with the committed
 *   value, rather than pushing a new one.
 *
 * Callers signal this by passing `isEdit: true` on focus and on every change
 * while editing, then `isEdit: false` (or omitted) on blur and on discrete,
 * one-shot changes.
 *
 * The tricky part: whether a given call pushes or replaces is decided by
 * whether the *previous* call was part of an edit run, not by this call's
 * own `isEdit` argument. `setIsEditing(isEdit)` schedules that flag for next
 * time; the `if (isEditing)` check below still sees the value from the
 * previous render, because `setSearchParams` closes over `isEditing` and
 * React doesn't update it until after this call returns. That one-call lag
 * is exactly what makes the trail work: the call that flips `isEdit` from
 * false to true (focus) still pushes, because *it* wasn't editing yet; the
 * call that flips it back to false (blur) still replaces, because the run it
 * is ending was. Reacting to this call's own `isEdit` value instead would
 * either push a duplicate entry on focus, or replace away the pre-edit
 * state on the first keystroke — both are the bugs this hook exists to
 * avoid, not the fix.
 */
export function useSearchParamsWithEdit(): [
  ReadonlyURLSearchParams,
  (newParams?: SetStateAction<URLSearchParams>, isEdit?: boolean) => void,
] {
  const params = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => {
    const abortController = new AbortController();
    globalThis.addEventListener(
      'popstate',
      () => {
        setIsEditing(false);
      },
      { signal: abortController.signal },
    );
    return () => {
      abortController.abort();
    };
  }, []);

  const setSearchParams = useCallback(
    (newParams?: SetStateAction<URLSearchParams>, isEdit: boolean = false) => {
      setIsEditing(isEdit);
      if (!newParams) {
        return;
      }

      const oldParams = new URLSearchParams(globalThis.location.search);
      const effectiveParams =
        typeof newParams === 'function' ? newParams(oldParams) : newParams;
      const newParamsString = effectiveParams.toString();

      if (effectiveParams.toString() === oldParams.toString()) {
        return;
      }

      const newUrl = new URL(globalThis.location.href);
      newUrl.search = newParamsString;

      // `isEditing` here is intentionally the *previous* call's `isEdit`,
      // not this call's — see the hook's doc comment above for why that lag
      // is required.
      if (isEditing) {
        globalThis.history.replaceState(null, '', newUrl.toString());
      } else {
        globalThis.history.pushState(null, '', newUrl.toString());
      }
    },
    [isEditing],
  );

  return [params, setSearchParams];
}
