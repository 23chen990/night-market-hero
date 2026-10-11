import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('self-contained playable bundle contains no module-only import.meta expression', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const alias = await readFile(new URL('../夜市飞侠-护印突围-试玩版.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /import\.meta/);
  assert.doesNotMatch(alias, /import\.meta/);
});
