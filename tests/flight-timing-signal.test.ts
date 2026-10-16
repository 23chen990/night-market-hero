import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { GrappleState } from '../src/game-core.ts';
import { drawSwingTimingSignal, shouldShowSwingTimingSignal } from '../src/ride-renderer.ts';

function example(): GrappleState {
  // This is a deliberate visual-only fixture. It NEVER awards a vehicle or
  // advances game physics, and does not replace real-browser encounter QA.
  return {
    status: 'playing', paused: false, levelId: 'night-patrol',
    vehicleId: null, attachedAnchorId: 'roof-1',
    anchors: [{ id: 'roof-1', x: 400 } as GrappleState['anchors'][number]],
    player: { x: 425, y: 420, vx: 390, vy: -140 }, tick: 110,
  } as GrappleState;
}

test('release spark only appears at a real stylish world-rope swing window', () => {
  const s = example();
  assert.equal(shouldShowSwingTimingSignal(s), true);
  for (const invalid of [
    { ...s, vehicleId: '纸鸢' as const },
    { ...s, attachedAnchorId: null },
    { ...s, paused: true },
    { ...s, status: 'failed' as const },
    { ...s, levelId: 'lantern-entry' as const },
    { ...s, anchors: [] },
    { ...s, player: { ...s.player, x: 398 } },
    { ...s, player: { ...s.player, vx: 205, vy: -80 } },
    { ...s, player: { ...s.player, vx: -450 } },
    { ...s, player: { ...s.player, vy: 130 } },
  ]) assert.equal(shouldShowSwingTimingSignal(invalid as GrappleState), false);
});

test('timing signal draws only actor-adjacent open chevrons and respects reduced motion', () => {
  const calls: Array<{ kind: string; args: number[] }> = [];
  const graphics = {
    lineStyle(...args: number[]) { calls.push({ kind: 'stroke', args }); return this; },
    lineBetween(...args: number[]) { calls.push({ kind: 'line', args }); return this; },
    fillStyle(...args: number[]) { calls.push({ kind: 'fill', args }); return this; },
    fillTriangle(...args: number[]) { calls.push({ kind: 'triangle', args }); return this; },
  } as unknown as Parameters<typeof drawSwingTimingSignal>[0];
  const s = example();
  drawSwingTimingSignal(graphics, s, true);
  assert.equal(calls.filter(c => c.kind === 'line').length, 2);
  assert.equal(calls.filter(c => c.kind === 'triangle').length, 1);
  assert.equal(calls.some(c => c.kind === 'circle'), false,
    'do not paint a misleading large collision or autopickup ring');
  const geometry = calls.filter(c => c.kind === 'line' || c.kind === 'triangle');
  assert.ok(geometry.every(item => item.args.every(n => Number.isFinite(n))));
  assert.ok(geometry.every(item => item.args.filter((_, i) => i % 2 === 0)
    .every(x => x >= s.player.x - 60 && x <= s.player.x + 60)));
  calls.length = 0;
  drawSwingTimingSignal(graphics, { ...s, attachedAnchorId: null }, false);
  assert.equal(calls.length, 0, 'free flight must never display a fake release window');
});
