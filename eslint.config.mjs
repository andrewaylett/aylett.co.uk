import andrewaylett from 'eslint-config-andrewaylett';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import next from '@next/eslint-plugin-next';
const { flatConfig: nextPlugin } = next;

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
    nextPlugin.recommended,
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
            'unicorn/import-style': ['off'],
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
    {
        files: ['test/**'],
        rules: {
            'require-await': ['off'],
            '@typescript-eslint/require-await': ['off'],
        },
    },
);
