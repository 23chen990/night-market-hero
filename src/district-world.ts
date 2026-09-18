/**
 * Pure, seed-addressable scheduling for the first three night-city districts.
 *
 * A district visit owns two 1600px chunks.  The scheduler deliberately has no
 * mutable cursor: rendering, gameplay, pause/resume, and snapshot reloads can
 * all ask for the same world coordinate in any order and receive the same
 * descriptor.
 */

export const CITY_CHUNK_WIDTH = 1_600 as const;
export const MAX_CITY_CHUNKS_IN_VIEW = 8 as const;

export type DistrictId = 'market' | 'rooftops' | 'waterfront';

export interface DistrictDescriptor {
  id: DistrictId;
  name: string;
  visitIndex: number;
  variant: 0 | 1 | 2 | 3;
}

export interface CityChunk {
  index: number;
  startX: number;
  endX: number;
  district: DistrictId;
  name: string;
  variant: 0 | 1 | 2 | 3;
  layoutId: string;
}

const DISTRICT_NAMES: Record<DistrictId, string> = {
  market: '百摊闹市',
  rooftops: '青瓦屋脊',
  waterfront: '临河水市',
};

// Each post-introduction block is generated from its own hash salts. A fixed
// 32-visit block keeps lookup work bounded while the block index changes the
// route. The final district is chosen before generation so the next block can
// enforce a compatible boundary without walking the whole history.
const POST_INTRO_BLOCK_LENGTH = 32;
const VARIANT_BLOCK_LENGTH = 32;
const VARIANTS: readonly (0 | 1 | 2 | 3)[] = [0, 1, 2, 3];

const LAYOUT_IDS: Record<DistrictId, readonly string[]> = {
  market: ['market-awning-lane', 'market-steam-court', 'market-lantern-row', 'market-stall-turn'],
  rooftops: ['rooftops-blue-ridge', 'rooftops-tile-bridge', 'rooftops-drumline', 'rooftops-open-eave'],
  waterfront: ['waterfront-stone-bridge', 'waterfront-mast-crossing', 'waterfront-lantern-reflection', 'waterfront-ferry-turn'],
};

function normalizedSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 1;
  return Math.trunc(seed) >>> 0;
}

/** A small integer mixer; it is deterministic across JS runtimes. */
function mix(seed: number, salt: number): number {
  let value = (normalizedSeed(seed) ^ (Math.trunc(salt) >>> 0)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function chunkIndexAtX(x: number): number {
  if (!Number.isFinite(x)) return x === Number.POSITIVE_INFINITY ? 1_000_000_000 : 0;
  return Math.max(0, Math.min(1_000_000_000, Math.floor(Math.max(0, x) / CITY_CHUNK_WIDTH)));
}

function districtFromHash(seed: number, salt: number): DistrictId {
  return ['market', 'rooftops', 'waterfront'][mix(seed, salt) % 3] as DistrictId;
}

function districtBlockExit(seed: number, blockIndex: number): DistrictId {
  return districtFromHash(seed, 0x6d2b79f5 ^ Math.imul(blockIndex, 0x9e3779b9));
}

function districtBlockTail(seed: number, blockIndex: number): [DistrictId, DistrictId, DistrictId] {
  const exitDistrict = districtBlockExit(seed, blockIndex);
  const middleCandidates = ['market', 'rooftops', 'waterfront'].filter((district) => district !== exitDistrict) as DistrictId[];
  const middleSalt = 0x7f4a7c15 ^ Math.imul(blockIndex, 0x94d049bb);
  const middle = middleCandidates[mix(seed, middleSalt) % middleCandidates.length]!;
  const firstCandidates = ['market', 'rooftops', 'waterfront'].filter((district) => district !== middle) as DistrictId[];
  const first = firstCandidates[mix(seed, 0x299f31d0 ^ Math.imul(blockIndex, 0x369dea0f)) % firstCandidates.length]!;
  return [first, middle, exitDistrict];
}

function districtBlock(
  seed: number,
  blockIndex: number,
  entryDistrict: DistrictId,
  previousTail?: readonly DistrictId[],
): DistrictId[] {
  const tail = districtBlockTail(seed, blockIndex);
  const result: DistrictId[] = [];
  for (let slot = 0; slot < POST_INTRO_BLOCK_LENGTH - 3; slot += 1) {
    const previous = result[slot - 1] ?? entryDistrict;
    const avoidThreeCycle = slot >= 3 ? result[slot - 3] : undefined;
    const avoidBoundaryCycle = previousTail && slot < 3 ? previousTail[slot] : undefined;
    const avoidTail = slot === POST_INTRO_BLOCK_LENGTH - 4 ? tail[0] : undefined;
    let candidates = ['market', 'rooftops', 'waterfront'].filter((district) => district !== previous
      && district !== avoidThreeCycle && district !== avoidBoundaryCycle && district !== avoidTail) as DistrictId[];
    if (candidates.length === 0) {
      candidates = ['market', 'rooftops', 'waterfront'].filter((district) => district !== previous
        && district !== avoidBoundaryCycle && district !== avoidTail) as DistrictId[];
    }
    if (candidates.length === 0) candidates = ['market', 'rooftops', 'waterfront'].filter((district) => district !== previous) as DistrictId[];
    const salt = 0x3c6ef372 ^ Math.imul(blockIndex, 0x85ebca6b) ^ Math.imul(slot + 1, 0xc2b2ae35);
    result.push(candidates[mix(seed, salt) % candidates.length]!);
  }
  result.push(...tail);
  return result;
}

function variantFromHash(seed: number, salt: number): 0 | 1 | 2 | 3 {
  return VARIANTS[mix(seed, salt) % VARIANTS.length]!;
}

function variantBlockExit(seed: number, blockIndex: number): 0 | 1 | 2 | 3 {
  return variantFromHash(seed, 0xa54ff53a ^ Math.imul(blockIndex, 0x27d4eb2f));
}

function variantBlock(seed: number, blockIndex: number, entryVariant: 0 | 1 | 2 | 3): Array<0 | 1 | 2 | 3> {
  const exitVariant = variantBlockExit(seed, blockIndex);
  const result: Array<0 | 1 | 2 | 3> = [];
  for (let slot = 0; slot < VARIANT_BLOCK_LENGTH - 1; slot += 1) {
    const previous = result[slot - 1] ?? entryVariant;
    const avoidThreeCycle = slot >= 3 ? result[slot - 3] : undefined;
    const avoidExit = slot === VARIANT_BLOCK_LENGTH - 2 ? exitVariant : undefined;
    let candidates = VARIANTS.filter((variant) => variant !== previous
      && variant !== avoidThreeCycle && variant !== avoidExit);
    if (candidates.length === 0) {
      candidates = VARIANTS.filter((variant) => variant !== previous && variant !== avoidExit);
    }
    if (candidates.length === 0) candidates = VARIANTS.filter((variant) => variant !== previous);
    const salt = 0x510e527f ^ Math.imul(blockIndex, 0x165667b1) ^ Math.imul(slot + 1, 0x9e3779b9);
    result.push(candidates[mix(seed, salt) % candidates.length]!);
  }
  result.push(exitVariant);
  return result;
}

function districtForVisit(seed: number, visitIndex: number): DistrictId {
  const visit = Math.max(0, Math.floor(visitIndex));
  if (visit === 0) return 'market';

  // The first two visits after the market always cover both new districts,
  // while the seed selects which one appears first.
  const firstNewDistrict: DistrictId = normalizedSeed(seed) % 2 === 0 ? 'waterfront' : 'rooftops';
  if (visit === 1) return firstNewDistrict;
  if (visit === 2) return firstNewDistrict === 'rooftops' ? 'waterfront' : 'rooftops';

  const offset = visit - 3;
  const blockIndex = Math.floor(offset / POST_INTRO_BLOCK_LENGTH);
  const slot = offset % POST_INTRO_BLOCK_LENGTH;
  const entryDistrict = blockIndex === 0 ? districtForVisit(seed, 2) : districtBlockExit(seed, blockIndex - 1);
  const previousTail = blockIndex === 0 ? undefined : districtBlockTail(seed, blockIndex - 1);
  return districtBlock(seed, blockIndex, entryDistrict, previousTail)[slot]!;
}

function variantForChunk(seed: number, chunkIndex: number): 0 | 1 | 2 | 3 {
  const index = Math.max(0, Math.floor(chunkIndex));
  const blockIndex = Math.floor(index / VARIANT_BLOCK_LENGTH);
  const slot = index % VARIANT_BLOCK_LENGTH;
  const entryVariant = blockIndex === 0 ? variantFromHash(seed, 0x243f6a88) : variantBlockExit(seed, blockIndex - 1);
  return variantBlock(seed, blockIndex, entryVariant)[slot]!;
}

function descriptorForChunk(seed: number, chunkIndex: number): DistrictDescriptor {
  const visitIndex = Math.floor(chunkIndex / 2);
  const id = districtForVisit(seed, visitIndex);
  return { id, name: DISTRICT_NAMES[id], visitIndex, variant: variantForChunk(seed, chunkIndex) };
}

function chunkFromIndex(seed: number, index: number): CityChunk {
  const chunkIndex = Math.max(0, Math.min(1_000_000_000, Math.floor(index)));
  const descriptor = descriptorForChunk(seed, chunkIndex);
  const startX = chunkIndex * CITY_CHUNK_WIDTH;
  return {
    index: chunkIndex,
    startX,
    endX: startX + CITY_CHUNK_WIDTH,
    district: descriptor.id,
    name: descriptor.name,
    variant: descriptor.variant,
    layoutId: LAYOUT_IDS[descriptor.id][descriptor.variant]!,
  };
}

/** Return the descriptor owning a world X coordinate. Coordinates before the
 * playable origin resolve to the first market chunk. */
export function districtAtX(seed: number, x: number): DistrictDescriptor {
  return descriptorForChunk(seed, chunkIndexAtX(x));
}

/**
 * Return a contiguous, capped list of chunks intersecting the half-open
 * [left, right) range.  Capping protects the renderer from an accidental
 * unbounded camera/snapshot range while retaining the leading edge of the
 * requested viewport.
 */
export function cityChunksInView(seed: number, left: number, right: number): CityChunk[] {
  const finiteLeft = Number.isFinite(left) ? left : left === Number.POSITIVE_INFINITY ? 1_000_000_000 * CITY_CHUNK_WIDTH : 0;
  const finiteRight = Number.isFinite(right) ? right : right === Number.POSITIVE_INFINITY ? 1_000_000_000 * CITY_CHUNK_WIDTH : 0;
  const low = Math.min(finiteLeft, finiteRight);
  const high = Math.max(finiteLeft, finiteRight);
  const start = chunkIndexAtX(low);
  const end = Math.max(start, Math.min(1_000_000_000, Math.ceil(Math.max(0, high) / CITY_CHUNK_WIDTH) - 1));
  const count = end - start + 1;
  const first = start;
  let last = end;
  if (count > MAX_CITY_CHUNKS_IN_VIEW) {
    last = start + MAX_CITY_CHUNKS_IN_VIEW - 1;
  }
  return Array.from({ length: last - first + 1 }, (_, offset) => chunkFromIndex(seed, first + offset));
}
