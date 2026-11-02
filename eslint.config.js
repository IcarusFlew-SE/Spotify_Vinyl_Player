import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.test.js', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  prettier, // formatting is Prettier's job — turn off overlapping ESLint rules
];
