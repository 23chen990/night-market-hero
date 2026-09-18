import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

test('Hub top uses transparent shell sources and preserves money glyph aspect ratio', () => {
  assert.match(main, /approved-runtime\/hub\/money-shell-transparent\.png/);
  assert.match(main, /approved-runtime\/hub\/gate-strip-transparent\.png/);
  assert.match(main, /approved-runtime\/hub\/money-value\.png/);
  assert.doesNotMatch(main, /money-shell-aligned\.png|gate-strip-aligned\.png/);
  assert.match(css, /\.hub-money-value[^}]*object-fit:\s*contain/s);
});

test('visible grapple anchors are backed by the approved anchor-button asset', () => {
  assert.match(main, /approved-runtime\/hub\/anchor-button\.png/);
  assert.match(main, /load\.image\(['"]anchor-button['"]/);
  assert.match(main, /anchorSprites/);
  assert.doesNotMatch(main, /drawMarketAnchor[\s\S]*fillRoundedRect\(anchor\.x/);
});
