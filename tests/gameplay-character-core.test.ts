import assert from 'node:assert/strict';
import test from 'node:test';
import { createGrappleGame } from '../src/game-core';
import { CHARACTERS } from '../src/progression';
import { segmentStartPx } from '../src/endless';

test('approved characters affect ordinary velocity, gravity, speed cap and actual grapple eligibility', () => {
  const base = createGrappleGame(31);
  const fast = createGrappleGame(31, { characterId: '走绳伎' });
  const stats = CHARACTERS.find(c => c.id === '走绳伎')!.stats;
  assert.equal(fast.getState().player.vx, base.getState().player.vx * stats.speed);
  assert.equal(fast.getState().maxSpeed, base.getState().maxSpeed * stats.speed);
  assert.equal(fast.getState().attachRadius, base.getState().attachRadius * stats.attachRadius);
  const baselineMotion = base.advanceTicks(12);
  const fastMotion = fast.advanceTicks(12);
  assert.ok(fastMotion.player.x > baselineMotion.player.x);
  assert.ok(fastMotion.player.vy > baselineMotion.player.vy);
  const probe = createGrappleGame(31).getState();
  probe.anchors = [{ id: 'radius-probe', type: '檐角', x: 800, y: 300 }];
  probe.player = { x: 200, y: 325, vx: 245, vy: 0 };
  base.restoreSnapshot(probe);
  assert.equal(base.getEligibleAnchorId(), null);
  probe.characterId = '双钩客';
  const safer = createGrappleGame(31);
  assert.equal(safer.restoreSnapshot(probe), true);
  assert.equal(safer.getEligibleAnchorId(), 'radius-probe');
});

test('selection validates ids, affects new runs, survives restore and never compounds', () => {
  const game = createGrappleGame(31, { characterId: '铁索僧' });
  const initial = game.getState();
  assert.equal(game.setCharacter('unknown'), false);
  assert.deepEqual(game.getState(), initial);
  game.advanceTicks(1);
  assert.equal(game.setCharacter('走绳伎'), false);
  for (let i = 0; i < 3; i++) {
    game.resetGame(31);
    assert.equal(game.getState().player.vx, initial.player.vx);
    assert.equal(game.getState().attachRadius, initial.attachRadius);
    assert.equal(game.restoreSnapshot(game.getState()), true);
    assert.equal(game.getState().maxSpeed, initial.maxSpeed);
  }
  const legacy = game.getState();
  delete (legacy as any).characterId;
  assert.equal(game.restoreSnapshot(legacy), true);
  assert.equal(game.getState().characterId, '街灯客');
});

test('sky record counts qualified distinct segments once across frames, reentry and reload', () => {
  const game = createGrappleGame(31, { marketGates: false });
  game.restartEndless(31);
  const enter = (index: number, y = 400, vx = 420) => {
    game.setPlayerForTest({ x: segmentStartPx(index) + 100, y, vx, vy: 0 });
    return game.advanceTicks(1);
  };
  assert.equal(enter(8, 520, 200).skySegments, 0);
  assert.equal(enter(8).skySegments, 1);
  assert.equal(game.advanceTicks(3).skySegments, 1);
  enter(7);
  assert.equal(enter(8).skySegments, 1);
  const snapshot = game.getState();
  const restored = createGrappleGame(31, { marketGates: false });
  restored.restoreSnapshot(snapshot);
  restored.setPlayerForTest({ x: segmentStartPx(8) + 100, y: 400, vx: 420, vy: 0 });
  assert.equal(restored.advanceTicks(1).skySegments, 1);
  assert.equal(enter(12).skySegments, 2);
});

test('paused item use is a full no-op', () => {
  const game = createGrappleGame(31);
  game.setPaused(true);
  const before = game.getState();
  assert.equal(game.useTalisman(), false);
  assert.equal(game.useFirecracker(), false);
  assert.deepEqual(game.getState(), before);
});
