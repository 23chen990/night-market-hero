import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('..', import.meta.url);

test('level one UI exposes wordless state icons and all four segment states', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const main = await readFile(new URL('src/main.ts', root), 'utf8');
  assert.match(html, /data-hub="hub-money-shell"/);
  assert.match(html, /data-hub="hub-money-value"/);
  assert.match(html, /data-ui="pause-icon"/);
  assert.match(html, /data-ui="pursuit-icon"/);
  assert.match(html, /data-ui="closing-gate-icon"/);
  assert.match(html, /data-hub="hub-gate-strip"/);
  assert.match(main, /safe-tutorial.*first-pursuit.*route-alternation.*gate-climax/s);
  assert.match(main, /uiMotionAssets\s*=\s*\[[\s\S]+grappleAttachBurst/);
  assert.match(main, /climaxCopy\.textContent/);
  assert.doesNotMatch(main, /climaxCallout\.textContent/);
  assert.doesNotMatch(main, /pauseButton\.textContent/);
  assert.match(main, /feedbackLayer\.src/);
  assert.match(main, /lastAttachedAnchorId/);
});

test('missing art remains explicit TODO and never falls back to legacy character sheet', async () => {
  const main = await readFile(new URL('src/main.ts', root), 'utf8');
  assert.match(main, /TODO\(art\):.*progress|TODO\(art\):.*角色/s);
  assert.doesNotMatch(main, /night-market-hero-elements-v1/);
});

test('source entry redirects file protocol users to the self-contained playable alias', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /location\.protocol\s*===\s*['"]file:/);
  assert.match(html, /夜市飞侠-护印突围-试玩版\.html/);
});
