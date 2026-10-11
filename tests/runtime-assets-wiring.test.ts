import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const renderer = await readFile(new URL('../src/night-city-renderer.ts', import.meta.url), 'utf8');
const catalog = await readFile(new URL('../src/longmap-art-catalog.ts', import.meta.url), 'utf8');

test('approved identity assets are wired into the Phaser world renderer', () => {
  assert.match(main, /approved-runtime\/identity\/protagonist-swing-base-v1\.png/);
  assert.match(main, /approved-runtime\/identity\/pursuer-run-base-v1\.png/);
  assert.match(main, /load\.image\(['"]protagonist-swing['"]/);
  assert.match(main, /load\.image\(['"]pursuer-run['"]/);
  assert.match(main, /setTexture\(['"]protagonist-swing['"]\)/);
  assert.match(main, /setTexture\(['"]pursuer-run['"]\)/);
});

test('approved environment support assets remain preloadable but do not mount stale floating decoration', () => {
  for (const asset of ['stall-canopy', 'paifang-crossbeam', 'bamboo-scaffold', 'inner-eave', 'pushcart', 'blank-banner', 'covered-alley-frame']) {
    assert.match(main, new RegExp(`approved-runtime/environment/${asset}-v1\\.png`));
    assert.match(main, new RegExp(`load\\.image\\(['"]module-${asset}['"]`));
  }
  assert.match(main, /moduleLayer/);
  assert.match(main, /setDepth\(-[0-9]+\)/);
  assert.doesNotMatch(main, /this\.addEnvironmentModules\(core\.getState\(\)\)/);
  assert.doesNotMatch(main, /environment-modules-v1|ui-f-night-market-interior|parallax-far-interior|parallax-mid-stall/);
});

test('approved v55 rooftop components are present in the runtime source tree', () => {
  for (const asset of ['rooftops-curved-eave', 'rooftops-roof-crown', 'rooftops-roof-support-block']) {
    assert.match(catalog, new RegExp(`assets/approved-runtime/environment/${asset}-v1\\.png`));
  }
});

test('withdrawn full-cable asset is unavailable on every main runtime presentation path', () => {
  assert.doesNotMatch(main, /approved-runtime\/environment\/lantern-cable-v1\.png/);
  assert.doesNotMatch(main, /module-lantern-cable/);
  assert.doesNotMatch(main, /addModule\(['"]module-lantern-cable['"]/);
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

test('the default journey keeps one static scene owner', () => {
  assert.match(main, /sceneOwner/);
  assert.match(main, /night-city-image-stream/);
  assert.match(main, /sceneLayerCount/);
  assert.match(main, /sceneOverlay/);
  assert.match(main, /componentPreviewEnabled/);
  assert.match(main, /componentStats\.active\s*\?\s*['"]2['"]\s*:\s*['"]1['"]/);
});

test('longmap query mounts the code-drawn component preview without changing the default route', () => {
  assert.match(main, /createComponentRenderer/);
  assert.match(main, /isLongmapPreviewEnabled/);
  assert.match(main, /componentPreviewEnabled/);
  assert.match(main, /componentRenderer\.preload\(this\)/);
  assert.match(main, /componentRenderer\.render\(this, state\.seed/);
  assert.match(main, /app\.dataset\.componentRenderer\s*=\s*componentStats\.renderer/);
  assert.match(main, /sceneOverlay/);
  assert.match(main, /component-overlay/);
});

test('the FlightScene never paints legacy sceneObjects terrain over the image stream', () => {
  assert.doesNotMatch(main, /for \(const terrain of state\.sceneObjects\)/);
  assert.doesNotMatch(main, /this\.drawActiveTerrain\(graphics, \{ \.\.\.state, activeTerrain: terrain \}\)/);
  assert.match(main, /graphics\.setAlpha\(1\)/);
});

test('live gate HUD values stay wired to current core state', () => {
  assert.match(main, /data-ui="gates-total"/);
  assert.match(main, /data-ui="gate-distance"/);
  assert.match(main, /gatesTotal\.textContent\s*=\s*String\(state\.gatesPassed\)/);
  assert.match(main, /gateDistance\.textContent\s*=\s*`\$\{.*\}m`/);
});
