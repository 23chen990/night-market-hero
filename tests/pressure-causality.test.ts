import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame, type GrappleState } from '../src/game-core.ts';
import { segmentStartPx } from '../src/endless.ts';
import { directedMutation } from '../src/experience-director.ts';

// Isolated physics fixtures, not natural-input or human playtest evidence.
const options = { marketGates: false, terrainMode: 'panorama', guidedExperience: true } as const;

function patrolWithGap(gap: number, seed = 32) {
  const game = createGrappleGame(seed, options);
  game.restartEndless(seed);
  game.setPlayerForTest({ x: segmentStartPx(9) + 200, y: 500, vx: 320, vy: -30 });
  game.advanceTicks(1);
  const state = game.getState();
  state.pursuer.x = state.player.x - gap;
  state.pursuer.vx = 320;
  state.pursuer.ax = 0;
  state.chase.distance = gap;
  state.chase.pressure = Math.max(0, Math.min(1, (520 - gap) / 420));
  state.activePickups = [];
  assert.equal(game.restoreSnapshot(state), true);
  return game;
}

test('a firecracker never teleports a distant guard closer to the player', () => {
  for (const gap of [900, 1400, 220, 520]) {
    const game = patrolWithGap(gap);
    const before = game.getState();
    const usesBefore = before.itemUsage.firecracker;
    assert.equal(game.useFirecracker(), true);
    const stunned = game.getState();
    assert.equal(stunned.pursuer.x, before.pursuer.x, `guard teleported at gap ${gap}`);
    assert.equal(stunned.pursuer.vx, 0, 'the visible stun must take effect on the accepted action');
    assert.equal(stunned.firecrackerStunUntilTick, before.tick + 180);
    assert.equal(stunned.itemUsage.firecracker, usesBefore + 1);
    assert.equal(game.useFirecracker(), false, 'an active stun cannot consume another use');
    const advanced = game.advanceTicks(30);
    assert.equal(advanced.pursuer.x, before.pursuer.x, 'stunned guard must stay in its actual position');
    assert.ok(advanced.chase.distance > gap, 'forward travel should build a real, not synthetic, gap');
  }
});

test('visible curfew reinforcement increases bounded closing pressure in the default patrol', () => {
  assert.equal(directedMutation(32, 9), '宵禁加派');
  assert.equal(directedMutation(33, 9), '起雾');
  const reinforced = patrolWithGap(700, 32);
  const ordinary = patrolWithGap(700, 33);
  const before = reinforced.getState();
  let strong: GrappleState = before;
  let normal: GrappleState = ordinary.getState();
  for (let tick = 0; tick < 36; tick++) {
    strong = reinforced.advanceTicks(1);
    normal = ordinary.advanceTicks(1);
    assert.equal(strong.status, 'playing');
    assert.equal(normal.status, 'playing');
    assert.equal(strong.player.x, normal.player.x, 'the comparison must use identical player motion');
    assert.ok(strong.pursuer.vx <= 850, 'reinforcements must respect the existing patrol speed limit');
    assert.ok(Math.abs(strong.pursuer.ax) <= 1200, 'reinforcements cannot jump to an unlimited speed');
  }
  assert.equal(strong.mutation, '宵禁加派');
  assert.ok(strong.pursuer.x > normal.pursuer.x + 2, 'the announced event must change actual patrol motion');
  assert.ok(strong.chase.distance < normal.chase.distance, 'increased pressure must follow the real gap');
  assert.ok(strong.chase.distance > 550, 'an event must not teleport the guard into capture range');
});

test('read-only state snapshots cannot mutate live item use or the lantern pivot', () => {
  const game = patrolWithGap(700);
  const before = game.getState();
  assert.equal(game.useFirecracker(), true);
  assert.equal(before.itemUsage.firecracker, 0, 'an earlier snapshot must remain a historical value');
  const observed = game.getState();
  observed.itemUsage.firecracker = 999;
  assert.equal(game.getState().itemUsage.firecracker, 1, 'observers cannot rewrite live counters');

  const mounted = game.getState();
  const pivot = { x: mounted.player.x + 100, y: mounted.player.y - 200 };
  mounted.vehicleId = '灯笼群';
  mounted.vehicleTicksRemaining = 300;
  mounted.vehicleVirtualAnchor = { ...pivot };
  mounted.vehicleLockY = Math.hypot(100, 200);
  mounted.vehiclePhase = 'holding';
  mounted.inputHeld = true;
  assert.equal(game.restoreSnapshot(mounted), true);
  mounted.vehicleVirtualAnchor.x += 5000;
  assert.deepEqual(game.getState().vehicleVirtualAnchor, pivot, 'restoring must not retain the caller-owned pivot');
  const lantern = game.getState();
  lantern.vehicleVirtualAnchor!.y += 5000;
  assert.deepEqual(game.getState().vehicleVirtualAnchor, pivot, 'render observers cannot move the physical support');
});

test('a low safety pickup still slows real reinforced officers', () => {
  const helped = patrolWithGap(700);
  const control = patrolWithGap(700);
  for (const [game, kind] of [[helped, 'low-safety'], [control, 'high-route']] as const) {
    const state = game.getState();
    state.activePickups = [{ kind, segment: 9, value: 2, collected: false,
      x: state.player.x + 2, y: state.player.y }];
    assert.equal(game.restoreSnapshot(state), true);
  }
  const helpedState = helped.advanceTicks(36);
  const controlState = control.advanceTicks(36);
  assert.equal(helpedState.mutation, '宵禁加派');
  assert.equal(helpedState.pickups, 1);
  assert.equal(controlState.pickups, 1);
  assert.equal(helpedState.player.x, controlState.player.x);
  assert.ok(helpedState.chase.distance > controlState.chase.distance + 10,
    'the visible low route must earn space even during reinforcement');
});

test('two actual stylish rope releases still counter curfew pursuit', () => {
  function qualifyingRun(firstStylish: boolean) {
    const game = patrolWithGap(700);
    // Place only the first isolated swing at its release phase. The next
    // rope is actually attached and simulated through its forward arc.
    const state = game.getState();
    const first = state.anchors.find(anchor => anchor.x > state.player.x)!;
    state.player = { x: first.x + 50, y: first.y + 180,
      vx: firstStylish ? 430 : 250, vy: -60 };
    state.attachedAnchorId = first.id;
    state.ropeLength = Math.hypot(50, 180);
    state.inputHeld = true;
    assert.equal(game.restoreSnapshot(state), true);
    assert.equal(game.act('release'), true);
    const next = game.getState().anchors.find(anchor => anchor.x > first.x + 250)!;
    game.setPlayerForTest({ x: next.x - 100, y: next.y + 240, vx: 430, vy: -60 });
    assert.equal(game.act('press'), true);
    let released = false;
    for (let ticks = 0; ticks < 180; ticks++) {
      const swing = game.advanceTicks(1);
      const anchor = swing.anchors.find(item => item.id === swing.attachedAnchorId);
      assert.equal(swing.status, 'playing');
      if (anchor && swing.player.x > anchor.x + 12 && swing.player.vx > 200
        && swing.player.vy < 120 && Math.hypot(swing.player.vx, swing.player.vy) >= 360) {
        assert.equal(game.act('release'), true);
        released = true;
        break;
      }
    }
    assert.equal(released, true, 'the second real swing must reach its release window');
    return game;
  }
  const skilled = qualifyingRun(true);
  const ordinary = qualifyingRun(false);
  assert.equal(skilled.getState().combo, 2);
  assert.equal(ordinary.getState().combo, 1);
  const escaped = skilled.advanceTicks(36);
  const unearned = ordinary.advanceTicks(36);
  assert.equal(escaped.mutation, '宵禁加派');
  assert.equal(escaped.player.x, unearned.player.x);
  assert.ok(escaped.chase.distance > unearned.chase.distance + 10,
    'earned stylish flight must still create a measurable actual escape window');
});
