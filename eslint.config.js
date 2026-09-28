import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'release/**',
      'node_modules/**',
      'android/**',
      'keys/**',
      'public/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}', 'electron/**/*.{cjs,js}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: 'detect' } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Un composant qui lit une variable declaree plus bas plante au premier
      // rendu (TDZ) : c'est exactement le bug corrige dans store.jsx.
      'no-use-before-define': ['error', { functions: false, classes: false }],
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
      'no-fallthrough': 'error',
      'no-cond-assign': 'error',
      'valid-typeof': 'error',
      'eqeqeq': ['error', 'smart'],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['electron/**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    files: ['scripts/**/*.{cjs,mjs}'],
    languageOptions: { sourceType: 'module', globals: globals.node },
  },
];
