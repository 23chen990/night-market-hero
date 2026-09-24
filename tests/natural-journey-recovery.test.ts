import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

/**
 * A real browser does not deliver a perfectly fixed number of simulation ticks
 * for each pointer hold. This is a bounded, ordinary hold/release rhythm with
 * a little cadence variation, representative of a player learning the first
 * route rather than a fixture or state injection.
 */
test('ordinary tutorial rhythm can recover from the low route and reach the rejoin', () => {
  const game = createGrappleGame(31);
  const cadence = [
    { hold: 32, release: 8 },
    { hold: 36, release: 8 },
    { hold: 40, release: 8 },
    { hold: 44, release: 12 },
  ];
  let reachedRejoin = false;
  for (let cycle = 0; cycle < 80 && game.getState().status === 'playing'; cycle += 1) {
    const rhythm = cadence[cycle % cadence.length]!;
    assert.equal(game.act('press'), true, `press ${cycle} should be accepted`);
    game.advanceTicks(rhythm.hold);
    assert.equal(game.act('release'), true, `release ${cycle} should be accepted`);
    game.advanceTicks(rhythm.release);
    const state = game.getState();
    if (state.player.x >= state.routeGraph.rejoin.x) reachedRejoin = true;
    assert.ok(state.player.x >= 0, 'the tutorial rhythm must remain in the authored world');
  }
  assert.equal(reachedRejoin, true, 'the low route needs a recoverable hold/release path to the rejoin');
  assert.equal(game.getState().status, 'won', 'the same ordinary rhythm must remain recoverable through the live gate');
});

test('browser-scale tutorial cadence cannot be caught before the authored rejoin', () => {
  const game = createGrappleGame(31);
  const rejoinX = game.getState().routeGraph.rejoin.x;
  let reachedRejoin = false;
  for (let cycle = 0; cycle < 40 && game.getState().status === 'playing'; cycle += 1) {
    assert.equal(game.act('press'), true, `press ${cycle} should be accepted`);
    game.advanceTicks(30);
    assert.equal(game.act('release'), true, `release ${cycle} should be accepted`);
    game.advanceTicks(8);
    const state = game.getState();
    if (state.player.x >= rejoinX) reachedRejoin = true;
    if (!reachedRejoin) assert.notEqual(state.status, 'failed', 'tutorial chase contact must leave the taught route recoverable');
  }
  assert.equal(reachedRejoin, true, 'the browser-scale cadence must reach the shared rejoin');
});

test('browser-scale tutorial cadence remains recoverable through the closing gate', () => {
  const game = createGrappleGame(31);
  for (let cycle = 0; cycle < 80 && game.getState().status === 'playing'; cycle += 1) {
    assert.equal(game.act('press'), true, `press ${cycle} should be accepted`);
    game.advanceTicks(30);
    assert.equal(game.act('release'), true, `release ${cycle} should be accepted`);
    game.advanceTicks(8);
  }
  assert.equal(game.getState().status, 'won', 'the tutorial should remain completable at browser-scale cadence');
});
