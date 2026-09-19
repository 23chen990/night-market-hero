/**
 * Compatibility facade for the legacy district-world API.
 *
 * RunPlan is the only authority for long-map ordering and chunk identity.
 * This module keeps the exports consumed by game-core and the panorama
 * renderer while adapting RunPlan descriptors to their historical shapes.
 */

import {
  RUN_PLAN_CHUNK_WIDTH,
  RUN_PLAN_MAX_VIEW_CHUNKS,
  chunkIndexAtWorldX,
  runPlanChunkAtWorldX,
  runPlanChunksInView,
  type RunPlanChunkDescriptor,
  type RunPlanDistrict,
} from './run-plan.ts';

export const CITY_CHUNK_WIDTH = RUN_PLAN_CHUNK_WIDTH;
export const MAX_CITY_CHUNKS_IN_VIEW = RUN_PLAN_MAX_VIEW_CHUNKS;

export type DistrictId = RunPlanDistrict;

export interface DistrictDescriptor {
  id: DistrictId;
  name: string;
  visitIndex: number;
  variant: RunPlanChunkDescriptor['variant'];
  kind: RunPlanChunkDescriptor['kind'];
  chunkId: string;
  globalChunkIndex: number;
  chainIndex: number;
  sceneFamily: string;
  fromDistrict: DistrictId | null;
  toDistrict: DistrictId | null;
  transition: RunPlanChunkDescriptor['transition'];
  traversalRhythm: RunPlanChunkDescriptor['traversalRhythm'];
}

export interface CityChunk extends RunPlanChunkDescriptor {
  /** Historical alias retained for renderer/gameplay callers. */
  index: number;
  name: string;
  /** Gameplay-only projection retained for the existing endless anchor layout. */
  gameplayDistrict: DistrictId;
  /** Stable layout token consumed by endlessAnchorLayout. */
  layoutId: string;
}

const DISTRICT_NAMES: Record<DistrictId, string> = {
  market: '百摊闹市',
  rooftops: '青瓦屋脊',
  waterfront: '临河水市',
};

const COMPATIBILITY_VARIANTS: readonly (0 | 1 | 2 | 3)[] = [0, 1, 2, 3];

function normalizedCompatibilitySeed(seed: number): number {
  if (!Number.isFinite(seed)) return 1;
  return Math.trunc(seed) >>> 0;
}

function compatibilityMix(seed: number, salt: number): number {
  let value = (normalizedCompatibilitySeed(seed) ^ (Math.trunc(salt) >>> 0)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function compatibilityVariantFromHash(seed: number, salt: number): 0 | 1 | 2 | 3 {
  return COMPATIBILITY_VARIANTS[compatibilityMix(seed, salt) % COMPATIBILITY_VARIANTS.length]!;
}

function compatibilityVariantBlockExit(seed: number, blockIndex: number): 0 | 1 | 2 | 3 {
  return compatibilityVariantFromHash(seed, 0xa54ff53a ^ Math.imul(blockIndex, 0x27d4eb2f));
}

function compatibilityVariantBlock(seed: number, blockIndex: number, entryVariant: 0 | 1 | 2 | 3): Array<0 | 1 | 2 | 3> {
  const exitVariant = compatibilityVariantBlockExit(seed, blockIndex);
  const result: Array<0 | 1 | 2 | 3> = [];
  for (let slot = 0; slot < 31; slot += 1) {
    const previous = result[slot - 1] ?? entryVariant;
    const avoidThreeCycle = slot >= 3 ? result[slot - 3] : undefined;
    const avoidExit = slot === 30 ? exitVariant : undefined;
    let candidates = COMPATIBILITY_VARIANTS.filter((variant) => variant !== previous
      && variant !== avoidThreeCycle && variant !== avoidExit);
    if (candidates.length === 0) candidates = COMPATIBILITY_VARIANTS.filter((variant) => variant !== previous && variant !== avoidExit);
    if (candidates.length === 0) candidates = COMPATIBILITY_VARIANTS.filter((variant) => variant !== previous);
    const salt = 0x510e527f ^ Math.imul(blockIndex, 0x165667b1) ^ Math.imul(slot + 1, 0x9e3779b9);
    result.push(candidates[compatibilityMix(seed, salt) % candidates.length]!);
  }
  result.push(exitVariant);
  return result;
}

function compatibilityVariantForChunk(seed: number, globalChunkIndex: number): 0 | 1 | 2 | 3 {
  const blockIndex = Math.floor(globalChunkIndex / 32);
  const slot = globalChunkIndex % 32;
  const entryVariant = blockIndex === 0
    ? compatibilityVariantFromHash(seed, 0x243f6a88)
    : compatibilityVariantBlockExit(seed, blockIndex - 1);
  return compatibilityVariantBlock(seed, blockIndex, entryVariant)[slot]!;
}

function gameplayDistrictForChunk(seed: number, globalChunkIndex: number, authoredDistrict: DistrictId): DistrictId {
  // Preserve the validated opening anchor envelope without making it part of
  // RunPlan topology or scene identity.
  if (globalChunkIndex < 2) return 'market';
  if (globalChunkIndex < 4) return normalizedCompatibilitySeed(seed) % 2 === 0 ? 'waterfront' : 'rooftops';
  if (globalChunkIndex < 6) return normalizedCompatibilitySeed(seed) % 2 === 0 ? 'rooftops' : 'waterfront';
  return authoredDistrict;
}

// These are the legacy gameplay layout tokens, retained only as a compatibility
// projection for endlessAnchorLayout. RunPlan sceneFamily remains authoritative
// for visual recipes; keeping these tuned tokens avoids changing the validated
// anchor envelope while the new topology is introduced.
const GAMEPLAY_LAYOUT_IDS: Record<DistrictId, readonly string[]> = {
  market: ['market-awning-lane', 'market-steam-court', 'market-lantern-row', 'market-stall-turn'],
  rooftops: ['rooftops-blue-ridge', 'rooftops-tile-bridge', 'rooftops-drumline', 'rooftops-open-eave'],
  waterfront: ['waterfront-stone-bridge', 'waterfront-mast-crossing', 'waterfront-lantern-reflection', 'waterfront-ferry-turn'],
};

function descriptorToDistrict(seed: number, descriptor: RunPlanChunkDescriptor): DistrictDescriptor {
  return {
    id: descriptor.district,
    name: DISTRICT_NAMES[descriptor.district],
    // The old API called this a visit index.  Keeping it addressable by the
    // global chunk index avoids inventing a second visit scheduler now that
    // authored transitions occupy their own chunks.
    visitIndex: descriptor.globalChunkIndex,
    variant: compatibilityVariantForChunk(seed, descriptor.globalChunkIndex),
    kind: descriptor.kind,
    chunkId: descriptor.chunkId,
    globalChunkIndex: descriptor.globalChunkIndex,
    chainIndex: descriptor.chainIndex,
    sceneFamily: descriptor.sceneFamily,
    fromDistrict: descriptor.fromDistrict,
    toDistrict: descriptor.toDistrict,
    transition: descriptor.transition,
    traversalRhythm: descriptor.traversalRhythm,
  };
}

function descriptorToChunk(seed: number, descriptor: RunPlanChunkDescriptor): CityChunk {
  const gameplayDistrict = gameplayDistrictForChunk(seed, descriptor.globalChunkIndex, descriptor.district);
  const variant = compatibilityVariantForChunk(seed, descriptor.globalChunkIndex);
  return {
    ...descriptor,
    variant,
    layoutVariant: variant,
    index: descriptor.globalChunkIndex,
    name: DISTRICT_NAMES[descriptor.district],
    gameplayDistrict,
    layoutId: GAMEPLAY_LAYOUT_IDS[gameplayDistrict][variant]!,
  };
}

/** Return the destination-compatible descriptor owning world X. */
export function districtAtX(seed: number, x: number): DistrictDescriptor {
  return descriptorToDistrict(seed, runPlanChunkAtWorldX(seed, x));
}

/**
 * Return the bounded RunPlan viewport slice in the historical CityChunk shape.
 * No independent random scheduler or mutable cursor lives here.
 */
export function cityChunksInView(seed: number, left: number, right: number): CityChunk[] {
  return runPlanChunksInView(seed, left, right).map((descriptor) => descriptorToChunk(seed, descriptor));
}

/** Expose the shared coordinate helper for diagnostics without new scheduling. */
export { chunkIndexAtWorldX };
