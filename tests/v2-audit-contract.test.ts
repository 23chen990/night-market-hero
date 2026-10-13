import assert from 'node:assert/strict';
import test from 'node:test';
import { everyClaimedInstanceIsPlayable, everyEarnedRideIsPlayable, hasAttributablePursuit } from './v2-audit-contract.ts';

test('newly earned last ride must be observed for a real second before automated pause', () => {
  const snaps = new Map([
    ['灯笼群', { firstTick: 2411, lastTick: 2945, elapsed: 20 }],
    ['货运滑索', { firstTick: 8075, lastTick: 8075, elapsed: 67 }],
  ]);
  const earned = new Set(['灯笼群', '货运滑索']);
  const evidence = new Set(['灯笼群', '货运滑索']);
  assert.equal(everyEarnedRideIsPlayable(earned, snaps, evidence), false,
    'one previously completed ride cannot excuse a late unobserved pickup');
  snaps.get('货运滑索')!.lastTick = 8195;
  assert.equal(everyEarnedRideIsPlayable(earned, snaps, evidence), true);
  evidence.delete('货运滑索');
  assert.equal(everyEarnedRideIsPlayable(earned, snaps, evidence), false,
    'a completed ride with no actual frame is insufficient evidence');
});

test('safe skilled route is valid when a separate real-input route shows escalating officer contact', () => {
  assert.equal(hasAttributablePursuit([
    { phases: ['safe', 'climax'], failures: [{ reason: 'caught', screenshot: '844x390-terminal-0.png' }] },
    { phases: ['safe'], failures: [] },
  ]), true);
  assert.equal(hasAttributablePursuit([
    { phases: ['safe'], failures: [] }, { phases: ['safe'], failures: [] },
  ]), false, 'two safe journeys do not prove a credible pursuit system');
  assert.equal(hasAttributablePursuit([
    { phases: ['safe', 'alert'], failures: [{ reason: 'fell', screenshot: 'terminal.png' }] },
  ]), false, 'falling cannot be relabeled officer capture');
  assert.equal(hasAttributablePursuit([
    { phases: ['safe', 'danger'], failures: [{ reason: 'caught' }] },
  ]), false, 'physical guard failure requires visual evidence');
});

test('multiple instances of the same ride cannot mask a zero-duration late reward', () => {
  const resolved = [
    { instanceId: '32:2:2:货运滑索', id: '货运滑索', outcome: 'claimed' as const },
    { instanceId: '32:14:14:货运滑索', id: '货运滑索', outcome: 'claimed' as const },
  ];
  const windows = new Map([
    [resolved[0]!.instanceId, { firstTick: 1100, lastTick: 1550, elapsed: 9 }],
    [resolved[1]!.instanceId, { firstTick: 8075, lastTick: 8075, elapsed: 67 }],
  ]);
  const screenshotTypes = new Set(['货运滑索']);
  assert.equal(everyClaimedInstanceIsPlayable(resolved, windows, screenshotTypes), false);
  windows.get(resolved[1]!.instanceId)!.lastTick = 8200;
  assert.equal(everyClaimedInstanceIsPlayable(resolved, windows, screenshotTypes), true);
  assert.equal(everyClaimedInstanceIsPlayable([
    ...resolved, { instanceId: '32:4:4:纸鸢', id: '纸鸢', outcome: 'missed' as const },
  ], windows, screenshotTypes), true, 'a missed optional ride is not a hidden entitlement');
});
