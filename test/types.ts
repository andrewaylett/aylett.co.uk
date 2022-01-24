import originalExpect from 'expect';
import { isRight } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/PathReporter';

const customMatchers: Parameters<typeof originalExpect.extend>[0] = {
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

interface ExtendedMatchers<R, T> extends originalExpect.Matchers<R, T> {
  toBeRight(): R;
}

export interface Expect<State extends originalExpect.MatcherState = originalExpect.MatcherState>
  extends originalExpect.Matchers<State> {
  <T = unknown>(actual: T): ExtendedMatchers<void, T>;
}

export const expect: Expect = originalExpect as any;
