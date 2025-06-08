import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import andrewaylett from 'eslint-config-andrewaylett';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default tseslint.config(
    {
        ignores: ['**/node_modules/*', '**/out/*', '**/.next/*', '**/*.scss'],
    },
    {
        languageOptions: {
            parserOptions: {
                project: true,
                projectService: {
                    allowDefaultProject: ['*.js', '*.mjs', 'jest.config.ts'],
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
    ...compat.config({
        plugins: ['@next/next'],
        extends: ['plugin:@next/next/recommended'],
        settings: {
            'import/resolver': {
                node: true,
            },
        },
    }),
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
            'unicorn/import-style': ['off'],
        },
    },
);
