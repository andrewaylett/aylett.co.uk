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
