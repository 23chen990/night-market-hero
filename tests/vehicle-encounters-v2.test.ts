import assert from 'node:assert/strict';
import test from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';
import { segmentLengthPx, segmentStartPx, type VehicleId } from '../src/endless.ts';
import { encounterActionEligible, planVehicleEncounter, sweptEncounterContact,
  encounterInstructions, missedEncounterReason } from '../src/vehicle-encounters.ts';
import { createRunSnapshot, isValidRunState, parseRunSnapshot } from '../src/run-snapshot.ts';

const options = { marketGates: false, terrainMode: 'panorama', guidedExperience: true } as const;
const rides: readonly [number, VehicleId, 'release' | 'high-release' | 'press' | 'stylish-release'][] = [
  [2, '货运滑索', 'release'], [4, '纸鸢', 'high-release'],
  [6, '灯笼群', 'press'], [8, '青鸾', 'stylish-release'],
];
function game(seed = 32) { const result = createGrappleGame(seed, options); result.restartEndless(seed); return result; }
function locate(g: ReturnType<typeof game>, segment: number) {
  g.setPlayerForTest({ x: segmentStartPx(segment) + 5, y: 450, vx: 410, vy: 0 });
  const state = g.advanceTicks(1);
  const offer = state.vehicleOffers.find(item => item.segment === segment);
  assert.ok(offer);
  assert.ok(offer.instanceId && offer.chunkId && offer.supportId && offer.requiredAction);
  return offer;
}

test('all four initial challenges are source-anchored, deterministic, visible and optional', () => {
  for (const seed of [1, 31, 32, 99, 157]) for (const [segment, id, action] of rides) {
    const planned = planVehicleEncounter(seed, segment, id);
    assert.ok(planned, `seed ${seed} segment ${segment} needs a real image support`);
    assert.deepEqual(planVehicleEncounter(seed, segment, id), planned);
    assert.equal(planned.requiredAction, action);
    assert.ok(planned.x > segmentStartPx(segment));
    assert.ok(planned.x < segmentStartPx(segment) + segmentLengthPx(segment));
    assert.ok(planned.y > 125 && planned.y < 720);
    assert.ok(planned.radiusX <= 100 && planned.radiusY <= 100);
    assert.ok(planned.announceX < planned.x - 600, 'warn early enough to change swing trajectory');
    assert.ok(encounterInstructions(id).length >= 8, 'each challenge has a usable short cue');
    const g = game(seed);
    const offer = locate(g, segment);
    assert.equal(g.getState().vehicleId, null, 'segment transition is not an automatic grant');
    assert.equal(offer.x, planned.x);
    assert.equal(offer.y, planned.y);
  }
});

test('an ellipse is a real world collision: no magnet rectangle and no high-speed tunneling', () => {
  const ring = { x: 500, y: 410, radiusX: 80, radiusY: 75 };
  assert.equal(sweptEncounterContact({ x: 440, y: 475 }, { x: 442, y: 475 }, ring), false);
  assert.equal(sweptEncounterContact({ x: 380, y: 410 }, { x: 620, y: 410 }, ring), true);
  assert.equal(sweptEncounterContact({ x: 300, y: 250 }, { x: 700, y: 250 }, ring), false);
  assert.equal(sweptEncounterContact({ x: 500, y: 410 }, { x: 500, y: 410 }, ring), true);
});

test('distinct qualifying actions require a real recent press/release, speed, and bird combo', () => {
  const s = { tick: 200, playerY: 420, playerVx: 460, inputHeld: false,
    attached: false, lastReleaseTick: -10000, lastPressTick: -10000, stylishTicks: [] as number[] };
  for (const [, , action] of rides) assert.equal(encounterActionEligible(action, s), false);
  s.lastReleaseTick = 180;
  assert.equal(encounterActionEligible('release', s), true);
  assert.equal(encounterActionEligible('high-release', s), true);
  assert.equal(encounterActionEligible('stylish-release', s), false);
  // A stale release is not a valid interaction with a later ring.
  s.lastReleaseTick = 159;
  assert.equal(encounterActionEligible('release', s), false);
  s.lastReleaseTick = 180;
  s.playerY = 535;
  assert.equal(encounterActionEligible('high-release', s), false);
  s.playerY = 420;
  assert.equal(encounterActionEligible('high-release', s), true);
  s.playerY = 580;
  assert.equal(encounterActionEligible('high-release', s), false);
  s.playerY = 420;
  s.stylishTicks = [80, 170];
  assert.equal(encounterActionEligible('stylish-release', s), true);
  s.attached = true;
  assert.equal(encounterActionEligible('release', s), false);
  s.attached = false;
  s.inputHeld = true; s.lastPressTick = 199;
  assert.equal(encounterActionEligible('press', s), true);
  assert.equal(encounterActionEligible('release', s), false);
  s.lastPressTick = 100;
  assert.equal(encounterActionEligible('press', s), false);
  assert.match(missedEncounterReason('stylish-release', 400, true), /连续两次/);
});

test('wrong action and bypass do not grant a ride, and the same encounter cannot resolve twice', () => {
  const g = game(); const offer = locate(g, 2);
  g.setPlayerForTest({ x: offer.x - 15, y: offer.y, vx: 440, vy: 0 });
  const touched = g.advanceTicks(1);
  assert.equal(touched.vehicleId, null);
  assert.equal(touched.vehicleOffers.find(item => item.instanceId === offer.instanceId)?.status, 'available');
  g.setPlayerForTest({ x: offer.x + 270, y: offer.y - 320, vx: 440, vy: 0 });
  const missed = g.advanceTicks(1);
  assert.equal(missed.vehicleId, null);
  assert.equal(missed.lastVehicleOffer?.kind, 'missed');
  assert.equal(missed.encounterEvents.filter(event => event.instanceId === offer.instanceId).length, 1);
  g.setPlayerForTest({ x: offer.x - 15, y: offer.y });
  g.advanceTicks(1);
  assert.equal(g.getState().encounterEvents.filter(event => event.instanceId === offer.instanceId).length, 1);
  assert.equal(g.getState().vehicleId, null);
});

test('a second encounter of the same vehicle can resolve differently and is identified by instance', () => {
  const g = game(31);
  const first = locate(g, 2);
  g.setPlayerForTest({ x: first.x + 250, y: first.y - 310, vx: 450, vy: 0 });
  g.advanceTicks(1);
  const missed = g.getState().encounterEvents.at(-1);
  assert.equal(missed?.outcome, 'missed');
  const fixture = g.getState();
  const id = first.id;
  const future = { ...first, instanceId: '31:50:alternate:货运滑索', segment: 50,
    x: fixture.player.x + 100, y: fixture.player.y, status: 'available' as const };
  // This fixture isolates two independently saved encounters of one type.
  fixture.vehicleOffers = [future];
  fixture.lastGrappleReleaseTick = fixture.tick;
  fixture.player.vx = 480;
  assert.equal(g.restoreSnapshot(fixture), true);
  g.setPlayerForTest({ x: future.x - 20, y: future.y, vx: 480, vy: 0 });
  g.advanceTicks(1);
  const after = g.getState();
  assert.equal(after.vehicleId, id);
  assert.equal(after.encounterEvents.filter(e => e.id === id).length, 2);
  assert.equal(new Set(after.encounterEvents.map(e => e.instanceId)).size, 2);
  assert.deepEqual(after.encounterEvents.map(e => e.outcome), ['missed', 'claimed']);
});

test('offer/encounter records survive save/load; invalid action, duplicate instance and forged reward are rejected', () => {
  const g = game(); const offer = locate(g, 2);
  g.setPlayerForTest({ x: offer.x + 250, y: offer.y - 350, vx: 400, vy: 0 }); g.advanceTicks(1);
  const snapshot = createRunSnapshot('v2-archive', g.getState());
  assert.ok(parseRunSnapshot(JSON.stringify(snapshot)));
  const restored = game(); assert.equal(restored.restoreSnapshot(snapshot.state), true);
  assert.deepEqual(restored.getState().encounterEvents, g.getState().encounterEvents);
  const state = g.getState();
  assert.equal(isValidRunState({ ...state, vehicleOffers: [{ ...offer, requiredAction: 'magic' }] }), false);
  const ev = state.encounterEvents[0]!;
  assert.equal(isValidRunState({ ...state, encounterEvents: [ev, { ...ev }] }), false);
  assert.equal(isValidRunState({ ...state, encounterEvents: [{ ...ev, quality: 'legendary' }] }), false);
});
