import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import andrewaylett from 'eslint-config-andrewaylett';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: ["**/node_modules/*", "**/out/*", "**/.next/*", "**/*.scss"],
}, ...compat.extends(
    "plugin:@next/next/recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
), ...andrewaylett, {
    languageOptions: {
        globals: {
            ...globals["shared-node-browser"],
        },

        ecmaVersion: 5,
        sourceType: "script",

        parserOptions: {
            project: true,
        },
    },

    rules: {
        "@typescript-eslint/restrict-template-expressions": ["error", {
            allowNumber: true,
            allowBoolean: true,
        }],
    },
}, {
    files: ["./*.js", "./*.mjs"],

    languageOptions: {
        globals: {
            ...globals.node,
        },
    },
}, {
    files: ["./src/client/*"],

    languageOptions: {
        globals: {
            ...globals.browser,
        },
    },
}];
