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

export interface ComponentRenderLine {
  setTo(x1: number, y1: number, x2: number, y2: number): ComponentRenderLine;
  setLineWidth(width: number): ComponentRenderLine;
  setStrokeStyle(color: number, alpha?: number): ComponentRenderLine;
  setDepth(depth: number): ComponentRenderLine;
  setVisible(visible: boolean): ComponentRenderLine;
  destroy(): void;
}

export interface ComponentSceneLike {
  load: { image(key: string, url: string): void };
  // Phaser's line primitive is optional so lightweight test scenes can omit it.
  add: { image(x: number, y: number, key: string): ComponentRenderImage; line?: (x: number, y: number, x1: number, y1: number, x2: number, y2: number, color: number, alpha?: number) => ComponentRenderLine };
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

interface RetainedLanternGroup {
  images: RetainedComponent[];
  connector: ComponentRenderLine | null;
}

interface RetainedRooftopGroup {
  connectors: ComponentRenderLine[];
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
  private readonly lanternGroups = new Map<string, RetainedLanternGroup>();
  private readonly rooftopGroups = new Map<string, RetainedRooftopGroup>();
  private readonly freeByKey = new Map<string, ComponentRenderImage[]>();
  private readonly freeRoofLines: ComponentRenderLine[] = [];
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

  private releaseLanternGroup(group: RetainedLanternGroup): void {
    for (const image of group.images) this.release(image);
    group.connector?.setVisible(false);
  }

  private releaseRooftopGroup(group: RetainedRooftopGroup): void {
    for (const connector of group.connectors) {
      connector.setVisible(false);
      this.freeRoofLines.push(connector);
    }
  }

  private acquireRoofLine(scene: ComponentSceneLike, x1: number, y1: number, x2: number, y2: number): ComponentRenderLine | null {
    const line = this.freeRoofLines.pop() ?? scene.add.line?.(0, 0, x1, y1, x2, y2, 0x101d2d, 0.86) ?? null;
    return line;
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
    const rooftopItemsByChunk = new Map<string, DesiredComponent[]>();
    for (const item of boundedDesired) {
      if (!item.placement.assetId.startsWith('rooftops.')) continue;
      const items = rooftopItemsByChunk.get(item.chunk.chunkId) ?? [];
      items.push(item);
      rooftopItemsByChunk.set(item.chunk.chunkId, items);
    }
    for (const [id, group] of this.lanternGroups) {
      if (desiredIds.has(id)) continue;
      this.releaseLanternGroup(group);
      this.lanternGroups.delete(id);
    }
    for (const [chunkId, group] of this.rooftopGroups) {
      if (rooftopItemsByChunk.has(chunkId)) continue;
      this.releaseRooftopGroup(group);
      this.rooftopGroups.delete(chunkId);
    }
    for (const [id, component] of this.retained) {
      if (desiredIds.has(id)) continue;
      this.retained.delete(id);
      this.release(component);
    }
    for (const item of boundedDesired) {
      if (item.placement.assetId === 'lighting.lanternCable') {
        this.renderLanternGroup(scene, item);
        continue;
      }
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
    for (const [chunkId, items] of rooftopItemsByChunk) this.renderRooftopGroup(scene, chunkId, items);
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

  private renderLanternGroup(scene: ComponentSceneLike, item: DesiredComponent): void {
    const { placement, imageAsset, chunk } = item;
    const [width, height] = imageAsset.nominalCanvas;
    const span = Math.max(180, Math.round((220 + placement.scale * 260) * Math.max(0.7, placement.scaleY)));
    const baseX = chunk.startX + placement.x;
    const lanternY = placement.y;
    let group = this.lanternGroups.get(item.id);
    if (!group) {
      const images: RetainedComponent[] = [];
      for (let index = 0; index < 3; index += 1) {
        const image = this.acquire(scene, item.runtimeKey);
        if (!image) continue;
        images.push({ id: `${item.id}:lantern:${index}`, runtimeKey: item.runtimeKey, image });
      }
      const connector = scene.add.line?.(0, 0, baseX, lanternY - height * placement.scaleY * 0.38, baseX + span, lanternY - height * placement.scaleY * 0.38, 0x3a2418, 0.92) ?? null;
      group = { images, connector };
      this.lanternGroups.set(item.id, group);
    }
    const y = lanternY;
    group.images.forEach((component, index) => {
      const x = baseX + (span * index) / 2;
      component.image.setOrigin(0.5, 0.5).setPosition(x, y)
        .setDisplaySize(width * placement.scale * 0.22, height * placement.scaleY * 0.22)
        .setDepth(depthFor(placement.depthBand)).setAlpha(placement.occlusionRole === 'foreground' ? 0.94 : 0.86).setVisible(true);
      component.image.setFlipX?.(placement.flipX);
    });
    group.connector?.setTo(baseX, y - height * placement.scaleY * 0.1, baseX + span, y - height * placement.scaleY * 0.1)
      .setLineWidth(Math.max(2, placement.scale * 5)).setStrokeStyle(0x3a2418, 0.9).setDepth(depthFor(placement.depthBand) - 0.1).setVisible(true);
  }

  /**
   * Rooftop sprites provide the authored silhouettes while these spans supply
   * the variable-width roof structure between them. Keeping the span in code
   * prevents separate source crops from reading as a stack of floating images.
   */
  private renderRooftopGroup(scene: ComponentSceneLike, chunkId: string, items: DesiredComponent[]): void {
    const ordered = [...items].sort((left, right) => left.placement.x - right.placement.x);
    let group = this.rooftopGroups.get(chunkId);
    if (!group) {
      group = { connectors: [] };
      this.rooftopGroups.set(chunkId, group);
    }
    while (group.connectors.length < Math.max(0, ordered.length - 1)) {
      const connector = this.acquireRoofLine(scene, 0, 0, 1, 0);
      if (!connector) break;
      group.connectors.push(connector);
    }
    for (let index = 0; index < group.connectors.length; index += 1) {
      const connector = group.connectors[index];
      const left = ordered[index];
      const right = ordered[index + 1];
      if (!left || !right) {
        connector.setVisible(false);
        continue;
      }
      const [leftWidth, leftHeight] = left.imageAsset.nominalCanvas;
      const [rightWidth, rightHeight] = right.imageAsset.nominalCanvas;
      const leftX = left.chunk.startX + left.placement.x + leftWidth * left.placement.scale;
      const rightX = right.chunk.startX + right.placement.x;
      const startX = Math.min(leftX, rightX - Math.max(12, rightWidth * right.placement.scale * 0.08));
      const endX = Math.max(rightX, startX + 24);
      const startY = left.placement.y + leftHeight * left.placement.scaleY * 0.62;
      const endY = right.placement.y + rightHeight * right.placement.scaleY * 0.62;
      const width = Math.max(6, Math.min(16, Math.round(Math.min(left.placement.scale, right.placement.scale) * 14)));
      connector.setTo(startX, startY, endX, endY)
        .setLineWidth(width)
        .setStrokeStyle(0x101d2d, 0.86)
        .setDepth(depthFor('mid-scenery') - 0.2)
        .setVisible(true);
    }
  }

  getStats(): ComponentRendererStats {
    return { ...this.lastStats, retainedCount: this.retained.size, visibleCount: this.retained.size };
  }

  destroy(): void {
    for (const component of this.retained.values()) component.image.destroy();
    for (const bucket of this.freeByKey.values()) for (const image of bucket) image.destroy();
    this.retained.clear();
    for (const group of this.lanternGroups.values()) { group.connector?.destroy(); }
    this.lanternGroups.clear();
    for (const group of this.rooftopGroups.values()) for (const connector of group.connectors) connector.destroy();
    this.rooftopGroups.clear();
    for (const connector of this.freeRoofLines) connector.destroy();
    this.freeRoofLines.length = 0;
    this.freeByKey.clear();
    this.lastStats = { ...this.lastStats, visibleCount: 0, retainedCount: 0 };
  }
}

export function createComponentRenderer(options: ComponentRendererOptions = {}): ComponentRenderer {
  return new ComponentRenderer(options);
}
