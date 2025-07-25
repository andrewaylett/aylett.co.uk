import { type Config } from '@jest/types';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import nextJest = require('next/jest.js');

const createJestConfig = nextJest.default({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const config = {
  testEnvironment: 'jsdom',
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
} satisfies Config.InitialProjectOptions;

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export = createJestConfig(config);
