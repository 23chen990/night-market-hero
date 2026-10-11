import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';
import { metersAtSegment, segmentStartPx, settlementCoins } from '../src/endless.ts';

test('追捕阶段在最终 gate-climax 外按现有距离阈值依次预警', () => {
  const sample = (distance: number, scenario = 'segment-first-pursuit') => {
    const game = createGrappleGame(31);
    const loaded = game.loadScenario(scenario);
    game.setPlayerForTest({ x: loaded.pursuer.x + distance, y: 470, vx: 0, vy: 0 });
    return game.advanceTicks(1);
  };

  assert.equal(sample(500).chase.phase, 'safe');
  assert.equal(sample(320).chase.phase, 'alert');
  assert.equal(sample(140).chase.phase, 'danger');
  assert.equal(sample(350, 'segment-gate-climax').chase.phase, 'climax');
});

test('路线 commitment 对 high/low 实际走廊对称更新并驱动下游路线', () => {
  const lowToHigh = createGrappleGame(31);
  lowToHigh.loadScenario('route-low');
  lowToHigh.setPlayerForTest({ x: 1575, y: 370, vx: 300, vy: 0 });
  const highState = lowToHigh.advanceTicks(1);
  assert.equal(highState.routeTraversal.committedRoute, 'high');
  assert.equal(highState.route, 'high');
  assert.equal(highState.routeProfile.id, 'high');
  assert.ok(['node-5', 'node-6'].includes(lowToHigh.getEligibleAnchorId() ?? ''));

  const highToLow = createGrappleGame(31);
  highToLow.loadScenario('route-high');
  highToLow.setPlayerForTest({ x: 1575, y: 620, vx: 300, vy: 0 });
  const lowState = highToLow.advanceTicks(1);
  assert.equal(lowState.routeTraversal.committedRoute, 'low');
  assert.equal(lowState.route, 'low');
  assert.equal(lowState.routeProfile.id, 'low');
  assert.equal(highToLow.getEligibleAnchorId(), 'node-low');

  const outside = createGrappleGame(31);
  outside.loadScenario('route-high');
  outside.setPlayerForTest({ x: 1800, y: 800, vx: 0, vy: 0 });
  assert.equal(outside.advanceTicks(1).routeTraversal.committedRoute, null);
});

test('结算拒绝非有限、负数与不安全输入且不产生 NaN 或溢出', () => {
  const invalidInputs: Array<Record<string, unknown>> = [
    { gates: Number.NaN },
    { gates: Number.POSITIVE_INFINITY },
    { gates: -1 },
    { gates: 0, distanceMeters: Number.NaN },
    { gates: 0, pickupCoins: -1 },
    { gates: 0, combo: Number.NEGATIVE_INFINITY },
    { gates: 0, depthMultiplier: -0.1 },
    { gates: Number.MAX_SAFE_INTEGER + 1 },
    { gates: 0, distanceMeters: Number.MAX_SAFE_INTEGER + 1 },
  ];

  for (const input of invalidInputs) {
    const result = settlementCoins(input as never);
    assert.equal(result, 0, `invalid input should be rejected: ${JSON.stringify(input)}`);
    assert.equal(Number.isFinite(result), true);
  }

  assert.equal(settlementCoins({ distanceMeters: Number.MAX_SAFE_INTEGER, gates: 0 }), 1_080_863_910_568_918);
  assert.equal(settlementCoins({ distanceMeters: 0, gates: 0, pickupCoins: Number.MAX_SAFE_INTEGER, combo: 0 }), Number.MAX_SAFE_INTEGER);
  const overflow = settlementCoins({
    distanceMeters: 0,
    gates: 0,
    pickupCoins: Number.MAX_SAFE_INTEGER,
    combo: 99,
    depthMultiplier: Number.MAX_SAFE_INTEGER,
  });
  assert.equal(overflow, 0);
  assert.equal(Number.isFinite(overflow), true);
});

test('无尽夜巡复活不越过死亡前已到达的前沿', () => {
  const game = createGrappleGame(1);
  game.restartEndless(1);
  const reachedX = 4502.866;

  game.setPlayerForTest({ x: reachedX, y: 500, vx: 0, vy: 0 });
  const reached = game.advanceTicks(1);
  game.setPlayerForTest({ x: reached.player.x, y: 950, vx: 0, vy: 0 });
  const failed = game.advanceTicks(1);

  assert.equal(failed.status, 'failed');
  assert.equal(game.canRewardedRevive(), true);
  assert.equal(game.reviveFromSafeState(), true);
  const revived = game.getState();
  assert.ok(Number.isFinite(revived.furthestX));
  assert.ok(revived.player.x <= revived.furthestX + 1e-6);
  assert.ok(revived.player.x <= failed.player.x + 1e-6);
  assert.equal(revived.distanceMeters, failed.distanceMeters);
  assert.equal(revived.reviveUsed, true);
});

test('无尽夜巡分段奖励按首次进入记录，回退和存档恢复不重复发放', () => {
  const game = createGrappleGame(11);
  game.restartEndless(11);
  const at = (segment: number) => {
    game.setPlayerForTest({ x: segmentStartPx(segment) + 100, y: 500, vx: 0, vy: 0 });
    return game.advanceTicks(1);
  };

  at(1);
  const firstSegmentTwo = at(2);
  const segmentTwoPickups = firstSegmentTwo.activePickups.filter((pickup) => pickup.segment === 2).length;
  const firstVehicleTicks = firstSegmentTwo.vehicleTicksRemaining;
  const snapshot = game.getState();

  const backtracked = at(1);
  assert.equal(backtracked.gatesPassed, firstSegmentTwo.gatesPassed);
  assert.equal(backtracked.activePickups.filter((pickup) => pickup.segment === 2).length, segmentTwoPickups);
  assert.equal(backtracked.vehicleTicksRemaining, firstVehicleTicks - 1);

  const reentered = at(2);
  assert.equal(reentered.gatesPassed, firstSegmentTwo.gatesPassed);
  assert.equal(reentered.activePickups.filter((pickup) => pickup.segment === 2).length, segmentTwoPickups);
  assert.equal(reentered.vehicleTicksRemaining, firstVehicleTicks - 2);

  const restoredGame = createGrappleGame(11);
  assert.equal(restoredGame.restoreSnapshot(snapshot), true);
  restoredGame.setPlayerForTest({ x: segmentStartPx(1) + 100, y: 500, vx: 0, vy: 0 });
  const restoredBacktrack = restoredGame.advanceTicks(1);
  restoredGame.setPlayerForTest({ x: segmentStartPx(2) + 100, y: 500, vx: 0, vy: 0 });
  const restoredReentry = restoredGame.advanceTicks(1);
  assert.equal(restoredReentry.gatesPassed, snapshot.gatesPassed);
  assert.equal(restoredReentry.activePickups.filter((pickup) => pickup.segment === 2).length, segmentTwoPickups);
  assert.equal(restoredReentry.vehicleTicksRemaining, restoredBacktrack.vehicleTicksRemaining - 1);
  assert.deepEqual(restoredReentry.visitedSegments, snapshot.visitedSegments);

  const legacySnapshot = game.getState() as any;
  delete legacySnapshot.furthestX;
  delete legacySnapshot.visitedSegments;
  const restoredLegacyGame = createGrappleGame(11);
  assert.equal(restoredLegacyGame.restoreSnapshot(legacySnapshot), true);
  const restoredLegacy = restoredLegacyGame.getState();
  assert.equal(restoredLegacy.furthestX, legacySnapshot.player.x);
  assert.deepEqual(restoredLegacy.visitedSegments, [legacySnapshot.segmentIndex]);
});

test('分段里程边界与分段起点一致', () => {
  // The previous expectation used n*(n+1)/2; authored segment starts use n*(n-1)/2.
  for (const segment of [0, 1, 4, 8, 24]) {
    assert.equal(metersAtSegment(segment), segmentStartPx(segment) / 30);
  }
});
