import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';
import { COMPONENT_DEPTH_RANGES, createComponentRenderer, isLongmapPreviewEnabled } from '../src/component-renderer.ts';
import { getLongmapSceneRecipe, placementsForChunk, allLongmapSceneRecipes } from '../src/longmap-scene-recipes.ts';
import { getLongmapArt } from '../src/longmap-art-catalog.ts';
import { runPlanChunkAtIndex } from '../src/run-plan.ts';

interface FakeImage {
  key: string;
  visible: boolean;
  depth: number;
  setOrigin(x: number, y: number): FakeImage;
  setPosition(x: number, y: number): FakeImage;
  setDisplaySize(width: number, height: number): FakeImage;
  setDepth(depth: number): FakeImage;
  setVisible(visible: boolean): FakeImage;
  setAlpha(alpha: number): FakeImage;
  setFlipX(flipX: boolean): FakeImage;
  destroy(): void;
}

function fakeScene() {
  const loaded = new Set<string>();
  const images: FakeImage[] = [];
  const scene = {
    load: { image(key: string) { loaded.add(key); } },
    textures: { exists(key: string) { return loaded.has(key); } },
    add: { image(_x: number, _y: number, key: string) {
      const image: FakeImage = {
        key, visible: false, depth: 0,
        setOrigin() { return image; },
        setPosition() { return image; },
        setDisplaySize() { return image; },
        setDepth(depth: number) { image.depth = depth; return image; },
        setVisible(visible: boolean) { image.visible = visible; return image; },
        setAlpha() { return image; },
        setFlipX() { return image; },
        destroy() { image.visible = false; },
      };
      images.push(image);
      return image;
    } },
  };
  return { scene, images };
}

describe('component scenery foundation', () => {
  test('authored recipes are deterministic and differ by scene family', () => {
    const chunk = runPlanChunkAtIndex(73, 0);
    assert.deepEqual(getLongmapSceneRecipe(chunk.sceneFamily), getLongmapSceneRecipe(chunk.sceneFamily));
    assert.notDeepEqual(
      placementsForChunk(runPlanChunkAtIndex(73, 0)),
      placementsForChunk(runPlanChunkAtIndex(73, 1)),
      'adjacent authored chunks must not share one placement signature',
    );
    assert.ok(placementsForChunk(runPlanChunkAtIndex(73, 0)).every((placement) => placement.assetId));
  });

  test('all fifteen authored slots have recipes and catalog entries', () => {
    const recipes = allLongmapSceneRecipes();
    assert.equal(recipes.length, 15);
    assert.equal(new Set(recipes.map((recipe) => recipe.sceneFamily)).size, 15);
    for (let index = 0; index < 15; index += 1) {
      const chunk = runPlanChunkAtIndex(73, index);
      const recipe = getLongmapSceneRecipe(chunk.sceneFamily);
      assert.ok(recipe, `missing recipe for ${chunk.sceneFamily}`);
      for (const placement of recipe!.placements) {
        assert.ok(getLongmapArt(placement.assetId), `missing catalog entry for ${placement.assetId}`);
      }
    }
  });

  test('rooftops recipes use atomic horizontal components instead of full-building art', () => {
    const rooftopFamilies = [
      'rooftops-01/low-tile-ridges',
      'rooftops-02/stepped-eaves',
      'rooftops-03/cross-street-roof-bridge',
      'rooftops-04/open-high-ridge',
    ];
    const rooftopAssets = new Set(rooftopFamilies.flatMap((family) =>
      getLongmapSceneRecipe(family)!.placements.map((placement) => placement.assetId)));
    for (const assetId of [
      'rooftops.lowBuildingMass',
      'rooftops.highBuildingMass',
      'rooftops.foregroundEaveOccluder',
      'rooftops.highLanternSupportFrame',
      'rooftops.crossStreetNegativeSpace',
      'rooftops.darkCanopy',
    ]) assert.ok(rooftopAssets.has(assetId), `missing atomic rooftop component ${assetId}`);
    for (const assetId of ['rooftops.tileRoof', 'rooftops.attic', 'rooftops.silhouette']) {
      assert.equal(rooftopAssets.has(assetId), false, `legacy full-building asset remains: ${assetId}`);
    }
  });

  test('missing assets are counted and skipped without procedural scenery fallback', () => {
    const { scene, images } = fakeScene();
    const renderer = createComponentRenderer({ enabled: true, prefetchChunks: 0, maxRetainedComponents: 16 });
    renderer.preload(scene);
    const stats = renderer.render(scene, 73, 0, 1_600);

    assert.ok(stats.missingAssetCount > 0, 'the first authored scene intentionally references future art');
    assert.ok(images.length > 0, 'approved component art should still render');
    assert.ok(images.every((image) => image.key.startsWith('longmap-component-')));
  });

  test('pool remains bounded while scrolling away and reuses released components', () => {
    const { scene, images } = fakeScene();
    const renderer = createComponentRenderer({ enabled: true, prefetchChunks: 1, maxRetainedComponents: 12 });
    renderer.preload(scene);
    renderer.render(scene, 73, 0, 1_600);
    const firstCount = images.length;
    const farStats = renderer.render(scene, 73, 160_000, 161_600);
    assert.ok(farStats.retainedCount <= 12);
    assert.ok(images.length <= firstCount + 12, 'far scrolling must not grow an unbounded image list');
    const beforeReturn = images.length;
    const returnStats = renderer.render(scene, 73, 0, 1_600);
    assert.ok(returnStats.retainedCount <= 12);
    assert.ok(images.length <= beforeReturn + 4, 'returning to a prior chunk should reuse the pool');
  });

  test('depth bands stay between panorama and player layers', () => {
    const { scene, images } = fakeScene();
    const renderer = createComponentRenderer({ enabled: true, prefetchChunks: 0, maxRetainedComponents: 32 });
    renderer.preload(scene);
    renderer.render(scene, 73, 0, 1_600);
    assert.ok(images.length > 0);
    for (const image of images.filter((item) => item.visible)) {
      assert.ok(Object.values(COMPONENT_DEPTH_RANGES).some(({ min, max }) => image.depth >= min && image.depth <= max));
    }
  });

  test('preview switch is opt-in and disabled mode does not touch the Phaser scene', () => {
    assert.equal(isLongmapPreviewEnabled('?longmap=1'), true);
    assert.equal(isLongmapPreviewEnabled('?longmap=0'), false);
    assert.equal(isLongmapPreviewEnabled(''), false);
    const { scene, images } = fakeScene();
    const renderer = createComponentRenderer({ enabled: false });
    const stats = renderer.render(scene, 73, 0, 1_600);
    assert.equal(stats.renderer, 'disabled');
    assert.equal(images.length, 0);
  });

  test('component renderer has no collision or building-graphics side effect', async () => {
    const source = await readFile(new URL('../src/component-renderer.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /add\.graphics|new Phaser\.GameObjects\.Graphics|collider|physics/);
  });
});
