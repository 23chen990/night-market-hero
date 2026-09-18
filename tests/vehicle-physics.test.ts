import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';
import { rollVehicleForSegment, VEHICLES, segmentStartPx } from '../src/endless.ts';

// game-core advances the simulation at a fixed 1/120s step, so durationSeconds
// map to a deterministic tick budget of 120 ticks per second (no wall clock).
const TICKS_PER_SECOND = 120;

/** Place the player inside a known segment so a deterministic vehicle is granted. */
function grantVehicleAt(seed: number, segment: number): ReturnType<typeof createGrappleGame> {
  const game = createGrappleGame(seed);
  game.restartEndless(seed);
  const x = segmentStartPx(segment) + 120;
  game.setPlayerForTest({ x, y: 400, vx: 360, vy: 0 });
  game.advanceTicks(1);
  return game;
}

test('vehicle acquisition is a deterministic probability event', () => {
  // Same seed/segment always yields the same vehicle (replay-stable).
  assert.equal(rollVehicleForSegment(11, 2, false), '纸鸢');
  assert.equal(rollVehicleForSegment(11, 2, false), rollVehicleForSegment(11, 2, false));
  // Not every segment grants a vehicle.
  assert.equal(rollVehicleForSegment(32, 2, false), null);
  // Sky segments only ever yield 青鸾; 青鸾 never appears outside a sky roll.
  assert.equal(rollVehicleForSegment(6, 8, true), '青鸾');
  assert.notEqual(rollVehicleForSegment(6, 8, false), '青鸾');
  // Each ground vehicle keeps its design per-segment probability.
  assert.equal(rollVehicleForSegment(11, 2, false), '纸鸢'); // 0.18
  assert.equal(rollVehicleForSegment(13, 2, false), '货运滑索'); // 0.18
  assert.equal(rollVehicleForSegment(42, 2, false), '灯笼群'); // 0.18
});

test('vehicle duration is a deterministic tick countdown and expires', () => {
  // Seed 1 grants 纸鸢 at the wide, non-sky segment 38 so the player stays in one segment.
  const game = createGrappleGame(1);
  game.restartEndless(1);
  const x = segmentStartPx(38) + 120;
  const kiteDurationTicks = Math.round(VEHICLES.find((v) => v.id === '纸鸢')!.durationSeconds * TICKS_PER_SECOND);
  let lastTicks = 0;
  let expired = false;
  for (let i = 0; i < kiteDurationTicks + 5; i += 1) {
    game.setPlayerForTest({ x, y: 400, vx: 0, vy: 0 });
    game.advanceTicks(1);
    const s = game.getState() as any;
    if (i === 0) {
      // Grant tick also applies one countdown decrement.
      assert.equal(s.vehicleId, '纸鸢');
      assert.equal(s.vehicleTicksRemaining, kiteDurationTicks - 1);
    } else if (s.vehicleId) {
      // Exactly one tick of countdown per fixed tick (deterministic, no wall clock).
      assert.equal(s.vehicleTicksRemaining, lastTicks - 1);
    } else {
      expired = true;
      break;
    }
    lastTicks = s.vehicleTicksRemaining;
  }
  assert.ok(expired, 'vehicle should expire after its duration');
  const finalState = game.getState() as any;
  assert.equal(finalState.vehicleId, null);
  assert.equal(finalState.vehicleTicksRemaining, 0);
  assert.equal(finalState.vehiclePhase, 'idle');
});

test('纸鸢 lifts on hold, glides low-gravity on release, immune to falling', () => {
  const game = grantVehicleAt(11, 2);
  assert.equal((game.getState() as any).vehicleId, '纸鸢');
  const y0 = game.getState().player.y;
  game.act('press');
  game.advanceTicks(20);
  const holding = game.getState();
  assert.ok(holding.player.vy < -30, 'hold should drive the runner upward');
  assert.ok(holding.player.y < y0, 'kite lift should raise the runner');

  // Release -> low-gravity glide: downward velocity grows far slower than normal gravity.
  const vRel = holding.player.vy;
  game.act('release');
  game.advanceTicks(15);
  const gliding = game.getState();
  const glideDelta = gliding.player.vy - vRel;
  // KITE_GLIDE_GRAVITY = GRAVITY * 0.22 -> ~24 px/s over 15 ticks; normal would be ~110.
  assert.ok(glideDelta < 60, 'glide must apply reduced gravity');

  // Fall immunity: dropping past FAIL_Y while riding the kite does not kill.
  const failY = game.getState().failY;
  game.setPlayerForTest({ x: segmentStartPx(2) + 120, y: failY + 80, vx: 200, vy: 0 });
  game.advanceTicks(1);
  const immune = game.getState();
  assert.equal(immune.status, 'playing', 'kite fall immunity should prevent death');
  assert.ok(immune.player.y <= failY, 'kite should be trapped above the fail line');
});

test('货运滑索 locks height and accelerates on hold, ejects on release', () => {
  const game = grantVehicleAt(13, 2);
  assert.equal((game.getState() as any).vehicleId, '货运滑索');
  const y0 = game.getState().player.y;
  const vx0 = game.getState().player.vx;
  game.act('press');
  game.advanceTicks(20);
  const holding = game.getState();
  assert.ok(Math.abs(holding.player.y - y0) < 1, 'zipline should lock the runner height');
  assert.ok(holding.player.vx > vx0 + 30, 'zipline should accelerate horizontally');

  game.act('release');
  game.advanceTicks(20);
  const ejected = game.getState();
  assert.ok(ejected.player.vy > 50, 'released zipline should fall under normal gravity');
});

test('灯笼群 free-attach swings around a virtual pivot', () => {
  const game = grantVehicleAt(42, 2);
  assert.equal((game.getState() as any).vehicleId, '灯笼群');
  game.act('press');
  game.advanceTicks(10);
  const s = game.getState() as any;
  assert.ok(s.vehicleVirtualAnchor, 'lantern should spawn a virtual anchor above the runner');
  const pivot = s.vehicleVirtualAnchor;
  const dist = Math.hypot(s.player.x - pivot.x, s.player.y - pivot.y);
  assert.ok(dist <= 215, 'runner should stay on the virtual rope');
  assert.ok(Math.abs(s.player.vx) > 1, 'lantern should swing the runner');
});

test('青鸾 climbs on hold, dives on release, and is catch-immune', () => {
  const game = grantVehicleAt(6, 8); // sky segment -> 青鸾
  assert.equal((game.getState() as any).vehicleId, '青鸾');
  const pursuerBefore = game.getState().pursuer.x;
  game.act('press');
  game.advanceTicks(20);
  const holding = game.getState();
  assert.ok(holding.player.vy < -20, 'bird flap should climb');
  // catchImmune: the pursuer must not advance while 青鸾 is active.
  assert.ok(Math.abs(holding.pursuer.x - pursuerBefore) < 1, '青鸾 should freeze the pursuer');

  const vxAtRelease = holding.player.vx;
  const vyAtRelease = holding.player.vy;
  game.act('release');
  game.advanceTicks(40);
  const diving = game.getState();
  // Dive adds extra downward acceleration beyond normal gravity (BIRD_DIVE_GRAVITY > GRAVITY).
  assert.ok(diving.player.vy > vyAtRelease + 300, 'bird dive should accelerate downward');
  assert.ok(diving.player.vx > vxAtRelease + 10, 'bird dive should accelerate forward');
});

test('vehicle state survives snapshot save/restore and defaults when absent', () => {
  const game = grantVehicleAt(11, 2);
  game.act('press');
  game.advanceTicks(5);
  const snapshot = game.getState() as any;
  const before = {
    id: snapshot.vehicleId,
    rem: snapshot.vehicleTicksRemaining,
    lock: snapshot.vehicleLockY,
    va: snapshot.vehicleVirtualAnchor,
  };
  game.restoreSnapshot(snapshot);
  const after = game.getState() as any;
  assert.equal(after.vehicleId, before.id);
  assert.equal(after.vehicleTicksRemaining, before.rem);
  assert.equal(after.vehicleLockY, before.lock);
  assert.deepEqual(after.vehicleVirtualAnchor, before.va);

  // Legacy snapshots without the new fields fall back to safe defaults.
  const legacy = game.getState() as any;
  delete legacy.vehicleTicksRemaining;
  delete legacy.vehicleLockY;
  delete legacy.vehicleVirtualAnchor;
  game.restoreSnapshot(legacy);
  const restored = game.getState() as any;
  assert.equal(restored.vehicleTicksRemaining, 0);
  assert.equal(restored.vehicleLockY, 0);
  assert.equal(restored.vehicleVirtualAnchor, null);
});
