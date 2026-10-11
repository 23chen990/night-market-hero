import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { continuousGameplayDeltaSeconds } from '../src/cut-impact';

const mainSource = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');

test('CUT-CONTINUITY-014 keeps the simulation clock moving while visual cut feedback plays', () => {
  assert.equal(continuousGameplayDeltaSeconds(16), 0.016);
  assert.equal(continuousGameplayDeltaSeconds(-4), 0);
  assert.match(mainSource, /continuousGameplayDeltaSeconds\(wallDeltaMs\)/);
  assert.doesNotMatch(mainSource, /wallTime < hitStopUntil \? simulation\.getState\(\) :/);
});

test('CUT-CONTINUITY-016 rebases the RAF clock after synchronous state resets', () => {
  assert.match(mainSource, /function resetFrameClock\(\): void/);
  assert.match(mainSource, /syncAndRender\(state, 0\);\n\s+resetFrameClock\(\);/);
  assert.match(mainSource, /resetPresentation\(\);\n\s+syncAndRender\(state, 0\);\n\s+resetFrameClock\(\);\n\s+return state;/);
});
