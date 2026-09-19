/**
 * Authoritative long-map topology for 夜市飞侠：护印突围.
 *
 * RunPlan owns world ordering and identity only.  Scene recipes, rendering,
 * gameplay segments, and collision geometry remain separate systems.
 */

export const RUN_PLAN_CHUNK_WIDTH = 1_600 as const;
export const RUN_PLAN_CHAIN_LENGTH = 15 as const;
export const RUN_PLAN_MAX_VIEW_CHUNKS = 8 as const;

// Keep extreme camera/snapshot inputs finite while leaving enough addressable
// space for practical endless runs.  This is an address-space guard, not a
// finite authored-world limit: every index resolves directly without a cursor.
export const MAX_RUN_PLAN_CHUNK_INDEX = Number.MAX_SAFE_INTEGER;
const MAX_RUN_PLAN_WORLD_X = MAX_RUN_PLAN_CHUNK_INDEX * RUN_PLAN_CHUNK_WIDTH;

export type RunPlanDistrict = 'market' | 'rooftops' | 'waterfront';
export type RunPlanChunkKind = 'district' | 'transition';
export type RunPlanTraversalRhythm = 'dense-hooks' | 'vertical-climb' | 'long-glide' | 'mixed' | 'transition';

export interface RunPlanTransition {
  fromDistrict: RunPlanDistrict;
  toDistrict: RunPlanDistrict;
}

export interface RunPlanChunkDescriptor {
  /** Unique identity for this world instance, including its chain. */
  chunkId: string;
  globalChunkIndex: number;
  chainIndex: number;
  slotIndex: number;
  startX: number;
  endX: number;
  kind: RunPlanChunkKind;
  /** Compatibility district: transitions resolve to their toDistrict. */
  district: RunPlanDistrict;
  fromDistrict: RunPlanDistrict | null;
  toDistrict: RunPlanDistrict | null;
  sceneFamily: string;
  /**
   * Short-lived gameplay compatibility profile for the validated endless
   * opening. This is not world topology and is never used by scenery.
   */
  gameplayDistrict: RunPlanDistrict;
  variant: 0 | 1 | 2 | 3;
  variantSeed: number;
  layoutVariant: 0 | 1 | 2 | 3;
  layoutSeed: number;
  landmarkId: string | null;
  transition: RunPlanTransition | null;
  traversalRhythm: RunPlanTraversalRhythm;
}

interface AuthoredSceneSlot {
  kind: RunPlanChunkKind;
  district: RunPlanDistrict;
  sceneFamily: string;
  traversalRhythm: RunPlanTraversalRhythm;
  landmarkId: string | null;
  fromDistrict?: RunPlanDistrict;
  toDistrict?: RunPlanDistrict;
}

const AUTHORED_CHAIN: readonly AuthoredSceneSlot[] = [
  { kind: 'district', district: 'market', sceneFamily: 'market-01/lantern-main-street', traversalRhythm: 'dense-hooks', landmarkId: null },
  { kind: 'district', district: 'market', sceneFamily: 'market-02/canopy-stall-lane', traversalRhythm: 'dense-hooks', landmarkId: null },
  { kind: 'district', district: 'market', sceneFamily: 'market-03/teahouse-signage', traversalRhythm: 'mixed', landmarkId: null },
  { kind: 'district', district: 'market', sceneFamily: 'market-04/paifang-market-court', traversalRhythm: 'mixed', landmarkId: 'paifang-lantern-court' },
  {
    kind: 'transition', district: 'rooftops', sceneFamily: 'transition/market-to-rooftops/climb-to-eaves',
    traversalRhythm: 'transition', landmarkId: null, fromDistrict: 'market', toDistrict: 'rooftops',
  },
  { kind: 'district', district: 'rooftops', sceneFamily: 'rooftops-01/low-tile-ridges', traversalRhythm: 'vertical-climb', landmarkId: null },
  { kind: 'district', district: 'rooftops', sceneFamily: 'rooftops-02/stepped-eaves', traversalRhythm: 'vertical-climb', landmarkId: null },
  { kind: 'district', district: 'rooftops', sceneFamily: 'rooftops-03/cross-street-roof-bridge', traversalRhythm: 'long-glide', landmarkId: 'cross-street-roof-bridge' },
  { kind: 'district', district: 'rooftops', sceneFamily: 'rooftops-04/open-high-ridge', traversalRhythm: 'long-glide', landmarkId: 'open-high-ridge' },
  {
    kind: 'transition', district: 'waterfront', sceneFamily: 'transition/rooftops-to-waterfront/descent-to-canal',
    traversalRhythm: 'transition', landmarkId: null, fromDistrict: 'rooftops', toDistrict: 'waterfront',
  },
  { kind: 'district', district: 'waterfront', sceneFamily: 'waterfront-01/narrow-canal', traversalRhythm: 'long-glide', landmarkId: null },
  { kind: 'district', district: 'waterfront', sceneFamily: 'waterfront-02/stone-bridge', traversalRhythm: 'mixed', landmarkId: 'stone-bridge' },
  { kind: 'district', district: 'waterfront', sceneFamily: 'waterfront-03/cargo-wharf', traversalRhythm: 'dense-hooks', landmarkId: 'cargo-wharf' },
  { kind: 'district', district: 'waterfront', sceneFamily: 'waterfront-04/lantern-boat-market', traversalRhythm: 'long-glide', landmarkId: 'lantern-boat-market' },
  {
    kind: 'transition', district: 'market', sceneFamily: 'transition/waterfront-to-market/canal-return-to-market',
    traversalRhythm: 'transition', landmarkId: null, fromDistrict: 'waterfront', toDistrict: 'market',
  },
];

const VARIANTS: readonly (0 | 1 | 2 | 3)[] = [0, 1, 2, 3];

// Preserve the baseline's deterministic variant cadence for gameplay-facing
// layout compatibility. The topology and identity still come from RunPlan;
// this only keeps the validated visual/anchor variant sequence stable while
// authored scene families are introduced.
function legacyVariantFromHash(seed: number, salt: number): 0 | 1 | 2 | 3 {
  return VARIANTS[mix(seed, salt) % VARIANTS.length]!;
}

function legacyVariantBlockExit(seed: number, blockIndex: number): 0 | 1 | 2 | 3 {
  return legacyVariantFromHash(seed, 0xa54ff53a ^ Math.imul(blockIndex, 0x27d4eb2f));
}

function legacyVariantBlock(seed: number, blockIndex: number, entryVariant: 0 | 1 | 2 | 3): Array<0 | 1 | 2 | 3> {
  const exitVariant = legacyVariantBlockExit(seed, blockIndex);
  const result: Array<0 | 1 | 2 | 3> = [];
  for (let slot = 0; slot < 31; slot += 1) {
    const previous = result[slot - 1] ?? entryVariant;
    const avoidThreeCycle = slot >= 3 ? result[slot - 3] : undefined;
    const avoidExit = slot === 30 ? exitVariant : undefined;
    let candidates = VARIANTS.filter((variant) => variant !== previous
      && variant !== avoidThreeCycle && variant !== avoidExit);
    if (candidates.length === 0) candidates = VARIANTS.filter((variant) => variant !== previous && variant !== avoidExit);
    if (candidates.length === 0) candidates = VARIANTS.filter((variant) => variant !== previous);
    const salt = 0x510e527f ^ Math.imul(blockIndex, 0x165667b1) ^ Math.imul(slot + 1, 0x9e3779b9);
    result.push(candidates[mix(seed, salt) % candidates.length]!);
  }
  result.push(exitVariant);
  return result;
}

function legacyVariantForChunk(seed: number, globalChunkIndex: number): 0 | 1 | 2 | 3 {
  const blockIndex = Math.floor(globalChunkIndex / 32);
  const slot = globalChunkIndex % 32;
  const entryVariant = blockIndex === 0 ? legacyVariantFromHash(seed, 0x243f6a88) : legacyVariantBlockExit(seed, blockIndex - 1);
  return legacyVariantBlock(seed, blockIndex, entryVariant)[slot]!;
}

function gameplayDistrictForChunk(seed: number, globalChunkIndex: number, authoredDistrict: RunPlanDistrict): RunPlanDistrict {
  // The baseline opening taught two market chunks, then both non-market
  // districts before the long-map chain's authored scenery takes over. Keep
  // that validated anchor envelope while the new topology remains authoritative
  // for chunk identity, renderer metadata, and scene recipes.
  if (globalChunkIndex < 2) return 'market';
  if (globalChunkIndex < 4) return normalizedSeed(seed) % 2 === 0 ? 'waterfront' : 'rooftops';
  if (globalChunkIndex < 6) return normalizedSeed(seed) % 2 === 0 ? 'rooftops' : 'waterfront';
  return authoredDistrict;
}

function normalizedSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 1;
  return Math.trunc(seed) >>> 0;
}

/** Small integer mixer with stable results across JS runtimes. */
function mix(seed: number, salt: number): number {
  let value = (normalizedSeed(seed) ^ (Math.trunc(salt) >>> 0)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function boundedChunkIndex(index: number): number {
  if (!Number.isFinite(index)) return index === Number.POSITIVE_INFINITY ? MAX_RUN_PLAN_CHUNK_INDEX : 0;
  return Math.min(MAX_RUN_PLAN_CHUNK_INDEX, Math.max(0, Math.floor(index)));
}

/** Resolve a world X coordinate directly to its non-negative chunk index. */
export function chunkIndexAtWorldX(x: number): number {
  if (x === Number.POSITIVE_INFINITY) return MAX_RUN_PLAN_CHUNK_INDEX;
  if (!Number.isFinite(x) || x <= 0) return 0;
  return boundedChunkIndex(Math.floor(x / RUN_PLAN_CHUNK_WIDTH));
}

function finiteWorldBoundary(value: number, fallback: number): number {
  if (value === Number.POSITIVE_INFINITY) return MAX_RUN_PLAN_WORLD_X;
  if (value === Number.NEGATIVE_INFINITY) return 0;
  if (!Number.isFinite(value)) return fallback;
  return Math.min(MAX_RUN_PLAN_WORLD_X, Math.max(0, value));
}

function seedForChunk(seed: number, globalChunkIndex: number, salt: number): number {
  // The index is deliberately part of both seeds, so a later chain is never
  // the same runtime object as an earlier chain even when its recipe family is
  // shared.  The mixer keeps the result finite and stable for extreme inputs.
  return mix(seed, (Math.trunc(globalChunkIndex) + salt) >>> 0);
}

function descriptorForIndex(seed: number, requestedIndex: number): RunPlanChunkDescriptor {
  const globalChunkIndex = boundedChunkIndex(requestedIndex);
  const chainIndex = Math.floor(globalChunkIndex / RUN_PLAN_CHAIN_LENGTH);
  const slotIndex = globalChunkIndex % RUN_PLAN_CHAIN_LENGTH;
  const authored = AUTHORED_CHAIN[slotIndex]!;
  const variantSeed = seedForChunk(seed, globalChunkIndex, 0x9e3779b9);
  const layoutSeed = seedForChunk(seed, globalChunkIndex, 0x7f4a7c15);
  const variant = legacyVariantForChunk(seed, globalChunkIndex);
  const layoutVariant = variant;
  const gameplayDistrict = gameplayDistrictForChunk(seed, globalChunkIndex, authored.district);
  const transition = authored.kind === 'transition'
    ? { fromDistrict: authored.fromDistrict!, toDistrict: authored.toDistrict! }
    : null;
  const startX = globalChunkIndex * RUN_PLAN_CHUNK_WIDTH;

  return {
    chunkId: `chain-${chainIndex}/${authored.sceneFamily}`,
    globalChunkIndex,
    chainIndex,
    slotIndex,
    startX,
    endX: startX + RUN_PLAN_CHUNK_WIDTH,
    kind: authored.kind,
    district: authored.district,
    fromDistrict: transition?.fromDistrict ?? null,
    toDistrict: transition?.toDistrict ?? null,
    sceneFamily: authored.sceneFamily,
    gameplayDistrict,
    variant,
    variantSeed,
    layoutVariant,
    layoutSeed,
    landmarkId: authored.landmarkId,
    transition,
    traversalRhythm: authored.traversalRhythm,
  };
}

/** Resolve any non-negative global chunk index without walking prior chunks. */
export function runPlanChunkAtIndex(seed: number, globalChunkIndex: number): RunPlanChunkDescriptor {
  return descriptorForIndex(seed, globalChunkIndex);
}

/** Resolve the chunk owning a world X coordinate. Negative X clamps to origin. */
export function runPlanChunkAtWorldX(seed: number, x: number): RunPlanChunkDescriptor {
  return descriptorForIndex(seed, chunkIndexAtWorldX(x));
}

/**
 * Return a finite, contiguous viewport slice. The result is capped even when
 * callers pass an enormous camera range, protecting renderers and pools.
 */
export function runPlanChunksInView(
  seed: number,
  left: number,
  right: number,
  maxChunks = RUN_PLAN_MAX_VIEW_CHUNKS,
): RunPlanChunkDescriptor[] {
  const safeLeft = finiteWorldBoundary(left, 0);
  const safeRight = finiteWorldBoundary(right, RUN_PLAN_CHUNK_WIDTH);
  const low = Math.min(safeLeft, safeRight);
  const high = Math.max(safeLeft, safeRight);
  const start = chunkIndexAtWorldX(low);
  const end = boundedChunkIndex(Math.ceil(high / RUN_PLAN_CHUNK_WIDTH) - 1);
  const count = Math.max(1, end - start + 1);
  const requestedLimit = Number.isFinite(maxChunks) ? Math.floor(maxChunks) : RUN_PLAN_MAX_VIEW_CHUNKS;
  const limit = Math.max(1, requestedLimit);
  const length = Math.min(count, limit);
  return Array.from({ length }, (_, offset) => descriptorForIndex(seed, start + offset));
}

/** Named facade for callers that prefer an object-shaped RunPlan API. */
export const RunPlan = Object.freeze({
  chunkIndexAtWorldX,
  chunkAtIndex: runPlanChunkAtIndex,
  chunkAtWorldX: runPlanChunkAtWorldX,
  chunksInView: runPlanChunksInView,
});
