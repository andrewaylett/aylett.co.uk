import path from 'node:path';
import { fileURLToPath } from 'node:url';

import globals from 'globals';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import andrewaylett from 'eslint-config-andrewaylett';
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
        extends: ['plugin:@next/next/recommended'],
    }),
    ...andrewaylett,
    ...tseslint.configs.stylisticTypeChecked,
    {
        rules: {
            '@typescript-eslint/restrict-template-expressions': [
                'error',
                {
                    allowNumber: true,
                    allowBoolean: true,
                },
            ],
        },
    },
    {
        files: ['*.js', '*.mjs'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
);
