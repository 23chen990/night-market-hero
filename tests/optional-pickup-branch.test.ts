import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

/** Physics-layer coverage only. Browser QA independently exercises real input;
 * this test does not count as a natural-input or human acceptance trace. */
test('a stable gameplay input route can intentionally bypass a visible lantern halo', () => {
  const game = createGrappleGame(31, {
    marketGates: false, terrainMode: 'panorama', guidedExperience: true,
  });
  game.restartEndless(31);
  let held = false;
  let lastRelease = -999;
  let holdAt = -999;
  let encountered = false;
  let deliberateHoldFrames = 0;
  for (let sample = 0; sample < 1_200; sample++) {
    const state = game.getState();
    assert.equal(state.status, 'playing', 'optional side route must not kill the player before the halo');
    const target = state.vehicleOffers.find(item => item.id === '灯笼群');
    if (target && target.status === 'missed') {
      assert.ok(encountered && deliberateHoldFrames > 0, 'the player must intentionally steer around an authored object');
      assert.equal(state.lastVehicleOffer?.id, '灯笼群');
      assert.equal(state.lastVehicleOffer?.kind, 'missed');
      assert.notEqual(state.vehicleId, '灯笼群', 'missing a ring must not grant an invisible vehicle');
      assert.ok(state.player.x > target.x + 140, 'missed event must occur only after flying fully past the ring');
      return;
    }
    if (target?.status === 'claimed') {
      assert.fail('normal hold input must be able to miss the optional lantern ring');
    }
    const anchor = state.anchors.find(item => item.id === state.attachedAnchorId);
    let wantHold = state.vehicleId
      ? state.vehicleId === '货运滑索' ? state.vehicleTicksRemaining > 100
        : state.vehicleId === '灯笼群' ? state.vehiclePhase !== 'holding'
          ? state.tick - lastRelease > 26 : state.player.vy > 0 && state.player.vx >= 240
          : state.player.y > 390
      : anchor ? !(state.player.x > anchor.x + 12 && state.player.vx > 0 && state.player.vy < 60)
        && state.player.vx >= 0 && state.tick - holdAt < 160
        : state.tick - lastRelease > 20
          && (state.player.vy > 0 || state.player.y > 540 || state.inputTransitions === 0);
    // Press-and-hold is a real available action, not a fake pickup bypass:
    // the moving player travels below an authored world-space halo.
    if (target?.status === 'available' && state.player.x > target.x - 350
      && state.player.x < target.x - 110) {
      encountered = true;
      deliberateHoldFrames += 8;
      wantHold = true;
    }
    if (held !== wantHold) {
      game.act(wantHold ? 'press' : 'release');
      held = wantHold;
      if (wantHold) holdAt = state.tick;
      else lastRelease = state.tick;
    }
    if (held && !state.inputHeld && state.inputTransitions > 0 && state.tick - holdAt > 30) {
      game.act('release'); held = false; lastRelease = state.tick;
    }
    game.advanceTicks(8);
  }
  assert.fail('the authored lantern halo never resolved from normal physics inputs');
});
