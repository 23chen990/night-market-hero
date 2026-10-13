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

test('guided catch-immune bird cannot permanently freeze officers', () => {
  const game = createGrappleGame(31, options); game.restartEndless(31);
  // Build a visible authored pickup in a fixture; never treat fixture as
  // evidence that the natural browser route can reach this encounter.
  game.setPlayerForTest({ x: segmentStartPx(8) + 1, y: 535, vx: 480, vy: 0 });
  const entered = game.advanceTicks(1);
  const offer = entered.vehicleOffers.find(item => item.id === '青鸾' && item.status === 'available');
  assert.ok(offer);
  // Scoped chase immunity fixture, never used to prove acquisition.
  const forced = game.getState();
  forced.vehicleId = '青鸾';
  forced.vehicleTicksRemaining = 600;
  forced.vehiclePhase = 'idle';
  forced.player.x = offer.x - 20;
  forced.player.y = offer.y;
  forced.player.vx = 480;
  assert.equal(game.restoreSnapshot(forced), true);
  const mounted = game.advanceTicks(1);
  assert.equal(mounted.vehicleId, '青鸾');
  const guardX = mounted.pursuer.x;
  game.act('press');
  game.advanceTicks(60);
  const flying = game.getState();
  assert.equal(flying.vehicleId, '青鸾');
  assert.ok(flying.pursuer.x > guardX + 5, 'catch immunity must not stop a guided patrol');
  assert.ok(flying.chase.distance >= 260, 'immune flight should not drop officers directly into unavoidable contact');
});
