import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';
import { segmentStartPx } from '../src/endless.ts';

// Engineering regression only. This does not replace natural input / perceptual QA.
const options = { marketGates: false, terrainMode: 'panorama', guidedExperience: true } as const;

test('guided high-speed player must not create unlimited uncatchable guard distance', () => {
  const game = createGrappleGame(31, options); game.restartEndless(31);
  game.setPlayerForTest({ x: segmentStartPx(5) + 120, y: 590, vx: 540, vy: 0 });
  game.advanceTicks(1);
  const setup = game.getState();
  setup.pursuer.x = setup.player.x - 700;
  setup.pursuer.vx = 540;
  assert.equal(game.restoreSnapshot(setup), true);
  let maxGap = setup.player.x - setup.pursuer.x;
  for (let minute = 0; minute < 16; minute++) {
    if (game.getState().status !== 'playing') break;
    game.setPlayerForTest({ y: 590, vy: 0, vx: 540 });
    game.advanceTicks(60);
    maxGap = Math.max(maxGap, game.getState().chase.distance);
  }
  assert.ok(maxGap < 1200, 'pursuer must not drift out of visible gameplay indefinitely');
  assert.ok(game.getState().chase.distance < 1000 || game.getState().failureReason === 'caught',
    'patrol must exert sustainable pressure without teleportation');
});

test('guided run must limit travel speed in later endless segments', () => {
  const game = createGrappleGame(31, options); game.restartEndless(31);
  game.setPlayerForTest({ x: segmentStartPx(16) + 20, y: 475, vx: 1600, vy: 0 });
  const state = game.advanceTicks(1);
  assert.equal(state.status, 'playing');
  assert.ok(state.player.vx <= 700, 'horizontal speed exceeds mobile comfort cap');
  assert.ok(state.maxSpeed <= 750, 'endless speed ceiling should not grow without bound');
});
