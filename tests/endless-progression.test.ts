import assert from 'node:assert/strict';
import { test } from 'node:test';
import { segmentLengthPx, metersAtSegment, difficultyAtSegment, segmentForIndex, chooseMutation, skySpacing, vehicleForSegment, VEHICLES, comboMultiplier, depthCoefficient, settlementCoins, speedFeelProfile, segmentStartPx, segmentIndexAtX, segmentProgressAtX, retentionBoundsAtSegment, pickupPlacementForSegment, pickupCollisionWindow, vehicleProbabilityAtSegment } from '../src/endless.ts';
import { CHARACTERS, validateRosterTradeoffs, missionForProgress } from '../src/progression.ts';
import { createGrappleGame } from '../src/game-core.ts';
import { LocalRunSnapshotStorage } from '../src/run-snapshot.ts';
import { MemoryProgressStorage, NightMarketMonetization } from '../src/monetization.ts';

test('tutorial completion enters the real endless patrol runtime', () => {
  const game = createGrappleGame(7);
  const gate = game.loadScenario('event-closing-gate-beat-3');
  game.setPlayerForTest({ x: gate.gate.x + 40, y: gate.gate.collisionAperture.y + 80, vx: 700, vy: 0 });
  game.advanceTicks(30);
  assert.equal(game.getState().status, 'won');
  const patrol = game.continueCampaign();
  assert.equal(patrol.levelId, 'night-patrol');
  assert.equal(patrol.levelTitle, '无限夜巡');
  assert.equal(patrol.finishX, Number.MAX_SAFE_INTEGER);
});

test('endless mapping is deterministic and keeps constant segment budget', () => {
  assert.equal(segmentLengthPx(0), 1600);
  assert.equal(metersAtSegment(0), 0);
  assert.ok(metersAtSegment(11) > 500);
  assert.equal(segmentForIndex(0).type, 'swing');
  assert.equal(segmentForIndex(2).type, 'gate');
  assert.equal(segmentForIndex(3).type, 'terrain');
  assert.equal(segmentForIndex(6).type, 'gate');
});

test('difficulty rises by segment while spacing is bounded and sky is wider', () => {
  assert.ok(difficultyAtSegment(11).speedMultiplier >= 1.35);
  assert.ok(difficultyAtSegment(100).anchorSpacing <= 520);
  assert.ok(skySpacing(100) > difficultyAtSegment(100).anchorSpacing);
});

test('mutations start at segment 3, are deterministic, and do not repeat within last 2', () => {
  // 第3段起才可能出现变异
  assert.equal(chooseMutation(0, 3, 42), null);
  assert.equal(chooseMutation(2, 3, 42), null);
  assert.ok(chooseMutation(3, 3, 42) !== null);
  // 确定性：同 (seed, segment) 必得同一变异（暂停恢复一致）
  for (const seg of [3, 7, 20, 50, 99, 200]) {
    assert.equal(chooseMutation(seg, 3, 42), chooseMutation(seg, 3, 42));
  }
  assert.equal(chooseMutation(99, 3, 42), chooseMutation(99, 3, 42));
  // 不重复约束：满池区域（segment>=37）内任意变异不得与最近2段相同
  const seq = Array.from({ length: 201 }, (_, s) => chooseMutation(s, 3, 42));
  for (let i = 37; i < seq.length; i++) {
    assert.notEqual(seq[i], seq[i - 1]);
    assert.notEqual(seq[i], seq[i - 2]);
  }
});

test('vehicles preserve hold/release semantics and are reachable', () => {
  const v = vehicleForSegment(6, true);
  assert.ok(v && v.probability < 0.18);
  assert.equal(vehicleForSegment(2, false)?.id, '纸鸢');
});

test('settlement is fixed pickup value plus gates and ignores legacy multipliers', () => {
  assert.equal(comboMultiplier(8), 4);
  assert.equal(comboMultiplier(8, '提灯童'), 3);
  assert.equal(depthCoefficient(11), 1.2);
  assert.equal(settlementCoins({distanceMeters:100, gates:1, pickups:10, combo:4}), 50);
});

test('roster tradeoffs and mission gating are explicit', () => {
  assert.equal(CHARACTERS.length, 5);
  assert.equal(validateRosterTradeoffs(), true);
  assert.equal(missionForProgress({endlessUnlocked:false, skyUnlocked:false, characters:[]}).length, 3);
});

test('endless runtime exposes segment, economy and pickup progression', () => {
  const game = createGrappleGame(11);
  const gate = game.loadScenario('event-closing-gate-beat-3');
  game.setPlayerForTest({ x: gate.gate.x + 40, y: gate.gate.collisionAperture.y + 80, vx: 700, vy: 0 });
  game.advanceTicks(30);
  game.continueCampaign();
  const patrol = game.getState() as unknown as Record<string, unknown>;
  assert.equal(patrol.levelId, 'night-patrol');
  assert.equal(typeof patrol.segmentIndex, 'number');
  assert.equal(typeof patrol.distanceMeters, 'number');
  assert.equal(typeof patrol.coins, 'number');
  assert.equal(typeof patrol.combo, 'number');
  assert.ok('mutation' in patrol);
  assert.ok('isSky' in patrol);
});

test('night patrol replay remains endless after a terminal failure', () => {
  const game = createGrappleGame(19);
  const gate = game.loadScenario('event-closing-gate-beat-3');
  game.setPlayerForTest({ x: gate.gate.x + 40, y: gate.gate.collisionAperture.y + 80, vx: 700, vy: 0 });
  game.advanceTicks(30);
  game.continueCampaign();
  game.setPlayerForTest({ y: game.getState().failY + 10 });
  game.advanceTicks(1);
  assert.equal(game.getState().status, 'failed');
  game.act('press');
  const replay = game.getState();
  assert.equal(replay.levelId, 'night-patrol');
  assert.equal(replay.levelCount, 2);
  assert.equal(replay.finishX, Number.MAX_SAFE_INTEGER);
});

test('snapshot storage defaults to v2 and does not expose legacy fixed-level key', () => {
  const storage = new LocalRunSnapshotStorage();
  assert.equal((storage as unknown as { key: string }).key, 'night-market-hero.run.v2');
});

test('speed feel profile interpolates continuously from player velocity', () => {
  const calm = speedFeelProfile(245, false);
  const fast = speedFeelProfile(520, false);
  assert.ok(fast.trailAlpha > calm.trailAlpha);
  assert.ok(fast.speedLineAlpha > calm.speedLineAlpha);
  assert.ok(fast.parallaxFactor > calm.parallaxFactor);
  assert.equal(speedFeelProfile(520, true).trailAlpha, 0);
  assert.equal(speedFeelProfile(520, true).speedLineAlpha, 0);
});

test('endless anchor spacing widens by street block without exceeding cap', () => {
  assert.equal(difficultyAtSegment(0).anchorSpacing, 325);
  assert.equal(difficultyAtSegment(11).anchorSpacing, 361);
  assert.ok(difficultyAtSegment(40).anchorSpacing > difficultyAtSegment(0).anchorSpacing);
  assert.equal(difficultyAtSegment(200).anchorSpacing, 520);
});

test('segment-relative progress uses scaled segment boundaries', () => {
  assert.equal(segmentStartPx(0), 0);
  assert.equal(segmentStartPx(1), 1600);
  assert.equal(segmentIndexAtX(segmentStartPx(2) + 10), 2);
  assert.ok(segmentProgressAtX(segmentStartPx(2) + segmentLengthPx(2) / 2) > 0.49);
  assert.ok(segmentProgressAtX(segmentStartPx(2) + segmentLengthPx(2) / 2) < 0.51);
});

test('endless retention window spans exactly two segments behind and ahead', () => {
  const window = retentionBoundsAtSegment(8);
  assert.equal(window.behindStartPx, segmentStartPx(6));
  assert.equal(window.aheadEndPx, segmentStartPx(11));
});

test('sky segments are sparse, gated by high route speed, and wider than ground anchors', () => {
  assert.equal(segmentForIndex(5).isSky, false, 'first street block must not contain sky');
  assert.equal(segmentForIndex(8).isSky, true);
  assert.equal(segmentForIndex(7).isGate, false);
  assert.ok(segmentForIndex(8).anchorSpacing >= difficultyAtSegment(8).anchorSpacing * 1.3);
  assert.equal(segmentForIndex(9).isSky, false, 'sky segments cannot be consecutive');
});

test('fast release emits combo gain feedback events', () => {
  const game = createGrappleGame(4);
  game.loadScenario('segment-safe-tutorial');
  game.act('press');
  game.advanceTicks(8);
  game.act('release');
  assert.ok(game.getEvents().some((event) => event.type === 'combo-gain'));
});

test('pickup placements use risk positions and a three-segment collision window', () => {
  const placements = pickupPlacementForSegment(8);
  assert.ok(placements.every((item) => ['high-route', 'swing-apex', 'gate-brush', 'low-safety', 'backswing'].includes(item.kind)));
  assert.ok(placements.filter((item) => item.kind === 'swing-apex').length < 6);
  assert.equal(pickupPlacementForSegment(10).some((item) => item.kind === 'backswing'), false);
  assert.deepEqual(pickupCollisionWindow(8), [7, 8, 9]);
});

test('vehicles expose per-segment probabilities and hold/release tradeoffs', () => {
  assert.equal(vehicleProbabilityAtSegment(2, false, '纸鸢'), 0.18);
  assert.equal(vehicleProbabilityAtSegment(6, true, '青鸾'), 0.12);
  assert.equal(vehicleProbabilityAtSegment(2, false, '青鸾'), 0);
  assert.ok(VEHICLES.every((vehicle) => !(vehicle.fallImmune && vehicle.catchImmune)));
});

test('legacy wishfire migrates to coins while future progress fails closed', () => {
  const legacy = new NightMarketMonetization({ showRewarded: async () => ({ status: 'unavailable' as const }), showInterstitial: async () => ({ status: 'unavailable' as const }) }, new MemoryProgressStorage(JSON.stringify({ version: 1, wishfire: 37, completionCount: 2 })));
  assert.equal(legacy.getProgress().coins, 37);
  const future = new NightMarketMonetization({ showRewarded: async () => ({ status: 'unavailable' as const }), showInterstitial: async () => ({ status: 'unavailable' as const }) }, new MemoryProgressStorage(JSON.stringify({ version: 99, coins: 999 })));
  assert.equal(future.getProgress().coins, 0);
});

test('settlement persists roster, records and identity progression in v2', () => {
  const storage = new MemoryProgressStorage();
  const ads = { showRewarded: async () => ({ status: 'unavailable' as const }), showInterstitial: async () => ({ status: 'unavailable' as const }) };
  const economy = new NightMarketMonetization(ads, storage);
  economy.completeRun('run-progress', 50, { distanceMeters: 240, pickups: 4, combo: 6, gatesPassed: 2 });
  const progress = economy.getProgressV2() as unknown as Record<string, unknown>;
  assert.equal((progress.records as { totalMeters: number }).totalMeters, 240);
  assert.equal((progress as { identityRank?: number }).identityRank, 1);
});
