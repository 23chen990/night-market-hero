import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as rendererModule from '../src/night-city-renderer.ts';

const {
  NIGHT_CITY_LAYER_CONFIG,
  NIGHT_CITY_ASSET_PATHS,
  NIGHT_CITY_SUPPORT_CATALOG,
  computeScreenCoverage,
  createNightCityRenderPlan,
  createNightCityRenderer,
} = rendererModule;

function readPngHeader(url: string): { width: number; height: number; colorType: number } {
  const bytes = readFileSync(new URL(url));
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25]! };
}

interface RenderCall {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  crop?: [number, number, number, number];
  flipX?: boolean;
  scrollFactor?: number;
  verticalScrollFactor?: number;
}

function makeScene() {
  const loaded = new Set<string>();
  const calls: RenderCall[] = [];
  const images: Array<{ key: string; call: RenderCall }> = [];
  const scene = {
    load: { image: (key: string) => loaded.add(key) },
    textures: { exists: (key: string) => loaded.has(key) },
    add: {
      image: (_x: number, _y: number, key: string) => {
        const call: RenderCall = { key, x: 0, y: 0, width: 0, height: 0 };
        const image = {
          setOrigin() { return image; },
          setPosition(x: number, y: number) { call.x = x; call.y = y; return image; },
          setDisplaySize(width: number, height: number) { call.width = width; call.height = height; calls.push(call); return image; },
          setDepth() { return image; },
          setVisible() { return image; },
          setAlpha() { return image; },
          setScrollFactor(factor: number, verticalFactor?: number) {
            call.scrollFactor = factor;
            call.verticalScrollFactor = verticalFactor;
            return image;
          },
          setFlipX(flip: boolean) { call.flipX = flip; return image; },
          setCrop(x?: number, y?: number, width?: number, height?: number) {
            if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
              call.crop = [x, y, width, height];
            } else {
              call.crop = undefined;
            }
            return image;
          },
          destroy() { return undefined; },
        };
        images.push({ key, call });
        return image;
      },
    },
  };
  return { scene, loaded, calls, images };
}

test('default image stream retires repeated foreground eaves and keeps compatibility asset unloaded', () => {
  const { scene, loaded, images } = makeScene();
  const renderer = createNightCityRenderer({ prefetchChunks: 1, maxRetainedChunks: 8 });

  renderer.preload(scene);
  renderer.render(scene, 73, 0, 6_400);

  assert.equal(loaded.has('night-city-foreground-eaves'), false);
  assert.equal(images.some(({ key }) => key === 'night-city-foreground-eaves'), false);
});

test('every seam veil remains world-aligned at near and far camera positions', () => {
  const { scene, images } = makeScene();
  const renderer = createNightCityRenderer({ prefetchChunks: 1, maxRetainedChunks: 8 });

  renderer.render(scene, 73, 0, 6_400);
  renderer.render(scene, 73, 100_000, 106_400);

  const veils = images
    .filter(({ key }) => key === 'night-city-district-transition-mist' || key === 'night-city-rooftops-transition-v36')
    .map(({ call }) => call);
  assert.equal(images.filter(({ key }) => key === 'night-city-rooftops-transition-v36').length, 0, 'old full-frame seam mask must not return');
  assert.ok(veils.every(({ scrollFactor, verticalScrollFactor }) => (
    scrollFactor === NIGHT_CITY_LAYER_CONFIG.panoramaScrollFactor
      && verticalScrollFactor === 0
  )), 'seam veils must use the world-aligned panorama scroll factor');
});

test('seam-matched mirrored panels replace the old random crop variation and keep full coverage', () => {
  const plan = createNightCityRenderPlan(73, 0, 6_400);
  const repeat = createNightCityRenderPlan(73, 0, 6_400);
  assert.deepEqual(plan.chunks, repeat.chunks, 'crop selection must be deterministic');
  assert.ok(plan.chunks.filter(c => c.kind === 'district').every(c => c.cropRect.width === c.imageWidth && c.overlap === 0));
  assert.ok(plan.chunks.every((chunk) => chunk.drawWidth > 0 && chunk.drawHeight > 0));

  const { scene, calls } = makeScene();
  createNightCityRenderer({ prefetchChunks: 0, maxRetainedChunks: 8 }).render(scene, 73, 0, 6_400);
  const panoramaCalls = calls.filter(({ key }) => key.startsWith('night-city-')
    && !key.includes('transition') && !key.includes('foreground'));
  assert.ok(panoramaCalls.every((call) => call.crop === undefined), 'ordinary panorama panels must not randomly crop their silhouettes');
  assert.ok(panoramaCalls.some((call) => call.flipX === true), 'alternate tiles must reflect the same source edge');

  for (const cameraX of [0, 10_000, 100_000]) {
    const viewportWidth = 1_672;
    const coveragePlan = createNightCityRenderPlan(31, cameraX - 1_600, cameraX + viewportWidth + 1_600);
    const coverage = computeScreenCoverage(coveragePlan.chunks, cameraX, NIGHT_CITY_LAYER_CONFIG.panoramaScrollFactor, viewportWidth);
    assert.ok(coverage.left <= 0, `panorama starts after the viewport at ${cameraX}`);
    assert.ok(coverage.right >= viewportWidth, `panorama ends before the viewport at ${cameraX}`);
  }
});

test('renderer world height and anchor socket Y match the actual plate display transform', () => {
  for (const cameraX of [0, 6_400, 8_000, 14_400]) {
    const plan = createNightCityRenderPlan(32, cameraX, cameraX + 1_600);
    const { scene, calls } = makeScene();
    createNightCityRenderer({ prefetchChunks: 0, maxRetainedChunks: 8 })
      .render(scene, 32, cameraX, cameraX + 1_600);
    for (const chunk of plan.chunks) {
      const expectedHeight = chunk.cropRect.height * chunk.sourceScaleY;
      assert.ok(Math.abs(chunk.drawHeight - expectedHeight) < 0.001,
        `world-height/anchor mismatch for ${chunk.assetKey}`);
      assert.ok(Math.abs(chunk.sourceScaleY - chunk.sourceScale) < 0.0001,
        `PNG must be rendered with isotropic source pixels: ${chunk.assetKey}`);
      const display = calls.find(call => call.key === chunk.assetKey
        && Math.abs(call.width - chunk.drawWidth) < 0.001);
      assert.ok(display, `no rendered plate for ${chunk.assetKey}`);
      assert.ok(Math.abs(display.height - chunk.drawHeight) < 0.001,
        `source pixel socket Y must agree with actual displayed height: ${chunk.assetKey}`);
    }
  }
});

test('adjacent ordinary districts have exactly matching edge pixels by construction', () => {
  for (const first of [0, 1, 2, 5, 6, 7, 10, 11, 12, 15, 16, 17]) {
    const plan = createNightCityRenderPlan(31, first * 1600, (first + 2) * 1600);
    const a = plan.chunks.find(chunk => chunk.index === first)!;
    const b = plan.chunks.find(chunk => chunk.index === first + 1)!;
    if (a.kind !== 'district' || b.kind !== 'district' || a.district !== b.district) continue;
    assert.equal(a.assetKey, b.assetKey, 'ordinary joins must use the same texture source');
    assert.notEqual(a.mirrored, b.mirrored, 'the common source image edge must reflect');
    assert.equal(a.startX + a.drawWidth, b.startX, 'no overlap can reintroduce mismatched pixels');
    assert.equal(a.drawHeight, b.drawHeight, 'rooftops must not jump in vertical scale');
    assert.equal(a.cropRect.x, b.cropRect.x);
    assert.equal(a.cropRect.y, b.cropRect.y);
  }
});
test('maps a world anchor to a support socket on the same transformed panorama image', () => {
    const mapWorldAnchorToArchitecturalSocket = (rendererModule as typeof rendererModule & {
    mapWorldAnchorToArchitecturalSocket?: (plan: ReturnType<typeof createNightCityRenderPlan>, anchor: { x: number; y: number }) => {
      x: number;
      y: number;
      assetKey: string;
      chunkId: string;
      supportId: string;
      sourceX: number;
      sourceY: number;
    } | null;
  }).mapWorldAnchorToArchitecturalSocket;
  assert.equal(typeof mapWorldAnchorToArchitecturalSocket, 'function');

  const plan = createNightCityRenderPlan(73, 0, 6_400);
  const chunk = plan.chunks[1]!;
  const socket = mapWorldAnchorToArchitecturalSocket!(plan, {
    x: chunk.startX + chunk.width * 0.45,
    y: 350,
  });
  assert.ok(socket);
  assert.equal(socket?.assetKey, chunk.assetKey);
  assert.equal(socket?.chunkId, chunk.chunkId);
  assert.ok(Number.isFinite(socket?.x) && Number.isFinite(socket?.y));
  assert.ok(socket!.x >= chunk.startX - chunk.overlap && socket!.x <= chunk.startX - chunk.overlap + chunk.drawWidth);
  assert.equal(typeof socket?.supportId, 'string');
  assert.ok(NIGHT_CITY_SUPPORT_CATALOG[chunk.assetKey]?.some((support) => support.supportId === socket?.supportId));
});

test('catalogs explicit visible source-pixel supports for all six panoramas and three bridge plates', () => {
  const selectedAssets = [
    'night-city-market-v1',
    'night-city-market-v2',
    'night-city-rooftops-v1',
    'night-city-rooftops-v2',
    'night-city-waterfront-v1',
    'night-city-waterfront-v2',
    'night-city-market-rooftops-bridge-v3',
    'night-city-rooftops-waterfront-bridge-v1',
    'night-city-waterfront-market-bridge-v1',
  ] as const;
  const sourceSizes: Record<(typeof selectedAssets)[number], { width: number; height: number }> = {
    'night-city-market-v1': { width: 1_672, height: 941 },
    'night-city-market-v2': { width: 1_672, height: 941 },
    'night-city-rooftops-v1': { width: 1_672, height: 941 },
    'night-city-rooftops-v2': { width: 1_672, height: 941 },
    'night-city-waterfront-v1': { width: 1_672, height: 941 },
    'night-city-waterfront-v2': { width: 1_672, height: 941 },
    'night-city-market-rooftops-bridge-v3': { width: 2_080, height: 958 },
    'night-city-rooftops-waterfront-bridge-v1': { width: 1_672, height: 941 },
    'night-city-waterfront-market-bridge-v1': { width: 1_672, height: 941 },
  };
  for (const assetKey of selectedAssets) {
    const supports = NIGHT_CITY_SUPPORT_CATALOG[assetKey];
    assert.ok(supports && supports.length >= 2, `${assetKey} needs multiple authored supports`);
    for (const support of supports ?? []) {
      assert.ok(support.supportId.length > 0);
      assert.ok(support.x1 >= 0 && support.x1 <= sourceSizes[assetKey].width);
      assert.ok(support.x2 >= 0 && support.x2 <= sourceSizes[assetKey].width);
      assert.ok(support.y1 >= 0 && support.y1 <= sourceSizes[assetKey].height);
      assert.ok(support.y2 >= 0 && support.y2 <= sourceSizes[assetKey].height);
      assert.notEqual(support.x1 === support.x2 && support.y1 === support.y2, true,
        `${assetKey}/${support.supportId} must describe a visible point segment`);
    }
  }
});

test('returns an authored support point inside the selected crop and preserves its transformed world position', () => {
  const mapWorldAnchorToArchitecturalSocket = (rendererModule as typeof rendererModule & {
    mapWorldAnchorToArchitecturalSocket?: (plan: ReturnType<typeof createNightCityRenderPlan>, anchor: { x: number; y: number }) => {
      x: number;
      y: number;
      assetKey: string;
      supportId: string;
      sourceX: number;
      sourceY: number;
    } | null;
  }).mapWorldAnchorToArchitecturalSocket;
  assert.equal(typeof mapWorldAnchorToArchitecturalSocket, 'function');

  const seen = new Set<string>();
  for (const index of Array.from({ length: 15 }, (_, value) => value)) {
    const plan = createNightCityRenderPlan(73, index * 1_600, (index + 1) * 1_600);
    const chunk = plan.chunks.find((candidate) => !seen.has(candidate.assetKey)
      && NIGHT_CITY_SUPPORT_CATALOG[candidate.assetKey]);
    if (!chunk) continue;
    seen.add(chunk.assetKey);
    const anchor = { x: chunk.startX + chunk.width * 0.5, y: 350 };
    const socket = mapWorldAnchorToArchitecturalSocket!(plan, anchor);
    assert.ok(socket, `${chunk.assetKey} must map to a visible authored support`);
    assert.equal(socket?.assetKey, chunk.assetKey);
    const support = NIGHT_CITY_SUPPORT_CATALOG[chunk.assetKey]!.find((item) => item.supportId === socket?.supportId);
    assert.ok(support);
    assert.ok(socket!.sourceX >= chunk.cropRect.x && socket!.sourceX <= chunk.cropRect.x + chunk.cropRect.width);
    assert.ok(socket!.sourceY >= chunk.cropRect.y && socket!.sourceY <= chunk.cropRect.y + chunk.cropRect.height);
    const expectedWorldX = chunk.startX - chunk.overlap
      + (chunk.mirrored ? chunk.cropRect.width - (socket!.sourceX - chunk.cropRect.x) : socket!.sourceX - chunk.cropRect.x) * chunk.sourceScale;
    const expectedWorldY = (socket!.sourceY - chunk.cropRect.y) * chunk.sourceScaleY;
    assert.ok(Math.abs(socket!.x - expectedWorldX) < 1e-9);
    assert.ok(Math.abs(socket!.y - expectedWorldY) < 1e-9);
    assert.ok(support!.x1 !== support!.x2 || support!.y1 !== support!.y2);
  }
  assert.deepEqual([...seen].sort(), [
    'night-city-market-rooftops-bridge-v3',
    'night-city-market-v1',
    'night-city-rooftops-v1',
    'night-city-rooftops-waterfront-bridge-v1',
    'night-city-waterfront-market-bridge-v1',
    'night-city-waterfront-v1',
  ].sort());
});

test('uses the two supplied opaque bridge plates for every authored district transition', () => {
  const transitions = [
    { index: 4, key: 'night-city-market-rooftops-bridge-v3', width: 2_080, height: 958 },
    { index: 9, key: 'night-city-rooftops-waterfront-bridge-v1', width: 1_672, height: 941 },
    { index: 14, key: 'night-city-waterfront-market-bridge-v1', width: 1_672, height: 941 },
  ] as const;
  for (const expected of transitions) {
    const plan = createNightCityRenderPlan(73, expected.index * 1_600, (expected.index + 1) * 1_600);
    const transition = plan.chunks.find((chunk) => chunk.index === expected.index);
    assert.equal(transition?.kind, 'transition');
    assert.equal(transition?.assetKey, expected.key);
    assert.equal(transition?.imageWidth, expected.width);
    assert.equal(transition?.imageHeight, expected.height);
    assert.notEqual(transition?.assetKey, 'night-city-district-transition-mist');
  }

  const rooftopWaterfront = readPngHeader(NIGHT_CITY_ASSET_PATHS.rooftopsWaterfrontBridgeV1);
  const waterfrontMarket = readPngHeader(NIGHT_CITY_ASSET_PATHS.waterfrontMarketBridgeV1);
  assert.deepEqual(rooftopWaterfront, { width: 1_672, height: 941, colorType: 2 });
  assert.deepEqual(waterfrontMarket, { width: 1_672, height: 941, colorType: 2 });
});

test('preloads and renders each supplied bridge plate on the default image stream', () => {
  const { scene, loaded, images } = makeScene();
  const renderer = createNightCityRenderer({ prefetchChunks: 0, maxRetainedChunks: 8 });
  const bridgeKeys = [
    'night-city-market-rooftops-bridge-v3',
    'night-city-rooftops-waterfront-bridge-v1',
    'night-city-waterfront-market-bridge-v1',
  ];
  for (const index of [4, 9, 14]) renderer.render(scene, 73, index * 1_600, (index + 1) * 1_600);
  for (const key of bridgeKeys) {
    assert.equal(loaded.has(key), true, `${key} must be preloaded`);
    assert.ok(images.some((image) => image.key === key), `${key} must reach scene.add.image`);
  }
});

test('socket lookup never clamps an off-map anchor into a distant visible support', () => {
  const plan = createNightCityRenderPlan(31, 0, 1600);
  assert.equal(rendererModule.mapWorldAnchorToArchitecturalSocket(plan, { x: -10_000, y: 250 }), null);
  assert.equal(rendererModule.mapWorldAnchorToArchitecturalSocket(plan, { x: 100_000, y: 250 }), null);
  assert.equal(rendererModule.mapWorldAnchorToArchitecturalSocket(plan, { x: 400, y: -10_000 }), null);
});
