import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

const options = { marketGates: false, terrainMode: 'panorama', guidedExperience: true } as const;

test('instant re-press and release cannot manufacture consecutive flight rewards', () => {
  const game = createGrappleGame(32, options);
  game.restartEndless(32);
  assert.equal(game.act('press'), true);
  let reachedRelease = false;
  for (let tick = 0; tick < 400; tick++) {
    const state = game.advanceTicks(1);
    const anchor = state.anchors.find(item => item.id === state.attachedAnchorId);
    if (anchor && state.player.x >= anchor.x && state.player.vx > 200
      && state.player.vy < 120 && Math.hypot(state.player.vx, state.player.vy) >= 360) {
      reachedRelease = true;
      break;
    }
  }
  assert.equal(reachedRelease, true, 'ordinary physics must reach a genuine release window');
  assert.equal(game.act('release'), true);
  assert.equal(game.getState().combo, 1, 'the real completed swing must still earn its reward');
  const releaseTick = game.getState().tick;
  for (let taps = 0; taps < 4; taps++) {
    assert.equal(game.act('press'), true);
    assert.equal(game.act('release'), true);
  }
  const after = game.getState();
  assert.equal(after.tick, releaseTick, 'no physical swing occurred between these input edges');
  assert.ok(after.combo < 2, 'input spam cannot build a combo without a new swing');
  assert.ok(after.stylishReleaseTicks.length < 2, 'input spam cannot qualify for the rare bird');
  assert.equal(game.getEvents().filter(event => event.type === 'combo-gain').length, 1);
});

test('guided release rewards require the body to actually pass its attached support', () => {
  const game = createGrappleGame(32, options);
  game.restartEndless(32);
  game.act('press');
  const initial = game.getState();
  const anchor = initial.anchors.find(item => item.id === initial.attachedAnchorId)!;
  // Scoped timing fixture: speed and a physical tick alone are insufficient
  // while the body is still approaching the visible support.
  game.setPlayerForTest({ x: anchor.x - 30, y: anchor.y + 200, vx: 500, vy: -50 });
  const beforeRelease = game.advanceTicks(1);
  assert.ok(beforeRelease.player.x < anchor.x);
  assert.ok(beforeRelease.player.vx > 200 && beforeRelease.player.vy < 120);
  assert.ok(Math.hypot(beforeRelease.player.vx, beforeRelease.player.vy) >= 360);
  assert.equal(game.act('release'), true);
  assert.equal(game.getState().combo, 0, 'a premature launch cannot earn the displayed late-release reward');
  assert.deepEqual(game.getState().stylishReleaseTicks, []);
});
