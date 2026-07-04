import { useCallback, useMemo } from 'react';

import { produce, type Producer } from 'immer';

/**
 * Some stores of state have fixed representations, requiring marshalling and
 * unmarshalling.  If we have an "onto" transformation, we may edit the
 * transformed state rather than the raw state.
 */
export function useTransformedState<T extends object, U, P extends unknown[]>(
  storedValue: U,
  setStoredValue: (newValue: U | ((prev: U) => U), ...args: P) => void,
  transformFromStored: (value: U) => T,
  transformToStored: (value: T) => U,
): [T, (newValue: T | Producer<T>, ...args: P) => void] {
  const wrappedValue = useMemo(
    () => transformFromStored(storedValue),
    [storedValue, transformFromStored],
  );
  const setAndUnwrap: (newValue: T | Producer<T>, ...args: P) => void =
    useCallback(
      (newValue, ...params) => {
        const effectiveValue: T =
          typeof newValue === 'function'
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
