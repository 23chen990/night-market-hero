import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  NIGHT_CITY_ASSET_PATHS,
  NIGHT_CITY_LAYER_CONFIG,
  computeScreenCoverage,
  createNightCityRenderPlan,
  createNightCityRenderer,
} from '../src/night-city-renderer.ts';

describe('night-city image renderer', () => {
  test('plans distinct image-backed market, rooftop, and waterfront chunks', () => {
    const plan = createNightCityRenderPlan(73, 0, 9_600);
    assert.ok(plan.chunks.length > 0);
    assert.deepEqual(Object.keys(NIGHT_CITY_ASSET_PATHS).sort(), ['districtTransitionMist', 'foregroundEaves', 'gateCounterFrame', 'market', 'marketV2', 'rooftops', 'rooftopsV2', 'settingsGear', 'waterfront', 'waterfrontV2']);
    assert.deepEqual(new Set(plan.chunks.map((chunk) => chunk.district)), new Set(['market', 'rooftops']));
    const waterfrontPlan = createNightCityRenderPlan(73, 10 * 1_600, 15 * 1_600);
    assert.ok(waterfrontPlan.chunks.some((chunk) => chunk.district === 'waterfront'));
    assert.ok(plan.chunks.every((chunk) => chunk.assetKey.startsWith('night-city-')));
    assert.ok(plan.chunks.every((chunk) => chunk.width > 0 && chunk.height > 0));
    for (let index = 1; index < plan.chunks.length; index += 1) {
      const previous = `${plan.chunks[index - 1]!.assetKey}:${plan.chunks[index - 1]!.cropX}:${plan.chunks[index - 1]!.layoutId}`;
      const next = `${plan.chunks[index]!.assetKey}:${plan.chunks[index]!.cropX}:${plan.chunks[index]!.layoutId}`;
      assert.notEqual(next, previous, 'adjacent chunks must not duplicate a recognizable panorama composition');
    }
    for (let index = 0; index + 1 < plan.chunks.length; index += 2) {
      if (plan.chunks[index]!.district !== plan.chunks[index + 1]!.district) continue;
      assert.notEqual(plan.chunks[index]!.assetKey, plan.chunks[index + 1]!.assetKey, 'each two-chunk district visit must use both approved compositions');
    }
  });

  test('preloads before first visibility and releases pooled images outside the bounded view', () => {
    const loaded: string[] = [];
    const images: Array<{ key: string; visible: boolean; setOrigin: () => any; setPosition: () => any; setDisplaySize: () => any; setDepth: () => any; setVisible: (value: boolean) => any; setAlpha: () => any; destroy: () => void }> = [];
    const scene = {
      load: { image: (key: string) => loaded.push(key) },
      textures: { exists: (key: string) => loaded.includes(key) },
      add: { image: (_x: number, _y: number, key: string) => {
        const image = {
          key,
          visible: false,
          setOrigin() { return image; },
          setPosition() { return image; },
          setDisplaySize() { return image; },
          setDepth() { return image; },
          setVisible(value: boolean) { image.visible = value; return image; },
          setAlpha() { return image; },
          destroy() { image.visible = false; },
        };
        images.push(image);
        return image;
      } },
    };
    const renderer = createNightCityRenderer({ prefetchChunks: 1, maxRetainedChunks: 5 });
    renderer.preload(scene);
    assert.ok(loaded.includes('night-city-market-v1'));
    assert.ok(loaded.includes('night-city-market-v2'));
    assert.ok(loaded.includes('night-city-rooftops-v1'));
    assert.ok(loaded.includes('night-city-rooftops-v2'));
    assert.ok(loaded.includes('night-city-waterfront-v1'));
    assert.ok(loaded.includes('night-city-waterfront-v2'));
    assert.ok(loaded.includes('night-city-district-transition-mist'));
    assert.equal(images.length, 0, 'preload must not make an image visible');

    renderer.render(scene, 73, 0, 2_000);
    assert.ok(images.length > 0);
    assert.ok(images.every((image) => image.visible));
    const firstCount = images.length;
    renderer.render(scene, 73, 100_000, 102_000);
    assert.ok(images.length <= 15, `pool grew beyond the five-chunk three-layer image bound (${images.length})`);
    assert.ok(renderer.getStats().retainedCount <= 5);
    assert.ok(images.length <= firstCount + 10);
  });

  test('keeps full-stage eaves coverage, uses depth parallax, and reports the focused district', () => {
    const loaded = new Set<string>();
    const rendered: Array<{ key: string; x: number; y: number; width: number; height: number; scrollFactor?: number; verticalScrollFactor?: number; alpha?: number }> = [];
    const scene = {
      load: { image: (key: string) => loaded.add(key) },
      textures: { exists: (key: string) => loaded.has(key) },
      add: { image: (_x: number, _y: number, key: string) => {
        const image = {
          setOrigin() { return image; },
          setPosition(x: number, y: number) { const last = rendered.find((item) => item.key === key && item.width === 0); if (last) { last.x = x; last.y = y; } return image; },
          setDisplaySize(width: number, height: number) { rendered.push({ key, x: 0, y: 0, width, height }); return image; },
          setDepth() { return image; },
          setVisible() { return image; },
          setAlpha(alpha: number) { const item = rendered[rendered.length - 1]; if (item) item.alpha = alpha; return image; },
          setScrollFactor(factor: number, verticalFactor?: number) { const item = rendered.find((entry) => entry.key === key); if (item) { item.scrollFactor = factor; item.verticalScrollFactor = verticalFactor; } return image; },
          destroy() { return undefined; },
        };
        return image;
      } },
    };
    const renderer = createNightCityRenderer({ prefetchChunks: 1, maxRetainedChunks: 8 });
    renderer.preload(scene);
    const stats = renderer.render(scene, 1, 5 * 1_600, 6 * 1_600);
    const eaves = rendered.find((item) => item.key === 'night-city-foreground-eaves');
    assert.ok(eaves, 'foreground eaves must be image-backed');
    assert.ok(eaves.height >= 941, 'the full-height eaves artwork must cover the 941px logical stage');
    assert.ok(Math.abs(eaves.width / eaves.height - 1_672 / 941) < 0.02, 'eaves must preserve the approved aspect ratio');
    const panorama = rendered.find((item) => item.key.startsWith('night-city-rooftops'));
    assert.equal(panorama?.scrollFactor, 1, 'opaque panorama must stay world-aligned to preserve screen coverage');
    assert.equal(panorama?.verticalScrollFactor, 0, 'jump camera movement must not uncover the panorama vertically');
    assert.equal(panorama?.alpha, 1, 'opaque panorama must fully replace the retired CSS scene background');
    const eavesScroll = rendered.find((item) => item.key === 'night-city-foreground-eaves');
    assert.ok(eavesScroll?.scrollFactor !== undefined && eavesScroll.scrollFactor > 1, 'foreground stream provides the depth/parallax motion');
    assert.equal(eavesScroll?.verticalScrollFactor, 0, 'jump camera movement must not uncover the foreground stream vertically');
    assert.equal(stats.district, 'rooftops', 'district telemetry must use the focused world chunk, not the prefetch edge');
  });

  test('keeps neighboring panorama coverage overlapped and the long-run pool bounded', () => {
    const loaded = new Set<string>();
    const images: Array<{ key: string; visible: boolean; setOrigin: () => any; setPosition: () => any; setDisplaySize: () => any; setDepth: () => any; setVisible: (value: boolean) => any; setAlpha: () => any; destroy: () => void }> = [];
    const scene = {
      load: { image: (key: string) => loaded.add(key) },
      textures: { exists: (key: string) => loaded.has(key) },
      add: { image: (_x: number, _y: number, key: string) => {
        const image = { key, visible: false,
          setOrigin() { return image; }, setPosition() { return image; }, setDisplaySize() { return image; }, setDepth() { return image; }, setVisible(value: boolean) { image.visible = value; return image; }, setAlpha() { return image; }, destroy() { image.visible = false; },
        };
        images.push(image);
        return image;
      } },
    };
    const renderer = createNightCityRenderer({ prefetchChunks: 0, maxRetainedChunks: 4 });
    renderer.preload(scene);
    const plan = createNightCityRenderPlan(17, 0, 6_400);
    renderer.render(scene, 17, 0, 6_400);
    const panoramas = images.filter((image) => image.key !== 'night-city-foreground-eaves'
      && image.key !== 'night-city-district-transition-mist');
    assert.ok(plan.chunks.length >= 3);
    assert.ok(panoramas.length <= 4, 'streamer must cap active panorama images');
    for (let index = 0; index < 30; index += 1) renderer.render(scene, 17, index * 1_600, index * 1_600 + 6_400);
    assert.ok(renderer.getStats().retainedCount <= 4, 'free and visible pools must stay bounded after a long run');
  });

  test('veils every panorama boundary, including same-district variant joins', () => {
    const loaded = new Set<string>();
    const rendered: Array<{ key: string; alpha: number }> = [];
    const scene = {
      load: { image: (key: string) => loaded.add(key) },
      textures: { exists: (key: string) => loaded.has(key) },
      add: { image: (_x: number, _y: number, key: string) => {
        let alpha = 1;
        const image = {
          setOrigin() { return image; }, setPosition() { return image; }, setDisplaySize() { return image; }, setDepth() { return image; },
          setVisible() { rendered.push({ key, alpha }); return image; }, setAlpha(value: number) { alpha = value; return image; }, setScrollFactor() { return image; }, destroy() { return undefined; },
        };
        return image;
      } },
    };
    const renderer = createNightCityRenderer({ prefetchChunks: 0, maxRetainedChunks: 8 });
    renderer.render(scene, 73, 0, 6_400);
    const plan = createNightCityRenderPlan(73, 0, 6_400);
    const boundaryCount = Math.max(0, plan.chunks.length - 1);
    const sameDistrictJoinCount = plan.chunks.slice(1).filter((chunk, index) => chunk.district === plan.chunks[index]!.district).length;
    assert.ok(sameDistrictJoinCount > 0, 'fixture must include a same-district variant join');
    const veils = rendered.filter((item) => item.key === 'night-city-district-transition-mist');
    assert.ok(veils.length >= boundaryCount,
      'every panorama join, including same-district variants, needs a raster veil');
    assert.ok(veils.every((item) => item.alpha <= 0.1), 'transition mist must stay subtle enough to avoid a repeated vertical pillar');
  });

  test('keeps both screen-space streams covered at far camera positions', () => {
    assert.equal(NIGHT_CITY_LAYER_CONFIG.panoramaScrollFactor, 1);
    assert.ok(NIGHT_CITY_LAYER_CONFIG.foregroundScrollFactor > 1);
    for (const cameraX of [0, 10_000, 100_000]) {
      const viewportWidth = 1_672;
      const panoramaPlan = createNightCityRenderPlan(31,
        cameraX - 1_600, cameraX + viewportWidth + 1_600);
      const panoramaCoverage = computeScreenCoverage(panoramaPlan.chunks, cameraX,
        NIGHT_CITY_LAYER_CONFIG.panoramaScrollFactor, viewportWidth);
      assert.ok(panoramaCoverage.left <= 0, `panorama starts after the viewport at ${cameraX}`);
      assert.ok(panoramaCoverage.right >= viewportWidth, `panorama ends before the viewport at ${cameraX}`);

      const foregroundCameraX = cameraX * NIGHT_CITY_LAYER_CONFIG.foregroundScrollFactor;
      const foregroundPlan = createNightCityRenderPlan(31,
        foregroundCameraX - 1_600, foregroundCameraX + viewportWidth + 1_600);
      const foregroundCoverage = computeScreenCoverage(foregroundPlan.chunks, foregroundCameraX,
        1, viewportWidth);
      assert.ok(foregroundCoverage.left <= 0 && foregroundCoverage.right >= viewportWidth);
      assert.equal(panoramaPlan.chunks[0]!.height / panoramaPlan.chunks[0]!.width, 941 / 1_672);
    }
  });

  test('preserves transition metadata while using the destination panorama fallback', () => {
    const plan = createNightCityRenderPlan(73, 4 * 1_600, 6 * 1_600);
    const transition = plan.chunks.find((chunk) => chunk.kind === 'transition');

    assert.ok(transition, 'a viewport crossing the first boundary must expose the transition chunk');
    assert.deepEqual(transition?.transition, { fromDistrict: 'market', toDistrict: 'rooftops' });
    assert.equal(transition?.fromDistrict, 'market');
    assert.equal(transition?.toDistrict, 'rooftops');
    assert.equal(transition?.district, 'rooftops');
    assert.match(transition?.assetKey ?? '', /^night-city-rooftops-/,
      'fallback rendering should use the transition destination panorama');
  });
});
