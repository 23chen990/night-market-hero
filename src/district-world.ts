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
  /** Stable layout token consumed by endlessAnchorLayout. */
  layoutId: string;
}

const DISTRICT_NAMES: Record<DistrictId, string> = {
  market: '百摊闹市',
  rooftops: '青瓦屋脊',
  waterfront: '临河水市',
};

function descriptorToDistrict(descriptor: RunPlanChunkDescriptor): DistrictDescriptor {
  return {
    id: descriptor.district,
    name: DISTRICT_NAMES[descriptor.district],
    // The old API called this a visit index.  Keeping it addressable by the
    // global chunk index avoids inventing a second visit scheduler now that
    // authored transitions occupy their own chunks.
    visitIndex: descriptor.globalChunkIndex,
    variant: descriptor.variant,
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

function descriptorToChunk(descriptor: RunPlanChunkDescriptor): CityChunk {
  return {
    ...descriptor,
    index: descriptor.globalChunkIndex,
    name: DISTRICT_NAMES[descriptor.district],
    layoutId: `${descriptor.sceneFamily}#v${descriptor.layoutVariant}`,
  };
}

/** Return the destination-compatible descriptor owning world X. */
export function districtAtX(seed: number, x: number): DistrictDescriptor {
  return descriptorToDistrict(runPlanChunkAtWorldX(seed, x));
}

/**
 * Return the bounded RunPlan viewport slice in the historical CityChunk shape.
 * No independent random scheduler or mutable cursor lives here.
 */
export function cityChunksInView(seed: number, left: number, right: number): CityChunk[] {
  return runPlanChunksInView(seed, left, right).map(descriptorToChunk);
}

/** Expose the shared coordinate helper for diagnostics without new scheduling. */
export { chunkIndexAtWorldX };
