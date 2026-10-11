import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {},
  },
];
