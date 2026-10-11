import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PHYSICS, SliceSimulation } from '../src/game-core';
import { getLevelDefinition } from '../src/game-levels';

function tapAtCadence(cadence: number, seconds: number): {
  state: ReturnType<SliceSimulation['getState']>;
  minimumY: number;
  minimumVy: number;
} {
  const game = new SliceSimulation(31, 1);
  let elapsed = 0;
  let nextTap = 0;
  let minimumY = game.getState().player.y;
  let minimumVy = game.getState().player.vy;
  while (elapsed < seconds && game.getState().status !== 'failed' && game.getState().status !== 'won') {
    if (elapsed + 1e-9 >= nextTap) {
      game.act('flip');
      nextTap += cadence;
    }
    game.advanceFrame(1 / 60);
    const state = game.getState();
    minimumY = Math.min(minimumY, state.player.y);
    minimumVy = Math.min(minimumVy, state.player.vy);
    elapsed += 1 / 60;
  }
  return { state: game.getState(), minimumY, minimumVy };
}

test('FLIGHT-001 repeated 300ms and 500ms taps stay in the playable flight envelope', () => {
  for (const cadence of [0.3, 0.5]) {
    const result = tapAtCadence(cadence, 8);
    assert.notEqual(result.state.failReason, 'fall', `cadence ${cadence}s must not exit the top as fall`);
    assert.ok(result.minimumY >= PHYSICS.flightCeiling - 1e-6, `cadence ${cadence}s crossed the flight ceiling`);
  }
});

test('FLIGHT-002 every airborne tap is bounded by the declared upward-speed limit', () => {
  const game = new SliceSimulation(31, 1);
  for (let frame = 0; frame < 8 * 60 && game.getState().status !== 'failed'; frame += 1) {
    if (frame % 9 === 0) game.act('flip');
    game.advanceFrame(1 / 60);
    assert.ok(
      game.getState().player.vy >= -PHYSICS.maxUpwardSpeed - 1e-6,
      `upward speed exceeded limit: ${game.getState().player.vy}`,
    );
  }
});

test('FLIGHT-003 the ceiling holds the knife without failing it, while bottom exit fails', () => {
  const game = new SliceSimulation(31, 1);
  game.act('flip');
  game.debugPlacePlayer(1000, 300);
  game.debugSetVelocity(150, -760);
  game.step(0.5);
  const held = game.getState();
  assert.equal(held.failReason, null);
  assert.equal(held.status, 'airborne');
  assert.ok(held.player.y >= PHYSICS.flightCeiling);

  const falling = new SliceSimulation(31, 1);
  falling.debugLoadScenario('fall');
  falling.step(1 / 60);
  assert.equal(falling.getState().status, 'failed');
  assert.equal(falling.getState().failReason, 'fall');
});

test('FLIGHT-004 Level 1 keeps the low spike lesson and has no high-lane spike', () => {
  const spikes = getLevelDefinition(1).spikes;
  assert.ok(spikes.some((spike) => spike.id === 'spike-low'));
  assert.ok(!spikes.some((spike) => spike.id === 'spike-high'));
});

test('FLIGHT-005 normal Level 1 rhythms reach the finish and expose both rich gates', () => {
  const schedules: number[][] = [];
  for (let cadenceMs = 300; cadenceMs <= 1600; cadenceMs += 100) {
    schedules.push(Array.from(
      { length: Math.ceil(60_000 / cadenceMs) },
      (_, index) => 0.4 + (index * cadenceMs) / 1000,
    ));
  }
  for (let seed = 1; seed <= 40; seed += 1) {
    let value = (seed * 7919) >>> 0;
    const random = () => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 0x1_0000_0000;
    };
    const base = 450 + random() * 700;
    const taps: number[] = [];
    for (let at = 0.4; at < 60; at += (base * (0.7 + random() * 0.6)) / 1000) taps.push(at);
    schedules.push(taps);
  }

  const outcomes = schedules.map((taps) => {
    const game = new SliceSimulation(31, 1);
    let elapsed = 0;
    let nextTap = 0;
    while (elapsed < 60 && !['failed', 'won'].includes(game.getState().status)) {
      while (nextTap < taps.length && taps[nextTap]! <= elapsed + 1e-9) {
        game.act('flip');
        nextTap += 1;
      }
      game.step(1 / 60);
      elapsed += 1 / 60;
    }
    return game.getState();
  });

  const wins = outcomes.filter((state) => state.status === 'won');
  assert.ok(wins.length >= 38, `expected at least 38/54 wins, got ${wins.length}/54`);
  assert.ok(wins.some((state) => state.finishGateId === 'ember-four'), 'a win must reach ×4');
  assert.ok(wins.some((state) => state.finishGateId === 'jade-two'), 'a win must reach ×2');
  assert.equal(outcomes.filter((state) => state.status === 'failed' && state.player.y < 0).length, 0);
});
