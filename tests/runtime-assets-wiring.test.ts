import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const renderer = await readFile(new URL('../src/night-city-renderer.ts', import.meta.url), 'utf8');

test('approved identity assets are wired into the Phaser world renderer', () => {
  assert.match(main, /approved-runtime\/identity\/protagonist-swing-base-v1\.png/);
  assert.match(main, /approved-runtime\/identity\/pursuer-run-base-v1\.png/);
  assert.match(main, /load\.image\(['"]protagonist-swing['"]/);
  assert.match(main, /load\.image\(['"]pursuer-run['"]/);
  assert.match(main, /setTexture\(['"]protagonist-swing['"]\)/);
  assert.match(main, /setTexture\(['"]pursuer-run['"]\)/);
});

test('approved environment support assets remain preloadable but do not mount stale floating decoration', () => {
  for (const asset of ['stall-canopy', 'paifang-crossbeam', 'bamboo-scaffold', 'inner-eave', 'lantern-cable', 'pushcart', 'blank-banner', 'covered-alley-frame']) {
    assert.match(main, new RegExp(`approved-runtime/environment/${asset}-v1\\.png`));
    assert.match(main, new RegExp(`load\\.image\\(['"]module-${asset}['"]`));
  }
  assert.match(main, /moduleLayer/);
  assert.match(main, /setDepth\(-[0-9]+\)/);
  assert.doesNotMatch(main, /this\.addEnvironmentModules\(core\.getState\(\)\)/);
  assert.doesNotMatch(main, /environment-modules-v1|ui-f-night-market-interior|parallax-far-interior|parallax-mid-stall/);
});

test('night-city renderer streams approved district panoramas before visibility', () => {
  for (const asset of [
    'market-panorama-v1', 'market-panorama-v2',
    'rooftops-panorama-v1', 'rooftops-panorama-v2',
    'waterfront-panorama-v1', 'waterfront-panorama-v2',
    'foreground-eaves-v1',
  ]) assert.match(renderer, new RegExp(`assets/night-city/${asset}\\.png`));
  assert.match(main, /createNightCityRenderer/);
  assert.match(main, /nightCityRenderer\.preload\(this\)/);
  assert.match(main, /nightCityRenderer\.render\(this, state\.seed/);
  assert.match(main, /cityRenderer/);
  assert.match(main, /app\.dataset\.cityDistrict/);
  assert.match(main, /app\.dataset\.cityChunkCount/);
  assert.match(main, /app\.dataset\.cityRenderer/);
  assert.doesNotMatch(main, /drawCoveredNightMarketInterior/);
});

test('long-map component scenery is preview-only and exposes bounded telemetry', () => {
  assert.match(main, /createComponentRenderer/);
  assert.match(main, /isLongmapPreviewEnabled/);
  assert.match(main, /componentRenderer\.preload\(this\)/);
  assert.match(main, /componentRenderer\.render\(this, state\.seed/);
  assert.match(main, /app\.dataset\.componentRenderer/);
  assert.match(main, /app\.dataset\.missingAssetCount/);
  assert.match(main, /longmap=1/);
});

test('live gate HUD values stay wired to current core state', () => {
  assert.match(main, /data-ui="gates-total"/);
  assert.match(main, /data-ui="gate-distance"/);
  assert.match(main, /gatesTotal\.textContent\s*=\s*String\(state\.gatesPassed\)/);
  assert.match(main, /gateDistance\.textContent\s*=\s*`\$\{.*\}m`/);
});
