import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import css from '@eslint/css';

export default defineConfig(
    // 1. Global Ignores (Strictly skip internal tool folders and bundles)
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
    // Map the rules arrays specifically to source script extensions so they never bleed into MD/JSON/CSS
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
            'react/react-in-jsx-scope': 'off', // Essential for modern React/Next.js runtimes
        },
    },

    // 4. Data & Metadata Files (Protected from script rules)
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
