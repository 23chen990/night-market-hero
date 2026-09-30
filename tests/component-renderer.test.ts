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

interface FakeLine {
  x1: number; x2: number; visible: boolean;
  setTo(x1: number, y1: number, x2: number, y2: number): FakeLine;
  setLineWidth(_width: number): FakeLine;
  setStrokeStyle(_color: number, _alpha?: number): FakeLine;
  setDepth(_depth: number): FakeLine;
  setVisible(visible: boolean): FakeLine;
  destroy(): void;
}

function fakeScene() {
  const loaded = new Set<string>();
  const images: FakeImage[] = [];
  const lines: FakeLine[] = [];
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
    }, line(_x: number, _y: number, x1: number, y1: number, x2: number, y2: number) {
      void y1; void y2;
      const line: FakeLine = { x1, x2, visible: false,
        setTo(nextX1, nextY1, nextX2, nextY2) { line.x1 = nextX1; line.x2 = nextX2; void nextY1; void nextY2; return line; },
        setLineWidth() { return line; }, setStrokeStyle() { return line; }, setDepth() { return line; },
        setVisible(visible) { line.visible = visible; return line; }, destroy() { line.visible = false; } };
      lines.push(line); return line;
    } },
  };
  return { scene, images, lines };
}

describe('component scenery foundation', () => {
  test('approved lantern cable uses the single sprite contract', () => {
    const entry = getLongmapArt('lighting.lanternCable');
    assert.ok(entry, 'lantern cable catalog entry must exist');
    assert.equal(entry!.status, 'AVAILABLE');
    assert.match(entry!.path ?? '', /assets\/approved-runtime\/environment\/market-lantern-sprite-v1\.png$/);
    assert.equal(entry!.runtimeKey, 'longmap-component-lighting-lantern-sprite');
  });

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
      'rooftops.curvedEave',
      'rooftops.roofSupportBlock',
      'rooftops.crossStreetNegativeSpace',
      'rooftops.roofCrown',
    ]) assert.ok(rooftopAssets.has(assetId), `missing atomic rooftop component ${assetId}`);
    for (const assetId of ['rooftops.tileRoof', 'rooftops.attic', 'rooftops.silhouette']) {
      assert.equal(rooftopAssets.has(assetId), false, `legacy full-building asset remains: ${assetId}`);
    }
  });

  test('v55 source-derived rooftop components are available and used by rooftop recipes', async () => {
    const expected = [
      ['rooftops.curvedEave', 'rooftops-curved-eave-v1.png', 'longmap-component-rooftops-curved-eave', [385, 284]],
      ['rooftops.roofCrown', 'rooftops-roof-crown-v1.png', 'longmap-component-rooftops-roof-crown', [199, 205]],
      ['rooftops.roofSupportBlock', 'rooftops-roof-support-block-v1.png', 'longmap-component-rooftops-roof-support-block', [220, 205]],
    ] as const;
    const rooftopFamilies = [
      'rooftops-01/low-tile-ridges',
      'rooftops-02/stepped-eaves',
      'rooftops-03/cross-street-roof-bridge',
      'rooftops-04/open-high-ridge',
    ];
    const rooftopAssets = new Set(rooftopFamilies.flatMap((family) =>
      getLongmapSceneRecipe(family)!.placements.map((placement) => placement.assetId)));
    for (const [assetId, fileName, runtimeKey, nominalCanvas] of expected) {
      const entry = getLongmapArt(assetId);
      assert.ok(entry, `missing v55 catalog entry ${assetId}`);
      assert.equal(entry!.status, 'AVAILABLE');
      assert.equal(entry!.runtimeKey, runtimeKey);
      assert.deepEqual(entry!.nominalCanvas, nominalCanvas);
      assert.match(entry!.path ?? '', new RegExp(`assets/approved-runtime/environment/${fileName}$`));
      assert.ok(rooftopAssets.has(assetId), `rooftop recipes do not use ${assetId}`);
      await import('node:fs/promises').then(({ access }) => access(new URL(entry!.path!)));
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

  test('lantern cable expands to pooled sprites with scale-derived connector span', () => {
    const { scene, images, lines } = fakeScene();
    const renderer = createComponentRenderer({ enabled: true, prefetchChunks: 0, maxRetainedComponents: 64 });
    renderer.preload(scene);
    renderer.render(scene, 73, 0, 1_600);
    const lanternImages = images.filter((image) => image.key === 'longmap-component-lighting-lantern-sprite');
    assert.ok(lanternImages.length >= 3, 'lantern cable must render a small deterministic group');
    assert.ok(lines.some((line) => line.visible && line.x2 > line.x1), 'connector line must have a positive span');
    const firstSpan = lines.find((line) => line.visible)!.x2 - lines.find((line) => line.visible)!.x1;
    renderer.render(scene, 73, 160_000, 161_600);
    renderer.render(scene, 73, 0, 1_600);
    const secondSpan = lines.find((line) => line.visible)!.x2 - lines.find((line) => line.visible)!.x1;
    assert.equal(secondSpan, firstSpan, 'deterministic placement geometry must preserve connector span');
  });

  test('rooftop components use a code-drawn structural span between asset anchors', () => {
    const { scene, lines } = fakeScene();
    const renderer = createComponentRenderer({ enabled: true, prefetchChunks: 0, maxRetainedComponents: 64 });
    renderer.preload(scene);
    const rooftopChunk = runPlanChunkAtIndex(73, 6);
    renderer.render(scene, 73, rooftopChunk.startX, rooftopChunk.endX);
    assert.ok(lines.some((line) => line.visible && line.x2 > line.x1), 'rooftop group must include a positive-span code-drawn connector');
    const connector = lines.find((line) => line.visible && line.x2 > line.x1);
    assert.ok(connector);
    renderer.render(scene, 73, 0, 1_600);
    assert.equal(connector!.visible, false, 'rooftop connector must be hidden when its chunk leaves the viewport');
    renderer.render(scene, 73, rooftopChunk.startX, rooftopChunk.endX);
    assert.equal(lines.filter((line) => line.visible && line.x2 > line.x1).length, 1);
    assert.equal(lines[0], connector, 'rooftop connector should be recycled with its image group');
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
