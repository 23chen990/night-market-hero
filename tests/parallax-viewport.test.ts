import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const mainSource = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const rendererSource = await readFile(new URL('../src/night-city-renderer.ts', import.meta.url), 'utf8');

test('generated parallax environment art is not part of the playable scene', () => {
  assert.doesNotMatch(mainSource, /parallaxFarLayer|parallaxMidLayer|level1-parallax-far|level1-parallax-mid/);
});

test('playable scene stays transparent over the neutral scene layer', () => {
  assert.match(mainSource, /setBackgroundColor\('rgba\(0,0,0,0\)'\)/);
  assert.match(mainSource, /render:\s*\{[^}]*transparent:\s*true/s);
});

test('scene geometry is not substituted with the removed generated reference backdrop', () => {
  assert.doesNotMatch(mainSource, /interiorBackdrop|reference-backdrop|ui-f-night-market-interior/);
});

test('night-city scenery uses bounded image depth layers with seamless chunk coverage', () => {
  assert.match(mainSource, /createNightCityRenderer/);
  assert.match(mainSource, /cityStats = this\.nightCityRenderer\.render/);
  assert.match(rendererSource, /depth:\s*-20/);
  assert.match(rendererSource, /setScrollFactor\?\./);
  assert.match(rendererSource, /overlap/);
  assert.match(rendererSource, /maxRetainedChunks/);
  assert.doesNotMatch(mainSource, /this\.drawAuthoredRoute\(graphics, state\)/);
  assert.doesNotMatch(mainSource, /this\.addEnvironmentModules\(core\.getState\(\)\)/);
  assert.doesNotMatch(rendererSource, /fillStyle|fillRect|fillCircle/);
});
