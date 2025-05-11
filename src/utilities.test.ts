import { describe, expect, it } from '@jest/globals';

import { encodeQueryComponent, nullToError } from './utilities';

describe('encodeQueryComponent', () => {
  it('percent-encodes special characters in query component', async () => {
    const input = 'a b+c@?/%&';
    const encoded = encodeQueryComponent(input);
    expect(encoded).toBe('a%20b%2Bc@?/%25%26');
  });
});

describe('nullToError', () => {
  it('throws when promise resolves to null', async () => {
    await expect(nullToError(Promise.resolve(null), 'oops')).rejects.toThrow(
      'oops',
    );
  });

  it('resolves value when not null', async () => {
    await expect(nullToError(Promise.resolve(42))).resolves.toBe(42);
  });
});
