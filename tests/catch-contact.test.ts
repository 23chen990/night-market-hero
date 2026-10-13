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


test('追捕接网有高度边界：高空躲网成功，低空同水平距离被抓', () => {
  const game = createGrappleGame(31, { marketGates: false, terrainMode: 'panorama', guidedExperience: true });
  game.restartEndless(31);
  // Test fixture only, not a natural-play proof. Move beyond opening grace.
  game.setPlayerForTest({ x: 5500, y: 200, vx: 0, vy: 0 });
  game.advanceTicks(1);
  const high = game.getState();
  high.pursuer.x = high.player.x - 18;
  high.pursuer.vx = 0;
  assert.equal(game.restoreSnapshot(high), true);
  const escaped = game.advanceTicks(1);
  assert.equal(escaped.status, 'playing', 'high swing above the thrown net must not be caught by an invisible x-only collider');
  game.setPlayerForTest({ x: escaped.pursuer.x + 16, y: 470, vx: 0, vy: 0 });
  const low = game.advanceTicks(1);
  assert.equal(low.status, 'failed');
  assert.equal(low.failureReason, 'caught');
});
