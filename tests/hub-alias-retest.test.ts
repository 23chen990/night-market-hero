import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('standalone playable alias contains the current Hub shell contract', async () => {
  const alias = await readFile(new URL('../夜市飞侠-护印突围-试玩版.html', import.meta.url), 'utf8');
  assert.match(alias, /data-ui[=:]"?level-title/);
  assert.match(alias, /data-hub[=:]"?hub-money-shell/);
  assert.match(alias, /data-hub[=:]"?hub-inventory-ring-top/);
  assert.doesNotMatch(alias, /Missing UI element: \[data-ui="level-title"\]/);
});

test('inventory slot presentation declares a shared tone contract', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.item-button\.item-slot-empty[\s\S]*opacity/);
  assert.match(css, /\.item-button\.item-slot-empty[\s\S]*filter/);
});
