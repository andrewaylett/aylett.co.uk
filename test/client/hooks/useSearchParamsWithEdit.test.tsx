'use client';

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, renderHook } from '@testing-library/react';

import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';

const mockSearchParams = { get: jest.fn() };
const mockUseSearchParams = jest.fn(() => mockSearchParams);

jest.mock('next/navigation', () => ({
  useSearchParams: mockUseSearchParams,
}));

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  globalThis.history.replaceState(null, '', '/');
});

describe('useSearchParamsWithEdit', () => {
  it('returns the object from useSearchParams unchanged', async () => {
    const { useSearchParamsWithEdit } =
      await import('@/client/hooks/useSearchParamsWithEdit');
    const { result } = renderHook(() => useSearchParamsWithEdit());

    expect(result.current[0]).toBe(mockSearchParams);
  });

  it('pushes state on the first call, with no isEdit argument', async () => {
    const { useSearchParamsWithEdit } =
      await import('@/client/hooks/useSearchParamsWithEdit');
    const pushSpy = jest.spyOn(globalThis.history, 'pushState');
    const replaceSpy = jest.spyOn(globalThis.history, 'replaceState');
    const { result } = renderHook(() => useSearchParamsWithEdit());

    act(() => {
      result.current[1](new URLSearchParams('a=1'));
    });

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(globalThis.location.search).toBe('?a=1');
  });

  it('still pushes state on the first call, even with isEdit: true (stale closure)', async () => {
    // isEditing is read from the closure captured when setSearchParams was
    // created, so the very first call always sees isEditing === false,
    // regardless of the isEdit argument passed in. This is existing,
    // intentional behaviour, not a bug to fix.
    const { useSearchParamsWithEdit } =
      await import('@/client/hooks/useSearchParamsWithEdit');
    const pushSpy = jest.spyOn(globalThis.history, 'pushState');
    const replaceSpy = jest.spyOn(globalThis.history, 'replaceState');
    const { result } = renderHook(() => useSearchParamsWithEdit());

    act(() => {
      result.current[1](new URLSearchParams('a=1'), true);
    });

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('replaces state on the second call, after isEditing has become true', async () => {
    const { useSearchParamsWithEdit } =
      await import('@/client/hooks/useSearchParamsWithEdit');
    const pushSpy = jest.spyOn(globalThis.history, 'pushState');
    const replaceSpy = jest.spyOn(globalThis.history, 'replaceState');
    const { result } = renderHook(() => useSearchParamsWithEdit());

    act(() => {
      result.current[1](new URLSearchParams('a=1'), true);
    });
    act(() => {
      result.current[1](new URLSearchParams('a=2'), false);
    });

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(globalThis.location.search).toBe('?a=2');
  });

  it('resets isEditing to false on a popstate event', async () => {
    const { useSearchParamsWithEdit } =
      await import('@/client/hooks/useSearchParamsWithEdit');
    const pushSpy = jest.spyOn(globalThis.history, 'pushState');
    const replaceSpy = jest.spyOn(globalThis.history, 'replaceState');
    const { result } = renderHook(() => useSearchParamsWithEdit());

    act(() => {
      result.current[1](new URLSearchParams('a=1'), true);
    });
    act(() => {
      globalThis.dispatchEvent(new PopStateEvent('popstate'));
    });
    act(() => {
      result.current[1](new URLSearchParams('a=2'));
    });

    expect(pushSpy).toHaveBeenCalledTimes(2);
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('does nothing when called with no newParams', async () => {
    const { useSearchParamsWithEdit } =
      await import('@/client/hooks/useSearchParamsWithEdit');
    const pushSpy = jest.spyOn(globalThis.history, 'pushState');
    const replaceSpy = jest.spyOn(globalThis.history, 'replaceState');
    const { result } = renderHook(() => useSearchParamsWithEdit());

    act(() => {
      result.current[1]();
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('does nothing when the function form returns the same instance', async () => {
    const { useSearchParamsWithEdit } =
      await import('@/client/hooks/useSearchParamsWithEdit');
    const pushSpy = jest.spyOn(globalThis.history, 'pushState');
    const replaceSpy = jest.spyOn(globalThis.history, 'replaceState');
    const { result } = renderHook(() => useSearchParamsWithEdit());

    act(() => {
      result.current[1]((old) => old);
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('accepts a URLSearchParams instance directly and updates location.search', async () => {
    const { useSearchParamsWithEdit } =
      await import('@/client/hooks/useSearchParamsWithEdit');
    const { result } = renderHook(() => useSearchParamsWithEdit());

    act(() => {
      result.current[1](new URLSearchParams('a=1'));
    });

    expect(globalThis.location.search).toBe('?a=1');
  });
});
