import { describe, expect, it } from '@jest/globals';

import { nullToError } from '@/utilities';

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
