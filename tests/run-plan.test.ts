import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  RUN_PLAN_CHAIN_LENGTH,
  RUN_PLAN_CHUNK_WIDTH,
  RUN_PLAN_MAX_VIEW_CHUNKS,
  MAX_RUN_PLAN_CHUNK_INDEX,
  chunkIndexAtWorldX,
  runPlanChunkAtIndex,
  runPlanChunkAtWorldX,
  runPlanChunksInView,
  type RunPlanChunkDescriptor,
} from '../src/run-plan.ts';

const SEED = 20260919;

function firstChain(): RunPlanChunkDescriptor[] {
  return Array.from({ length: RUN_PLAN_CHAIN_LENGTH }, (_, globalChunkIndex) =>
    runPlanChunkAtIndex(SEED, globalChunkIndex));
}

describe('authoritative long-map run plan', () => {
  test('defines the first chain as four districts, three transitions, and four districts', () => {
    const chunks = firstChain();

    assert.deepEqual(chunks.map((chunk) => chunk.sceneFamily), [
      'market-01/lantern-main-street',
      'market-02/canopy-stall-lane',
      'market-03/teahouse-signage',
      'market-04/paifang-market-court',
      'transition/market-to-rooftops/climb-to-eaves',
      'rooftops-01/low-tile-ridges',
      'rooftops-02/stepped-eaves',
      'rooftops-03/cross-street-roof-bridge',
      'rooftops-04/open-high-ridge',
      'transition/rooftops-to-waterfront/descent-to-canal',
      'waterfront-01/narrow-canal',
      'waterfront-02/stone-bridge',
      'waterfront-03/cargo-wharf',
      'waterfront-04/lantern-boat-market',
      'transition/waterfront-to-market/canal-return-to-market',
    ]);
    assert.deepEqual(chunks.slice(0, 4).map((chunk) => chunk.district), ['market', 'market', 'market', 'market']);
    assert.equal(chunks[4]!.kind, 'transition');
    assert.deepEqual([chunks[4]!.fromDistrict, chunks[4]!.toDistrict], ['market', 'rooftops']);
    assert.deepEqual(chunks.slice(5, 9).map((chunk) => chunk.district), ['rooftops', 'rooftops', 'rooftops', 'rooftops']);
    assert.equal(chunks[9]!.kind, 'transition');
    assert.deepEqual([chunks[9]!.fromDistrict, chunks[9]!.toDistrict], ['rooftops', 'waterfront']);
    assert.deepEqual(chunks.slice(10, 14).map((chunk) => chunk.district), ['waterfront', 'waterfront', 'waterfront', 'waterfront']);
    assert.equal(chunks[14]!.kind, 'transition');
    assert.deepEqual([chunks[14]!.fromDistrict, chunks[14]!.toDistrict], ['waterfront', 'market']);
  });

  test('is deterministic for repeated and out-of-order queries', () => {
    const expected = runPlanChunkAtIndex(SEED, 37);
    runPlanChunkAtIndex(SEED, 4_000_000);
    runPlanChunkAtWorldX(SEED, 0);
    assert.deepEqual(runPlanChunkAtIndex(SEED, 37), expected);
    assert.deepEqual(runPlanChunksInView(SEED, 4 * RUN_PLAN_CHUNK_WIDTH, 13 * RUN_PLAN_CHUNK_WIDTH),
      runPlanChunksInView(SEED, 4 * RUN_PLAN_CHUNK_WIDTH, 13 * RUN_PLAN_CHUNK_WIDTH));
  });

  test('is directly addressable from world X without walking from the origin', () => {
    const chunk = runPlanChunkAtWorldX(SEED, 123 * RUN_PLAN_CHUNK_WIDTH + 17);
    assert.equal(chunk.globalChunkIndex, 123);
    assert.equal(chunk.startX, 123 * RUN_PLAN_CHUNK_WIDTH);
    assert.equal(chunk.endX, 124 * RUN_PLAN_CHUNK_WIDTH);
    assert.equal(chunk.chunkId, `chain-${chunk.chainIndex}/${chunk.sceneFamily}`);
  });

  test('caps viewport queries and clamps negative coordinates to the world origin', () => {
    const chunks = runPlanChunksInView(SEED, -10_000, Number.POSITIVE_INFINITY);
    assert.ok(chunks.length <= RUN_PLAN_MAX_VIEW_CHUNKS);
    assert.equal(chunks[0]!.globalChunkIndex, 0);
    assert.equal(chunkIndexAtWorldX(-1), 0);
    assert.equal(runPlanChunkAtWorldX(SEED, -1).globalChunkIndex, 0);
  });

  test('keeps extreme finite coordinates addressable without non-finite positions', () => {
    const chunk = runPlanChunkAtWorldX(SEED, Number.MAX_VALUE);
    assert.ok(Number.isFinite(chunk.startX));
    assert.ok(Number.isFinite(chunk.endX));
    assert.ok(Number.isFinite(chunk.layoutSeed));
  });

  test('keeps the maximum chunk width exact at the finite address limit', () => {
    const chunk = runPlanChunkAtIndex(SEED, MAX_RUN_PLAN_CHUNK_INDEX);
    assert.equal(chunk.endX - chunk.startX, RUN_PLAN_CHUNK_WIDTH);
    assert.ok(Number.isSafeInteger(chunk.startX));
    assert.ok(Number.isSafeInteger(chunk.endX));
  });

  test('keeps gameplay compatibility projection out of the topology descriptor', () => {
    assert.equal('gameplayDistrict' in runPlanChunkAtIndex(SEED, 2), false);
  });

  test('does not turn the next chain into the same chunk instance', () => {
    const first = runPlanChunkAtIndex(SEED, 0);
    const next = runPlanChunkAtIndex(SEED, RUN_PLAN_CHAIN_LENGTH);

    assert.equal(first.chainIndex, 0);
    assert.equal(next.chainIndex, 1);
    assert.equal(first.slotIndex, next.slotIndex);
    assert.equal(first.sceneFamily, next.sceneFamily);
    assert.notEqual(first.chunkId, next.chunkId);
    assert.notEqual(first.variantSeed, next.variantSeed);
    assert.notEqual(first.layoutSeed, next.layoutSeed);
  });

  test('exposes traversal rhythm and landmark metadata without changing gameplay state', () => {
    const chunks = firstChain();
    assert.equal(chunks[0]!.traversalRhythm, 'dense-hooks');
    assert.equal(chunks[5]!.traversalRhythm, 'vertical-climb');
    assert.equal(chunks[10]!.traversalRhythm, 'long-glide');
    assert.equal(chunks[3]!.landmarkId, 'paifang-lantern-court');
    assert.equal(chunks[7]!.landmarkId, 'cross-street-roof-bridge');
    assert.equal(chunks[13]!.landmarkId, 'lantern-boat-market');
  });
});
