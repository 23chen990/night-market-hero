import assert from 'node:assert/strict';
import test from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';
import { segmentStartPx, type VehicleId } from '../src/endless.ts';
import { isValidRunState } from '../src/run-snapshot.ts';
import { controlCue } from '../src/experience-director.ts';
import { shouldHoldConservativeKiteRope, isConservativeKiteApexDanger,
  shouldReleaseConservativePulleyRope } from './v2-casual-kite-policy.ts';

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

test('each of the four rides requires a distinct real press/release action at a visible anchored encounter', () => {
  for (const [segment, ride] of opportunities) {
    const { game, offer } = atOpportunity(segment);
    const y = ride === '纸鸢' ? Math.min(offer.y + 8, 530)
      : ride === '青鸾' ? Math.min(offer.y + 8, 450) : offer.y;
    game.setPlayerForTest({ x: offer.x - 55, y, vx: 460, vy: 0 });
    if (ride === '青鸾') {
      // An isolated prepared state proves this power is *gated* by two
      // independently-earned stylish releases; this is not a natural QA run.
      const prepared = game.getState();
      prepared.tick = 250;
      prepared.elapsed = prepared.tick / 120;
      prepared.stylishReleaseTicks = [prepared.tick - 130, prepared.tick - 50];
      assert.ok(game.restoreSnapshot(prepared));
    }
    assert.equal(game.getState().vehicleId, null);
    assert.equal(game.act('press'), true);
    const afterPress = game.getState();
    if (ride === '灯笼群') {
      assert.equal(afterPress.vehicleId, ride, 'lantern must mount on a timed real press');
    } else {
      assert.equal(afterPress.vehicleId, null, `${ride} must not mount from the wrong press`);
      assert.ok(afterPress.attachedAnchorId, 'release challenge starts with a real rope on a supported anchor');
    }
    assert.equal(game.act('release'), true);
    const state = game.advanceTicks(2);
    assert.equal(state.vehicleId, ride);
    assert.equal(state.vehicleQueue.length, 0);
    const matching = state.encounterEvents.filter(e => e.instanceId === offer.instanceId);
    assert.equal(matching.length, 1, 'claim can only resolve once');
    assert.equal(matching[0]?.outcome, 'claimed');
    assert.equal(state.vehicleOffers.find(item => item.instanceId === offer.instanceId)?.status, 'claimed');
    assert.ok(isValidRunState(state));
  }
});

test('the bird cannot be claimed without two real stylish-release records', () => {
  const { game, offer } = atOpportunity(8);
  game.setPlayerForTest({ x: offer.x - 55, y: offer.y, vx: 460, vy: 0 });
  game.act('press');
  game.act('release');
  const wrongAction = game.advanceTicks(2);
  assert.equal(wrongAction.vehicleId, null);
  assert.equal(wrongAction.vehicleOffers.find(item => item.instanceId === offer.instanceId)?.status, 'available',
    'an incorrect attempt must not silently grant or consume the optional bird');
  game.setPlayerForTest({ x: offer.x + (offer.radiusX ?? 88) + 95,
    y: offer.y + 240, vx: 460, vy: 0 });
  const missed = game.advanceTicks(2);
  assert.equal(missed.vehicleId, null);
  assert.equal(missed.encounterEvents.find(e => e.instanceId === offer.instanceId)?.outcome, 'missed');
});

test('visible opportunity may be deliberately ignored; later segment never gives an unseen deferred ride', () => {
  const { game, offer } = atOpportunity(2);
  game.setPlayerForTest({ x: offer.x - 25, y: offer.y + 250, vx: 520, vy: 0 });
  game.advanceTicks(1);
  assert.equal(game.getState().vehicleId, null);
  game.setPlayerForTest({ x: offer.x + 230, y: offer.y + 255, vx: 500, vy: 0 });
  game.advanceTicks(2);
  const ignored = game.getState();
  assert.equal(ignored.vehicleId, null);
  assert.equal(ignored.vehicleQueue.length, 0);
  assert.equal(ignored.encounterEvents.filter(e => e.instanceId === offer.instanceId).length, 1);
  assert.equal(ignored.lastVehicleOffer?.kind, 'missed');
  game.setPlayerForTest({ x: segmentStartPx(3) + 50, y: 535, vx: 510, vy: -30 });
  const future = game.advanceTicks(2);
  assert.equal(future.vehicleId, null, 'segment entry must not secretly restore a missed reward');
  assert.equal(future.vehicleQueue.length, 0);
});

test('restoring a legacy save drains deferred awards rather than awarding them after dismount', () => {
  const { game } = atOpportunity(4);
  const old = game.getState();
  old.vehicleQueue = ['青鸾', '灯笼群'];
  delete (old as unknown as Record<string, unknown>).encounterEvents;
  delete (old as unknown as Record<string, unknown>).stylishReleaseTicks;
  delete (old as unknown as Record<string, unknown>).lastGrapplePressTick;
  delete (old as unknown as Record<string, unknown>).lastGrappleReleaseTick;
  assert.ok(game.restoreSnapshot(old));
  const restored = game.getState();
  assert.deepEqual(restored.vehicleQueue, []);
  assert.deepEqual(restored.encounterEvents, []);
  assert.deepEqual(restored.stylishReleaseTicks, []);
  assert.equal(restored.vehicleId, null);
  assert.ok(isValidRunState(restored));
});

test('ordinary real-input kite policy releases ABOVE the ring before rope reversal', () => {
  const kite = { x: 8044.3, y: 554.66, radiusY: 120 };
  assert.equal(shouldHoldConservativeKiteRope(
    { x: 7784, y: 490, vx: 457 }, kite), true, 'can hold a real roof beam during approach');
  assert.equal(shouldHoldConservativeKiteRope(
    { x: 8050, y: 420, vx: 253 }, kite), false, 'must let go before backward swing');
  assert.equal(shouldHoldConservativeKiteRope(
    { x: 8015, y: 472, vx: 180 }, kite), false, 'a reversing rope cannot trap the player');
  assert.equal(shouldHoldConservativeKiteRope(
    { x: 7840, y: 600, vx: 140 }, kite), true, 'do not prematurely release far from the target');
});

test('player receives actionable warning before the real rope reverses into pursuing officers', () => {
  const game = createGrappleGame(32, config);
  game.restartEndless(32);
  const state = game.getState();
  const anchor = state.anchors[0];
  assert.ok(anchor);
  state.vehicleOffers = [];
  state.attachedAnchorId = anchor.id;
  state.player.x = anchor.x + 44;
  state.player.vx = 205;
  state.player.vy = -35;
  state.chase.distance = 280;
  const cue = controlCue(state);
  assert.match(cue.title, /赶紧松手/);
  assert.equal(cue.tone, 'danger');
});

test('full natural keyboard route may release the real kite rope before reverse swing', () => {
  const kite = { x: 8044.3, y: 554.66, radiusY: 120 };
  assert.equal(isConservativeKiteApexDanger(
    { x: 7818, y: 366.7, vx: 83.2 }, kite, true), true,
    'a real observed browser failure: high old rope is reversing 226px before the kite');
  assert.equal(isConservativeKiteApexDanger(
    { x: 7750, y: 560, vx: 560 }, kite, true), false,
    'a healthy fast approach must not be auto-released');
  assert.equal(isConservativeKiteApexDanger(
    { x: 7818, y: 366.7, vx: 83.2 }, kite, false), false,
    'only a currently attached real beam can be proactively released');
});

test('a conservative REAL release can miss the low pulley while surviving its high-roof swing', () => {
  const pulley = { x: 3774, y: 614, radiusY: 98 };
  assert.equal(shouldReleaseConservativePulleyRope(
    { x: 3420, y: 385, vx: 480, vy: -60 }, pulley, true), false,
    'do not release before the pulley is close enough to make a choice');
  assert.equal(shouldReleaseConservativePulleyRope(
    { x: 3560, y: 390, vx: 430, vy: -40 }, pulley, true), true,
    'release while still flying forward, far ABOVE the visible low handle');
  assert.equal(shouldReleaseConservativePulleyRope(
    { x: 3740, y: 400, vx: 180, vy: 10 }, pulley, true), true,
    'late roof rope stall must not trap the rider behind pursuing officers');
  assert.equal(shouldReleaseConservativePulleyRope(
    { x: 3700, y: 604, vx: 480, vy: 0 }, pulley, true), false,
    'a rider actually INSIDE the visible pulley height can still fight to earn it');
  const { game, offer } = atOpportunity(2);
  const state = game.getState();
  state.vehicleOffers = [{ ...offer, status: 'available' }];
  state.vehicleId = null;
  state.attachedAnchorId = state.anchors[0]?.id ?? null;
  state.player.x = offer.x - 210;
  state.player.y = offer.y - (offer.radiusY ?? 98) - 35;
  state.player.vx = 345;
  state.chase.distance = 260;
  assert.match(controlCue(state).title, /吊轮在下方.*松手/,
    'the real player sees the same actionable safe-release cue');
  assert.equal(controlCue(state).tone, 'danger',
    'a nearby physical officer raises the urgency, not an invisible rescue');
});
