import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');

test('default playable scene does not load fabricated backdrop or parallax art', () => {
  assert.match(html, /data-ui="scene-layer"/);
  assert.doesNotMatch(html, /reference-backdrop/);
  assert.doesNotMatch(main, /ui-f-night-market-interior\.png|interiorBackdrop/);
  assert.doesNotMatch(main, /parallax-far-interior|parallax-mid-stall|parallaxFarLayer|parallaxMidLayer/);
  assert.match(css, /\.scene-layer\s*\{[^}]*background:\s*transparent/,
    'the compatibility scene layer must not tint or replace raster scenery');
});

test('default playable shell does not expose a legacy solid background', () => {
  assert.match(css, /#app\s*\{[^}]*background:\s*transparent/s);
  assert.match(css, /html,\s*body,\s*#game\s*\{[^}]*background:\s*transparent/s);
});

test('HUD and persistent inventory share the 1672x941 reference-stage transform', () => {
  assert.match(html, /class="corner-hud[^>]*data-reference-stage="true"/);
  assert.match(html, /class="item-actions"[^>]*data-reference-stage="true"/);
  assert.match(main, /REFERENCE_STAGE_WIDTH\s*=\s*1672/);
  assert.match(main, /REFERENCE_STAGE_HEIGHT\s*=\s*941/);
  assert.match(main, /syncReferenceStage/);
  assert.match(css, /--reference-stage-scale/);
  assert.doesNotMatch(css, /\.item-actions\s*\{[^}]*position:\s*fixed/s);
  assert.doesNotMatch(css, /--slot-size:\s*clamp/);
});

test('inventory keeps independent supplied asset layers and remains persistent', () => {
  assert.match(html, /class="item-actions"[^>]*data-persistent="true"/);
  assert.match(html, /data-slot="talisman"[\s\S]*data-hub="hub-inventory-ring-top"[\s\S]*data-hub="hub-inventory-talisman"[\s\S]*data-hub="hub-inventory-play-top"/);
  assert.match(html, /data-slot="firecracker"[\s\S]*data-hub="hub-inventory-ring-bottom"[\s\S]*data-hub="hub-inventory-scroll"/);
  assert.match(html, /data-reference-x="1543"[^>]*data-reference-y="290"/);
  assert.match(html, /data-reference-x="1543"[^>]*data-reference-y="429"/);
});

test('world camera, streamed scenery, and HUD share the same logical 16:9 origin', () => {
  assert.match(main, /createCameraLayout\(\{ width: viewportWidth, height: viewportHeight, lookAhead: 0\.32 \}\)/);
  assert.match(main, /cameras\.main\.setOrigin\(0, 0\)/);
  assert.match(main, /cameras\.main\.scrollY = projection\.scrollY/);
  assert.match(main, /projection\.scrollY;\s*\/\* side-view vertical origin stays fixed \*\//);
  assert.match(main, /this\.nightCityRenderer\.render\(this, state\.seed/);
  assert.match(main, /app\.dataset\.cityDistrict/);
  assert.match(main, /app\.dataset\.cityChunkCount/);
});
