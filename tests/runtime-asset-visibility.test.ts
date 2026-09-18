import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/night-city-renderer.ts', import.meta.url), 'utf8');

test('district textures are queued in preload and are not visible until texture readiness', () => {
  assert.match(source, /preload\(scene: NightCitySceneLike\)/);
  assert.match(source, /scene\.load\.image\(key, path\)/);
  assert.match(source, /textureReady\(scene, key\)/);
  assert.match(source, /if \(!image\) continue; \/\/ texture has not completed loading yet/);
  assert.match(source, /setVisible\(true\)/);
});

test('renderer uses image display objects with world depth and bounded streaming, never a scenery Graphics fallback', () => {
  assert.match(source, /scene\.add\.image\(0, 0, key\)/);
  assert.match(source, /depth:\s*-20/);
  assert.match(source, /setScrollFactor\?\./);
  assert.match(source, /maxRetainedChunks/);
  assert.match(source, /cityChunksInView/);
  assert.doesNotMatch(source, /new Phaser\.GameObjects\.Graphics|fillRect\(/);
});
