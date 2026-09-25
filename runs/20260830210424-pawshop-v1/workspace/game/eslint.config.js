import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const browserGlobals = {
  cancelAnimationFrame: 'readonly',
  document: 'readonly',
  Image: 'readonly',
  localStorage: 'readonly',
  performance: 'readonly',
  requestAnimationFrame: 'readonly',
  setTimeout: 'readonly',
  Storage: 'readonly',
  structuredClone: 'readonly',
  window: 'readonly',
};

export default tseslint.config(
  { ignores: ['dist/**', 'artifacts/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', 'vitest.config.ts'],
    languageOptions: { globals: browserGlobals },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'eqeqeq': 'error',
      'prefer-const': 'error',
    },
  },
);
