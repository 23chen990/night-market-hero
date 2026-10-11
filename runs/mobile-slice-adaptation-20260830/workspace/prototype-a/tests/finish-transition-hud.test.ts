import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MECHANICS_DEMO_THEME,
  hudStateLabel,
  isFinishTransition,
  resolveRewardFlyTarget,
} from '../src/theme';
import * as theme from '../src/theme';

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

type FeedbackOriginResolver = (fruit: { left: number; top: number; width: number; height: number }, viewport: { width: number; height: number }) => { x: number; y: number };
type FeedbackPoint = { x: number; y: number };
type RewardFlyRoute = { waypoint: FeedbackPoint; targetVisible: boolean };

function pointIsInsideReservedAppleEnvelope(point: FeedbackPoint, fruit: theme.RewardFlyRect): boolean {
  const horizontalClearance = Math.max(fruit.width * .7, 32) + 32;
  const verticalClearance = 21;
  return point.x > fruit.left - horizontalClearance
    && point.x < fruit.left + fruit.width + horizontalClearance
    && point.y > fruit.top - verticalClearance
    && point.y < fruit.top + fruit.height + verticalClearance;
}

function segmentCrossesReservedAppleEnvelope(start: FeedbackPoint, end: FeedbackPoint, fruit: theme.RewardFlyRect): boolean {
  for (let step = 1; step < 100; step++) {
    const progress = step / 100;
    if (pointIsInsideReservedAppleEnvelope({
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
    }, fruit)) return true;
  }
  return false;
}

test('apple reward labels clear the opening fruit at desktop and both phone orientations', () => {
  const resolveOrigin = (theme as unknown as { resolveCutFeedbackOrigin: FeedbackOriginResolver }).resolveCutFeedbackOrigin;
  assert.equal(typeof resolveOrigin, 'function', 'reward feedback needs a fruit-aware layout');
  for (const [width, height, left, top, fruitWidth, fruitHeight] of [
    [1180, 720, 480, 270, 65, 84], [390, 844, 140, 280, 72, 92], [844, 390, 380, 120, 58, 75],
  ]) {
    const fruit = { left: left!, top: top!, width: fruitWidth!, height: fruitHeight! };
    const origin = resolveOrigin(fruit, { width: width!, height: height! });
    assert.ok(origin.y + 21 < fruit.top - 8, 'even the enlarged +4 text must start above the fruit envelope');
    assert.ok(origin.x >= 32 && origin.x <= width! - 32 && origin.y >= 24, 'keep the reward inside the safe viewport');
  }
});

test('a fruit near the top edge places its reward beside the complete reveal envelope', () => {
  const resolveOrigin = (theme as unknown as { resolveCutFeedbackOrigin: FeedbackOriginResolver }).resolveCutFeedbackOrigin;
  assert.equal(typeof resolveOrigin, 'function');
  for (const left of [12, 290]) {
    const fruit = { left, top: 12, width: 70, height: 84 };
    const origin = resolveOrigin(fruit, { width: 390, height: 844 });
    const clearance = Math.max(fruit.width * .7, 32);
    assert.ok(origin.x + 32 <= fruit.left - clearance || origin.x - 32 >= fruit.left + fruit.width + clearance,
      'the upward label animation must never pass through either opened half');
    assert.ok(origin.x >= 32 && origin.x <= 358 && origin.y >= 24);
  }
});

test('a wide fruit at the top uses the clear lower slot when neither side can fit the reward label', () => {
  const resolveOrigin = (theme as unknown as { resolveCutFeedbackOrigin: FeedbackOriginResolver }).resolveCutFeedbackOrigin;
  assert.equal(typeof resolveOrigin, 'function');
  const fruit = { left: 120, top: 12, width: 150, height: 100 };
  const origin = resolveOrigin(fruit, { width: 390, height: 844 });
  assert.ok(origin.y - 21 >= fruit.top + fruit.height + 8,
    'the fallback must use the open space below the full cap-reveal envelope');
  assert.ok(origin.x >= 32 && origin.x <= 358 && origin.y <= 820);
});

test('reward flight hides before its target when a top-edge banner route would cross the apple reveal', () => {
  const resolveOrigin = (theme as unknown as { resolveCutFeedbackOrigin: FeedbackOriginResolver }).resolveCutFeedbackOrigin;
  const resolveRoute = (theme as unknown as {
    resolveRewardFlyRoute: (origin: FeedbackPoint, target: FeedbackPoint, fruit: theme.RewardFlyRect, viewport: { width: number; height: number }) => RewardFlyRoute;
  }).resolveRewardFlyRoute;
  assert.equal(typeof resolveRoute, 'function', 'reward flight needs a complete obstacle-aware path');
  const fruit = { left: 12, top: 12, width: 70, height: 84 };
  const viewport = { width: 390, height: 844 };
  const origin = resolveOrigin(fruit, viewport);
  const route = resolveRoute(origin, { x: 110, y: 100 }, fruit, viewport);
  assert.equal(route.targetVisible, false, 'the fallback target lands inside the reserved apple envelope');
  assert.equal(segmentCrossesReservedAppleEnvelope(origin, route.waypoint, fruit), false,
    'every visible portion of the flight must clear both opening halves and its enlarged label bounds');
});

test('an anchor message near an apple uses that apple envelope while distant anchors keep their origin', () => {
  const findRect = (theme as unknown as { findAppleFeedbackRect: (point: { x: number; y: number }, apples: theme.RewardFlyRect[]) => theme.RewardFlyRect | undefined }).findAppleFeedbackRect;
  assert.equal(typeof findRect, 'function', 'anchor feedback needs to protect the nearby cap reveal too');
  const apple = { left: 261, top: 142, width: 32, height: 31 };
  assert.deepEqual(findRect({ x: 282, y: 158 }, [apple]), apple);
  assert.deepEqual(findRect({ x: 305, y: 167 }, [apple]), apple, 'reserve the expanded half and anchor tip, not only the intact silhouette');
  assert.equal(findRect({ x: 610, y: 260 }, [apple]), undefined);
});
