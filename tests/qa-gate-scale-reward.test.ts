import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

test('闸门是紧凑地标且闸门后有收钱接应人', () => {
  const state = createGrappleGame(31).loadScenario('event-closing-gate-beat-3');
  assert.ok(state.gate.anchorBounds.width <= 420);
  assert.ok(state.gate.anchorBounds.height <= 380);
  assert.ok(state.gate.receiver.x > state.gate.x);
  assert.ok(state.gate.receiver.y >= state.gate.collisionAperture.y);
});

test('完成穿门后记录一次城门奖励并标记接应人已收钱', () => {
  const game = createGrappleGame(31);
  const state = game.loadScenario('event-closing-gate-beat-3');
  game.setPlayerForTest({ x: state.gate.x - 42, y: state.gate.centerY, vx: 720, vy: 0 });
  const won = game.advanceTicks(24);
  assert.equal(won.status, 'won');
  assert.equal(won.gatesPassed, 1);
  assert.equal(won.receiverPaid, true);
});

test('人在闸门开口外侧时不能被判定为通关', () => {
  const game = createGrappleGame(32);
  const state = game.loadScenario('event-closing-gate-beat-3');
  game.setPlayerForTest({
    x: state.gate.x - 42,
    y: state.gate.anchorBounds.y + 20,
    vx: 720,
    vy: 0,
  });
  const result = game.advanceTicks(24);
  assert.notEqual(result.status, 'won');
  assert.equal(result.receiverPaid, false);
});
