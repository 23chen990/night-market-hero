import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MECHANICS_DEMO_THEME,
  hudStateLabel,
  isFinishTransition,
  resolveRewardFlyTarget,
} from '../src/theme';

test('finish transition visibility hides competing HUD panels while keeping terminal text', () => {
  assert.equal(isFinishTransition('contact'), true);
  assert.equal(isFinishTransition('reward'), true);
  assert.equal(isFinishTransition('celebration'), true);
  assert.equal(isFinishTransition('idle'), false);
  assert.equal(isFinishTransition('terminal'), false);
});

test('finish transition state label is settlement copy while initial ready stays ready', () => {
  assert.equal(hudStateLabel('ready', 'idle'), MECHANICS_DEMO_THEME.copy.status.ready);
  assert.equal(hudStateLabel('ready', 'reward'), MECHANICS_DEMO_THEME.copy.status.settling);
  assert.equal(hudStateLabel('airborne', 'contact'), MECHANICS_DEMO_THEME.copy.status.settling);
});

test('reward fly target falls back to a visible rect when earnings banner is hidden', () => {
  const fallback = { left: 20, top: 80, width: 180, height: 40 };
  assert.deepEqual(resolveRewardFlyTarget({ left: 0, top: 0, width: 0, height: 0 }, fallback), fallback);
  assert.deepEqual(resolveRewardFlyTarget({ left: 20, top: 100, width: 160, height: 32 }, fallback), {
    left: 20,
    top: 100,
    width: 160,
    height: 32,
  });
});
