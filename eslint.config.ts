import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import css from '@eslint/css';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(
    // 1. Global Ignores
    {
        ignores: [
            'dist/**',
            'artifacts/**',
            'build/**',
            '.build/**',
            'node_modules/**',
            '.cottontail-tmp/**',
            '.vscode/**',
            '.hutch/**',
        ],
    },

    // 2. JavaScript & TypeScript Source Scope
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        rules: {
            ...js.configs.recommended.rules,
        },
    },
    ...tseslint.configs.recommended.map((config) => ({
        ...config,
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    })),
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        languageOptions: {
            parserOptions: {
                projectService: {
                    defaultProject: './tsconfig.json',
                },
                tsconfigRootDir: __dirname,
            },
        },
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'separate-type-imports',
                },
            ],
            '@typescript-eslint/consistent-type-exports': [
                'error',
                {
                    fixMixedExportsWithInlineTypeSpecifier: true,
                },
            ],
        },
    },

    // 3. React Source Scope
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        ...pluginReact.configs.flat.recommended,
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
        },
    },

    // 4. Data & Metadata Files
    {
        files: ['**/*.json'],
        plugins: { json },
        language: 'json/json',
    },
    {
        files: ['**/*.jsonc'],
        plugins: { json },
        language: 'json/jsonc',
    },
    {
        files: ['**/*.json5'],
        plugins: { json },
        language: 'json/json5',
    },

    // 5. Documentation & Styles
    {
        files: ['**/*.md'],
        plugins: { markdown },
        language: 'markdown/gfm',
    },
    {
        files: ['**/*.css'],
        plugins: { css },
        language: 'css/css',
    }
);
