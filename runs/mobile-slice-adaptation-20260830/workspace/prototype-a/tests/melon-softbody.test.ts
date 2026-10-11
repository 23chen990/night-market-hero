import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { MelonBody } from '../src/melon-softbody.js';

const finite = (values: ArrayLike<number>) => Array.from(values).every(Number.isFinite);

type SurfaceWithComponents = {
  rest: Float32Array;
  indices: Uint32Array;
  count: number;
  components: Int32Array;
};

function componentEdgeIncidence(surface: SurfaceWithComponents): number[] {
  const edges = new Map<string, number>();
  const pointKey = (component: number, index: number) => {
    const j = index * 3;
    return `${component}:${Math.round(surface.rest[j] * 1e6)}:${Math.round(surface.rest[j + 1] * 1e6)}:${Math.round(surface.rest[j + 2] * 1e6)}`;
  };
  for (let i = 0; i < surface.indices.length; i += 3) {
    for (const [a, b] of [[surface.indices[i], surface.indices[i + 1]], [surface.indices[i + 1], surface.indices[i + 2]], [surface.indices[i + 2], surface.indices[i]]]) {
      const component = surface.components[a];
      assert.equal(surface.components[b], component);
      const ka = pointKey(component, a), kb = pointKey(component, b);
      const edge = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  return [...edges.values()];
}

test('constructs independently with typed surface buffers and original origin', () => {
  const body = new MelonBody();
  assert.equal(body.origin.length, 2);
  assert.ok(finite(body.origin));
  assert.deepEqual(body.origin, new MelonBody({ tetSpacing: 0.42, tetLayers: 2 }).origin);
  assert.equal(body.componentCount, 1);
  assert.equal(body.topologyVersion, 0);
  for (const name of ['jelly', 'seeds', 'bubbles'] as const) {
    const surface = body.surfaces[name];
    assert.equal(surface.interleaved.length, surface.count * 6);
    assert.equal(surface.rest.length, surface.count * 3);
    assert.equal(surface.aux.length % surface.count, 0);
    assert.ok(surface.indices.length > 0);
    assert.ok(finite(surface.interleaved));
    assert.ok(finite(surface.rest));
  }
});

test('setPose rotates about the original COM while preserving material rest coordinates', () => {
  const body = new MelonBody({ tetSpacing: 0.42, tetLayers: 2, substeps: 4 });
  const before = body.surfaces.jelly.rest.slice();
  const beforeDynamic = body.surfaces.jelly.interleaved.slice();
  body.setPose(1.25, [0.12, 0.42, -0.08]);
  assert.deepEqual(body.surfaces.jelly.rest, before);
  assert.notDeepEqual(body.surfaces.jelly.interleaved, beforeDynamic);
  assert.ok(body.stats().shapeError < 1e-3);
});

test('impacts deform the surface and preserve finite volume after settling', () => {
  const body = new MelonBody({ tetSpacing: 0.42, tetLayers: 2, substeps: 4 });
  const before = body.surfaces.jelly.interleaved.slice();
  body.setPose(10, [0, 0, 0]);
  body.setMaterial({ damping: 0.9 });
  body.impulse([4, 7, -2]);
  for (let i = 0; i < 4; i++) body.step(1 / 60);
  assert.notDeepEqual(body.surfaces.jelly.interleaved, before);
  const peakShapeError = body.stats().shapeError;
  assert.ok(peakShapeError > 1e-4);
  for (let i = 0; i < 4; i++) body.step(1 / 60);
  assert.ok(body.stats().shapeError < peakShapeError);
  for (let i = 0; i < 90; i++) body.step(1 / 60);
  const stats = body.stats();
  assert.ok(Number.isFinite(stats.ke));
  assert.ok(stats.inverted === 0);
  assert.ok(stats.minTetRatio > 0);
});

test('cut conserves volume, creates capped independent fragments, and keeps seeded surfaces attached', () => {
  const body = new MelonBody({ tetSpacing: 0.42, tetLayers: 2, substeps: 4 });
  const pre = body.stats();
  const beforeSeeds = body.surfaces.seeds.count;
  assert.equal(body.cut([1, 0.19, 0.13], 0, 0.6), true);
  assert.equal(body.componentCount, 2);
  assert.equal(body.topologyVersion, 1);
  assert.ok(body.surfaces.jelly.indices.length > 0);
  assert.ok(body.surfaces.seeds.count >= beforeSeeds);
  assert.equal(body.surfaces.seeds.aux.length, body.surfaces.seeds.count * 2);
  assert.ok(Array.from(body.surfaces.seeds.indices).every(index => index < body.surfaces.seeds.count));
  assert.ok(finite(body.surfaces.seeds.interleaved));
  const post = body.stats();
  assert.ok(Math.abs(post.volRatio - pre.volRatio) < 0.03);
  assert.ok(post.minTetRatio > 0);
  body.step(1 / 60);
  assert.ok(finite(body.surfaces.jelly.interleaved));
});

test('cut caps close each fragment boundary and preserve original seed attachments', () => {
  const body = new MelonBody({ tetSpacing: 0.42, tetLayers: 2, substeps: 4 });
  assert.equal(body.cut([1, 0.19, 0.13], 0, 0.6), true);
  const jelly = body.surfaces.jelly as typeof body.surfaces.jelly & { components: Int32Array };
  assert.equal(jelly.components.length, jelly.count);
  const incidence = componentEdgeIncidence(jelly);
  assert.ok(incidence.length > 0);
  assert.ok(incidence.every(count => count === 2));
  const seeds = body.surfaces.seeds;
  assert.equal(seeds.aux.length, seeds.count * 2);
  assert.ok(Array.from(seeds.indices).every(index => index < seeds.count));
  const rest = seeds.rest.slice();
  body.step(1 / 60);
  assert.deepEqual(seeds.rest, rest);
  assert.ok(finite(seeds.interleaved));
});

test('grazing or out-of-body cuts fail transactionally', () => {
  const body = new MelonBody({ tetSpacing: 0.42, tetLayers: 2, substeps: 4 });
  const version = body.topologyVersion;
  const count = body.surfaces.jelly.count;
  assert.equal(body.cut([0.2, 0.1, 1], 100), false);
  assert.equal(body.topologyVersion, version);
  assert.equal(body.componentCount, 1);
  assert.equal(body.surfaces.jelly.count, count);
});

test('ground supports constrain downward crossings without underside teleportation', () => {
  const body = new MelonBody({ tetSpacing: 0.42, tetLayers: 2, substeps: 4 });
  body.setGroundSurfaces([{ minX: -4, maxX: 4, minZ: -4, maxZ: 4, y: 0 }]);
  body.setPose(2, [0.05, 0.1, -0.03]);
  body.setVelocity([0, -2, 0]);
  for (let i = 0; i < 180; i++) body.step(1 / 60);
  const stats = body.stats();
  assert.ok(stats.minY >= -1e-6);
  assert.ok(stats.contacts > 0);
  assert.ok(stats.inverted === 0);
});

test('nodes beneath an elevated support fall through to the flat floor', () => {
  const body = new MelonBody({ tetSpacing: 0.42, tetLayers: 2, substeps: 4 });
  body.setGroundSurfaces([{ minX: -4, maxX: 4, minZ: -4, maxZ: 4, y: 3 }]);
  body.setPose(2, [0, 0, 0]);
  body.setVelocity([0, -4, 0]);
  for (let i = 0; i < 180; i++) body.step(1 / 60);
  const stats = body.stats();
  assert.ok(stats.minY >= -1e-6);
  assert.ok(stats.minY < 1);
  assert.ok(stats.contacts > 0);
  assert.equal(stats.inverted, 0);
});

test('elevated support catches downward crossings without underside teleportation', () => {
  const body = new MelonBody({ tetSpacing: 0.42, tetLayers: 2, substeps: 4 });
  body.setGroundSurfaces([{ minX: -4, maxX: 4, minZ: -4, maxZ: 4, y: 3 }]);
  body.setPose(4.5, [0, 0, 0]);
  body.setVelocity([0, -4, 0]);
  for (let i = 0; i < 180; i++) body.step(1 / 60);
  const stats = body.stats();
  assert.ok(stats.minY >= 3 - 1e-6);
  assert.ok(stats.contacts > 0);
  assert.equal(stats.inverted, 0);
});

test('flat-floor fallback resolves nodes already below zero after an elastic projection', () => {
  const body = new MelonBody({ tetSpacing: 0.42, tetLayers: 2, substeps: 4 });
  body.setGroundSurfaces([{ minX: -4, maxX: 4, minZ: -4, maxZ: 4, y: 3 }]);
  body.setPose(0.3, [0, 0, 0]);
  body.step(1 / 60);
  const stats = body.stats();
  assert.ok(stats.minY >= -1e-6);
  assert.ok(stats.contacts > 0);
  assert.equal(stats.inverted, 0);
});

test('material settings change the response while fixed timestep remains bounded', () => {
  const soft = new MelonBody({ tetSpacing: 0.42, tetLayers: 2, substeps: 4 });
  const firm = new MelonBody({ tetSpacing: 0.42, tetLayers: 2, substeps: 4 });
  soft.setMaterial({ firmness: 0.05, damping: 0.1 });
  firm.setMaterial({ firmness: 0.95, damping: 0.8 });
  soft.impulse([5, 6, 0]);
  firm.impulse([5, 6, 0]);
  soft.step(1);
  firm.step(1);
  assert.ok(soft.stats().maxV <= 32 + 1e-6);
  assert.ok(firm.stats().maxV <= 32 + 1e-6);
  assert.notEqual(soft.stats().shapeError, firm.stats().shapeError);
  soft.setVelocity([1, 2, 3], [0.2, 0.1, -0.2]);
  soft.step(1 / 60);
  assert.ok(finite(soft.surfaces.jelly.interleaved));
});
