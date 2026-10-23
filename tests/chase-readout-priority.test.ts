import assert from 'node:assert/strict';
import test from 'node:test';
import { chaseReadoutUrgency } from '../src/experience-hud.ts';

test('pursuit warnings reflect actual danger phase and normalized pressure without changing game physics', () => {
  assert.equal(chaseReadoutUrgency('calm', 0.03), 'calm');
  assert.equal(chaseReadoutUrgency('calm', 0.34), 'calm');
  assert.equal(chaseReadoutUrgency('calm', 0.35), 'alert');
  assert.equal(chaseReadoutUrgency('alert', 0.05), 'alert');
  assert.equal(chaseReadoutUrgency('calm', 0.75), 'danger');
  assert.equal(chaseReadoutUrgency('danger', 0.15), 'danger');
  assert.equal(chaseReadoutUrgency('climax', 0), 'danger');
});

import type { GrappleState } from '../src/game-core.ts';
import { hudCopyPriority } from '../src/experience-hud.ts';

test('pickup action replaces duplicate objective while patrol warning stays independent', () => {
  const state = {
    levelId: 'night-patrol', elapsed: 25, vehicleId: null,
    player: { x: 3600 },
    vehicleOffers: [{ id: '货运滑索', status: 'available', x: 3800 }],
  } as GrappleState;
  const ready = { title: '现在松手！飞向货运滑索', detail: '真实飞入吊轮', tone: 'ready' } as const;
  const approaching = hudCopyPriority(state, ready, 'alert');
  assert.equal(approaching.hideDuplicateGoal, true);
  assert.equal(approaching.compactCoaching, false);
  assert.equal(approaching.quickAction, 'release');
  const alreadyResolved = hudCopyPriority({
    ...state, vehicleOffers: [{ ...state.vehicleOffers[0]!, status: 'missed' }],
  } as GrappleState, ready, 'alert');
  assert.equal(alreadyResolved.hideDuplicateGoal, false,
    'missing the first ride must restore a meaningful next objective');
});

test('quiet coaching compacts only after the intro and never hides near-capture warning', () => {
  const quiet = { title: '按住摆荡', detail: '向前松手', tone: 'neutral' } as const;
  const state = {
    levelId: 'night-patrol', elapsed: 17, vehicleId: null,
    player: { x: 9000 }, vehicleOffers: [],
  } as unknown as GrappleState;
  const calm = hudCopyPriority(state, quiet, 'calm');
  assert.equal(calm.hideDuplicateGoal, false);
  assert.equal(calm.compactCoaching, true);
  assert.equal(calm.quickAction, 'none');
  assert.equal(hudCopyPriority(state, quiet, 'danger').compactCoaching, false);
  assert.equal(hudCopyPriority({ ...state, elapsed: 12 }, quiet, 'calm').compactCoaching, false);
  assert.equal(hudCopyPriority({ ...state, vehicleId: '纸鸢' }, quiet, 'calm').compactCoaching, false);
  assert.equal(hudCopyPriority(state, { ...quiet, tone: 'danger' }, 'calm').compactCoaching, false);
  assert.equal(hudCopyPriority(state, { ...quiet, title: '快按住！接住前方挂点' }, 'calm').quickAction, 'press');
});

test('an active ride does not advertise a second pickup that cannot be claimed while mounted', () => {
  const riding = {
    levelId: 'night-patrol', elapsed: 25, vehicleId: '纸鸢',
    player: { x: 10000 },
    vehicleOffers: [{ id: '灯笼群', status: 'available', x: 10800 }],
  } as unknown as GrappleState;
  const cue = { title: '按住拉升 · 松手滑翔', detail: '顺着金币调整高度', tone: 'neutral' } as const;
  assert.equal(hudCopyPriority(riding, cue, 'calm').hideDuplicateGoal, true,
    'the ride badge and valid ride control cue already supply the current goal');
  assert.equal(hudCopyPriority({ ...riding, vehicleId: null, vehicleOffers: [] }, cue, 'calm').hideDuplicateGoal, false,
    'ordinary traversal restores its next objective after the ride ends');
});
