import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');

test('confirmed return-button source is copied byte-for-byte and wired as an independent asset', async () => {
  const runtime = await readFile(new URL('../src/assets/approved-ui/back-button-v1.png', import.meta.url));
  assert.equal(createHash('sha256').update(runtime).digest('hex'), '1c3d9e1741fc53e436508f64d43d630b53fdf0eeecc391c88ce99703c28170f9');
  assert.match(main, /back-button-v1\.png/);
  assert.match(main, /data-ui="back-icon"/);
});

test('HUD slice exposes fixed top navigation and a right-side item rail', () => {
  assert.match(html, /data-ui="back"/);
  assert.match(html, /data-ui="settings"/);
  assert.match(html, /class="item-actions"[^>]*data-reference-stage="true"/);
  assert.match(css, /--reference-stage-scale/);
  assert.doesNotMatch(css, /\.item-actions\s*\{[^}]*position:\s*fixed/s);
});

test('static reference baseline removes legacy rails and text placeholder items', () => {
  assert.match(html, /class="run-readout"[^>]*hidden/);
  assert.match(html, /class="journey-meter"[^>]*hidden/);
  assert.match(html, /class="route-hint[^>]*hidden/);
  assert.match(html, /class="tutorial-rail"[^>]*hidden/);
  assert.doesNotMatch(html, /data-action="talisman"[^>]*>护</);
  assert.doesNotMatch(html, /data-action="firecracker"[^>]*>炮</);
  assert.doesNotMatch(html, /<svg/);
  assert.match(html, /data-hub="hub-inventory-ring-top"/);
  assert.match(html, /data-hub="hub-inventory-talisman"/);
  assert.match(html, /data-hub="hub-inventory-play-top"/);
  assert.doesNotMatch(main, /ui-f-night-market-interior\.png/);
  assert.match(main, /inventory-talisman\.png/);
  assert.match(main, /gate-strip-transparent\.png/);
  assert.match(html, /data-hub="hub-gate-strip"/);
  assert.match(css, /\.talisman-art[^}]*left:\s*calc\(18px \* var\(--reference-stage-scale\)\)/s);
  assert.match(css, /\.ad-play-button[^}]*left:\s*calc\(74px \* var\(--reference-stage-scale\)\)/s);
  assert.doesNotMatch(css, /--slot-size:\s*clamp/);
  assert.match(css, /\.scene-layer/);
  assert.match(css, /\.hud-nav-button\[data-ui="back"\][^}]*display:\s*none/s);
  assert.doesNotMatch(main, /fillRect\(this\.cameras\.main\.scrollX, 0, worldViewportWidth, worldViewportHeight\)/);
  assert.match(main, /graphics\.setAlpha\(state\.attachedAnchorId \|\| state\.activeChaseEvent \|\| state\.levelIndex === 0 \? 0\.38 : 0\)/);
  assert.match(main, /this\.drawActivePickups\(graphics, state/);
  assert.match(main, /render:\s*\{[^}]*transparent:\s*true/s);
  assert.doesNotMatch(main, /item-talisman.*copperTokenIcon|item-scroll.*destinationArrowIcon/s);
});

test('chase HUD remains hidden until the single visible pursuer state', () => {
  assert.match(css, /\.guard-presence\[data-visible="false"\]\s*\{\s*display:\s*none;/s);
  assert.match(html, /data-ui="pursuer"[^>]*data-visible="true"/);
  assert.match(main, /chaseVisible = state\.chase\.phase === 'danger' \|\| state\.chase\.phase === 'climax'/);
});
