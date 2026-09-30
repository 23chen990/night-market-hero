import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

type CoreModule = typeof import('../src/game-core.ts');
const core = await import('../src/game-core.ts').catch(() => null) as CoreModule | null;

test('restoreSnapshot clears a stale inputHeld from a persisted mid-hold snapshot', () => {
  assert.ok(core, 'expected the grapple core to exist');
  const game = core!.createGrappleGame(31);
  const snapshot = game.getState();
  // Simulate a run that was snapshotted while the player held the hook, then
  // reloaded. The restored page has no live pointer/keyboard ownership, so a
  // stale inputHeld=true must not carry over (it would lock the player into a
  // phantom hold until they press and release again).
  snapshot.inputHeld = true;
  assert.equal(snapshot.inputHeld, true);
  const restored = game.restoreSnapshot(snapshot);
  assert.equal(restored, true);
  assert.equal(game.getState().inputHeld, false, 'restore must not keep a stale hold from the snapshot');
});

test('grapple surface releases on lostpointercapture (defensive release path)', async () => {
  const source = await readFile('src/main.ts', 'utf8');
  assert.match(source, /lostpointercapture/);
  assert.match(source, /activePointerIds\.delete\(event\.pointerId\)/);
});
