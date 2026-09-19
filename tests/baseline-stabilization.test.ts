import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';
import type { GrappleState } from '../src/game-core.ts';
import { metersAtSegment, segmentIndexAtX, segmentProgressAtX, segmentStartPx } from '../src/endless.ts';

type Game = ReturnType<typeof createGrappleGame>;
type Mutation = GrappleState['mutation'];

/** 走正式解锁路径进入 night-patrol（不是任何测试后门）：完成教学坊门后再继续。 */
function enterNightPatrol(seed: number): Game {
  const game = createGrappleGame(seed);
  const gate = game.loadScenario('event-closing-gate-beat-3');
  game.setPlayerForTest({ x: gate.gate.x + 40, y: gate.gate.collisionAperture.y + 80, vx: 700, vy: 0 });
  game.advanceTicks(30);
  assert.equal(game.getState().status, 'won', 'tutorial scenario must clear the gate before the patrol unlocks');
  game.continueCampaign();
  return game;
}

/** 用引擎自身的 endless 推进把玩家送进指定段位，避免手工伪造段号。 */
function advanceToSegment(game: Game, segment: number): void {
  game.setPlayerForTest({ x: segmentStartPx(segment) + 200, y: 330, vx: 460, vy: 0 });
  game.advanceTicks(2);
}

function withMutation(game: Game, mutation: Mutation): Game {
  (game as unknown as { state: GrappleState }).state.mutation = mutation;
  return game;
}

describe('TASK-00 baseline: mutation modifier source', () => {
  test('A1 mutationModifiers is the single authoritative mutation source', () => {
    const game = createGrappleGame(23);
    const api = game as unknown as Record<string, unknown>;
    assert.equal(typeof api.mutationModifiers, 'function');
    assert.equal(
      'mutationEffects' in api,
      false,
      'mutationEffects must never return as a second copy of the mutation math',
    );
  });

  test('A2 a normal run advances a fixed tick against the documented modifiers', () => {
    const game = createGrappleGame(5);
    game.loadScenario('segment-safe-tutorial');
    const before = game.getState().tick;
    game.act('press');
    assert.doesNotThrow(() => game.advanceTicks(1), 'a fixed tick must not hit a missing mutation helper');
    assert.ok(game.getState().tick > before, 'the tick counter must actually move');
  });

  test('A3 mutation tuning parameters stay untouched by this stabilization', () => {
    const game = createGrappleGame(23);
    assert.deepEqual(game.mutationModifiers(), {
      attachRadiusFactorLow: 1, swingDriveFactor: 1, gravityFactor: 1,
      gateCloseTicksFactor: 1, pursuitSpeedFactor: 1,
    });
    assert.equal(withMutation(game, '起雾').mutationModifiers().attachRadiusFactorLow, 0.85);
    assert.equal(withMutation(game, '下雨').mutationModifiers().swingDriveFactor, 0.92);
    assert.equal(withMutation(game, '下雨').mutationModifiers().gravityFactor, 1.05);
    assert.equal(withMutation(game, '封灯').mutationModifiers().gateCloseTicksFactor, 1 / 1.1);
    assert.equal(withMutation(game, '宵禁加派').mutationModifiers().pursuitSpeedFactor, 1.25);
  });
});

describe('TASK-00 baseline: night-patrol snapshot keeps the endless runtime', () => {
  test('B1 restored night-patrol keeps its course and still runs as endless after a real tick', () => {
    const source = enterNightPatrol(23);
    advanceToSegment(source, 2);
    advanceToSegment(source, 5);
    advanceToSegment(source, 9);
    const snapshot = source.getState();
    assert.equal(snapshot.status, 'playing');
    assert.equal(snapshot.levelId, 'night-patrol');
    assert.equal(snapshot.finishX, Number.MAX_SAFE_INTEGER);
    assert.ok(snapshot.segmentIndex >= 5, 'the snapshot must come from a non-initial course position');
    assert.ok(snapshot.distanceMeters > 0);

    // main.ts 的启动顺序：new GrappleGame(seed) -> restoreSnapshot(state)
    const restored = createGrappleGame(snapshot.seed);
    assert.equal(restored.restoreSnapshot(snapshot), true);

    const afterRestore = restored.getState();
    assert.equal(afterRestore.levelId, 'night-patrol');
    assert.equal(afterRestore.finishX, Number.MAX_SAFE_INTEGER);
    assert.deepEqual(
      {
        segmentIndex: afterRestore.segmentIndex, distanceMeters: afterRestore.distanceMeters,
        mutation: afterRestore.mutation, vehicleId: afterRestore.vehicleId,
      },
      {
        segmentIndex: snapshot.segmentIndex, distanceMeters: snapshot.distanceMeters,
        mutation: snapshot.mutation, vehicleId: snapshot.vehicleId,
      },
      'restore must not jump the course, vehicle or mutation fields',
    );

    // 关键：真正推进一个 fixed tick。只检查 levelId 的表面断言抓不到这个回归。
    const deepX = segmentStartPx(24) + 400;
    restored.setPlayerForTest({ x: deepX, y: 330, vx: 460, vy: 0 });
    assert.doesNotThrow(() => restored.advanceTicks(1));
    const after = restored.getState();
    const expectedSegment = segmentIndexAtX(after.player.x);
    assert.ok(expectedSegment > snapshot.segmentIndex, 'the probe must actually cross into a later segment');

    assert.equal(after.levelId, 'night-patrol');
    assert.equal(after.finishX, Number.MAX_SAFE_INTEGER);
    assert.equal(
      after.segmentIndex,
      expectedSegment,
      'endless has to recompute the segment from the player position on every tick',
    );
    assert.ok(
      after.distanceMeters >= Math.floor(metersAtSegment(expectedSegment)),
      'endless distance must follow the segment ladder, not stay frozen at the snapshot value',
    );
    assert.equal(
      after.progress,
      segmentProgressAtX(after.player.x),
      'progress must use the endless segment rule, never the campaign x/finishX rule',
    );
    assert.ok(
      after.anchors.some((anchor) => anchor.x > after.player.x),
      'the endless course must keep extending anchors ahead of the player',
    );
  });

  test('B2 a campaign snapshot restore stays a campaign run', () => {
    const game = createGrappleGame(11);
    const snapshot = game.getState();
    assert.equal(snapshot.levelId, 'lantern-entry');
    const levelFinishX = snapshot.finishX;
    assert.ok(Number.isFinite(levelFinishX) && levelFinishX < Number.MAX_SAFE_INTEGER);

    const restored = createGrappleGame(snapshot.seed);
    assert.equal(restored.restoreSnapshot(snapshot), true);
    restored.setPlayerForTest({ x: snapshot.player.x + 600, y: 330, vx: 460, vy: 0 });
    restored.advanceTicks(1);

    const after = restored.getState();
    assert.equal(after.levelId, 'lantern-entry');
    assert.equal(after.finishX, levelFinishX);
    assert.ok(
      after.progress <= Math.max(snapshot.progress, after.player.x / levelFinishX) + Number.EPSILON,
      'campaign progress keeps using the finite track length',
    );
  });
});
