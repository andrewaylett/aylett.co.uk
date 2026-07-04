import { describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';

import { useTransformedState } from '@/client/hooks/useTransformedState';

interface Stored {
  count: number;
}

const identity = (v: Stored): Stored => v;

describe('useTransformedState', () => {
  it('wraps storedValue via transformFromStored', () => {
    const storedValue: Stored = { count: 1 };
    const setStoredValue = jest.fn();

    const { result } = renderHook(() =>
      useTransformedState(storedValue, setStoredValue, identity, identity),
    );

    expect(result.current[0]).toBe(storedValue);
  });

  it('calls setStoredValue with transformToStored(newValue) for a plain value', () => {
    const storedValue: Stored = { count: 1 };
    const setStoredValue = jest.fn();

    const { result } = renderHook(() =>
      useTransformedState(storedValue, setStoredValue, identity, identity),
    );

    result.current[1]({ count: 2 });

    expect(setStoredValue).toHaveBeenCalledTimes(1);
    expect(setStoredValue).toHaveBeenCalledWith({ count: 2 });
  });

  it('applies a producer function to the wrapped value before transforming', () => {
    const storedValue: Stored = { count: 1 };
    const setStoredValue = jest.fn();

    const { result } = renderHook(() =>
      useTransformedState(storedValue, setStoredValue, identity, identity),
    );

    result.current[1]((draft) => {
      draft.count += 1;
    });

    expect(setStoredValue).toHaveBeenCalledTimes(1);
    expect(setStoredValue).toHaveBeenCalledWith({ count: 2 });
  });

  it('forwards extra arguments to setStoredValue verbatim', () => {
    const storedValue: Stored = { count: 1 };
    const setStoredValue =
      jest.fn<
        (
          newValue: Stored | ((prev: Stored) => Stored),
          ...args: [string, number]
        ) => void
      >();

    const { result } = renderHook(() =>
      useTransformedState(storedValue, setStoredValue, identity, identity),
    );

    result.current[1]({ count: 2 }, 'tag', 42);

    expect(setStoredValue).toHaveBeenCalledWith({ count: 2 }, 'tag', 42);
  });

  it('skips setStoredValue when transformToStored returns the same reference', () => {
    // With identity transforms, a producer that makes no changes causes
    // Immer to return the original object reference. transformToStored then
    // also returns that same reference, so it equals storedValue and the
    // upstream setter is not called at all — avoiding a redundant write.
    const storedValue: Stored = { count: 1 };
    const setStoredValue = jest.fn();

    const { result } = renderHook(() =>
      useTransformedState(storedValue, setStoredValue, identity, identity),
    );

    result.current[1](() => {
      // no-op producer
    });

    expect(setStoredValue).not.toHaveBeenCalled();
  });

  it('does not re-invoke transformFromStored on an unrelated rerender', () => {
    const storedValue: Stored = { count: 1 };
    const setStoredValue = jest.fn();
    const transformFromStored = jest.fn(identity);

    const { rerender } = renderHook(
      (props: { storedValue: Stored }) =>
        useTransformedState(
          props.storedValue,
          setStoredValue,
          transformFromStored,
          identity,
        ),
      { initialProps: { storedValue } },
    );

    expect(transformFromStored).toHaveBeenCalledTimes(1);

    rerender({ storedValue });

    expect(transformFromStored).toHaveBeenCalledTimes(1);
  });
});
