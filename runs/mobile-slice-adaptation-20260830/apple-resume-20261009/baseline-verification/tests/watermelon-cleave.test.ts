import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';

async function cleaveModule() {
  const implementation = await import('../src/watermelon-cleave').catch(() => null);
  assert.ok(implementation, 'the single-watermelon cleave preview is not implemented');
  return implementation;
}

function volume(geometry: THREE.BufferGeometry): number {
  const positions = geometry.getAttribute('position');
  let signed = 0;
  for (let i = 0; i < positions.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(positions, i);
    const b = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(positions, i + 2);
    signed += a.dot(b.cross(c)) / 6;
  }
  return Math.abs(signed);
}

test('WATERMELON-CLEAVE halves are equal sealed parts of the same original sphere', async () => {
  const { createWatermelonGeometry, WATERMELON } = await cleaveModule();
  const { source, halves, caps } = createWatermelonGeometry();
  const sourceVolume = volume(source.toNonIndexed());
  const volumes = halves.map(volume);
  assert.ok(Math.abs(volumes[0] - volumes[1]) < 1e-5, 'halves must have equal volume');
  assert.ok(Math.abs(volumes[0] + volumes[1] - sourceVolume) < 1e-5, 'reassembly must conserve the original sphere');
  for (const [index, cap] of caps.entries()) {
    const vertices = cap.getAttribute('position');
    const normals = cap.getAttribute('normal');
    assert.ok(vertices.count > 48, 'both halves need an actual sealed face');
    for (let i = 0; i < vertices.count; i++) {
      assert.ok(Math.abs(vertices.getX(i)) < 1e-6, 'cap stays on the shared x=0 knife plane');
      assert.equal(normals.getX(i), index === 0 ? 1 : -1);
    }
  }
  const box = new THREE.Box3();
  for (const half of halves) box.union(new THREE.Box3().setFromBufferAttribute(half.getAttribute('position') as THREE.BufferAttribute));
  assert.ok(Math.abs(box.max.y - WATERMELON.radius) < 1e-6);
  assert.ok(Math.abs(box.min.y + WATERMELON.radius) < 1e-6);
  source.dispose(); halves.forEach(g => g.dispose()); caps.forEach(g => g.dispose());
});

test('WATERMELON-CLEAVE blade crosses the centre before either half can open', async () => {
  const { sampleCleave, CLEAVE_TIMING, WATERMELON } = await cleaveModule();
  const crossing = CLEAVE_TIMING.center;
  for (const time of [0, crossing / 2, crossing - 0.0001, crossing]) {
    const frame = sampleCleave(time);
    assert.ok(frame.knife.edgeY >= WATERMELON.centerY - 1e-8);
    assert.equal(frame.halves[0].position[0], 0);
    assert.equal(frame.halves[1].position[0], 0);
    assert.equal(frame.halves[0].rotationZ, 0);
    assert.equal(frame.halves[1].rotationZ, 0);
  }
  const through = sampleCleave(crossing + 0.05);
  assert.ok(through.knife.edgeY < WATERMELON.centerY, 'visible cutting edge must pass the centre');
  assert.ok(through.halves[0].position[0] < 0);
  assert.ok(through.halves[1].position[0] > 0);
  assert.ok(Math.abs(through.halves[0].position[0] + through.halves[1].position[0]) < 1e-8);
  assert.deepEqual(through.knife.planeNormal, [1, 0, 0]);
  assert.equal(through.knife.position[0], 0, 'blade stays on the original centre plane');
});

test('WATERMELON-CLEAVE has a continuous readable stroke and no hit stop', async () => {
  const { sampleCleave, CLEAVE_TIMING } = await cleaveModule();
  let previous = sampleCleave(0);
  for (let i = 1; i <= 120; i++) {
    const time = i / 120;
    const frame = sampleCleave(time);
    if (time < CLEAVE_TIMING.strokeEnd) assert.ok(frame.knife.edgeY < previous.knife.edgeY, 'the knife must keep advancing through the stroke');
    assert.ok(Math.abs(frame.knife.edgeY - previous.knife.edgeY) < 0.12, 'blade movement cannot teleport at the centre');
    assert.ok(Math.abs(frame.halves[1].position[0] - previous.halves[1].position[0]) < 0.05, 'halves cannot pop apart');
    previous = frame;
  }
  assert.ok(CLEAVE_TIMING.center >= 0.18);
  assert.ok(CLEAVE_TIMING.opening >= 0.2);
});

test('WATERMELON-CLEAVE rolled halves remain above the actual tabletop', async () => {
  const { sampleCleave, createWatermelonGeometry, WATERMELON, CLEAVE_TIMING } = await cleaveModule();
  const geometry = createWatermelonGeometry();
  for (let step = 0; step <= Math.ceil(CLEAVE_TIMING.total * 120); step++) {
    const frame = sampleCleave(Math.min(step / 120, CLEAVE_TIMING.total));
    const bounds: THREE.Box3[] = [];
    for (let i = 0; i < 2; i++) {
      const half = frame.halves[i];
      const matrix = new THREE.Matrix4().makeRotationZ(half.rotationZ).setPosition(...half.position);
      const vertices = geometry.halves[i].getAttribute('position');
      const box = new THREE.Box3();
      let bottom = Infinity;
      for (let vertex = 0; vertex < vertices.count; vertex++) {
        const point = new THREE.Vector3().fromBufferAttribute(vertices, vertex).applyMatrix4(matrix);
        bottom = Math.min(bottom, point.y); box.expandByPoint(point);
      }
      bounds.push(box);
      assert.ok(bottom >= WATERMELON.tableTop - 1e-6, `half ${i} penetrated table at ${step / 120}s`);
    }
    assert.ok(bounds[0].max.x <= bounds[1].min.x + 1e-6, `opened halves intersect at ${step / 120}s`);
  }
  geometry.source.dispose(); geometry.halves.forEach(g => g.dispose()); geometry.caps.forEach(g => g.dispose());
});

test('WATERMELON-CLEAVE actual knife mesh lower surfaces match the centre-crossing edge', async () => {
  const { createCleaveKnifeGeometry, sampleCleave, CLEAVE_TIMING, WATERMELON } = await cleaveModule();
  assert.equal(typeof createCleaveKnifeGeometry, 'function', 'actual knife geometry needs a shared centre-plane definition');
  const geometry = createCleaveKnifeGeometry();
  for (const part of [geometry.blade, geometry.edge]) {
    const mesh = new THREE.Mesh(part);
    mesh.position.set(...sampleCleave(CLEAVE_TIMING.center).knife.position);
    assert.ok(Math.abs(new THREE.Box3().setFromObject(mesh).min.y - WATERMELON.centerY) < 1e-6, 'actual blade bottom must meet the centre exactly');
    part.dispose();
  }
});

test('WATERMELON-CLEAVE preserves several advancing poses even when a rendered frame is late', async () => {
  const { WatermelonCleaveController, CLEAVE_TIMING } = await cleaveModule();
  const demo = new WatermelonCleaveController();
  assert.equal(typeof demo.advanceVisible, 'function', 'a visible stroke needs a bounded presentation frame step');
  demo.start();
  let previous = demo.getState().frame.knife.edgeY;
  for (let frame = 0; frame < 4; frame++) {
    demo.advanceVisible(0.18, 1);
    const state = demo.getState();
    assert.ok(state.elapsed < CLEAVE_TIMING.center, 'one late frame must not skip the whole cut-in phase');
    assert.ok(state.frame.knife.edgeY < previous, 'the blade keeps advancing without hit stop');
    previous = state.frame.knife.edgeY;
  }
});

test('WATERMELON-CLEAVE waits for input, settles, and replays the same assembled watermelon', async () => {
  const { WatermelonCleaveController, CLEAVE_TIMING } = await cleaveModule();
  const demo = new WatermelonCleaveController();
  demo.advance(1);
  assert.equal(demo.getState().status, 'ready');
  assert.equal(demo.getState().elapsed, 0);
  assert.equal(demo.start(), true);
  assert.equal(demo.start(), false, 'a second input cannot restart an active cut');
  demo.advance(CLEAVE_TIMING.total + 1);
  assert.equal(demo.getState().status, 'settled');
  assert.equal(demo.start(), true);
  assert.equal(demo.getState().elapsed, 0);
  assert.equal(demo.getState().cycles, 2);
  assert.equal(demo.getState().frame.halves[1].position[0], 0);
  demo.reset();
  assert.equal(demo.getState().status, 'ready');
});
