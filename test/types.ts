import { Matchers, MatcherState, Expect as RawExpect, MatchersObject } from 'expect/build/types';
import { isRight } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/PathReporter';
import { expect as originalExpect } from '@jest/globals';

const customMatchers: MatchersObject = {
  toBeRight(received) {
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

interface ExtendedMatchers<R, T> extends Matchers<R, T> {
  toBeRight(): R;
}

export interface Expect<State extends MatcherState = MatcherState> extends RawExpect<State> {
  <T = unknown>(actual: T): ExtendedMatchers<void, T>;
}

export const expect: Expect = originalExpect as any;
