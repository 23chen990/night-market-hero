import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

test('Hub top image layers use the approved aligned assets', () => {
  for (const layer of ['hub-back-key', 'hub-money-shell', 'hub-money-value', 'hub-gate-strip']) assert.match(html, new RegExp(`data-hub="${layer}"`));
  for (const asset of ['money-shell-transparent', 'money-value', 'gate-strip-transparent', 'back-key']) assert.match(main, new RegExp(`approved-runtime/hub/${asset}\\.png`));
  assert.match(css, /\.hub-money-shell/);
  assert.doesNotMatch(html, /data-hud="token-status-only"/);
});

test('Hub inventory renders ring, talisman, scroll and play as independent persistent layers', () => {
  assert.match(html, /data-persistent="true"/);
  for (const layer of ['hub-inventory-ring-top', 'hub-inventory-talisman', 'hub-inventory-play-top', 'hub-inventory-ring-bottom', 'hub-inventory-scroll', 'hub-inventory-play-bottom']) assert.match(html, new RegExp(`data-hub="${layer}"`));
  for (const asset of ['inventory-ring', 'inventory-talisman', 'inventory-scroll', 'inventory-play']) assert.match(main, new RegExp(`approved-runtime/hub/${asset}\\.png`));
});

test('Hub integration never loads screenshot-derived backgrounds', () => {
  assert.doesNotMatch(main, /hub-background-clean|hub-background-reference-clean|hub-reference|hub-scene-source/);
  assert.match(css, /\.scene-layer/);
});
