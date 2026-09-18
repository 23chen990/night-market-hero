import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

type SnapshotModule = typeof import('../src/run-snapshot.ts');
const snapshots = await import('../src/run-snapshot.ts').catch(() => null) as SnapshotModule | null;

describe('QA round 2 bounded modal shell and input ownership', () => {
  test('edge pursuer is non-rendered when the world pursuer is visible and both expressions are mutually exclusive', async () => {
    const [style, source] = await Promise.all([
      readFile('src/style.css', 'utf8'),
      readFile('src/main.ts', 'utf8'),
    ]);
    assert.match(style, /\.guard-presence\[data-visible=["']false["']\]\s*\{[^}]*display:\s*none/s);
    assert.match(source, /pursuerPresence\.dataset\.visible\s*=\s*String\(state\.pursuer\.visible\s*&&\s*chaseVisible\s*&&\s*!guardOnScreen\)/);
    assert.match(source, /app\.dataset\.guardOnScreen\s*=\s*String\(state\.pursuer\.x\s*>=/);
  });

  test('markup supplies in-app result scrim, pause modal, and accessible rotate prompt', async () => {
    const html = await readFile('index.html', 'utf8');
    assert.match(html, /data-ui="result-scrim"/);
    assert.match(html, /data-ui="pause-overlay"/);
    assert.match(html, /data-ui="orientation-block"[^>]*role="dialog"/);
    assert.match(html, /请旋转至横屏/);
  });

  test('runtime tracks pointer and keyboard grapple ownership separately and ignores interactive key targets', async () => {
    const source = await readFile('src/main.ts', 'utf8');
    assert.match(source, /activePointerIds/);
    assert.match(source, /keyboardGrappleHeld/);
    assert.match(source, /isInteractiveTarget/);
    assert.match(source, /orientationBlocked/);
  });
});

describe('QA round 2 versioned run refresh recovery', () => {
  test('snapshot parser round-trips a valid run and rejects corrupt or future versions', () => {
    assert.ok(snapshots, 'expected dependency-free run snapshot module');
    const game = createGrappleGame(501);
    game.act('press');
    game.advanceTicks(180);
    game.setPaused(true);
    const source = snapshots.createRunSnapshot('501:stable', game.getState());
    assert.deepEqual(snapshots.parseRunSnapshot(JSON.stringify(source)), source);
    assert.equal(snapshots.parseRunSnapshot('{broken'), null);
    assert.equal(snapshots.parseRunSnapshot(JSON.stringify({ ...source, version: 99 })), null);
    assert.equal(snapshots.parseRunSnapshot(JSON.stringify({ version: 1, runId: '', state: {} })), null);
  });

  test('core restore preserves seed, run state, pause, terminal eligibility, and physical pursuer truth', () => {
    assert.ok(snapshots, 'expected dependency-free run snapshot module');
    const original = createGrappleGame(503);
    original.act('press');
    original.advanceTicks(240);
    original.setPaused(true);
    const snapshot = snapshots.createRunSnapshot('503:stable', original.getState());
    const restored = createGrappleGame(1);
    assert.equal(restored.restoreSnapshot(snapshot.state), true);
    assert.deepEqual(restored.getState(), original.getState());
  });
});
