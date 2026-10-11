import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const workspace = new URL('..', import.meta.url);
const gate = JSON.parse(readFileSync(new URL('runtime-product-gates.json', workspace), 'utf8'));

test('default map journey contract belongs to the current game and runtime', () => {
  assert.equal(gate.targetWorkspace, 'runs/mobile-chart-adaptation-20260830/workspace/night-market-hero');
  assert.equal(gate.defaultEntrypoint, 'src/main.ts');
  assert.ok(gate.runtimeWiredEntrypoints.includes('src/night-city-renderer.ts'));
  assert.ok(gate.runtimeWiredEntrypoints.includes('src/flight-presentation.ts'));
  for (const file of gate.runtimeWiredEntrypoints) {
    assert.ok(readFileSync(new URL(file, workspace)).byteLength > 0, `missing runtime entrypoint: ${file}`);
  }
});

test('open-streets journey declares settlement and replay without a removed gate checkpoint', () => {
  assert.deepEqual(gate.journey, [
    'startup', 'tutorial', 'tutorial-settlement', 'night-patrol',
    'segment-crossing', 'open-checkpoint', 'death-settlement', 'replay',
  ]);
  assert.equal(gate.legacyBehavior.status, 'compatibility-only');
});

test('runtime contract validator keeps missing current-build browser evidence blocked', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('validate-runtime-product-gates.mjs', workspace))], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.structurePassed, true);
  assert.equal(report.passed, false, 'metadata alone cannot pass the runtime product gate');
  assert.ok(report.blockers.length > 0, 'missing natural/perceptual evidence must have an explicit blocker');
});
