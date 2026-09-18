import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CITY_CHUNK_WIDTH, cityChunksInView } from '../src/district-world.ts';
import { createGrappleGame, type GrappleState } from '../src/game-core.ts';

function endlessAt(seed: number, x: number): GrappleState {
  const game = createGrappleGame(seed);
  game.restartEndless(seed);
  game.setPlayerForTest({ x, y: 360, vx: 520, vy: -40 });
  return game.advanceTicks(1);
}

describe('endless district gameplay integration', () => {
  test('district layouts influence generated anchor trajectories', () => {
    const state = endlessAt(41, CITY_CHUNK_WIDTH * 3 + 200);
    const alternateSeed = endlessAt(42, CITY_CHUNK_WIDTH * 3 + 200);
    const visible = cityChunksInView(state.seed, CITY_CHUNK_WIDTH * 2, CITY_CHUNK_WIDTH * 6);
    const anchorsInView = state.anchors.filter((anchor) => anchor.x >= CITY_CHUNK_WIDTH * 2 && anchor.x < CITY_CHUNK_WIDTH * 6);
    const alternateAnchorsInView = alternateSeed.anchors.filter((anchor) => anchor.x >= CITY_CHUNK_WIDTH * 2 && anchor.x < CITY_CHUNK_WIDTH * 6);
    assert.ok(visible.some((chunk) => chunk.district !== 'market'));
    assert.ok(anchorsInView.length >= 4);
    assert.notDeepEqual(
      anchorsInView.map(({ x, y }) => ({ x, y })),
      alternateAnchorsInView.map(({ x, y }) => ({ x, y })),
      'seeded district/layout choices must change generated anchor positions',
    );
    assert.ok(new Set(anchorsInView.map((anchor) => anchor.y)).size > 2, 'district/layout profiles must alter the hold/release trajectory');
    for (let index = 1; index < anchorsInView.length; index += 1) {
      assert.ok(anchorsInView[index]!.x - anchorsInView[index - 1]!.x <= 520, 'generated anchors must stay inside the reachable horizontal gap');
      assert.ok(Math.abs(anchorsInView[index]!.y - anchorsInView[index - 1]!.y) <= 220, 'district transitions must stay vertically reachable');
    }
  });

  test('pruning retains the currently attached anchor', () => {
    const game = createGrappleGame(53);
    game.restartEndless(53);
    game.setPlayerForTest({ x: 220, y: 420, vx: 380, vy: -20 });
    game.advanceTicks(1);
    game.act('press');
    const attached = game.getState().attachedAnchorId;
    assert.ok(attached, 'fixture should attach to the nearby first anchor');

    game.setPlayerForTest({ x: CITY_CHUNK_WIDTH * 4 + 100, y: 360, vx: 520, vy: -20 });
    const afterPrune = game.advanceTicks(1);
    assert.equal(afterPrune.attachedAnchorId, attached);
    assert.ok(afterPrune.anchors.some((anchor) => anchor.id === attached));
  });

  test('tutorial course and transition into endless remain available', () => {
    const game = createGrappleGame(67);
    const tutorial = game.getState();
    assert.equal(tutorial.levelId, 'lantern-entry');
    assert.equal(tutorial.anchors[0]!.x, 275);
    const endless = game.restartEndless(67);
    assert.equal(endless.levelId, 'night-patrol');
    assert.equal(endless.status, 'playing');
    assert.equal(endless.finishX, Number.MAX_SAFE_INTEGER);
  });
});
