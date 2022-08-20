import type { Matchers, Expect as RawExpect } from 'expect';
import { isRight } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/PathReporter';
import { expect as originalExpect } from '@jest/globals';

const customMatchers: Parameters<typeof originalExpect.extend>[0] = {
  toBeRight(received: any) {
    const pass = isRight(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to contain a successful result`,
        pass: true,
      };
    }
    return {
      message: () => `${received} decoded to these errors: ${PathReporter.report(received)}`,
      pass: false,
    };
  },
};

originalExpect.extend(customMatchers);

interface ExtendedMatchers<R extends void | Promise<void>> extends Matchers<R> {
  toBeRight(): R;
}

export interface Expect extends RawExpect {
  <T = unknown>(actual: T): ExtendedMatchers<void>;
}

export const expect: Expect = originalExpect as any;
