import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  CITY_CHUNK_WIDTH,
  MAX_CITY_CHUNKS_IN_VIEW,
  cityChunksInView,
  districtAtX,
  type CityChunk,
  type DistrictId,
} from '../src/district-world.ts';

function authoredChain(seed: number): CityChunk[] {
  return Array.from({ length: 15 }, (_, index) =>
    cityChunksInView(seed, index * CITY_CHUNK_WIDTH, (index + 1) * CITY_CHUNK_WIDTH)[0]!);
}

function visitDistricts(seed: number, count: number): DistrictId[] {
  return Array.from({ length: count }, (_, visitIndex) =>
    districtAtX(seed, visitIndex * CITY_CHUNK_WIDTH).id);
}

describe('district-world compatibility facade', () => {
  test('exposes the authoritative first chain with four districts and three transitions', () => {
    const chunks = authoredChain(1);

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
    assert.deepEqual(chunks.slice(5, 9).map((chunk) => chunk.district), ['rooftops', 'rooftops', 'rooftops', 'rooftops']);
    assert.deepEqual(chunks.slice(10, 14).map((chunk) => chunk.district), ['waterfront', 'waterfront', 'waterfront', 'waterfront']);
    assert.equal(chunks[4]!.kind, 'transition');
    assert.deepEqual([chunks[4]!.fromDistrict, chunks[4]!.toDistrict], ['market', 'rooftops']);
    assert.equal(chunks[9]!.kind, 'transition');
    assert.deepEqual([chunks[9]!.fromDistrict, chunks[9]!.toDistrict], ['rooftops', 'waterfront']);
    assert.equal(chunks[14]!.kind, 'transition');
    assert.deepEqual([chunks[14]!.fromDistrict, chunks[14]!.toDistrict], ['waterfront', 'market']);
  });

  test('keeps the legacy API shape and chunk width while exposing new metadata', () => {
    const chunk = authoredChain(73)[4]!;
    const descriptor = districtAtX(73, chunk.startX);

    assert.equal(CITY_CHUNK_WIDTH, 1_600);
    assert.equal(chunk.index, 4);
    assert.equal(chunk.endX - chunk.startX, CITY_CHUNK_WIDTH);
    assert.equal(chunk.layoutId, `${chunk.sceneFamily}#v${chunk.layoutVariant}`);
    assert.equal(descriptor.id, 'rooftops', 'transition compatibility district is the destination district');
    assert.equal(descriptor.kind, 'transition');
    assert.deepEqual(descriptor.transition, { fromDistrict: 'market', toDistrict: 'rooftops' });
  });

  test('keeps deterministic lookup and bounded viewport behavior', () => {
    const expected = cityChunksInView(1234, CITY_CHUNK_WIDTH * 2, CITY_CHUNK_WIDTH * 9);
    districtAtX(1234, CITY_CHUNK_WIDTH * 100);
    cityChunksInView(1234, -100, CITY_CHUNK_WIDTH);
    const reloaded = cityChunksInView(1234, CITY_CHUNK_WIDTH * 2, CITY_CHUNK_WIDTH * 9);

    assert.deepEqual(reloaded, expected);
    assert.ok(cityChunksInView(91, -2_000, 90_000).length <= MAX_CITY_CHUNKS_IN_VIEW);
    assert.equal(districtAtX(91, -1).id, 'market');
  });

  test('does not create a modulo-15 closed loop of chunk identities', () => {
    const chainZero = authoredChain(73);
    const chainOne = Array.from({ length: 15 }, (_, slotIndex) =>
      cityChunksInView(73, (15 + slotIndex) * CITY_CHUNK_WIDTH, (16 + slotIndex) * CITY_CHUNK_WIDTH)[0]!);

    assert.deepEqual(chainOne.map((chunk) => chunk.sceneFamily), chainZero.map((chunk) => chunk.sceneFamily));
    assert.ok(chainOne.every((chunk, index) => chunk.chainIndex === 1 && chunk.index !== chainZero[index]!.index));
    assert.ok(chainOne.some((chunk, index) => chunk.variantSeed !== chainZero[index]!.variantSeed));
    assert.notEqual(chainOne[0]!.chunkId, chainZero[0]!.chunkId);
  });

  test('keeps long-chain scene families varied without changing the three-district vocabulary', () => {
    const visits = visitDistricts(20260916, 45);
    assert.deepEqual(new Set(visits), new Set<DistrictId>(['market', 'rooftops', 'waterfront']));
    assert.ok(visits.some((district, index) => index > 0 && district === visits[index - 1]),
      'authored chains may contain adjacent same-district chunks; transition metadata disambiguates boundaries');
  });
});
