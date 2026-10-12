import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';
import { segmentStartPx } from '../src/endless.ts';

const options = { marketGates: false, terrainMode: 'panorama', guidedExperience: true } as const;

test('guided high-speed players cannot create an unlimited uncatchable guard gap', () => {
  const game = createGrappleGame(31, options); game.restartEndless(31);
  // Engineering fixture: keep the player at a constant cruising speed/altitude
  // while the real fixed-step pursuer controller runs, without teleporting the guard.
  game.setPlayerForTest({ x: segmentStartPx(5) + 120, y: 590, vx: 540, vy: 0 });
  game.advanceTicks(1);
  const setup = game.getState();
  // Normalize only the initial engineer-fixture separation. No guard state
  // injection occurs during the measurement window itself.
  setup.pursuer.x = setup.player.x - 700;
  setup.pursuer.vx = 540;
  assert.equal(game.restoreSnapshot(setup), true);
  let furthestGap = setup.player.x - setup.pursuer.x;
  for (let sample = 0; sample < 16; sample++) {
    const current = game.getState();
    if (current.status !== 'playing') break;
    game.setPlayerForTest({ y: 590, vy: 0, vx: 540 });
    game.advanceTicks(60);
    furthestGap = Math.max(furthestGap, game.getState().chase.distance);
  }
  assert.ok(furthestGap < 1200, `pursuer drifted out of the game: ${furthestGap}`);
  assert.ok(game.getState().chase.distance < 1000 || game.getState().failureReason === 'caught',
    'patrol must exert sustainable pressure without snapping to the player');
});

test('guided run limits real travel speed even after deep endless segments', () => {
  const game = createGrappleGame(31, options); game.restartEndless(31);
  game.setPlayerForTest({ x: segmentStartPx(16) + 20, y: 475, vx: 1600, vy: 0 });
  const state = game.advanceTicks(1);
  assert.equal(state.status, 'playing');
  assert.ok(state.player.vx <= 700, `uncapped late speed: ${state.player.vx}`);
  assert.ok(state.maxSpeed <= 750, `late speed cap should not ramp indefinitely: ${state.maxSpeed}`);
});
