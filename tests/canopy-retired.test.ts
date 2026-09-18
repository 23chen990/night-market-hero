import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

test('布篷弹跳在当前版本被隐藏且不参与核心循环', () => {
  const game = createGrappleGame(51);
  const state = game.loadScenario('terrain-布棚-safe');
  const canopy = state.activeTerrain!;
  game.setPlayerForTest({ x: canopy.bounds.x + 80, y: canopy.bounds.y - 5, vx: 280, vy: 260 });
  const after = game.advanceTicks(1);
  assert.equal(after.bounceCount, 0);
  assert.equal(after.activeTerrain?.behaviorState, 'ready');
});
