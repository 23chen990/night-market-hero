import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

function runBrowserLikeCadence(holdTicks: number) {
  const game = createGrappleGame(32);
  game.restartEndless(32);
  for (let pair = 0; pair < 64 && game.getState().status === 'playing'; pair += 1) {
    game.act('press');
    game.advanceTicks(holdTicks);
    game.act('release');
    game.advanceTicks(10);
    if (game.getState().player.x > 6_600) break;
  }
  return game.getState();
}

test('endless opening tolerates browser frame variance around the taught rhythm', () => {
  for (const holdTicks of [86, 88, 90, 92, 94, 96]) {
    const state = runBrowserLikeCadence(holdTicks);
    assert.equal(state.status, 'playing', `${holdTicks}/10 rhythm failed with ${state.failureReason}`);
    assert.ok(state.player.x > 6_600, `${holdTicks}/10 rhythm stopped at x=${state.player.x}`);
  }
});

test('opening chase grace ends after the first endless district cycle', () => {
  const game = createGrappleGame(32);
  game.restartEndless(32);
  while (game.getState().status === 'playing' && game.getState().segmentIndex <= 3) {
    game.act('press');
    game.advanceTicks(90);
    game.act('release');
    game.advanceTicks(10);
  }
  assert.ok(game.getState().segmentIndex > 3, 'the taught rhythm must leave the opening district cycle');
  game.act('release');
  game.advanceTicks(3_000);
  assert.equal(game.getState().status, 'failed');
  assert.ok(['caught', 'fell'].includes(game.getState().failureReason ?? ''));
});
