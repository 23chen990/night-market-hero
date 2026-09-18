import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

test('玩家二维碰撞体落到官兵身上时立即被抓捕', () => {
  const game = createGrappleGame(31);
  const state = game.getState();
  game.setPlayerForTest({ x: state.pursuer.x + 8, y: state.pursuer.y - 10, vx: 0, vy: 0 });
  const caught = game.advanceTicks(1);
  assert.equal(caught.status, 'failed');
  assert.equal(caught.failureReason, 'caught');
});
