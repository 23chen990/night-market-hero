import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { inflateSync } from 'node:zlib';
import {
  NIGHT_CITY_ASSET_PATHS,
  NIGHT_CITY_LAYER_CONFIG,
  computeScreenCoverage,
  createNightCityRenderPlan,
  createNightCityRenderer,
} from '../src/night-city-renderer.ts';

function decodePngAlpha(url: string): { width: number; height: number; alpha: Uint8Array } {
  const bytes = readFileSync(new URL(url));
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'transition asset must be a PNG');
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8, 'transition asset must use 8-bit channels');
      colorType = data[9]!;
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  assert.equal(colorType, 6, 'transition asset must carry a real RGBA alpha channel');
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const alpha = new Uint8Array(width * height);
  const previous = new Uint8Array(stride);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceOffset++]!;
    const row = new Uint8Array(raw.subarray(sourceOffset, sourceOffset + stride));
    sourceOffset += stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? row[x - 4]! : 0;
      const up = previous[x]!;
      const upLeft = x >= 4 ? previous[x - 4]! : 0;
      if (filter === 1) row[x] = (row[x]! + left) & 0xff;
      else if (filter === 2) row[x] = (row[x]! + up) & 0xff;
      else if (filter === 3) row[x] = (row[x]! + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const pa = Math.abs(estimate - left);
        const pb = Math.abs(estimate - up);
        const pc = Math.abs(estimate - upLeft);
        row[x] = (row[x]! + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 0xff;
      } else assert.equal(filter, 0, `unsupported PNG filter ${filter}`);
    }
    for (let x = 0; x < width; x += 1) alpha[y * width + x] = row[x * 4 + 3]!;
    previous.set(row);
  }
  return { width, height, alpha };
}

describe('night-city image renderer', () => {
  test('plans distinct image-backed market, rooftop, and waterfront chunks', () => {
    const plan = createNightCityRenderPlan(73, 0, 9_600);
    assert.ok(plan.chunks.length > 0);
    assert.deepEqual(Object.keys(NIGHT_CITY_ASSET_PATHS).sort(), ['districtTransitionMist', 'foregroundEaves', 'gateCounterFrame', 'market', 'marketRooftopsBridgeV3', 'marketV2', 'rooftops', 'rooftopsTransitionV36', 'rooftopsV2', 'rooftopsWaterfrontBridgeV1', 'settingsGear', 'waterfront', 'waterfrontMarketBridgeV1', 'waterfrontV2']);
    assert.deepEqual(new Set(plan.chunks.map((chunk) => chunk.district)), new Set(['market', 'rooftops']));
    const waterfrontPlan = createNightCityRenderPlan(73, 10 * 1_600, 15 * 1_600);
    assert.ok(waterfrontPlan.chunks.some((chunk) => chunk.district === 'waterfront'));
    assert.ok(plan.chunks.every((chunk) => chunk.assetKey.startsWith('night-city-')));
    assert.ok(plan.chunks.every((chunk) => chunk.width > 0 && chunk.height > 0));
    for (let index = 1; index < plan.chunks.length; index += 1) {
      const previous = `${plan.chunks[index - 1]!.assetKey}:${plan.chunks[index - 1]!.mirrored}:${plan.chunks[index - 1]!.layoutId}`;
      const next = `${plan.chunks[index]!.assetKey}:${plan.chunks[index]!.mirrored}:${plan.chunks[index]!.layoutId}`;
      assert.notEqual(next, previous, 'adjacent chunks must not duplicate a recognizable panorama composition');
    }
    for (let index = 0; index + 1 < plan.chunks.length; index += 1) {
      const first = plan.chunks[index]!;
      const next = plan.chunks[index + 1]!;
      if (first.district !== next.district || first.kind !== 'district' || next.kind !== 'district') continue;
      assert.equal(first.assetKey, next.assetKey, 'ordinary images must share exact source edge pixels');
      assert.notEqual(first.mirrored, next.mirrored, 'alternating reflection must match those edges');
      assert.equal(first.drawHeight, next.drawHeight, 'no sudden roof-height discontinuity');
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
    assert.ok(loaded.includes('night-city-market-rooftops-bridge-v3'));
    assert.ok(loaded.includes('night-city-rooftops-v1'));
    assert.ok(loaded.includes('night-city-rooftops-v2'));
    assert.ok(loaded.includes('night-city-waterfront-v1'));
    assert.ok(loaded.includes('night-city-waterfront-v2'));
    assert.ok(loaded.includes('night-city-district-transition-mist'));
    assert.ok(loaded.includes('night-city-rooftops-transition-v36'));
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

  test('uses baked panorama architecture without a repeated foreground eaves stream', () => {
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
    assert.equal(eaves, undefined, 'default image stream must not duplicate baked panorama eaves');
    const panorama = rendered.find((item) => item.key.startsWith('night-city-rooftops'));
    assert.equal(panorama?.scrollFactor, 1, 'opaque panorama must stay world-aligned to preserve screen coverage');
    assert.equal(panorama?.verticalScrollFactor, 0, 'jump camera movement must not uncover the panorama vertically');
    assert.equal(panorama?.alpha, 1, 'opaque panorama must fully replace the retired CSS scene background');
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
    const sameDistrictJoinCount = plan.chunks.slice(1).filter((chunk, index) => chunk.district === plan.chunks[index]!.district).length;
    assert.ok(sameDistrictJoinCount > 0, 'fixture must include an ordinary same-district join');
    const veils = rendered.filter((item) => item.key === 'night-city-district-transition-mist');
    assert.ok(veils.every((item) => item.alpha <= 0.1), 'district transition mist must remain subtle');
    assert.ok(veils.length < sameDistrictJoinCount, 'ordinary mirrored joins must not be concealed by repeat fog');
  });

  test('keeps ordinary Rooftops variant seams from installing an opaque full-height carrier', () => {
    const loaded = new Set<string>();
    const rendered: Array<{ key: string; width: number; height: number; alpha: number }> = [];
    const scene = {
      load: { image: (key: string) => loaded.add(key) },
      textures: { exists: (key: string) => loaded.has(key) },
      add: { image: (_x: number, _y: number, key: string) => {
        let alpha = 1;
        const image = {
          setOrigin() { return image; },
          setPosition() { return image; },
          setDisplaySize(width: number, height: number) { rendered.push({ key, width, height, alpha }); return image; },
          setDepth() { return image; },
          setVisible() { return image; },
          setAlpha(value: number) { alpha = value; return image; },
          setScrollFactor() { return image; },
          destroy() { return undefined; },
        };
        return image;
      } },
    };
    const renderer = createNightCityRenderer({ prefetchChunks: 0, maxRetainedChunks: 8 });
    const plan = createNightCityRenderPlan(73, 5 * 1_600, 9 * 1_600);
    const rooftopSeams = plan.chunks.slice(1).filter((chunk, index) => (
      chunk.district === 'rooftops' && plan.chunks[index]!.district === 'rooftops'
    ));
    assert.ok(rooftopSeams.length > 0, 'fixture must include a Rooftops variant seam');
    renderer.render(scene, 73, 5 * 1_600, 9 * 1_600);
    const carriers = rendered.filter((item) => item.key === 'night-city-rooftops-transition-v36');
    assert.equal(carriers.length, 0, 'ordinary Rooftops variant seams must not place an opaque full-height carrier over continuous architecture');
    const veils = rendered.filter((item) => item.key === 'night-city-district-transition-mist');
    assert.equal(veils.length, 0, 'rooftop ordinary joins need exact matching pixels, not fog');
    assert.ok(!rendered.some((item) => item.key.includes('bridge-architecture') || item.key.includes('seam-fog')),
      'runtime must not load the bridge or fog layer candidates');
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

  test('uses a real alpha-feathered market-to-rooftops transition plate', () => {
    const png = decodePngAlpha(NIGHT_CITY_ASSET_PATHS.marketRooftopsBridgeV3);
    assert.equal(png.width, 2_080);
    assert.equal(png.height, 958);
    const leftEdge = png.alpha[0]!;
    const leftFeather = png.alpha[128]!;
    const center = png.alpha[Math.floor(png.height / 2) * png.width + Math.floor(png.width / 2)]!;
    const rightFeather = png.alpha[Math.floor(png.height / 2) * png.width + png.width - 129]!;
    const rightEdge = png.alpha[Math.floor(png.height / 2) * png.width + png.width - 1]!;
    assert.equal(leftEdge, 0, 'left edge must reveal the neighboring panorama');
    assert.ok(leftFeather > 0 && leftFeather < 255, 'left edge must fade continuously into the bridge');
    assert.equal(center, 255, 'bridge body must remain opaque');
    assert.ok(rightFeather > 0 && rightFeather < 255, 'right edge must fade continuously into the neighboring panorama');
    assert.equal(rightEdge, 0, 'right edge must reveal the neighboring panorama');
  });

  test('preserves transition metadata while using the alpha-feathered market-to-rooftops bridge', () => {
    const plan = createNightCityRenderPlan(73, 4 * 1_600, 6 * 1_600);
    const transition = plan.chunks.find((chunk) => chunk.kind === 'transition');

    assert.ok(transition, 'a viewport crossing the first boundary must expose the transition chunk');
    assert.deepEqual(transition?.transition, { fromDistrict: 'market', toDistrict: 'rooftops' });
    assert.equal(transition?.fromDistrict, 'market');
    assert.equal(transition?.toDistrict, 'rooftops');
    assert.equal(transition?.district, 'rooftops');
    assert.equal(transition?.assetKey, 'night-city-market-rooftops-bridge-v3',
      'market-to-rooftops transition rendering should use the alpha-feathered bridge');
  });

  test('uses the alpha-feathered bridge as the deterministic sole transition panorama owner', () => {
    const left = 3 * 1_600;
    const right = 6 * 1_600;
    const plan = createNightCityRenderPlan(73, left, right);
    const repeat = createNightCityRenderPlan(73, left, right);
    const transition = plan.chunks.find((chunk) => chunk.kind === 'transition'
      && chunk.fromDistrict === 'market' && chunk.toDistrict === 'rooftops');

    assert.ok(transition, 'the market-to-rooftops transition must be present');
    assert.equal(transition?.assetKey, 'night-city-market-rooftops-bridge-v3');
    assert.equal(transition?.imageWidth, 2_080);
    assert.equal(transition?.imageHeight, 958);
    assert.equal(transition?.overlap, 204);
    assert.deepEqual(plan.chunks, repeat.chunks, 'transition asset selection must remain deterministic');

    const loaded: string[] = [];
    const rendered: Array<{ key: string; x: number }> = [];
    const scene = {
      load: { image: (key: string) => loaded.push(key) },
      textures: { exists: (key: string) => loaded.includes(key) },
      add: { image: (_x: number, _y: number, key: string) => {
        let positionX = 0;
        const image = {
          setOrigin() { return image; },
          setPosition(x: number) { positionX = x; return image; },
        setDisplaySize() { rendered.push({ key, x: positionX }); return image; },
        setDepth() { return image; },
          setVisible() { return image; },
          setAlpha() { return image; },
          setScrollFactor() { return image; },
          destroy() { return undefined; },
        };
        return image;
      } },
    };
    createNightCityRenderer({ prefetchChunks: 0, maxRetainedChunks: 8 }).render(scene, 73, left, right);
    assert.ok(loaded.includes('night-city-market-rooftops-bridge-v3'), 'alpha-feathered bridge must preload before rendering');
    const boundaryOwners = rendered.filter((item) => item.x >= (transition?.startX ?? 0) - 400
      && item.x < (transition?.startX ?? 0) + 400
      && (item.key.includes('market-panorama') || item.key.includes('rooftops-panorama')
        || item.key.includes('market-rooftops-bridge') || item.key.includes('district-transition')));
    assert.deepEqual(new Set(boundaryOwners.map((item) => item.key)), new Set(['night-city-market-rooftops-bridge-v3']),
      'the alpha-feathered bridge must remain the sole static panorama or veil owner');
  });

  test('renders the alpha-feathered bridge above neighboring opaque panoramas', () => {
    const loaded = new Set<string>();
    const rendered: Array<{ key: string; x: number; depth: number }> = [];
    const scene = {
      load: { image: (key: string) => loaded.add(key) },
      textures: { exists: (key: string) => loaded.has(key) },
      add: { image: (_x: number, _y: number, key: string) => {
        let positionX = 0;
        let depth = 0;
        const image = {
          setOrigin() { return image; },
          setPosition(x: number) { positionX = x; return image; },
          setDisplaySize() { return image; },
          setDepth(value: number) { depth = value; return image; },
          setVisible(value: boolean) { if (value) rendered.push({ key, x: positionX, depth }); return image; },
          setAlpha() { return image; },
          setScrollFactor() { return image; },
          destroy() { return undefined; },
        };
        return image;
      } },
    };
    const left = 3 * 1_600;
    const right = 6 * 1_600;
    createNightCityRenderer({ prefetchChunks: 0, maxRetainedChunks: 8 }).render(scene, 73, left, right);
    const bridge = rendered.find((item) => item.key === 'night-city-market-rooftops-bridge-v3');
    const panoramas = rendered.filter((item) => item.key === 'night-city-market-v1'
      || item.key === 'night-city-market-v2' || item.key === 'night-city-rooftops-v1'
      || item.key === 'night-city-rooftops-v2');
    assert.ok(bridge, 'alpha-feathered bridge must be rendered');
    assert.ok(panoramas.length > 0, 'neighboring opaque panoramas must remain rendered');
    assert.equal(bridge?.depth, -19, 'bridge plate must render above opaque panoramas');
    assert.ok(panoramas.every((item) => item.depth === -20), 'opaque panoramas retain depth -20');
  });
});
