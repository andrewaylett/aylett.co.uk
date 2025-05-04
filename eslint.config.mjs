import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import andrewaylett from 'eslint-config-andrewaylett';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
                    allowDefaultProject: ['*.js', '*.mjs'],
                },
            },
            globals: {
                ...globals['shared-node-browser'],
            },
        },
    },
    ...compat.config({
        plugins: ['@next/next'],
        extends: ['plugin:@next/next/recommended', 'plugin:import/typescript'],
        settings: {
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                },
                node: true,
            },
        },
    }),
    ...andrewaylett,
    ...tseslint.configs.stylisticTypeChecked,
    {
        ...react.configs.flat.recommended,
        settings: { react: { version: 'detect' } },
    },
    reactHooks.configs['recommended-latest'],
    {
        rules: {
            '@typescript-eslint/restrict-template-expressions': [
                'error',
                {
                    allowNumber: true,
                    allowBoolean: true,
                },
            ],
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
            'import/no-extraneous-dependencies': ['error'],
            'import/consistent-type-specifier-style': [
                'error',
                'prefer-inline',
            ],
            'import/order': [
                'error',
                {
                    groups: [
                        'builtin',
                        'external',
                        'parent',
                        'sibling',
                        'index',
                        'type',
                    ],
                    'newlines-between': 'always',
                    pathGroups: [
                        {
                            pattern:
                                '{react,react-dom,react-dom/server,prop-types}',
                            group: 'external',
                            position: 'before',
                        },
                        {
                            pattern:
                                '{bpk-*,bpk-**,bpk-*/**,bpk-*/**/**,@skyscanner/bpk-*/**/**,@skyscanner/backpack-web/**/**}',
                            group: 'external',
                            position: 'after',
                        },
                        {
                            pattern: 'common/**',
                            group: 'external',
                            position: 'after',
                        },
                        {
                            pattern: '{*.scss,*.css}',
                            group: 'type',
                            patternOptions: { matchBase: true },
                            position: 'after',
                        },
                    ],
                    pathGroupsExcludedImportTypes: [
                        'react',
                        'react-dom',
                        'prop-types',
                    ],
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                    named: true,
                },
            ],
            '@typescript-eslint/consistent-type-exports': 'error',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { fixStyle: 'inline-type-imports' },
            ],
            'no-duplicate-imports': ['error', { includeExports: true }],
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
);
