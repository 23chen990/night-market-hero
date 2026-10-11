import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CITY_CHUNK_WIDTH, cityChunksInView } from '../src/district-world.ts';
import { createGrappleGame } from '../src/game-core.ts';

type TerrainModeOptions = {
  marketGates?: boolean;
  terrainMode?: 'legacy-authored' | 'panorama';
};

function createPanoramaGame(seed = 31) {
  return createGrappleGame(seed, {
    marketGates: false,
    terrainMode: 'panorama',
  } as Parameters<typeof createGrappleGame>[1]);
}

function createLegacyGame(seed = 31, explicit = false) {
  const options: TerrainModeOptions = { marketGates: false };
  if (explicit) options.terrainMode = 'legacy-authored';
  return createGrappleGame(seed, options as Parameters<typeof createGrappleGame>[1]);
}

function bambooContact(game: ReturnType<typeof createGrappleGame>) {
  const loaded = game.loadScenario('terrain-竹架-safe');
  const bamboo = loaded.sceneObjects.find((item) => item.kind === '竹架')!;
  game.setPlayerForTest({
    x: bamboo.bounds.x + 40,
    y: bamboo.bounds.y + 20,
    vx: 360,
    vy: 0,
  });
  const before = game.getState();
  const after = game.advanceTicks(1);
  return {
    before,
    after,
    beforeBamboo: before.sceneObjects.find((item) => item.kind === '竹架')!,
    afterBamboo: after.sceneObjects.find((item) => item.kind === '竹架')!,
  };
}

test('panorama terrain mode leaves the exact bamboo fixture physically untouched', () => {
  const { after, beforeBamboo, afterBamboo } = bambooContact(createPanoramaGame());

  assert.equal(beforeBamboo.impactCount, 0);
  assert.equal(afterBamboo.impactCount, beforeBamboo.impactCount);
  assert.equal(afterBamboo.behaviorState, beforeBamboo.behaviorState);
  assert.ok(after.player.vx > 340, 'panorama must not apply the hidden bamboo kick');
  assert.ok(after.player.vy > 0 && after.player.vy < 20, 'panorama must retain ordinary gravity only');
});

test('default and explicit legacy-authored terrain modes keep the bamboo fixture kickable', () => {
  for (const game of [createLegacyGame(), createLegacyGame(31, true)]) {
    const { before, after, beforeBamboo, afterBamboo } = bambooContact(game);

    assert.equal(beforeBamboo.collision, 'solid');
    assert.equal(afterBamboo.impactCount, beforeBamboo.impactCount + 1);
    assert.equal(afterBamboo.behaviorState, 'strained');
    assert.ok(after.player.vx < before.player.vx * 0.7);
    assert.equal(after.player.vy, -180);
  }
});

test('panorama snapshot restore sanitizes legacy terrain and route surfaces', () => {
  const source = createLegacyGame();
  const loaded = source.loadScenario('terrain-竹架-safe');
  const bamboo = loaded.sceneObjects.find((item) => item.kind === '竹架')!;
  source.setPlayerForTest({ x: bamboo.bounds.x + 40, y: bamboo.bounds.y + 20, vx: 360, vy: 0 });
  const contaminated = source.getState();
  const restoredBamboo = contaminated.sceneObjects.find((item) => item.kind === '竹架')!;
  restoredBamboo.collision = 'solid';
  contaminated.activeTerrain = { ...restoredBamboo };

  const panorama = createPanoramaGame();
  assert.equal(panorama.restoreSnapshot(contaminated), true);
  const restored = panorama.getState();
  assert.equal(restored.sceneObjects.find((item) => item.kind === '竹架')!.collision, 'none');
  assert.equal(restored.activeTerrain?.collision, 'none');

  panorama.setPlayerForTest({ x: bamboo.bounds.x + 40, y: bamboo.bounds.y + 20, vx: 360, vy: 0 });
  const afterBamboo = panorama.advanceTicks(1);
  assert.equal(afterBamboo.sceneObjects.find((item) => item.kind === '竹架')!.impactCount, 0);
  assert.ok(afterBamboo.player.vx > 340);

  const route = createPanoramaGame();
  route.loadScenario('route-low');
  route.setPlayerForTest({ y: 780, vy: 120 });
  const afterRouteSurface = route.advanceTicks(1);
  assert.ok(afterRouteSurface.player.y > 760, 'panorama must not snap onto the hidden authored route floor');
});

test('panorama endless anchors follow the authored district when compatibility districts disagree', () => {
  const chunk = cityChunksInView(31, CITY_CHUNK_WIDTH * 2, CITY_CHUNK_WIDTH * 3)[0]!;
  assert.equal(chunk.district, 'market');
  assert.equal(chunk.gameplayDistrict, 'rooftops');

  const panorama = createPanoramaGame(31);
  panorama.restartEndless(31);
  panorama.setPlayerForTest({ x: CITY_CHUNK_WIDTH * 2, y: 450, vx: 600, vy: 0 });
  const state = panorama.advanceTicks(1);
  const anchors = state.anchors.filter((anchor) => anchor.x >= chunk.startX && anchor.x < chunk.endX);

  assert.ok(anchors.length >= 4);
  assert.ok(
    anchors.some((anchor) => anchor.y >= 380),
    'market-authored anchor pattern must appear in the market panorama chunk',
  );
});
