import path from 'node:path';
import { fileURLToPath } from 'node:url';

import globals from 'globals';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import andrewaylett from 'eslint-config-andrewaylett';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactCompiler from 'eslint-plugin-react-compiler';

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
        extends: ['plugin:@next/next/recommended'],
    }),
    ...andrewaylett,
    ...tseslint.configs.stylisticTypeChecked,
    {
        ...react.configs.flat.recommended,
        settings: { react: { version: 'detect' } },
    },
    reactCompiler.configs.recommended,
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
        },
    },
    {
        files: ['*.js', '*.mjs', '*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
);
