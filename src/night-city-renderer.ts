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
  marketRooftopsBridgeV3: new URL('./assets/night-city/market-rooftops-bridge-v3.png', import.meta.url).href,
  rooftopsWaterfrontBridgeV1: new URL('./assets/night-city/rooftops-waterfront-bridge-map-v1.png', import.meta.url).href,
  waterfrontMarketBridgeV1: new URL('./assets/night-city/waterfront-market-bridge-map-v1.png', import.meta.url).href,
  rooftops: new URL('./assets/night-city/rooftops-panorama-v1.png', import.meta.url).href,
  rooftopsV2: new URL('./assets/night-city/rooftops-panorama-v2.png', import.meta.url).href,
  rooftopsTransitionV36: new URL('./assets/night-city/rooftops-transition-v36-fullheight.png', import.meta.url).href,
  waterfront: new URL('./assets/night-city/waterfront-panorama-v1.png', import.meta.url).href,
  waterfrontV2: new URL('./assets/night-city/waterfront-panorama-v2.png', import.meta.url).href,
  districtTransitionMist: new URL('./assets/night-city/district-transition-mist-v1.png', import.meta.url).href,
  /** @deprecated Compatibility-only path; the default stream uses baked panorama architecture. */
  foregroundEaves: new URL('./assets/night-city/foreground-eaves-v1.png', import.meta.url).href,
  settingsGear: new URL('./assets/night-city/settings-gear-v1.png', import.meta.url).href,
  gateCounterFrame: new URL('./assets/night-city/gate-counter-frame-v1.png', import.meta.url).href,
});

const PANORAMA_ASPECT = 1_672 / 941;
const PANORAMA_CANVAS_WIDTH = 1_672;
const PANORAMA_CANVAS_HEIGHT = 941;
const MARKET_ROOFTOPS_BRIDGE_WIDTH = 2_080;
const MARKET_ROOFTOPS_BRIDGE_HEIGHT = 958;
const MARKET_ROOFTOPS_BRIDGE_OVERLAP = 204;
const OPAQUE_BRIDGE_WIDTH = PANORAMA_CANVAS_WIDTH;
const OPAQUE_BRIDGE_HEIGHT = PANORAMA_CANVAS_HEIGHT;
const OPAQUE_BRIDGE_OVERLAP = 72;

/** Scroll factors retained for compatibility telemetry. The default stream
 * renders only baked, world-aligned plates; foregroundScrollFactor is unused
 * after the repeated eaves layer was retired. */
export const NIGHT_CITY_LAYER_CONFIG = Object.freeze({
  panoramaScrollFactor: 1,
  foregroundScrollFactor: 1.08,
});

export type NightCityAssetKey =
  | 'night-city-market-v1' | 'night-city-market-v2'
  | 'night-city-market-rooftops-bridge-v3'
  | 'night-city-rooftops-waterfront-bridge-v1'
  | 'night-city-waterfront-market-bridge-v1'
  | 'night-city-rooftops-v1' | 'night-city-rooftops-v2'
  | 'night-city-rooftops-transition-v36'
  | 'night-city-waterfront-v1' | 'night-city-waterfront-v2'
  | 'night-city-district-transition-mist'
  /** @deprecated Compatibility-only key; never acquired by the default stream. */
  | 'night-city-foreground-eaves';
type StreamNightCityAssetKey = Exclude<NightCityAssetKey, 'night-city-foreground-eaves'>;

export interface NightCityCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type NightCitySupportKind = 'beam' | 'post' | 'rope' | 'lantern-cable';

export interface NightCitySupportSegment {
  supportId: string;
  kind: NightCitySupportKind;
  /** Explicit source-pixel endpoints on visible architecture in the asset. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

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
  /** Normalized crop offsets retained for compatibility diagnostics. */
  cropX: number;
  cropY: number;
  /** Actual source-pixel crop submitted to Phaser.setCrop when supported. */
  cropRect: NightCityCropRect;
  /** Visible world span after the source crop and isotropic scale are applied. */
  drawWidth: number;
  drawHeight: number;
  /** Source-frame scale required by Phaser when a crop window is active. */
  sourceScale: number;
  renderScale: number;
  overlap: number;
  mirrored: boolean;
  sourceScaleY: number;
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

export interface NightCityArchitecturalSocket {
  x: number;
  y: number;
  sourceX: number;
  sourceY: number;
  supportId: string;
  chunkId: string;
  chunkIndex: number;
  assetKey: NightCityAssetKey;
}

export interface RenderImage {
  setOrigin(x: number, y: number): RenderImage;
  setPosition(x: number, y: number): RenderImage;
  setDisplaySize(width: number, height: number): RenderImage;
  setDepth(depth: number): RenderImage;
  setVisible(visible: boolean): RenderImage;
  setAlpha(alpha: number): RenderImage;
  setScrollFactor?(factorX: number, factorY?: number): RenderImage;
  setCrop?(x?: number, y?: number, width?: number, height?: number): RenderImage;
  setFlipX?(flip: boolean): RenderImage;
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

const PANORAMA_PATHS: Record<StreamNightCityAssetKey, string> = {
  'night-city-market-v1': NIGHT_CITY_ASSET_PATHS.market,
  'night-city-market-v2': NIGHT_CITY_ASSET_PATHS.marketV2,
  'night-city-market-rooftops-bridge-v3': NIGHT_CITY_ASSET_PATHS.marketRooftopsBridgeV3,
  'night-city-rooftops-waterfront-bridge-v1': NIGHT_CITY_ASSET_PATHS.rooftopsWaterfrontBridgeV1,
  'night-city-waterfront-market-bridge-v1': NIGHT_CITY_ASSET_PATHS.waterfrontMarketBridgeV1,
  'night-city-rooftops-v1': NIGHT_CITY_ASSET_PATHS.rooftops,
  'night-city-rooftops-v2': NIGHT_CITY_ASSET_PATHS.rooftopsV2,
  'night-city-rooftops-transition-v36': NIGHT_CITY_ASSET_PATHS.rooftopsTransitionV36,
  'night-city-waterfront-v1': NIGHT_CITY_ASSET_PATHS.waterfront,
  'night-city-waterfront-v2': NIGHT_CITY_ASSET_PATHS.waterfrontV2,
  'night-city-district-transition-mist': NIGHT_CITY_ASSET_PATHS.districtTransitionMist,
};

type NightCitySupportAssetKey =
  | 'night-city-market-v1'
  | 'night-city-market-v2'
  | 'night-city-rooftops-v1'
  | 'night-city-rooftops-v2'
  | 'night-city-waterfront-v1'
  | 'night-city-waterfront-v2'
  | 'night-city-market-rooftops-bridge-v3'
  | 'night-city-rooftops-waterfront-bridge-v1'
  | 'night-city-waterfront-market-bridge-v1';

/**
 * Authored source-pixel support geometry for the nine opaque/transition
 * plates that can own a world chunk. Coordinates were inspected against the
 * local image assets; they identify visible roof beams, posts, bridge rails,
 * and lantern cables rather than an abstract district height band.
 */
export const NIGHT_CITY_SUPPORT_CATALOG: Readonly<
  Record<NightCitySupportAssetKey, readonly NightCitySupportSegment[]>
  & Partial<Record<NightCityAssetKey, readonly NightCitySupportSegment[]>>
> = Object.freeze({
  'night-city-market-v1': [
    { supportId: 'market-v1-paifang-crossbeam', kind: 'beam', x1: 430, y1: 276, x2: 770, y2: 276 },
    { supportId: 'market-v1-left-stall-beam', kind: 'beam', x1: 90, y1: 242, x2: 410, y2: 242 },
    { supportId: 'market-v1-lantern-cable', kind: 'lantern-cable', x1: 850, y1: 206, x2: 1_190, y2: 164 },
    { supportId: 'market-v1-right-eave-beam', kind: 'beam', x1: 1_345, y1: 184, x2: 1_610, y2: 184 },
  ],
  'night-city-market-v2': [
    { supportId: 'market-v2-left-balcony-rail', kind: 'beam', x1: 100, y1: 286, x2: 430, y2: 286 },
    { supportId: 'market-v2-center-stall-beam', kind: 'beam', x1: 640, y1: 454, x2: 850, y2: 454 },
    { supportId: 'market-v2-lantern-cable', kind: 'lantern-cable', x1: 520, y1: 312, x2: 1_020, y2: 424 },
    { supportId: 'market-v2-right-balcony-rail', kind: 'beam', x1: 1_270, y1: 362, x2: 1_580, y2: 362 },
  ],
  'night-city-rooftops-v1': [
    { supportId: 'rooftops-v1-left-eave-beam', kind: 'beam', x1: 34, y1: 196, x2: 330, y2: 196 },
    { supportId: 'rooftops-v1-foreground-roof-rail', kind: 'beam', x1: 560, y1: 688, x2: 900, y2: 688 },
    { supportId: 'rooftops-v1-right-eave-beam', kind: 'beam', x1: 1_270, y1: 214, x2: 1_590, y2: 214 },
    { supportId: 'rooftops-v1-right-rope-line', kind: 'rope', x1: 1_220, y1: 438, x2: 1_550, y2: 372 },
  ],
  'night-city-rooftops-v2': [
    { supportId: 'rooftops-v2-left-eave-beam', kind: 'beam', x1: 42, y1: 176, x2: 304, y2: 176 },
    { supportId: 'rooftops-v2-bell-tower-beam', kind: 'beam', x1: 382, y1: 430, x2: 612, y2: 430 },
    { supportId: 'rooftops-v2-center-roof-rail', kind: 'beam', x1: 790, y1: 706, x2: 1_150, y2: 706 },
    { supportId: 'rooftops-v2-right-eave-beam', kind: 'beam', x1: 1_350, y1: 188, x2: 1_620, y2: 188 },
  ],
  'night-city-waterfront-v1': [
    { supportId: 'waterfront-v1-left-awning-beam', kind: 'beam', x1: 42, y1: 292, x2: 314, y2: 292 },
    { supportId: 'waterfront-v1-stone-bridge-rail', kind: 'beam', x1: 406, y1: 430, x2: 1_005, y2: 430 },
    { supportId: 'waterfront-v1-lantern-cable', kind: 'lantern-cable', x1: 684, y1: 214, x2: 1_120, y2: 146 },
    { supportId: 'waterfront-v1-right-house-beam', kind: 'beam', x1: 1_298, y1: 302, x2: 1_626, y2: 302 },
  ],
  'night-city-waterfront-v2': [
    { supportId: 'waterfront-v2-left-deck-rail', kind: 'beam', x1: 42, y1: 302, x2: 342, y2: 302 },
    { supportId: 'waterfront-v2-center-pier-rail', kind: 'beam', x1: 946, y1: 476, x2: 1_288, y2: 476 },
    { supportId: 'waterfront-v2-right-house-eave', kind: 'beam', x1: 1_366, y1: 294, x2: 1_628, y2: 294 },
    { supportId: 'waterfront-v2-mast-rope', kind: 'rope', x1: 1_088, y1: 384, x2: 1_300, y2: 332 },
  ],
  'night-city-market-rooftops-bridge-v3': [
    { supportId: 'market-rooftops-v3-left-walkway-beam', kind: 'beam', x1: 72, y1: 270, x2: 472, y2: 270 },
    { supportId: 'market-rooftops-v3-bridge-rail', kind: 'beam', x1: 636, y1: 458, x2: 1_360, y2: 458 },
    { supportId: 'market-rooftops-v3-lantern-rope', kind: 'lantern-cable', x1: 1_060, y1: 340, x2: 1_560, y2: 284 },
    { supportId: 'market-rooftops-v3-right-eave-beam', kind: 'beam', x1: 1_650, y1: 266, x2: 2_010, y2: 266 },
  ],
  'night-city-rooftops-waterfront-bridge-v1': [
    { supportId: 'rooftops-waterfront-v1-left-eave-beam', kind: 'beam', x1: 30, y1: 188, x2: 356, y2: 188 },
    { supportId: 'rooftops-waterfront-v1-bridge-rail', kind: 'beam', x1: 782, y1: 604, x2: 1_212, y2: 604 },
    { supportId: 'rooftops-waterfront-v1-canal-rope', kind: 'rope', x1: 1_010, y1: 504, x2: 1_396, y2: 414 },
    { supportId: 'rooftops-waterfront-v1-right-pier-rail', kind: 'beam', x1: 1_304, y1: 582, x2: 1_638, y2: 582 },
  ],
  'night-city-waterfront-market-bridge-v1': [
    { supportId: 'waterfront-market-v1-left-roof-beam', kind: 'beam', x1: 48, y1: 248, x2: 392, y2: 248 },
    { supportId: 'waterfront-market-v1-arch-bridge-rail', kind: 'beam', x1: 494, y1: 544, x2: 986, y2: 544 },
    { supportId: 'waterfront-market-v1-lantern-cable', kind: 'lantern-cable', x1: 892, y1: 264, x2: 1_376, y2: 180 },
    { supportId: 'waterfront-market-v1-right-market-beam', kind: 'beam', x1: 1_192, y1: 344, x2: 1_614, y2: 344 },
  ],
});

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function cropFor(
  chunk: CityChunk,
  imageWidth: number,
  imageHeight: number,
  allowVariation: boolean,
): NightCityCropRect {
  if (!allowVariation) return { x: 0, y: 0, width: imageWidth, height: imageHeight };
  // Keep the crop window at the source aspect ratio.  The resulting image is
  // scaled uniformly to the same visible span as a full panorama, so this
  // changes which approved pixels are shown without stretching the scene or
  // leaving a hole between adjacent world chunks.
  const trimByVariant = [0, 48, 96, 72] as const;
  const cropWidth = Math.max(1, imageWidth - trimByVariant[chunk.variant]);
  const cropHeight = Math.max(1, Math.min(imageHeight,
    Math.round(cropWidth * imageHeight / imageWidth)));
  const maxX = imageWidth - cropWidth;
  const maxY = imageHeight - cropHeight;
  const x = maxX > 0 ? chunk.variantSeed % (maxX + 1) : 0;
  const y = maxY > 0 ? chunk.layoutSeed % (maxY + 1) : 0;
  return { x, y, width: cropWidth, height: cropHeight };
}

interface TransitionImageSpec {
  assetKey: NightCityAssetKey;
  imageWidth: number;
  imageHeight: number;
  overlap: number;
}

function transitionImageFor(chunk: Pick<CityChunk, 'kind' | 'transition'>): TransitionImageSpec | null {
  if (chunk.kind !== 'transition' || !chunk.transition) return null;
  const transitionId = `${chunk.transition.fromDistrict}->${chunk.transition.toDistrict}`;
  if (transitionId === 'market->rooftops') {
    return {
      assetKey: 'night-city-market-rooftops-bridge-v3',
      imageWidth: MARKET_ROOFTOPS_BRIDGE_WIDTH,
      imageHeight: MARKET_ROOFTOPS_BRIDGE_HEIGHT,
      overlap: MARKET_ROOFTOPS_BRIDGE_OVERLAP,
    };
  }
  if (transitionId === 'rooftops->waterfront') {
    return {
      assetKey: 'night-city-rooftops-waterfront-bridge-v1',
      imageWidth: OPAQUE_BRIDGE_WIDTH,
      imageHeight: OPAQUE_BRIDGE_HEIGHT,
      overlap: OPAQUE_BRIDGE_OVERLAP,
    };
  }
  if (transitionId === 'waterfront->market') {
    return {
      assetKey: 'night-city-waterfront-market-bridge-v1',
      imageWidth: OPAQUE_BRIDGE_WIDTH,
      imageHeight: OPAQUE_BRIDGE_HEIGHT,
      overlap: OPAQUE_BRIDGE_OVERLAP,
    };
  }
  return null;
}

export function createNightCityRenderPlan(seed: number, left: number, right: number, chunkHeight = CITY_CHUNK_WIDTH / PANORAMA_ASPECT): NightCityRenderPlan {
  const safeLeft = Math.min(finite(left, 0), finite(right, 0));
  const safeRight = Math.max(finite(left, 0), finite(right, safeLeft + CITY_CHUNK_WIDTH));
  const chunks = cityChunksInView(seed, safeLeft, safeRight).map((chunk) => {
    const transitionImage = transitionImageFor(chunk);
    const ordinary = transitionImage === null;
    // Matched source-pixel edges: A.right equals mirror(A).left. Random crop
    // shifts, arbitrary vertical offsets and unequal scale would break joins.
    const mirrored = ordinary && chunk.slotIndex % 2 === 1;
    const imageWidth = transitionImage?.imageWidth ?? PANORAMA_CANVAS_WIDTH;
    const imageHeight = transitionImage?.imageHeight ?? PANORAMA_CANVAS_HEIGHT;
    const cropRect = { x: 0, y: 0, width: imageWidth, height: imageHeight };
    const drawWidth = ordinary ? CITY_CHUNK_WIDTH : imageWidth * 1.01;
    const sourceScale = drawWidth / cropRect.width;
    // The raster is rendered with uniform scale; socket projection, coverage
    // and the plan must use the *actual* displayed height, not intrinsic PNG
    // height. Previously ordinary panoramas claimed 941 world units but were
    // drawn at 901, creating a 40-unit mismatch with beam/socket locations.
    const drawHeight = imageHeight * sourceScale;
    const sourceScaleY = drawHeight / cropRect.height;
    const renderScale = ordinary ? 1 : 1.01;
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
      assetKey: transitionImage?.assetKey ?? PANORAMA_KEYS[chunk.district][0],
      width: CITY_CHUNK_WIDTH,
      height: chunkHeight,
      imageWidth,
      imageHeight,
      cropX: cropRect.x / imageWidth,
      cropY: cropRect.y / imageHeight,
      cropRect,
      drawWidth,
      drawHeight,
      sourceScale,
      renderScale,
      mirrored,
      sourceScaleY,
      overlap: transitionImage?.overlap ?? 0,
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
    right: chunk.startX - chunk.overlap + chunk.drawWidth - offset,
  }));
  if (spans.length === 0) return { left: 0, right: 0, width: 0 };
  const left = Math.min(...spans.map((span) => span.left));
  const right = Math.max(...spans.map((span) => span.right));
  const requestedWidth = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 0;
  return { left, right, width: Math.max(requestedWidth, right - left) };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

interface SourcePoint {
  x: number;
  y: number;
}

/**
 * Clip one authored source-pixel segment to the submitted source crop.  A
 * support may begin outside a deterministic crop while remaining visible in
 * the crop, so rejecting it solely because one endpoint is trimmed would make
 * the socket map depend on the crop seed rather than the image architecture.
 */
function clipSupportToCrop(
  support: NightCitySupportSegment,
  cropRect: NightCityCropRect,
): NightCitySupportSegment | null {
  const dx = support.x2 - support.x1;
  const dy = support.y2 - support.y1;
  let start = 0;
  let end = 1;
  const clip = (coefficient: number, distance: number): boolean => {
    if (coefficient === 0) return distance >= 0;
    const ratio = distance / coefficient;
    if (coefficient < 0) {
      if (ratio > end) return false;
      if (ratio > start) start = ratio;
    } else {
      if (ratio < start) return false;
      if (ratio < end) end = ratio;
    }
    return true;
  };
  if (!clip(-dx, support.x1 - cropRect.x)) return null;
  if (!clip(dx, cropRect.x + cropRect.width - support.x1)) return null;
  if (!clip(-dy, support.y1 - cropRect.y)) return null;
  if (!clip(dy, cropRect.y + cropRect.height - support.y1)) return null;
  if (start > end) return null;
  return {
    ...support,
    x1: support.x1 + dx * start,
    y1: support.y1 + dy * start,
    x2: support.x1 + dx * end,
    y2: support.y1 + dy * end,
  };
}

function closestPointOnSegment(target: SourcePoint, support: NightCitySupportSegment): SourcePoint {
  const dx = support.x2 - support.x1;
  const dy = support.y2 - support.y1;
  const lengthSquared = dx * dx + dy * dy;
  const position = lengthSquared > 0
    ? clamp(((target.x - support.x1) * dx + (target.y - support.y1) * dy) / lengthSquared, 0, 1)
    : 0;
  return {
    x: support.x1 + dx * position,
    y: support.y1 + dy * position,
  };
}

/**
 * Map a gameplay anchor to the nearest authored support socket on the exact
 * image transform used by the default renderer.  The catalog supplies visible
 * source-pixel segments for each panorama/bridge; no district-wide height band
 * or synthetic source-X projection can create a socket.  Anchors that are too
 * far from every visible support return null so presentation links stay
 * bounded and attributable to the selected image.
 */
export function mapWorldAnchorToArchitecturalSocket(
  plan: NightCityRenderPlan,
  anchor: { x: number; y: number },
): NightCityArchitecturalSocket | null {
  if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y) || plan.chunks.length === 0) return null;
  const chunk = plan.chunks.find((candidate) => anchor.x >= candidate.startX && anchor.x < candidate.endX);
  if (!chunk) return null;
  const authoredSupports = NIGHT_CITY_SUPPORT_CATALOG[chunk.assetKey];
  if (!authoredSupports || authoredSupports.length === 0) return null;
  const worldLeft = chunk.startX - chunk.overlap;
  const worldTop = 0;
  const sourceTarget = {
    x: chunk.mirrored ? chunk.cropRect.x + chunk.cropRect.width - (anchor.x - worldLeft) / chunk.sourceScale
      : chunk.cropRect.x + (anchor.x - worldLeft) / chunk.sourceScale,
    y: chunk.cropRect.y + (anchor.y - worldTop) / chunk.sourceScaleY,
  };
  const best = authoredSupports.reduce<{ support: NightCitySupportSegment; point: SourcePoint; distance: number } | null>(
    (closest, authoredSupport) => {
      const visibleSupport = clipSupportToCrop(authoredSupport, chunk.cropRect);
      if (!visibleSupport) return closest;
      const point = closestPointOnSegment(sourceTarget, visibleSupport);
      const distance = Math.hypot(
        (point.x - sourceTarget.x) * chunk.sourceScale,
        (point.y - sourceTarget.y) * chunk.sourceScale,
      );
      if (!closest || distance < closest.distance) return { support: authoredSupport, point, distance };
      return closest;
    },
    null,
  );
  const MAX_SUPPORT_LINK_DISTANCE = 520;
  if (!best || best.distance > MAX_SUPPORT_LINK_DISTANCE) return null;
  const { support, point } = best;
  return {
    x: worldLeft + (chunk.mirrored ? chunk.cropRect.width - (point.x - chunk.cropRect.x) : point.x - chunk.cropRect.x) * chunk.sourceScale,
    y: worldTop + (point.y - chunk.cropRect.y) * chunk.sourceScaleY,
    sourceX: point.x,
    sourceY: point.y,
    supportId: support.supportId,
    chunkId: chunk.chunkId,
    chunkIndex: chunk.index,
    assetKey: chunk.assetKey,
  };
}

interface RetainedItem {
  id: string;
  key: NightCityAssetKey;
  image: RenderImage;
}

interface DesiredRender {
  key: NightCityAssetKey;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  baseX?: number;
  baseY?: number;
  cropRect?: NightCityCropRect;
  mirrored?: boolean;
  ordinary?: boolean;
  sourceWidth?: number;
  sourceHeight?: number;
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
    const desired = new Map<string, DesiredRender>();
    for (const chunk of plan.chunks) {
      const baseX = chunk.startX - chunk.overlap;
      const baseY = 0;
      desired.set(`panorama:${chunk.index}`, {
        key: chunk.assetKey,
        // Phaser crops in source pixels and scales the cropped quad.  Offset
        // the object by the crop origin so the visible crop still starts at
        // the same world coordinate as the uncropped panorama.
        x: baseX - chunk.cropRect.x * chunk.sourceScale,
        y: baseY - chunk.cropRect.y * chunk.sourceScale,
        width: chunk.imageWidth * chunk.sourceScale,
        height: chunk.imageHeight * chunk.sourceScale,
        depth: -20 + (chunk.kind === 'transition' ? 1 : 0),
        baseX,
        baseY,
        cropRect: chunk.cropRect,
        mirrored: chunk.mirrored,
        ordinary: chunk.kind === 'district',
        sourceWidth: chunk.imageWidth,
        sourceHeight: chunk.imageHeight,
      });
    }
    for (let index = 1; index < plan.chunks.length; index += 1) {
      const previous = plan.chunks[index - 1]!;
      const chunk = plan.chunks[index]!;
      // Every authored district transition owns its boundary with one bridge
      // plate. A second veil would double the architecture at the join.
      if (transitionImageFor(chunk)) continue;
      const districtChange = previous.district !== chunk.district;
      if (!districtChange && previous.kind === 'district' && chunk.kind === 'district') continue;
      desired.set(`transition:${chunk.index}`, {
        // The full-height Rooftops V36 plate is a compatibility asset only.
        // It contains opaque architecture at its side edges, so placing it at
        // an ordinary panorama-variant join cuts through a continuous eave or
        // tower exactly like the user-reported vertical seam.  Ordinary joins
        // use the same subtle raster mist as other non-bridge boundaries;
        // authored district bridge plates remain the sole structural carriers.
        key: 'night-city-district-transition-mist',
        x: chunk.startX - 150,
        y: 0,
        // A light veil is present at every raster join so the two approved
        // variants in one district blend as one continuous street. District
        // changes use the same artwork with a stronger treatment below.
        width: districtChange ? 300 : 220,
        height: PANORAMA_CANVAS_HEIGHT,
        depth: districtChange ? -9 : -8,
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
      const cropSupported = typeof item.image.setCrop === 'function';
      const positionX = cropSupported ? spec.x : spec.baseX ?? spec.x;
      const positionY = cropSupported ? spec.y : spec.baseY ?? spec.y;
      const displayWidth = cropSupported && spec.cropRect ? spec.width : spec.cropRect
        ? spec.cropRect.width * (spec.width / (spec.sourceWidth ?? spec.cropRect.width))
        : spec.width;
      const displayHeight = cropSupported && spec.cropRect ? spec.height : spec.cropRect
        ? spec.cropRect.height * (spec.height / (spec.sourceHeight ?? spec.cropRect.height))
        : spec.height;
      const centeredX = spec.ordinary ? positionX + displayWidth / 2 : positionX;
      item.image.setOrigin(spec.ordinary ? 0.5 : 0, 0).setPosition(centeredX, positionY).setDisplaySize(displayWidth, displayHeight)
        .setDepth(spec.depth).setAlpha(spec.depth === -19
          || spec.depth === -20 || spec.key === 'night-city-rooftops-transition-v36' ? 1 : spec.depth === -9 || spec.depth === -8 ? 0.08 : 0.9);
      if (item.image.setCrop) {
        const crop = spec.cropRect;
        if (crop && spec.sourceWidth !== undefined && spec.sourceHeight !== undefined) {
          const isFullFrame = crop.x === 0 && crop.y === 0
            && crop.width === spec.sourceWidth && crop.height === spec.sourceHeight;
          if (isFullFrame) item.image.setCrop();
          else item.image.setCrop(crop.x, crop.y, crop.width, crop.height);
        } else {
          item.image.setCrop();
        }
      }
      // Every remaining image layer is part of the baked world map.  The
      // retired compatibility parallax factor is intentionally unused here;
      // seams must stay on the same world coordinate at every camera depth.
      item.image.setFlipX?.(spec.mirrored ?? false);
      item.image.setScrollFactor?.(NIGHT_CITY_LAYER_CONFIG.panoramaScrollFactor, 0);
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
