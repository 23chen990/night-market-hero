import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  gateCheckpointXForSegment,
  segmentForIndex,
  segmentLengthPx,
  segmentStartPx,
} from '../src/endless.ts';
import { createGrappleGame } from '../src/game-core.ts';

test('night patrol uses one compact, traversable gate landmark per block', () => {
  const gatesByBlock = new Map<number, number>();
  for (let index = 0; index < 40; index += 1) {
    const segment = segmentForIndex(index);
    if (segment.isGate) gatesByBlock.set(segment.block, (gatesByBlock.get(segment.block) ?? 0) + 1);
    if (segment.isSky) {
      assert.equal(segmentForIndex(index - 1).isGate, false, `sky segment ${index} touches a gate on the left`);
      assert.equal(segmentForIndex(index + 1).isGate, false, `sky segment ${index} touches a gate on the right`);
    }
  }
  assert.ok([...gatesByBlock.values()].every((count) => count === 1));

  const game = createGrappleGame(17);
  game.restartEndless(17);
  const segmentIndex = 6;
  game.setPlayerForTest({
    x: segmentStartPx(segmentIndex) + 12,
    y: 380,
    vx: 300,
    vy: 0,
  });
  const state = game.advanceTicks(1);
  assert.equal(state.segmentIndex, segmentIndex);
  assert.ok(
    Math.abs(state.gate.x - gateCheckpointXForSegment(segmentIndex)) < 0.001,
    'gate must be placed at the current gate segment checkpoint, not at a fixed 1600px bucket',
  );
  assert.ok(state.gate.anchorBounds.width <= 1_280 * 0.5, 'gate landmark must leave the route readable');
  assert.ok(state.gate.anchorBounds.height <= 720 * 0.72, 'gate landmark must not become a full-screen wall');
  assert.ok(state.gate.collisionAperture.width > 0 && state.gate.collisionAperture.height > 0);
  assert.equal(state.gate.expression, 'inner-market-gate');
});

test('non-gate market supports do not span both routes or hide the transfer gap', () => {
  const state = createGrappleGame(18).getState();
  const high = state.routeGraph.branches.high.corridor;
  const low = state.routeGraph.branches.low.corridor;
  assert.ok(state.environmentGeometry.interiorColumns.length > 0);
  for (const column of state.environmentGeometry.interiorColumns) {
    const crossesHigh = column.y < high.y + high.height && column.y + column.height > high.y;
    const crossesLow = column.y < low.y + low.height && column.y + column.height > low.y;
    assert.ok(!(crossesHigh && crossesLow), `support at x=${column.x} creates a full-height route wall`);
    assert.ok(column.height <= 320, `support at x=${column.x} is too tall for a market bay`);
  }
});

test('opening market fixtures stay separated and the alley reads as a passage, not a gate', () => {
  const state = createGrappleGame(20).getState();
  const canopy = state.sceneObjects.find((item) => item.kind === '布棚')!;
  const bamboo = state.sceneObjects.find((item) => item.kind === '竹架')!;
  const alley = state.sceneObjects.find((item) => item.kind === '窄巷')!;
  assert.ok(bamboo.bounds.x >= canopy.bounds.x + canopy.bounds.width + 72, 'opening fixtures must leave a readable transfer gap');
  assert.ok(alley.bounds.x >= bamboo.bounds.x + bamboo.bounds.width + 72, 'the passage must not overlap the scaffold');
  assert.ok(alley.bounds.width <= 180 && alley.bounds.height <= 300, 'the passage must stay smaller than a gate landmark');
});

test('release preserves a readable glide gap before the next grapple capture', () => {
  const game = createGrappleGame(19);
  game.restartEndless(19);
  const before = game.getState();
  const firstAnchor = before.anchors.find((anchor) => anchor.x > before.player.x && anchor.id !== 'node-low');
  assert.ok(firstAnchor);
  game.setPlayerForTest({ x: firstAnchor.x - 10, y: firstAnchor.y, vx: 500, vy: 0 });
  assert.equal(game.act('press'), true);
  const releasedAnchor = game.getState().attachedAnchorId;
  assert.equal(game.act('release'), true);
  assert.equal(game.getState().attachedAnchorId, null);

  assert.equal(game.act('press'), true, 'the grapple input remains available during the glide');
  assert.equal(game.getState().attachedAnchorId, null);
  game.act('release');

  game.advanceTicks(30);
  assert.equal(game.act('press'), true, 'the assist window should return after a short glide');
  assert.notEqual(game.getState().attachedAnchorId, releasedAnchor);
});

test('gate checkpoint helper is stable at the center of its gate segment', () => {
  for (const index of [2, 6, 10, 14]) {
    assert.equal(segmentForIndex(index).isGate, true);
    assert.equal(
      gateCheckpointXForSegment(index),
      segmentStartPx(index) + segmentLengthPx(index) / 2,
    );
  }
});
