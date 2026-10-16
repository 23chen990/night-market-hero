import assert from 'node:assert/strict';
import test from 'node:test';
import type { GrappleState } from '../src/game-core.ts';
import { flightActionFeedbackMode, drawFlightActionFeedback } from '../src/ride-renderer.ts';
import { isStylishRelease } from '../src/experience-director.ts';

function scene(): GrappleState {
  return {
    status: 'playing', paused: false, vehicleId: null,
    inputHeld: true, attachedAnchorId: 'real-roof',
    anchors: [{ id: 'real-roof', x: 400, y: 200 }],
    player: { x: 430, y: 480, vx: 390, vy: -140 },
    stylishReleaseTicks: [], tick: 120, combo: 0,
  } as GrappleState;
}

test('only the existing scoreable, attached real world-rope window displays release-now', () => {
  const s = scene();
  assert.equal(isStylishRelease(s.player), true, 'fixture genuinely qualifies for a score');
  assert.equal(flightActionFeedbackMode(s), 'ready');
  const invalid = [
    { ...s, attachedAnchorId: null },
    { ...s, inputHeld: false },
    { ...s, vehicleId: '货运滑索' },
    { ...s, paused: true },
    { ...s, status: 'failed' },
    { ...s, anchors: [] },
    { ...s, player: { ...s.player, x: 399 } },
    { ...s, player: { ...s.player, vx: 180, vy: -140 } },
    { ...s, player: { ...s.player, vx: -460 } },
    { ...s, player: { ...s.player, vy: 145 } },
  ];
  for (const frame of invalid) assert.equal(flightActionFeedbackMode(frame as GrappleState), 'none',
    'never recommend release when it cannot score with a real rope');
});

test('earned feedback can only follow a real engine-recorded stylish tick and expires promptly', () => {
  const s = scene();
  s.inputHeld = false;
  s.attachedAnchorId = null;
  s.tick = 136;
  s.combo = 1;
  s.stylishReleaseTicks = [120];
  assert.equal(flightActionFeedbackMode(s), 'earned');
  s.tick = 156;
  assert.equal(flightActionFeedbackMode(s), 'earned');
  s.tick = 157;
  assert.equal(flightActionFeedbackMode(s), 'none');
  s.tick = 125;
  s.combo = 0;
  assert.equal(flightActionFeedbackMode(s), 'none',
    'a leftover styled tick without actual combo earns no celebratory marker');
  s.combo = 1;
  s.tick = 119;
  assert.equal(flightActionFeedbackMode(s), 'none', 'future event cannot be pre-announced');
});

test('graphics are only small actor-adjacent open strokes, never a fake pickup ring', () => {
  const calls: Array<{ name: string; args: number[] }> = [];
  const graphics = {
    lineStyle(...args: number[]) { calls.push({ name: 'lineStyle', args }); return this; },
    lineBetween(...args: number[]) { calls.push({ name: 'lineBetween', args }); return this; },
    fillStyle(...args: number[]) { calls.push({ name: 'fillStyle', args }); return this; },
    fillTriangle(...args: number[]) { calls.push({ name: 'fillTriangle', args }); return this; },
  } as unknown as Parameters<typeof drawFlightActionFeedback>[0];
  const s = scene();
  drawFlightActionFeedback(graphics, s, true);
  assert.equal(calls.filter(x => x.name === 'lineBetween').length, 4);
  assert.ok(calls.every(c => !/Circle|Ellipse|Rect/i.test(c.name)));
  assert.ok(calls.filter(c => c.name === 'lineBetween').every(c =>
    c.args.every((n,i) => (i % 2 === 0)
      ? n >= s.player.x - 60 && n <= s.player.x + 60
      : n >= s.player.y - 60 && n <= s.player.y + 60)));
  calls.length = 0;
  s.inputHeld = false;
  s.attachedAnchorId = null;
  s.stylishReleaseTicks = [120];
  s.combo = 1;
  s.tick = 138;
  drawFlightActionFeedback(graphics, s, false);
  assert.equal(calls.filter(c => c.name === 'lineBetween').length, 2);
  assert.equal(calls.filter(c => c.name === 'fillTriangle').length, 1);
  calls.length = 0;
  s.paused = true;
  drawFlightActionFeedback(graphics, s, false);
  assert.equal(calls.length, 0, 'pausing never animates a gameplay reward');
});
