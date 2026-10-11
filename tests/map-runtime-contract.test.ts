import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
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
  const evidence = mkdtempSync(join(tmpdir(), 'missing-game-evidence-'));
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('validate-runtime-product-gates.mjs', workspace)), '--evidence-dir', evidence], { encoding: 'utf8' });
  rmSync(evidence, { recursive: true, force: true });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.structurePassed, true);
  assert.equal(report.passed, false, 'metadata alone cannot pass the runtime product gate');
  assert.ok(report.blockers.length > 0, 'missing natural/perceptual evidence must have an explicit blocker');
});

test('release gate rejects stale, failed and malformed evidence and fails strict mode', () => {
  const evidence = mkdtempSync(join(tmpdir(), 'invalid-game-evidence-'));
  const script = fileURLToPath(new URL('validate-runtime-product-gates.mjs', workspace));
  const names = ['runtime-product-gate.json', 'qa-natural-journey-report.json', 'perceptual-qa-report.json'];
  const run = () => spawnSync(process.execPath, [script, '--evidence-dir', evidence, '--strict'], { encoding: 'utf8' });
  const writeReports = (hash: string, passed: boolean) => {
    for (const name of names) writeFileSync(join(evidence, name), JSON.stringify({ buildHash: hash, naturalFlow: { buildHash: hash }, passed }));
  };
  try {
    let result = run();
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).passed, false);
    writeReports('0'.repeat(64), true);
    result = run();
    assert.equal(result.status, 1, 'passing an older build is not current acceptance');
    assert.ok(JSON.parse(result.stdout).blockers.some((message: string) => message.includes('hash mismatch')));
    const hash = createHash('sha256').update(readFileSync(new URL('dist/index.html', workspace))).digest('hex');
    writeReports(hash, false);
    result = run();
    assert.equal(result.status, 1, 'matching the build cannot bypass failed QA');
    writeReports(hash, true);
    writeFileSync(join(evidence, names[0]!), '{broken');
    result = run();
    assert.equal(result.status, 1);
    assert.ok(JSON.parse(result.stdout).blockers.some((message: string) => message.includes('not valid JSON')));
    writeReports(hash, true);
    result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).passed, true);
    assert.equal(JSON.parse(result.stdout).commercialReleasePassed, false, 'browser reports cannot release a platform package');
  } finally { rmSync(evidence, { recursive: true, force: true }); }
});
