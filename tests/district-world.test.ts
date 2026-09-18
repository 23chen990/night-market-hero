import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  CITY_CHUNK_WIDTH,
  MAX_CITY_CHUNKS_IN_VIEW,
  cityChunksInView,
  districtAtX,
  type DistrictId,
} from '../src/district-world.ts';

function visitDistricts(seed: number, count: number): DistrictId[] {
  return Array.from({ length: count }, (_, visitIndex) =>
    districtAtX(seed, visitIndex * 2 * CITY_CHUNK_WIDTH).id);
}

describe('night city district scheduler', () => {
  test('starts at market, visits rooftops and waterfront in seed-dependent order, and keeps visits two chunks long', () => {
    const seedOne = cityChunksInView(1, 0, CITY_CHUNK_WIDTH * 6);
    const seedTwo = cityChunksInView(2, 0, CITY_CHUNK_WIDTH * 6);

    assert.deepEqual(seedOne.slice(0, 2).map((chunk) => chunk.district), ['market', 'market']);
    assert.deepEqual(seedTwo.slice(0, 2).map((chunk) => chunk.district), ['market', 'market']);
    assert.deepEqual(seedOne.slice(2, 4).map((chunk) => chunk.district), [seedOne[2]!.district, seedOne[2]!.district]);
    assert.deepEqual(seedOne.slice(4, 6).map((chunk) => chunk.district), [seedOne[4]!.district, seedOne[4]!.district]);
    assert.deepEqual(new Set(seedOne.slice(2, 6).map((chunk) => chunk.district)), new Set(['rooftops', 'waterfront']));
    assert.deepEqual(new Set(seedTwo.slice(2, 6).map((chunk) => chunk.district)), new Set(['rooftops', 'waterfront']));
    assert.notEqual(seedOne[2]!.district, seedTwo[2]!.district, 'the first post-market visit must follow the seed');
  });

  test('does not immediately reuse a district or settle into a fixed three-theme loop', () => {
    const visits = visitDistricts(73, 15);
    for (let index = 1; index < visits.length; index += 1) {
      assert.notEqual(visits[index], visits[index - 1], `visit ${index} repeats the previous district`);
    }
    assert.notDeepEqual(visits.slice(3, 9), visits.slice(6, 12), 'the post-introduction schedule must not be a fixed three-theme loop');
  });

  test('uses independently hashed far blocks instead of repeating a short route table', () => {
    const visits = visitDistricts(73, 40);
    assert.notDeepEqual(visits.slice(3, 21), visits.slice(21, 39), 'far post-introduction visits must not repeat the old 18-visit table');

    const nearChunks = cityChunksInView(73, 0, CITY_CHUNK_WIDTH * 8);
    const farChunks = cityChunksInView(73, CITY_CHUNK_WIDTH * 8, CITY_CHUNK_WIDTH * 16);
    assert.notDeepEqual(
      nearChunks.map((chunk) => chunk.variant),
      farChunks.map((chunk) => chunk.variant),
      'far chunks must not reuse a fixed variant cycle',
    );
  });

  test('uses distinct neighboring variants and layout ids while keeping lookup bounded', () => {
    const chunks = cityChunksInView(91, -2_000, 90_000);
    assert.ok(chunks.length <= MAX_CITY_CHUNKS_IN_VIEW);
    assert.ok(chunks.length > 0);
    for (let index = 1; index < chunks.length; index += 1) {
      assert.equal(chunks[index]!.index, chunks[index - 1]!.index + 1);
      assert.notEqual(chunks[index]!.variant, chunks[index - 1]!.variant);
      assert.notEqual(chunks[index]!.layoutId, chunks[index - 1]!.layoutId);
    }
    for (const chunk of chunks) {
      assert.equal(chunk.endX - chunk.startX, CITY_CHUNK_WIDTH);
      assert.equal(districtAtX(91, chunk.startX).id, chunk.district);
      assert.equal(districtAtX(91, chunk.startX).variant, chunk.variant);
    }
  });

  test('is deterministic regardless of call order and reload', () => {
    const expected = cityChunksInView(1234, CITY_CHUNK_WIDTH * 2, CITY_CHUNK_WIDTH * 9);
    districtAtX(1234, CITY_CHUNK_WIDTH * 100);
    cityChunksInView(1234, -100, CITY_CHUNK_WIDTH);
    const reloaded = cityChunksInView(1234, CITY_CHUNK_WIDTH * 2, CITY_CHUNK_WIDTH * 9);
    assert.deepEqual(reloaded, expected);
  });

  test('keeps a long endless route varied without falling into a short repeated map loop', () => {
    const visits = visitDistricts(20260916, 256);
    for (let index = 1; index < visits.length; index += 1) {
      assert.notEqual(visits[index], visits[index - 1], `visit ${index} immediately repeats its district`);
    }
    const visitProfiles = Array.from({ length: 256 }, (_, visitIndex) => {
      const chunk = cityChunksInView(20260916, visitIndex * 2 * CITY_CHUNK_WIDTH, (visitIndex * 2 + 1) * CITY_CHUNK_WIDTH)[0]!;
      return `${chunk.district}:${chunk.variant}:${chunk.layoutId}`;
    });
    const windows = new Set<string>();
    for (let index = 0; index <= visitProfiles.length - 12; index += 1) {
      const signature = visitProfiles.slice(index, index + 12).join('>');
      assert.ok(!windows.has(signature), `12-visit route window repeats at visit ${index}`);
      windows.add(signature);
    }
    assert.deepEqual(new Set(visits), new Set<DistrictId>(['market', 'rooftops', 'waterfront']));
  });
});
