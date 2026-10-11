import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createGrappleGame } from '../src/game-core';
import { createRunSnapshot, parseRunSnapshot } from '../src/run-snapshot';

test('saved reward frontiers reject malformed values before core restoration', () => {
  for (const [field, value] of [
    ['furthestX', '4500'], ['furthestX', -1],
    ['visitedSegments', [0, '2']], ['visitedSegments', [0, 0]],
    ['visitedSegments', [-1]], ['visitedSegments', {}],
    ['characterId', 'future-character'], ['skySegments', [6, 10]],
  ] as const) {
    const snapshot = createRunSnapshot('integration', createGrappleGame(31).getState());
    (snapshot.state as unknown as Record<string, unknown>)[field] = value;
    assert.equal(parseRunSnapshot(JSON.stringify(snapshot)), null, `${field} must reject malformed supplied data`);
  }
});

test('legacy omissions remain readable and known progression fields roundtrip', () => {
  const snapshot = createRunSnapshot('integration', createGrappleGame(31).getState());
  const data = snapshot.state as unknown as Record<string, unknown>;
  for (const field of ['furthestX', 'visitedSegments', 'characterId', 'skySegments']) delete data[field];
  assert.ok(parseRunSnapshot(JSON.stringify(snapshot)));
  Object.assign(data, { furthestX: 4500, visitedSegments: [0, 1, 2], characterId: '走绳伎', skySegments: 2, visitedSkySegments: [8, 12], futureOptionalField: { preserved: true } });
  const parsed = parseRunSnapshot(JSON.stringify(snapshot));
  assert.ok(parsed);
  assert.deepEqual((parsed.state as unknown as Record<string, unknown>).futureOptionalField, { preserved: true });
  assert.equal((parsed.state as unknown as Record<string, unknown>).characterId, '走绳伎');
});

test('runtime contract binds the actual workspace and open checkpoint journey', () => {
  const gates = JSON.parse(readFileSync(new URL('../runtime-product-gates.json', import.meta.url), 'utf8'));
  assert.equal(gates.targetWorkspace, 'runs/mobile-chart-adaptation-20260830/workspace/night-market-hero');
  assert.equal(gates.defaultMode, 'lantern-entry');
  assert.ok(gates.journey.includes('open-checkpoint'));
  assert.ok(!gates.journey.includes('checkpoint-gate'));
  assert.equal(gates.legacyBehavior.status, 'compatibility-only');
  assert.ok(gates.runtimeWiredEntrypoints.includes('src/run-snapshot.ts'));
  assert.ok(gates.runtimeWiredEntrypoints.includes('src/runtime-session.ts'));
  assert.equal(gates.checkpointRules.rewardsPerSegmentPerRun, 1);
  assert.equal(gates.checkpointRules.collisionEnabled, false);
});
