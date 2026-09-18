import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('default page exposes a visible run HUD and detailed terminal settlement', async () => {
  const html = await readFile('index.html', 'utf8');
  const main = await readFile('src/main.ts', 'utf8');
  assert.match(html, /data-ui="distance"/);
  assert.match(html, /data-ui="run-coins"/);
  assert.match(html, /data-ui="combo"/);
  assert.match(html, /data-ui="depth"/);
  assert.match(html, /data-ui="record"/);
  assert.match(html, /data-ui="settlement-details"/);
  assert.match(main, /drawActivePickups/);
  assert.match(main, /state\.status === 'failed'[\s\S]*economy\.completeRun/);
  assert.match(main, /const graphics = this\.drawing;[\s\S]*?if \(!graphics\) return/);
});
