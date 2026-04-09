import andrewaylett from 'eslint-config-andrewaylett';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import next from '@next/eslint-plugin-next';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/*',
      '**/out/*',
      '**/.next/*',
      '**/*.scss',
      '**/build/*',
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', '*.mjs', '*.cjs', 'jest.config.ts'],
        },
      },
      globals: {
        ...globals['shared-node-browser'],
      },
    },
  },
  {
    files: ['*.js', '*.mjs', '*.ts', '*.mts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  next.configs.recommended,
  {
    files: ['**/*.ts', '**/*.mts', '**/*.tsx', '**/*.mtsx'],
    ...andrewaylett.configs.recommendedWithJestWithReactWithTypes,
  },
  andrewaylett.configs.recommendedWithJestWithReact,
  {
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        node: true,
      },
    },
    rules: {
      'unicorn/filename-case': ['off'],
      'unicorn/no-null': ['off'],
      'unicorn/no-await-expression-member': ['off'],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowBoolean: true,
          allowNumber: true,
        },
      ],
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      'import/consistent-type-specifier-style': ['off', 'prefer-top-level'],
      'import/no-duplicates': ['error', { 'prefer-inline': true }],
      'unicorn/import-style': ['off'],
      'unicorn/no-array-sort': ['off'],
      'unicorn/no-array-reverse': ['off'],
      'react/no-unescaped-entities': [
        'error',
        {
          forbid: [
            {
              char: '>',
              alternatives: ['&gt;'],
            },
            {
              char: '}',
              alternatives: ['&#125;'],
            },
          ],
        },
      ],
      'react/no-unknown-property': [
        'error',
        { ignore: ['property', 'resource', 'typeof', 'vocab'] },
      ],
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'import/no-extraneous-dependencies': ['error'],
    },
  },
  {
    files: ['test/**'],
    rules: {
      'require-await': ['off'],
      '@typescript-eslint/require-await': ['off'],
    },
  },
  {
    files: ['next-env.d.ts'],
    rules: {
      'prettier/prettier': ['off'],
    },
  },
);
