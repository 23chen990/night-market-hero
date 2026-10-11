import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-duplicate-case': 'error',
      'no-dupe-keys': 'error',
      'no-fallthrough': 'error',
      'no-unreachable': 'error',
      'valid-typeof': 'error',
    },
  },
  {
    files: ['src/main.ts', 'src/input.ts', 'src/responsive.ts', 'src/input.test.ts', 'src/responsive.test.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        caughtErrors: 'none',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
      }],
    },
  },
];
