import { useCallback, useMemo } from 'react';

import { produce, type Producer } from 'immer';

export type StoredValueUpdater<U extends object, P extends unknown[]> = (
  newValue: U | ((prev: U) => U),
  ...args: P
) => void;

export type TransformedValueUpdater<T extends object, P extends unknown[]> = (
  newValue?: T | Producer<T>,
  ...args: P
) => void;

/**
 * Some stores of state have fixed representations, requiring marshalling and
 * unmarshalling.  If we have an "onto" transformation, we may edit the
 * transformed state rather than the raw state.
 */
export function useTransformedState<
  T extends object,
  V extends object,
  P extends unknown[],
>(
  storedValue: V,
  setStoredValue: StoredValueUpdater<V, P>,
  transformFromStored: (value: V) => T,
  transformToStored: (value: T) => V,
): [T, TransformedValueUpdater<T, P>] {
  const wrappedValue = useMemo(
    () => transformFromStored(storedValue),
    [storedValue, transformFromStored],
  );
  const setAndUnwrap: TransformedValueUpdater<T, P> = useCallback(
    (newValue, ...params) => {
      const effectiveValue: T =
        newValue === undefined
          ? wrappedValue
          : typeof newValue === 'function'
            ? produce(wrappedValue, newValue)
            : newValue;
      const unwrappedValue = transformToStored(effectiveValue);
      if (unwrappedValue !== storedValue) {
        setStoredValue(unwrappedValue, ...params);
      }
    },
    [setStoredValue, transformToStored, storedValue, wrappedValue],
  );
  return [wrappedValue, setAndUnwrap];
}
