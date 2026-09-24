import {
  CITY_CHUNK_WIDTH,
  cityChunksInView,
  type CityChunk,
  type DistrictId,
} from './district-world.ts';

/** Paths are intentionally source-relative so Vite can inline the supplied
 * raster assets into the web-lite release.  No scenery is drawn with CSS or
 * Phaser Graphics. */
export const NIGHT_CITY_ASSET_PATHS = Object.freeze({
  market: new URL('./assets/night-city/market-panorama-v1.png', import.meta.url).href,
  marketV2: new URL('./assets/night-city/market-panorama-v2.png', import.meta.url).href,
  rooftops: new URL('./assets/night-city/rooftops-panorama-v1.png', import.meta.url).href,
  rooftopsV2: new URL('./assets/night-city/rooftops-panorama-v2.png', import.meta.url).href,
  rooftopsTransitionV36: new URL('./assets/night-city/rooftops-transition-v36-fullheight.png', import.meta.url).href,
  waterfront: new URL('./assets/night-city/waterfront-panorama-v1.png', import.meta.url).href,
  waterfrontV2: new URL('./assets/night-city/waterfront-panorama-v2.png', import.meta.url).href,
  districtTransitionMist: new URL('./assets/night-city/district-transition-mist-v1.png', import.meta.url).href,
  foregroundEaves: new URL('./assets/night-city/foreground-eaves-v1.png', import.meta.url).href,
  settingsGear: new URL('./assets/night-city/settings-gear-v1.png', import.meta.url).href,
  gateCounterFrame: new URL('./assets/night-city/gate-counter-frame-v1.png', import.meta.url).href,
});

const PANORAMA_ASPECT = 1_672 / 941;
const PANORAMA_CANVAS_WIDTH = 1_672;
const PANORAMA_CANVAS_HEIGHT = 941;

/** Screen-space movement for the two image streams.  Opaque district plates
 * stay world-aligned; only the transparent foreground has a mild parallax. */
export const NIGHT_CITY_LAYER_CONFIG = Object.freeze({
  panoramaScrollFactor: 1,
  foregroundScrollFactor: 1.08,
});

export type NightCityAssetKey =
  | 'night-city-market-v1' | 'night-city-market-v2'
  | 'night-city-rooftops-v1' | 'night-city-rooftops-v2'
  | 'night-city-rooftops-transition-v36'
  | 'night-city-waterfront-v1' | 'night-city-waterfront-v2'
  | 'night-city-district-transition-mist'
  | 'night-city-foreground-eaves';

export interface NightCityChunkRender {
  index: number;
  startX: number;
  endX: number;
  district: DistrictId;
  kind: CityChunk['kind'];
  fromDistrict: CityChunk['fromDistrict'];
  toDistrict: CityChunk['toDistrict'];
  transition: CityChunk['transition'];
  chunkId: string;
  chainIndex: number;
  sceneFamily: string;
  name: string;
  variant: CityChunk['variant'];
  layoutId: string;
  assetKey: NightCityAssetKey;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
  /** Small deterministic crop offsets keep repeated district art from reading
   * as a hard copy while preserving the approved camera/palette/background. */
  cropX: number;
  cropY: number;
  renderScale: number;
  overlap: number;
}

export interface NightCityRenderPlan {
  chunks: NightCityChunkRender[];
  left: number;
  right: number;
}

export interface ScreenCoverage {
  left: number;
  right: number;
  width: number;
}

export interface RenderImage {
  setOrigin(x: number, y: number): RenderImage;
  setPosition(x: number, y: number): RenderImage;
  setDisplaySize(width: number, height: number): RenderImage;
  setDepth(depth: number): RenderImage;
  setVisible(visible: boolean): RenderImage;
  setAlpha(alpha: number): RenderImage;
  setScrollFactor?(factorX: number, factorY?: number): RenderImage;
  setCrop?(x: number, y: number, width: number, height: number): RenderImage;
  destroy(): void;
}

export interface NightCitySceneLike {
  load: { image(key: string, url: string): void };
  add: { image(x: number, y: number, key: string): RenderImage };
  textures?: { exists(key: string): boolean };
}

export interface NightCityRendererOptions {
  prefetchChunks?: number;
  maxRetainedChunks?: number;
  chunkHeight?: number;
}

export interface NightCityRendererStats {
  renderer: 'image-stream';
  district: DistrictId | null;
  chunkCount: number;
  retainedCount: number;
  visibleCount: number;
  preloaded: boolean;
}

const PANORAMA_KEYS: Record<DistrictId, readonly [NightCityAssetKey, NightCityAssetKey]> = {
  market: ['night-city-market-v1', 'night-city-market-v2'],
  rooftops: ['night-city-rooftops-v1', 'night-city-rooftops-v2'],
  waterfront: ['night-city-waterfront-v1', 'night-city-waterfront-v2'],
};

const PANORAMA_PATHS: Record<NightCityAssetKey, string> = {
  'night-city-market-v1': NIGHT_CITY_ASSET_PATHS.market,
  'night-city-market-v2': NIGHT_CITY_ASSET_PATHS.marketV2,
  'night-city-rooftops-v1': NIGHT_CITY_ASSET_PATHS.rooftops,
  'night-city-rooftops-v2': NIGHT_CITY_ASSET_PATHS.rooftopsV2,
  'night-city-rooftops-transition-v36': NIGHT_CITY_ASSET_PATHS.rooftopsTransitionV36,
  'night-city-waterfront-v1': NIGHT_CITY_ASSET_PATHS.waterfront,
  'night-city-waterfront-v2': NIGHT_CITY_ASSET_PATHS.waterfrontV2,
  'night-city-district-transition-mist': NIGHT_CITY_ASSET_PATHS.districtTransitionMist,
  'night-city-foreground-eaves': NIGHT_CITY_ASSET_PATHS.foregroundEaves,
};

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function cropFor(chunk: CityChunk): { cropX: number; cropY: number } {
  // Keep all chunks aligned to the same 16:9 canvas while selecting a stable
  // crop from each approved panorama variant.  The image itself never swaps
  // during playback; this is only a deterministic layout offset.
  return {
    cropX: (chunk.variant * 0.045) % 0.14,
    cropY: ((chunk.variant + chunk.index) % 3) * 0.012,
  };
}

export function createNightCityRenderPlan(seed: number, left: number, right: number, chunkHeight = CITY_CHUNK_WIDTH / PANORAMA_ASPECT): NightCityRenderPlan {
  const safeLeft = Math.min(finite(left, 0), finite(right, 0));
  const safeRight = Math.max(finite(left, 0), finite(right, safeLeft + CITY_CHUNK_WIDTH));
  const chunks = cityChunksInView(seed, safeLeft, safeRight).map((chunk) => {
    const crop = cropFor(chunk);
    const renderScale = 1.01 + (chunk.variant % 3) * 0.004;
    return {
      index: chunk.index,
      startX: chunk.startX,
      endX: chunk.endX,
      district: chunk.district,
      kind: chunk.kind,
      fromDistrict: chunk.fromDistrict,
      toDistrict: chunk.toDistrict,
      transition: chunk.transition,
      chunkId: chunk.chunkId,
      chainIndex: chunk.chainIndex,
      sceneFamily: chunk.sceneFamily,
      name: chunk.name,
      variant: chunk.variant,
      layoutId: chunk.layoutId,
      assetKey: PANORAMA_KEYS[chunk.district][chunk.index % 2],
      width: CITY_CHUNK_WIDTH,
      height: chunkHeight,
      imageWidth: PANORAMA_CANVAS_WIDTH,
      imageHeight: PANORAMA_CANVAS_HEIGHT,
      cropX: crop.cropX,
      cropY: crop.cropY,
      renderScale,
      overlap: Math.ceil(CITY_CHUNK_WIDTH * (renderScale - 1) * 0.75) + 2,
    } satisfies NightCityChunkRender;
  });
  return { chunks, left: safeLeft, right: safeRight };
}

/** Compute the actual screen-space span covered by a streamed image plan. */
export function computeScreenCoverage(
  chunks: readonly NightCityChunkRender[],
  cameraX: number,
  scrollFactor: number,
  viewportWidth: number,
): ScreenCoverage {
  const offset = finite(cameraX, 0) * scrollFactor;
  const spans = chunks.map((chunk) => ({
    left: chunk.startX - chunk.overlap - offset,
    right: chunk.startX + chunk.imageWidth * chunk.renderScale - offset,
  }));
  if (spans.length === 0) return { left: 0, right: 0, width: 0 };
  const left = Math.min(...spans.map((span) => span.left));
  const right = Math.max(...spans.map((span) => span.right));
  const requestedWidth = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 0;
  return { left, right, width: Math.max(requestedWidth, right - left) };
}

interface RetainedItem {
  id: string;
  key: NightCityAssetKey;
  image: RenderImage;
}

/** Image-backed, bounded scene streaming for the default FlightScene. */
export class NightCityRenderer {
  private readonly prefetchChunks: number;
  private readonly maxRetainedChunks: number;
  private readonly chunkHeight: number;
  private readonly retained = new Map<string, RetainedItem>();
  private readonly freeByKey = new Map<NightCityAssetKey, RenderImage[]>();
  private preloaded = false;
  private lastStats: NightCityRendererStats = {
    renderer: 'image-stream', district: null, chunkCount: 0, retainedCount: 0, visibleCount: 0, preloaded: false,
  };

  constructor(options: NightCityRendererOptions = {}) {
    this.prefetchChunks = Math.max(0, Math.floor(options.prefetchChunks ?? 1));
    this.maxRetainedChunks = Math.max(1, Math.floor(options.maxRetainedChunks ?? 8));
    this.chunkHeight = Math.max(1, options.chunkHeight ?? CITY_CHUNK_WIDTH / PANORAMA_ASPECT);
  }

  preload(scene: NightCitySceneLike): void {
    if (this.preloaded) return;
    for (const [key, path] of Object.entries(PANORAMA_PATHS)) scene.load.image(key, path);
    this.preloaded = true;
    this.lastStats = { ...this.lastStats, preloaded: true };
  }

  private textureReady(scene: NightCitySceneLike, key: NightCityAssetKey): boolean {
    return !scene.textures || scene.textures.exists(key);
  }

  private acquire(scene: NightCitySceneLike, key: NightCityAssetKey): RenderImage | null {
    if (!this.textureReady(scene, key)) return null;
    const free = this.freeByKey.get(key);
    const reused = free?.pop();
    if (reused) return reused;
    return scene.add.image(0, 0, key);
  }

  private release(item: RetainedItem): void {
    item.image.setVisible(false);
    const bucket = this.freeByKey.get(item.key) ?? [];
    bucket.push(item.image);
    this.freeByKey.set(item.key, bucket);
  }

  private evictOverflow(): void {
    // Retained images are bounded by visible chunks plus prefetch margin.  A
    // stale item is released first; if a caller requests an enormous range,
    // free images are destroyed until the explicit cap is respected.
    const imageLimit = this.maxRetainedChunks * 3;
    let total = this.retained.size + [...this.freeByKey.values()].reduce((sum, bucket) => sum + bucket.length, 0);
    if (total <= imageLimit) return;
    for (const [key, bucket] of this.freeByKey) {
      while (total > imageLimit && bucket.length > 0) {
        bucket.pop()!.destroy();
        total -= 1;
      }
      if (bucket.length === 0) this.freeByKey.delete(key);
      if (total <= imageLimit) break;
    }
  }

  render(scene: NightCitySceneLike, seed: number, left: number, right: number): NightCityRendererStats {
    if (!this.preloaded) this.preload(scene);
    const margin = this.prefetchChunks * CITY_CHUNK_WIDTH;
    const fullPlan = createNightCityRenderPlan(seed, left - margin, right + margin, this.chunkHeight);
    const foregroundLeft = left * NIGHT_CITY_LAYER_CONFIG.foregroundScrollFactor;
    const foregroundRight = right * NIGHT_CITY_LAYER_CONFIG.foregroundScrollFactor;
    const foregroundPlan = createNightCityRenderPlan(seed, foregroundLeft - margin, foregroundRight + margin, this.chunkHeight);
    // Keep at most the configured number of chunks active.  The scheduler is
    // already capped, so this only trims pathological camera ranges while
    // retaining the chunks around the current focus.
    const planChunks = fullPlan.chunks.length <= this.maxRetainedChunks
      ? fullPlan.chunks
      : fullPlan.chunks.slice(
        Math.max(0, Math.floor((fullPlan.chunks.length - this.maxRetainedChunks) / 2)),
        Math.max(0, Math.floor((fullPlan.chunks.length - this.maxRetainedChunks) / 2)) + this.maxRetainedChunks,
      );
    const plan: NightCityRenderPlan = { ...fullPlan, chunks: planChunks };
    const foregroundChunks = foregroundPlan.chunks.length <= this.maxRetainedChunks
      ? foregroundPlan.chunks
      : foregroundPlan.chunks.slice(
        Math.max(0, Math.floor((foregroundPlan.chunks.length - this.maxRetainedChunks) / 2)),
        Math.max(0, Math.floor((foregroundPlan.chunks.length - this.maxRetainedChunks) / 2)) + this.maxRetainedChunks,
      );
    const desired = new Map<string, { key: NightCityAssetKey; x: number; y: number; width: number; height: number; depth: number; cropX: number; cropY: number }>();
    for (const chunk of plan.chunks) {
      desired.set(`panorama:${chunk.index}`, {
        key: chunk.assetKey,
        x: chunk.startX - chunk.overlap,
        y: -chunk.variant * 2,
        width: chunk.imageWidth * chunk.renderScale,
        height: chunk.imageHeight * chunk.renderScale,
        depth: -20,
        cropX: chunk.cropX,
        cropY: chunk.cropY,
      });
      // The foreground strip is a separate approved alpha asset.  It is kept
      // above the panorama but still behind anchors, rope, and characters.
    }
    for (let index = 1; index < plan.chunks.length; index += 1) {
      const previous = plan.chunks[index - 1]!;
      const chunk = plan.chunks[index]!;
      const districtChange = previous.district !== chunk.district;
      const rooftopVariantJoin = previous.district === 'rooftops' && chunk.district === 'rooftops';
      desired.set(`transition:${chunk.index}`, {
        key: rooftopVariantJoin ? 'night-city-rooftops-transition-v36' : 'night-city-district-transition-mist',
        x: rooftopVariantJoin ? chunk.startX - 320 : chunk.startX - 150,
        y: 0,
        // A light veil is present at every raster join so the two approved
        // variants in one district blend as one continuous street. District
        // changes use the same artwork with a stronger treatment below.
        width: rooftopVariantJoin ? 640 : districtChange ? 300 : 220,
        height: PANORAMA_CANVAS_HEIGHT,
        depth: rooftopVariantJoin || districtChange ? -9 : -8,
        cropX: 0,
        cropY: 0,
      });
    }
    for (const chunk of foregroundChunks) {
      desired.set(`eaves:${chunk.index}`, {
        key: 'night-city-foreground-eaves',
        x: chunk.startX - chunk.overlap,
        y: -chunk.variant * 2,
        width: chunk.imageWidth * chunk.renderScale,
        height: chunk.imageHeight * chunk.renderScale,
        depth: -10,
        cropX: 0,
        cropY: 0,
      });
    }
    for (const [id, item] of this.retained) {
      if (desired.has(id)) continue;
      this.retained.delete(id);
      this.release(item);
    }
    for (const [id, spec] of desired) {
      let item = this.retained.get(id);
      if (!item || item.key !== spec.key) {
        if (item) { this.retained.delete(id); this.release(item); }
        const image = this.acquire(scene, spec.key);
        if (!image) continue; // texture has not completed loading yet.
        item = { id, key: spec.key, image };
        this.retained.set(id, item);
      }
      item.image.setOrigin(0, 0).setPosition(spec.x, spec.y).setDisplaySize(spec.width, spec.height)
        .setDepth(spec.depth).setAlpha(spec.depth === -20 || spec.key === 'night-city-rooftops-transition-v36' ? 1 : spec.depth === -9 || spec.depth === -8 ? 0.08 : 0.9);
      item.image.setScrollFactor?.(spec.depth === -20 || spec.depth === -9
        ? NIGHT_CITY_LAYER_CONFIG.panoramaScrollFactor
        : NIGHT_CITY_LAYER_CONFIG.foregroundScrollFactor, 0);
      item.image.setVisible(true);
    }
    this.evictOverflow();
    const focusX = (finite(left, 0) + finite(right, finite(left, 0) + CITY_CHUNK_WIDTH)) / 2;
    const focused = plan.chunks.find((chunk) => focusX >= chunk.startX && focusX < chunk.endX)
      ?? plan.chunks.reduce<NightCityChunkRender | undefined>((closest, chunk) => {
        if (!closest) return chunk;
        return Math.abs(chunk.startX - focusX) < Math.abs(closest.startX - focusX) ? chunk : closest;
      }, undefined);
    const stats: NightCityRendererStats = {
      renderer: 'image-stream',
      district: focused?.district ?? null,
      chunkCount: plan.chunks.length,
      retainedCount: [...this.retained.keys()].filter((id) => id.startsWith('panorama:')).length,
      visibleCount: [...this.retained.values()].filter((item) => Boolean(item.image)).length,
      preloaded: this.preloaded,
    };
    this.lastStats = stats;
    return stats;
  }

  getStats(): NightCityRendererStats {
    return {
      ...this.lastStats,
      retainedCount: [...this.retained.keys()].filter((id) => id.startsWith('panorama:')).length,
    };
  }

  destroy(): void {
    for (const item of this.retained.values()) item.image.destroy();
    for (const bucket of this.freeByKey.values()) for (const image of bucket) image.destroy();
    this.retained.clear();
    this.freeByKey.clear();
    this.lastStats = { ...this.lastStats, retainedCount: 0, visibleCount: 0 };
  }
}

export function createNightCityRenderer(options: NightCityRendererOptions = {}): NightCityRenderer {
  return new NightCityRenderer(options);
}
