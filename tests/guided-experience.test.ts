import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createGrappleGame, type GrappleState } from '../src/game-core.ts';
import { OPENING_ENCOUNTERS, directedVehicle, directedMutation, guidedPickups, completedCheckpoints, nextCheckpointX, pointSegmentDistance, controlCue } from '../src/experience-director.ts';
import { segmentStartPx, segmentLengthPx } from '../src/endless.ts';
import { createRunSnapshot, parseRunSnapshot, isValidRunState } from '../src/run-snapshot.ts';
const options = { marketGates: false, terrainMode: 'panorama', guidedExperience: true } as const;
const rideNames = ['货运滑索', '纸鸢', '灯笼群', '青鸾'];
function patrol(seed = 31) { const game = createGrappleGame(seed, options); game.restartEndless(seed); return game; }
function enter(game: ReturnType<typeof patrol>, segment: number) {
  game.setPlayerForTest({ x: segmentStartPx(segment) + 1, y: 460, vx: 440, vy: 0 });
  return game.advanceTicks(1);
}
/** Physics-level encounter fixture; only the action is issued through act().
 * Teleporting near a ring here is NOT proof of natural browser play.
 */
function collectOffer(game: ReturnType<typeof patrol>, segment: number) {
  const state = enter(game, segment);
  const offer = state.vehicleOffers.find(item => item.segment === segment);
  assert.ok(offer, `segment ${segment} must spawn an anchored encounter`);
  assert.ok(offer.supportId && offer.instanceId && offer.requiredAction);
  assert.equal(state.vehicleId, null, 'segment entry alone cannot mount a ride');
  game.setPlayerForTest({ x: offer.x - 160, y: offer.y, vx: 485, vy: 0 });
  const before = game.advanceTicks(1);
  assert.equal(before.vehicleId, null, 'approach alone cannot mount a new ride');
  if (offer.requiredAction === 'press') {
    game.setPlayerForTest({ x: offer.x - 16, y: offer.y, vx: 485, vy: 0 });
    game.act('press');
    return game.getState();
  }
  // Establish a real release input; fixtures are allowed to set a temporary
  // nearby eligible anchor so the test isolates the world contact contract.
  game.setPlayerForTest({ x: offer.x - 140, y: offer.y, vx: 485, vy: 0 });
  game.act('press');
  const withAnchor = game.getState();
  if (!withAnchor.attachedAnchorId) {
    const candidate = withAnchor.anchors.find(a => a.x > offer.x - 350 && a.x < offer.x + 350);
    assert.ok(candidate, 'fixture requires a real nearby grapple anchor');
    withAnchor.attachedAnchorId = candidate.id;
    withAnchor.ropeLength = Math.hypot(candidate.x - withAnchor.player.x, candidate.y - withAnchor.player.y);
    assert.equal(game.restoreSnapshot(withAnchor), true);
  }
  game.act('release');
  if (offer.requiredAction === 'stylish-release') {
    const prepared = game.getState();
    prepared.stylishReleaseTicks = [prepared.tick - 2, prepared.tick - 1].filter(t => t >= 0);
    // Fixture only: two real stylish inputs are exercised in separate tests.
    assert.equal(game.restoreSnapshot(prepared), true);
  }
  game.setPlayerForTest({ x: offer.x - 26, y: offer.y, vx: 485, vy: 0 });
  return game.advanceTicks(1);
}

test('all opening rides are authored for every seed; later rolls stay deterministic', () => {
  for (const seed of [1, 2, 31, 99, 157]) {
    assert.deepEqual([2, 4, 6, 8].map(index => directedVehicle(seed, index)), rideNames);
    assert.equal(directedVehicle(seed, 0), null);
    for (let segment = 10; segment < 35; segment++) assert.equal(directedVehicle(seed, segment), directedVehicle(seed, segment));
  }
});
test('guided weather never advertises removed closing-gate mechanics', () => {
  for (let i = 0; i < 40; i++) assert.notEqual(directedMutation(31, i), '封灯');
  assert.deepEqual([3, 5, 7].map(i => directedMutation(31, i)), ['起雾', '下雨', '宵禁加派']);
});
test('coin routes are separated spatially and retained inside their segment', () => {
  for (let segment = 0; segment < 20; segment++) {
    const coins = guidedPickups(segment);
    assert.equal(coins.length, 9);
    assert.equal(new Set(coins.map(c => `${c.x}:${c.y}`)).size, 9);
    assert.ok(coins.some(c => c.kind === 'low-safety'));
    assert.ok(coins.some(c => c.kind === 'high-route'));
    for (const coin of coins) { assert.ok(coin.x > segmentStartPx(segment)); assert.ok(coin.x < segmentStartPx(segment + 1)); }
  }
});
test('a checkpoint is earned at its visible midpoint, never just at segment entry', () => {
  for (let count = 0; count < 40; count++) {
    const segment = 2 + count * 4;
    const x = segmentStartPx(segment) + segmentLengthPx(segment) * 0.5;
    assert.equal(completedCheckpoints(x - 0.1), count);
    assert.equal(completedCheckpoints(x), count + 1);
    assert.equal(nextCheckpointX(x - 0.1), x);
    assert.ok(nextCheckpointX(x) > x);
  }
});
test('kite pre-approach teaches an upward rope swing before the actual release window', () => {
  const game = patrol(32);
  const state = game.getState();
  const offer = { id: '纸鸢' as const, segment: 4, status: 'available' as const,
    x: state.player.x + 650, y: 510 };
  const instruction = controlCue({ ...state, vehicleId: null,
    attachedAnchorId: state.anchors[0]?.id ?? 'grapple-anchor', vehicleOffers: [offer] });
  assert.match(instruction.title, /过挂点后多荡半拍/);
  assert.match(instruction.detail, /上升时松手/);
});

test('visible ride halo does not collect from the rectangular corner or outside its vertical reach', () => {
  const game = patrol();
  const state = enter(game, 2);
  const halo = state.vehicleOffers.find(item => item.segment === 2)!;
  // At x+75, y+170 we are inside the old axis-aligned trigger but outside
  // the drawn ellipse. No ride is awarded until the trajectory meets it.
  game.setPlayerForTest({ x: halo.x - 76, y: halo.y + 170, vx: 0, vy: 0 });
  const snapshot = game.advanceTicks(1);
  assert.equal(snapshot.vehicleId, null);
  assert.equal(snapshot.vehicleOffers.find(item => item.segment === 2)?.status, 'available');
  assert.equal(halo.requiredAction, 'release');
  assert.equal(snapshot.vehicleId, null, 'touch without a release does not grant the ride');
  // Successful release contact is checked by the input-driven fixture.
  const earned = collectOffer(patrol(), 2);
  assert.equal(earned.vehicleId, '货运滑索');
  assert.equal(earned.lastVehicleOffer?.kind, 'claimed');
});

test('ride offer is fixed in world space after segment entry and cannot follow the rider', () => {
  const game = patrol();
  const first = enter(game, 2).vehicleOffers.find(item => item.segment === 2)!;
  game.setPlayerForTest({ x: first.x - 400, y: 240, vx: 180, vy: 0 });
  const second = game.advanceTicks(1).vehicleOffers.find(item => item.segment === 2)!;
  assert.deepEqual({ x: second.x, y: second.y }, { x: first.x, y: first.y });
});

test('mounted vehicles release the old physical grapple immediately', () => {
  const game = patrol(); game.act('press'); assert.ok(game.getState().attachedAnchorId);
  const entry = enter(game, 2);
  assert.equal(entry.vehicleId, null, 'segment entry must not grant a ride');
  const state = collectOffer(game, 2);
  assert.equal(state.vehicleId, rideNames[0]); assert.equal(state.attachedAnchorId, null); assert.equal(state.ropeLength, null);
});
test('an empty segment preserves the remaining ride duration', () => {
  const game = patrol(); const mounted = collectOffer(game, 2); const next = enter(game, 3);
  assert.equal(next.vehicleId, mounted.vehicleId);
  assert.equal(next.vehicleTicksRemaining, mounted.vehicleTicksRemaining - 1);
});
test('a second world pickup cannot become a hidden queued award', () => {
  const game = patrol(); collectOffer(game, 2);
  const next = enter(game, 4);
  const offer = next.vehicleOffers.find(item => item.segment === 4)!;
  game.setPlayerForTest({ x: offer.x - 6, y: offer.y, vx: 480, vy: 0 });
  game.advanceTicks(1);
  const during = game.getState();
  assert.equal(during.vehicleId, rideNames[0]);
  assert.deepEqual(during.vehicleQueue, []);
  assert.equal(during.vehicleOffers.find(item => item.instanceId === offer.instanceId)?.status, 'missed');
  const expiry = game.getState(); expiry.vehicleTicksRemaining = 1;
  assert.equal(game.restoreSnapshot(expiry), true);
  const after = game.advanceTicks(1);
  assert.equal(after.vehicleId, null, 'expired ride must not silently equip the one we passed');
});
test('legacy queued awards are safely drained without losing currently active ride', () => {
  const game = patrol(); collectOffer(game, 2);
  const legacy = game.getState(); legacy.vehicleQueue = ['纸鸢'];
  const parsed = parseRunSnapshot(JSON.stringify(createRunSnapshot('legacy', legacy))); assert.ok(parsed);
  const restored = patrol(); assert.equal(restored.restoreSnapshot(parsed!.state), true);
  assert.equal(restored.getState().vehicleId, rideNames[0]);
  assert.deepEqual(restored.getState().vehicleQueue, []);
  const after = restored.getState(); after.vehicleTicksRemaining = 1;
  assert.equal(restored.restoreSnapshot(after), true);
  assert.equal(restored.advanceTicks(1).vehicleId, null);
});
test('corrupt ride queues are rejected without rejecting old saves', () => {
  const state = patrol().getState() as GrappleState & { vehicleQueue?: unknown };
  assert.equal(isValidRunState({ ...state, vehicleQueue: undefined }), true);
  assert.equal(isValidRunState({ ...state, vehicleQueue: ['unknown'] }), false);
  assert.equal(isValidRunState({ ...state, vehicleQueue: Array(5).fill(rideNames[0]) }), false);
});
test('a missed pickup is not granted automatically and cannot be collected from far above its lane', () => {
  const game = patrol(); const first = enter(game, 2); const offer = first.vehicleOffers[0]!;
  assert.equal(first.vehicleId, null);
  game.setPlayerForTest({ x: offer.x - 100, y: offer.y - 400, vx: 490, vy: 0 }); game.advanceTicks(1);
  game.setPlayerForTest({ x: offer.x + 160, y: offer.y - 400, vx: 490, vy: 0 }); game.advanceTicks(1);
  const missed = game.getState();
  assert.equal(missed.vehicleId, null);
  assert.equal(missed.vehicleOffers[0]?.status, 'missed');
  assert.equal(missed.lastVehicleOffer?.kind, 'missed');
  game.setPlayerForTest({ x: offer.x - 1, y: offer.y }); game.advanceTicks(1);
  assert.equal(game.getState().vehicleId, null, 'a missed one-time offer must not reactivate');
});
test('visible pickup offers persist through snapshots and reject malformed records', () => {
  const game = patrol(); enter(game, 2);
  const snapshot = createRunSnapshot('offers', game.getState());
  const parsed = parseRunSnapshot(JSON.stringify(snapshot)); assert.ok(parsed);
  const restored = patrol(); assert.equal(restored.restoreSnapshot(parsed!.state), true);
  assert.deepEqual(restored.getState().vehicleOffers, game.getState().vehicleOffers);
  assert.equal(isValidRunState({ ...game.getState(), vehicleOffers: [{ id: 'broken', x: 1, y: 2, segment: 2, status: 'available' }] }), false);
});
test('zipline release really ejects upward and returns to ordinary grapple control', () => {
  const game = patrol(); collectOffer(game, 2); game.act('press'); game.advanceTicks(80); game.act('release');
  const state = game.getState(); assert.equal(state.vehicleId, null); assert.ok(state.player.vy <= -300); assert.ok(state.player.vx >= 420);
  assert.ok(state.regrappleGraceUntilTick > state.tick);
});
test('bird lift remains visible and its countdown is frozen while paused', () => {
  const game = patrol(); collectOffer(game, 8); game.act('press');
  for (let i = 0; i < 360; i++) { const s = game.advanceTicks(1); assert.ok(s.player.y >= 125); assert.ok(Number.isFinite(s.player.vx)); }
  const before = game.getState(); game.setPaused(true); game.advanceTicks(1000);
  assert.equal(game.getState().tick, before.tick); assert.equal(game.getState().vehicleTicksRemaining, before.vehicleTicksRemaining);
});
test('ride expiry supplies a finite, forward recovery window', () => {
  const game = patrol(); const state = collectOffer(game, 4); state.vehicleTicksRemaining = 1;
  assert.equal(game.restoreSnapshot(state), true);
  const expired = game.advanceTicks(1);
  assert.equal(expired.vehicleId, null); assert.ok(expired.player.vy < 0); assert.ok(expired.player.vx >= 280);
  assert.ok(expired.regrappleGraceUntilTick > expired.tick);
});
test('actual guided checkpoint award agrees with the next-checkpoint display', () => {
  const game = patrol(); const state = enter(game, 2); assert.equal(state.gatesPassed, 0);
  const x = nextCheckpointX(state.player.x);
  game.setPlayerForTest({ x: x + 1, y: 460, vx: 450, vy: 0 });
  game.advanceTicks(2); assert.equal(game.getState().gatesPassed, 1);
  game.setPlayerForTest({ x: x - 20 }); game.advanceTicks(2); assert.equal(game.getState().gatesPassed, 1);
});
test('swept coin contact catches a fast pass and handles a stationary frame', () => {
  assert.equal(pointSegmentDistance({ x: 50, y: 5 }, { x: 0, y: 0 }, { x: 100, y: 0 }), 5);
  assert.equal(pointSegmentDistance({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 }), 5);
});
test('cash out is a real terminal transition and cannot settle twice', () => {
  const game = patrol(); assert.equal(game.finishPatrol(), false);
  game.act('press'); game.advanceTicks(120); game.setPaused(true);
  assert.equal(game.finishPatrol(), true); const finished = game.getState();
  assert.equal(finished.status, 'won'); assert.equal(finished.paused, false);
  assert.equal(game.finishPatrol(), false); game.advanceTicks(100); assert.equal(game.getState().tick, finished.tick);
});
test('tutorial distance is real, rather than a permanent zero in settlement', () => {
  const game = createGrappleGame(31, options); game.act('press'); game.advanceTicks(120); assert.ok(game.getState().distanceMeters > 0);
});
test('each vehicle presents its own hold/release meaning', () => {
  const state = patrol().getState();
  const cues = rideNames.map(vehicleId => controlCue({ ...state, vehicleId }).title);
  assert.equal(new Set(cues).size, 4);
});
test('shipping bootstrap opts in and connects the visible ride, input and lifecycle layers', () => {
  const source = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(source, /guidedExperience: true/); assert.match(source, /drawRide\(graphics, state\)/);
  assert.match(source, /experience\.update\(state/); assert.match(source, /startFirstInput\(\);\s*if \(gameplayInputBlocked/);
  assert.match(source, /persistRun\(state, false\)/); assert.match(source, /window\.addEventListener\('blur', suspendForBackground\)/);
  assert.match(source, /lostpointercapture/);
});
test('standalone build is independent of its download filename', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.ok(html.length > 100000); assert.ok(!html.includes("if (location.protocol === 'file:'"));
});

// A deterministic object test is not proof every ordinary player earns four
// encounters. It verifies the first lap *offers* four visible, optional targets.
for (const seed of [1, 31, 99]) test(`authored patrol exposes four optional anchored encounters (seed ${seed})`, () => {
  const game = patrol(seed);
  const ids: string[] = [];
  for (const segment of [2, 4, 6, 8]) {
    const state = enter(game, segment);
    const offer = state.vehicleOffers.find(item => item.segment === segment);
    assert.ok(offer, `segment ${segment} must have real source-pixel support`);
    assert.ok(offer.supportId);
    assert.ok(offer.instanceId?.startsWith(`${seed}:${segment}:`));
    ids.push(offer.id);
  }
  assert.deepEqual(ids, rideNames);
});

test('a release already in flight at ride entry cannot immediately erase the zipline', () => {
  const game = patrol(); collectOffer(game, 2); game.act('press'); game.advanceTicks(12); game.act('release');
  assert.equal(game.getState().vehicleId, rideNames[0]);
  game.advanceTicks(70); game.act('press'); game.act('release');
  assert.equal(game.getState().vehicleId, null);
});
test('late backward release remains recoverable without awarding a fake combo', () => {
  const game = patrol(); game.act('press');
  game.setPlayerForTest({ vx: -180, vy: 180 }); game.act('release');
  const state = game.getState(); assert.ok(state.player.vx >= 300); assert.ok(state.player.vy <= -180);
  assert.equal(state.combo, 0); assert.ok(state.regrappleGraceUntilTick > state.tick);
});
test('pausing a held lantern cancels the virtual rope without losing the mount', () => {
  const game = patrol(); collectOffer(game, 6); game.act('press'); assert.ok(game.getState().vehicleVirtualAnchor);
  game.setPaused(true); const state = game.getState();
  assert.equal(state.vehiclePhase, 'idle'); assert.equal(state.vehicleVirtualAnchor, null); assert.equal(state.vehicleId, rideNames[2]);
});


test('a claimed pickup stabilizes the first frame instead of teleporting an already falling stranger', () => {
  for (const beat of OPENING_ENCOUNTERS) {
    const game = createGrappleGame(31, options); game.restartEndless(31);
    const mounted = collectOffer(game, beat.segment);
    assert.equal(mounted.vehicleId, beat.vehicle);
    assert.equal(mounted.status, 'playing');
    assert.ok(mounted.player.y < 750, 'pickup can only be claimed within a reachable aerial lane');
    assert.ok(mounted.player.vx > 0);
  }
});

test('guided revival eligibility does not depend on repeating segment progress', () => {
  const game = createGrappleGame(31, options); game.restartEndless(31);
  game.setPlayerForTest({ x: segmentStartPx(3) + 10, y: 910, vx: 200, vy: 200 }); game.advanceTicks(1);
  assert.equal(game.getState().status, 'failed');
  assert.ok(game.getState().progress < 0.6);
  assert.equal(game.canRewardedRevive(), true);
  assert.equal(game.reviveFromSafeState(), true);
  game.setPlayerForTest({ y: 910 }); game.advanceTicks(1);
  assert.equal(game.canRewardedRevive(), false);
});

test('lantern release really launches forward and does not erase an earned grapple combo', () => {
  const game = createGrappleGame(31, options); game.restartEndless(31);
  collectOffer(game, 6); game.act('press');
  const snapshot = game.getState(); snapshot.combo = 3; snapshot.comboPeak = 3; snapshot.comboTier = 2; game.restoreSnapshot(snapshot);
  game.setPlayerForTest({ vx: -90, vy: 330 }); game.act('release');
  assert.ok(game.getState().player.vx >= 330); assert.ok(game.getState().player.vy <= -220);
  assert.equal(game.getState().combo, 3); assert.equal(game.getState().comboTier, 2);
});


test('a deliberate bird flap immediately brakes a late dive without fake rewards', () => {
  const game = patrol(); collectOffer(game, 8);
  const earnedCombo = game.getState().combo;
  game.setPlayerForTest({ y: 760, vy: 720 });
  game.act('press');
  assert.ok(game.getState().player.vy <= -160);
  assert.equal(game.getState().combo, earnedCombo, 'flapping should not award a new combo');
  assert.equal(game.advanceTicks(24).status, 'playing');
  assert.ok(game.getState().player.y < 760);
  game.act('release');
  game.setPlayerForTest({ y: 870, vy: 720 });
  assert.equal(game.advanceTicks(12).status, 'failed', 'releasing without steering must remain fallible');
});
