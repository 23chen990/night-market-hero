import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

test('竹架 is a reusable obstacle type with impact slowdown and persistent debris', () => {
  const game = createGrappleGame(101);
  const before = game.loadScenario('terrain-竹架-safe');
  const obstacle = before.sceneObjects.find((item) => item.kind === '竹架')!;
  assert.equal(obstacle.category, 'obstacle');
  assert.equal(obstacle.collision, 'solid');
  const startingSpeed = before.player.vx;
  game.setPlayerForTest({ x: obstacle.bounds.x + 40, y: obstacle.bounds.y + 20, vx: 300, vy: 120 });
  const impacted = game.advanceTicks(1);
  assert.ok(impacted.player.vx < startingSpeed, 'kicking an obstacle must slow the player');
  assert.ok(impacted.sceneObjects.find((item) => item.kind === '竹架')!.impactCount >= 1);
  game.advanceTicks(12);
  const collapsed = game.getState();
  const bamboo = collapsed.sceneObjects.find((item) => item.kind === '竹架')!;
  assert.equal(bamboo.behaviorState, 'broken');
  assert.ok(bamboo.debrisBounds, 'collapsed obstacle must retain debris bounds');
  assert.equal(collapsed.chaseObstacle, null, 'terrain obstacle state is independent from timed chase events');
});

test('collapsed obstacle debris slows the pursuer and survives leaving the original bounds', () => {
  const game = createGrappleGame(102);
  game.loadScenario('terrain-竹架-safe');
  game.advanceTicks(12);
  const collapsed = game.getState();
  const bamboo = collapsed.sceneObjects.find((item) => item.kind === '竹架')!;
  assert.equal(bamboo.behaviorState, 'broken');
  const pursuerBefore = collapsed.pursuer.vx;
  game.setPlayerForTest({ x: bamboo.bounds.x + bamboo.bounds.width + 140, y: 600, vx: 220, vy: 0 });
  const later = game.advanceTicks(1);
  assert.ok(later.sceneObjects.some((item) => item.kind === '竹架' && item.debrisBounds));
  assert.ok(later.pursuer.vx <= pursuerBefore, 'debris must impose a temporary pursuit slowdown');
});

test('布棚在当前版本保留数据但不触发弹跳', () => {
  const game = createGrappleGame(103);
  const state = game.loadScenario('terrain-布棚-safe');
  const canopy = state.sceneObjects.find((item) => item.kind === '布棚')!;
  game.setPlayerForTest({ x: canopy.bounds.x + 80, y: canopy.bounds.y - 5, vx: 280, vy: 260 });
  const bounced = game.advanceTicks(1);
  assert.equal(bounced.activeTerrain?.behaviorState, 'ready');
  assert.equal(bounced.bounceCount, 0);
});
