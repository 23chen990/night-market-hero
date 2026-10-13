import assert from 'node:assert/strict';
import test from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';
import { segmentStartPx, type VehicleId } from '../src/endless.ts';
import { isValidRunState } from '../src/run-snapshot.ts';

const config = { marketGates: false, terrainMode: 'panorama', guidedExperience: true } as const;
const opportunities: readonly [number, VehicleId][] = [
  [2, '货运滑索'], [4, '纸鸢'], [6, '灯笼群'], [8, '青鸾'],
];
function atOpportunity(segment: number) {
  const game = createGrappleGame(32, config);
  game.restartEndless(32);
  game.setPlayerForTest({ x: segmentStartPx(segment) + 3, y: 470, vx: 420, vy: 0 });
  const state = game.advanceTicks(1);
  const offer = state.vehicleOffers.find(item => item.segment === segment);
  assert.ok(offer, `no world encounter for segment ${segment}`);
  return { game, offer };
}

test('each of four rides needs its own real press/release action at an anchored encounter', () => {
  for (const [segment, ride] of opportunities) {
    const { game, offer } = atOpportunity(segment);
    const y = ride === '纸鸢' ? Math.min(offer.y + 8, 530)
      : ride === '青鸾' ? Math.min(offer.y + 8, 450) : offer.y;
    game.setPlayerForTest({ x: offer.x - 55, y, vx: 460, vy: 0 });
    if (ride === '青鸾') {
      // Preparation fixture, not evidence of blind or natural play.
      const prepared = game.getState();
      prepared.tick = 250;
      prepared.elapsed = prepared.tick / 120;
      prepared.stylishReleaseTicks = [prepared.tick - 130, prepared.tick - 50];
      assert.ok(game.restoreSnapshot(prepared));
    }
    assert.equal(game.getState().vehicleId, null);
    assert.equal(game.act('press'), true);
    const afterPress = game.getState();
    if (ride === '灯笼群') assert.equal(afterPress.vehicleId, ride);
    else {
      assert.equal(afterPress.vehicleId, null);
      assert.ok(afterPress.attachedAnchorId, 'release challenge requires a real rope');
    }
    assert.equal(game.act('release'), true);
    const state = game.advanceTicks(2);
    assert.equal(state.vehicleId, ride);
    assert.equal(state.vehicleQueue.length, 0);
    assert.equal(state.encounterEvents.filter(e => e.instanceId === offer.instanceId).length, 1);
    assert.equal(state.encounterEvents.find(e => e.instanceId === offer.instanceId)?.outcome, 'claimed');
    assert.ok(isValidRunState(state));
  }
});

test('bird cannot be claimed without two actual stylish-release records', () => {
  const { game, offer } = atOpportunity(8);
  game.setPlayerForTest({ x: offer.x - 55, y: offer.y, vx: 460, vy: 0 });
  game.act('press'); game.act('release');
  const after = game.advanceTicks(2);
  assert.equal(after.vehicleId, null);
  assert.equal(after.vehicleOffers.find(o => o.instanceId === offer.instanceId)?.status, 'available');
  game.setPlayerForTest({ x: offer.x + (offer.radiusX ?? 88) + 95, y: offer.y + 240, vx: 460, vy: 0 });
  assert.equal(game.advanceTicks(2).encounterEvents.find(e => e.instanceId === offer.instanceId)?.outcome, 'missed');
});

test('deliberately ignored offer never becomes hidden inventory after another segment', () => {
  const { game, offer } = atOpportunity(2);
  game.setPlayerForTest({ x: offer.x - 25, y: offer.y + 250, vx: 520, vy: 0 });
  game.advanceTicks(1);
  assert.equal(game.getState().vehicleId, null);
  game.setPlayerForTest({ x: offer.x + 230, y: offer.y + 255, vx: 500, vy: 0 });
  game.advanceTicks(2);
  const ignored = game.getState();
  assert.equal(ignored.vehicleId, null);
  assert.deepEqual(ignored.vehicleQueue, []);
  assert.equal(ignored.encounterEvents.filter(e => e.instanceId === offer.instanceId).length, 1);
  assert.equal(ignored.lastVehicleOffer?.kind, 'missed');
  game.setPlayerForTest({ x: segmentStartPx(3) + 50, y: 535, vx: 510, vy: -30 });
  assert.equal(game.advanceTicks(2).vehicleId, null);
});

test('legacy saved invisible queue is safely discarded, not equipped', () => {
  const { game } = atOpportunity(4);
  const old = game.getState();
  old.vehicleQueue = ['青鸾', '灯笼群'];
  for (const key of ['encounterEvents', 'stylishReleaseTicks', 'lastGrapplePressTick', 'lastGrappleReleaseTick'])
    delete (old as unknown as Record<string, unknown>)[key];
  assert.ok(game.restoreSnapshot(old));
  const restored = game.getState();
  assert.deepEqual(restored.vehicleQueue, []);
  assert.deepEqual(restored.encounterEvents, []);
  assert.deepEqual(restored.stylishReleaseTicks, []);
  assert.equal(restored.vehicleId, null);
  assert.ok(isValidRunState(restored));
});
