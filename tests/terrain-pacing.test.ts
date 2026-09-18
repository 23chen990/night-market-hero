import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

test('first-level canopy and bamboo lessons are delayed and separated by a playable gap', () => {
  const game = createGrappleGame(104);
  const sample = (progress: number) => {
    const state = game.getState();
    game.setPlayerForTest({ x: state.finishX * progress, y: 420, vx: 0, vy: 0 });
    return game.step(1 / 120);
  };
  const atStart = sample(0.04);
  assert.notEqual(atStart.activeTerrain?.kind, '竹架', 'opening should teach grappling before the bamboo');
  const canopy = sample(0.12);
  assert.equal(canopy.activeTerrain?.kind, '布棚');
  const gap = sample(0.20);
  assert.notEqual(gap.activeTerrain?.kind, '竹架', 'a neutral transfer gap should separate canopy and bamboo');
  const bamboo = sample(0.30);
  assert.equal(bamboo.activeTerrain?.kind, '竹架');
});
