import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRetryPlan } from '../src/retry-debrief.ts';
import type { GrappleState } from '../src/game-core.ts';

const sample = (state: Record<string, unknown>): GrappleState => ({
  status: 'failed', levelId: 'night-patrol', failureReason: 'caught',
  distanceMeters: 282, comboPeak: 0, encounterEvents: [], ...state,
}) as unknown as GrappleState;

test('retry goal uses the pre-settlement record rather than falsely treating every completed run as a tie', () => {
  const first = buildRetryPlan(sample({ distanceMeters: 282 }), 0)!;
  assert.match(first.record, /第一条里程纪录：282m/);
  assert.equal(first.targetMeters, 300);
  assert.equal(first.tone, 'new-best');
  assert.match(first.next, /下局挑战 300m/);

  const newBest = buildRetryPlan(sample({ distanceMeters: 402 }), 365)!;
  assert.match(newBest.record, /新里程纪录.*37m/);
  assert.equal(newBest.targetMeters, 500);
  assert.equal(newBest.tone, 'new-best');

  const behind = buildRetryPlan(sample({ distanceMeters: 282 }), 350)!;
  assert.match(behind.record, /还差 68m/);
  assert.equal(behind.tone, 'catch-up');
  const tie = buildRetryPlan(sample({ distanceMeters: 300 }), 300)!;
  assert.match(tie.record, /追平此前的 300m/);
  assert.equal(tie.tone, 'progress');
  assert.equal(tie.targetMeters, 400);
});

test('failure-specific next action is true to the existing skill and chase rules', () => {
  const caught = buildRetryPlan(sample({ failureReason: 'caught', comboPeak: 0 }), 0)!;
  assert.match(caught.next, /连续完成两次漂亮松手/);
  const experienced = buildRetryPlan(sample({ failureReason: 'caught', comboPeak: 3 }), 0)!;
  assert.match(experienced.next, /选择低线/);
  const fell = buildRetryPlan(sample({ failureReason: 'fell' }), 0)!;
  assert.match(fell.next, /下落前重新按住/);
  assert.doesNotMatch(fell.next, /看完广告/);
  const tutorial = buildRetryPlan(sample({ levelId: 'lantern-entry' }), 0)!;
  assert.match(tutorial.next, /越过挂点再松手/);
});

test('missed vehicle goals use the actual last resolved instance without granting or blaming it for a death', () => {
  const e = (id: string, outcome: string, instanceId: string) => ({
    id, outcome, instanceId, segment: 4, tick: 100, playerX: 8000, playerY: 300,
    reason: '错过真实挂环', quality: null,
  });
  const won = sample({ status: 'won', failureReason: null,
    encounterEvents: [e('纸鸢', 'missed', '32:4:1:纸鸢'), e('灯笼群', 'claimed', '32:6:1:灯笼群')] });
  assert.match(buildRetryPlan(won, 100)!.next, /高屋檐/);
  const bird = sample({ ...won, encounterEvents: [e('青鸾', 'missed', '32:8:1:青鸾')] });
  assert.match(buildRetryPlan(bird, 100)!.next, /两次漂亮松手/);
  const fallen = sample({ ...won, status: 'failed', failureReason: 'fell' });
  assert.match(buildRetryPlan(fallen, 100)!.next, /下落前重新按住/,
    'missing an optional ride cannot be misreported as the cause of falling');
});

test('debrief has no live overlay, no mutation and no impossible negative targets', () => {
  const state = sample({ status: 'playing' });
  const before = JSON.stringify(state);
  assert.equal(buildRetryPlan(state, 0), null);
  assert.equal(JSON.stringify(state), before);
  const strange = buildRetryPlan(sample({ distanceMeters: -50 }), Number.POSITIVE_INFINITY)!;
  assert.equal(strange.targetMeters, 100);
  assert.match(strange.record, /首条里程纪录/);
});
