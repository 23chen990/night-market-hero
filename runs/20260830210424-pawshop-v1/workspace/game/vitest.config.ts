import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: '.',
  cacheDir: '/tmp/pawshop-v1-vitest-cache',
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
  },
});
