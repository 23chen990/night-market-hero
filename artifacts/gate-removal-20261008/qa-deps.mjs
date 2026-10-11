// Task-local resolver: shared factory dependency links changed during QA.
// Reuse the already installed, locked Zod package without changing shared files.
import { registerHooks } from 'node:module';
const zod = new URL('../../../../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/index.js', import.meta.url).href;
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === 'zod' ? zod : specifier, context);
} });
