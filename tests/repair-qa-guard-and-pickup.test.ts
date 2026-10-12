import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';
import { segmentStartPx } from '../src/endless.ts';

test('a slow, upright player can genuinely be arrested by patrol rather than only falling', () => {
  const game = createGrappleGame(31, { marketGates: false, terrainMode: 'panorama', guidedExperience: true });
  game.restartEndless(31);
  game.setPlayerForTest({ x: segmentStartPx(2) + 800, y: 590, vx: 100, vy: 0 });
  game.advanceTicks(1);
  const initial = game.getState();
  // Engineering setup deliberately supplies a nearby pursuing guard; the
  // assertion exercises normal continuous guard motion without any later
  // guard teleport, debug catch call, or artificial failure injection.
  initial.pursuer.x = initial.player.x - 430;
  initial.pursuer.vx = 370;
  assert.equal(game.restoreSnapshot(initial), true);
  const pressureReadings: number[] = [];
  for (let tick = 0; tick < 600; tick++) {
    if (game.getState().status !== 'playing') break;
    game.setPlayerForTest({ y: 590, vy: 0, vx: 100 });
    const state = game.advanceTicks(1);
    if (tick % 20 === 0) pressureReadings.push(state.chase.pressure);
  }
  const caught = game.getState();
  assert.ok(pressureReadings.some(p => p > 0.7), 'player should see an escalating danger state');
  assert.equal(caught.failureReason, 'caught', 'the patrol must be able to arrest, not just trigger a fall');
  assert.equal(caught.status, 'failed');
});

test('a patrol vehicle is not a segment-entry gift', () => {
  const game = createGrappleGame(31, { marketGates: false, terrainMode: 'panorama', guidedExperience: true });
  game.restartEndless(31);
  game.setPlayerForTest({ x: segmentStartPx(2) + 1, y: 465, vx: 450, vy: 0 });
  const state = game.advanceTicks(1);
  assert.equal(state.vehicleId, null);
  assert.equal(state.vehicleOffers.length, 1);
  assert.equal(state.vehicleOffers[0]!.status, 'available');
  assert.ok(state.vehicleOffers[0]!.x > state.player.x);
});
