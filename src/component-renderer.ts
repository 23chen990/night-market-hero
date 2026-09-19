import {
  availableLongmapArt,
  getLongmapArt,
  type LongmapArtCatalogEntry,
} from './longmap-art-catalog.ts';
import {
  placementsForChunk,
  type ComponentDepthBand,
  type SceneComponentPlacement,
} from './longmap-scene-recipes.ts';
import {
  RUN_PLAN_CHUNK_WIDTH,
  runPlanChunksInView,
  type RunPlanChunkDescriptor,
} from './run-plan.ts';

export const COMPONENT_DEPTH_RANGES: Readonly<Record<ComponentDepthBand, { min: number; max: number; depth: number }>> = Object.freeze({
  'background-architecture': { min: -18, max: -12, depth: -15 },
  'mid-scenery': { min: -9, max: -3, depth: -6 },
  'foreground-occluder': { min: -2, max: 2, depth: 1 },
});

export interface ComponentRenderImage {
  setOrigin(x: number, y: number): ComponentRenderImage;
  setPosition(x: number, y: number): ComponentRenderImage;
  setDisplaySize(width: number, height: number): ComponentRenderImage;
  setDepth(depth: number): ComponentRenderImage;
  setVisible(visible: boolean): ComponentRenderImage;
  setAlpha(alpha: number): ComponentRenderImage;
  setFlipX?(flipX: boolean): ComponentRenderImage;
  destroy(): void;
}

export interface ComponentSceneLike {
  load: { image(key: string, url: string): void };
  add: { image(x: number, y: number, key: string): ComponentRenderImage };
  textures?: { exists(key: string): boolean };
}

export interface ComponentRendererOptions {
  enabled?: boolean;
  prefetchChunks?: number;
  maxRetainedComponents?: number;
}

export interface ComponentRendererStats {
  renderer: 'component-overlay' | 'disabled';
  active: boolean;
  longmapChunkId: string | null;
  longmapChainIndex: number | null;
  longmapChunkKind: RunPlanChunkDescriptor['kind'] | null;
  longmapSceneFamily: string | null;
  visibleCount: number;
  retainedCount: number;
  missingAssetCount: number;
}

interface RetainedComponent {
  id: string;
  runtimeKey: string;
  image: ComponentRenderImage;
}

interface DesiredComponent {
  id: string;
  runtimeKey: string;
  imageAsset: LongmapArtCatalogEntry;
  placement: SceneComponentPlacement;
  chunk: RunPlanChunkDescriptor;
}

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function depthFor(band: ComponentDepthBand): number {
  return COMPONENT_DEPTH_RANGES[band].depth;
}

/** Preview only. The default formal journey leaves the component layer off. */
export function isLongmapPreviewEnabled(search: string | URLSearchParams = ''): boolean {
  const params = typeof search === 'string'
    ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    : search;
  return params.get('longmap') === '1';
}

export class ComponentRenderer {
  private readonly enabled: boolean;
  private readonly prefetchChunks: number;
  private readonly maxRetainedComponents: number;
  private readonly retained = new Map<string, RetainedComponent>();
  private readonly freeByKey = new Map<string, ComponentRenderImage[]>();
  private preloaded = false;
  private lastStats: ComponentRendererStats = {
    renderer: 'disabled',
    active: false,
    longmapChunkId: null,
    longmapChainIndex: null,
    longmapChunkKind: null,
    longmapSceneFamily: null,
    visibleCount: 0,
    retainedCount: 0,
    missingAssetCount: 0,
  };

  constructor(options: ComponentRendererOptions = {}) {
    this.enabled = options.enabled ?? false;
    this.prefetchChunks = Math.max(0, Math.floor(options.prefetchChunks ?? 1));
    this.maxRetainedComponents = Math.max(1, Math.floor(options.maxRetainedComponents ?? 64));
  }

  preload(scene: ComponentSceneLike): void {
    if (!this.enabled || this.preloaded) return;
    for (const asset of availableLongmapArt()) {
      if (asset.path && asset.runtimeKey) scene.load.image(asset.runtimeKey, asset.path);
    }
    this.preloaded = true;
  }

  private textureReady(scene: ComponentSceneLike, runtimeKey: string): boolean {
    return !scene.textures || scene.textures.exists(runtimeKey);
  }

  private acquire(scene: ComponentSceneLike, runtimeKey: string): ComponentRenderImage | null {
    if (!this.textureReady(scene, runtimeKey)) return null;
    const free = this.freeByKey.get(runtimeKey);
    const reused = free?.pop();
    if (reused) return reused;
    return scene.add.image(0, 0, runtimeKey);
  }

  private release(component: RetainedComponent): void {
    component.image.setVisible(false);
    const bucket = this.freeByKey.get(component.runtimeKey) ?? [];
    bucket.push(component.image);
    this.freeByKey.set(component.runtimeKey, bucket);
  }

  private evictOverflow(): void {
    let total = this.retained.size + [...this.freeByKey.values()].reduce((sum, bucket) => sum + bucket.length, 0);
    if (total <= this.maxRetainedComponents) return;
    for (const [runtimeKey, bucket] of this.freeByKey) {
      while (total > this.maxRetainedComponents && bucket.length > 0) {
        bucket.pop()!.destroy();
        total -= 1;
      }
      if (bucket.length === 0) this.freeByKey.delete(runtimeKey);
      if (total <= this.maxRetainedComponents) break;
    }
  }

  private disabledStats(): ComponentRendererStats {
    return { ...this.lastStats, renderer: 'disabled', active: false, visibleCount: 0, retainedCount: 0, missingAssetCount: 0 };
  }

  render(scene: ComponentSceneLike, seed: number, left: number, right: number): ComponentRendererStats {
    if (!this.enabled) {
      this.lastStats = this.disabledStats();
      return this.lastStats;
    }
    if (!this.preloaded) this.preload(scene);

    const safeLeft = finite(left, 0);
    const safeRight = Math.max(safeLeft, finite(right, safeLeft + RUN_PLAN_CHUNK_WIDTH));
    const margin = this.prefetchChunks * RUN_PLAN_CHUNK_WIDTH;
    const chunks = runPlanChunksInView(seed, safeLeft - margin, safeRight + margin);
    const desired: DesiredComponent[] = [];
    let missingAssetCount = 0;
    for (const chunk of chunks) {
      for (const placement of placementsForChunk(chunk)) {
        const asset = getLongmapArt(placement.assetId);
        if (!asset || (asset.status !== 'AVAILABLE' && asset.status !== 'REUSE') || !asset.runtimeKey) {
          missingAssetCount += 1;
          continue;
        }
        desired.push({
          id: `${chunk.chunkId}:${placement.placementId}`,
          runtimeKey: asset.runtimeKey,
          imageAsset: asset,
          placement,
          chunk,
        });
      }
    }
    const boundedDesired = desired.slice(0, this.maxRetainedComponents);
    const desiredIds = new Set(boundedDesired.map((item) => item.id));
    for (const [id, component] of this.retained) {
      if (desiredIds.has(id)) continue;
      this.retained.delete(id);
      this.release(component);
    }
    for (const item of boundedDesired) {
      let retained = this.retained.get(item.id);
      if (!retained || retained.runtimeKey !== item.runtimeKey) {
        if (retained) {
          this.retained.delete(item.id);
          this.release(retained);
        }
        const image = this.acquire(scene, item.runtimeKey);
        if (!image) continue;
        retained = { id: item.id, runtimeKey: item.runtimeKey, image };
        this.retained.set(item.id, retained);
      }
      const { placement, imageAsset, chunk } = item;
      const [width, height] = imageAsset.nominalCanvas;
      retained.image.setOrigin(0, 0)
        .setPosition(chunk.startX + placement.x, placement.y)
        .setDisplaySize(width * placement.scale, height * placement.scaleY)
        .setDepth(depthFor(placement.depthBand))
        .setAlpha(placement.occlusionRole === 'foreground' ? 0.92 : 0.86)
        .setVisible(true);
      retained.image.setFlipX?.(placement.flipX);
    }
    this.evictOverflow();
    const focusX = (safeLeft + safeRight) / 2;
    const focused = chunks.find((chunk) => focusX >= chunk.startX && focusX < chunk.endX)
      ?? chunks[0];
    this.lastStats = {
      renderer: 'component-overlay',
      active: true,
      longmapChunkId: focused?.chunkId ?? null,
      longmapChainIndex: focused?.chainIndex ?? null,
      longmapChunkKind: focused?.kind ?? null,
      longmapSceneFamily: focused?.sceneFamily ?? null,
      visibleCount: this.retained.size,
      retainedCount: this.retained.size,
      missingAssetCount,
    };
    return this.lastStats;
  }

  getStats(): ComponentRendererStats {
    return { ...this.lastStats, retainedCount: this.retained.size, visibleCount: this.retained.size };
  }

  destroy(): void {
    for (const component of this.retained.values()) component.image.destroy();
    for (const bucket of this.freeByKey.values()) for (const image of bucket) image.destroy();
    this.retained.clear();
    this.freeByKey.clear();
    this.lastStats = { ...this.lastStats, visibleCount: 0, retainedCount: 0 };
  }
}

export function createComponentRenderer(options: ComponentRendererOptions = {}): ComponentRenderer {
  return new ComponentRenderer(options);
}
