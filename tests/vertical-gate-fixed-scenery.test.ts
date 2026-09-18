import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

test('closing gate uses vertically closing leaves with stable horizontal aperture', () => {
  const game = createGrappleGame(1);
  const beat1 = game.loadScenario('event-closing-gate-beat-1').gate;
  const beat2 = game.loadScenario('event-closing-gate-beat-2').gate;
  const beat3 = game.loadScenario('event-closing-gate-beat-3').gate;
  assert.equal(beat1.closureMotion, 'VERTICAL_DOUBLE_LEAVES_INWARD');
  assert.ok(beat1.topLeafBounds.y + beat1.topLeafBounds.height < beat2.topLeafBounds.y + beat2.topLeafBounds.height);
  assert.ok(beat1.bottomLeafBounds.y > beat2.bottomLeafBounds.y);
  assert.ok(beat1.collisionAperture.width === beat2.collisionAperture.width);
  assert.ok(beat1.collisionAperture.height > beat2.collisionAperture.height);
  assert.ok(beat2.collisionAperture.height > beat3.collisionAperture.height);
  assert.ok(beat3.collisionAperture.height > 0);
  assert.deepEqual(beat3.topLeafBounds, beat3.renderTopLeafBounds);
  assert.deepEqual(beat3.bottomLeafBounds, beat3.renderBottomLeafBounds);
});

test('fixed scenery remains present and preserves collapsed debris through reset and snapshot', () => {
  const game = createGrappleGame(2);
  const initial = game.getState();
  assert.equal(initial.sceneObjects.length, 3);
  const collapsed = game.getState();
  collapsed.sceneObjects.find((item) => item.kind === '竹架')!.behaviorState = 'broken';
  assert.equal(collapsed.sceneObjects.find((item) => item.kind === '竹架')?.behaviorState, 'broken');
  assert.equal(game.restoreSnapshot(collapsed), true);
  assert.equal(game.getState().sceneObjects.find((item) => item.kind === '竹架')?.behaviorState, 'broken');
  game.resetGame(2);
  assert.equal(game.getState().sceneObjects.length, 3);
  assert.ok(game.getState().sceneObjects.every((item) => !item.visual.layers.includes('slide-arrow')));
});

test('every level has adjacent playable transfers and distant assist captures reel the rope', () => {
  for (const levelIndex of [0, 1, 2]) {
    const game = createGrappleGame(3);
    game.resetGame(3, levelIndex);
    const anchors = game.getState().anchors.filter((anchor) => anchor.id !== 'node-low');
    for (let i = 1; i < anchors.length; i += 1) {
      assert.ok(Math.hypot(anchors[i]!.x - anchors[i - 1]!.x, anchors[i]!.y - anchors[i - 1]!.y) <= 540);
    }
  }
  const game = createGrappleGame(4);
  game.setPlayerForTest({ x: 1_000, y: 330, vx: 500, vy: 0 });
  game.act('press');
  assert.ok((game.getState().ropeLength ?? 0) <= 540);
});
