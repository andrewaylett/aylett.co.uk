import { type SetStateAction, useCallback, useEffect, useState } from 'react';

import { type ReadonlyURLSearchParams, useSearchParams } from 'next/navigation';

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

      if (effectiveParams === oldParams) {
        return;
      }

      const newUrl = new URL(globalThis.location.href);
      newUrl.search = newParamsString;

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
