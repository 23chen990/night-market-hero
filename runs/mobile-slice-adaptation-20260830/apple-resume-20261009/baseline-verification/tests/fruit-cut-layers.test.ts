import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { SliceSimulation, type FoodStyle } from '../src/game-core';
import { ThreeCutVisualManager } from '../src/three-cut-visuals';
import { ThreePresentationModel, type PresentationFrame } from '../src/three-presentation';

function setup(style: FoodStyle) {
  const state = new SliceSimulation(31, 1).getState();
  const base = new ThreePresentationModel().sync(state);
  const visual = { id: 'fruit', kind: 'sigil' as const, skinKind: style === 'banana' ? 'log' as const : 'crystal' as const,
    foodStyle: style, phase: 'intact' as const, position: [2, 2, 0] as [number, number, number], width: .9,
    height: .8, depth: .6, radius: .4, falling: false, rotationZ: .17, halves: [] };
  const frame: PresentationFrame = { ...base, cuttables: [visual] };
  const manager = new ThreeCutVisualManager();
  manager.sync(frame, state);
  const cut = () => manager.sync({ ...frame, cuttables: [{ ...visual, phase: 'cut',
    cutPlane: { normal: [.8, .6, 0], point: [0, 0, 0], rotationZ: .17 },
    halves: [0, 1].map(index => ({ id: index === 0 ? 'halfA' : 'halfB', position: visual.position,
      rotationZ: 0, rotationDepth: 0, capMaterialId: `cap-${index}`, closedGeometry: true })) }] }, state);
  const body = (half = 'halfA') => manager.root.getObjectByName(`closed-body:fruit:${half}`) as THREE.Mesh;
  return { manager, cut, body, reset: () => manager.sync(frame, state) };
}

test('FRUIT-CAP actual contour carries the thin peel ring for each fruit', () => {
  for (const style of ['apple', 'orange-segment', 'banana', 'coconut'] as const) {
    const { manager, cut, body } = setup(style); cut();
    for (const half of ['halfA', 'halfB']) {
      const mesh = body(half), uv = mesh.geometry.getAttribute('uv');
      for (const group of mesh.geometry.groups.filter(group => group.materialIndex === 2)) {
        for (let i = group.start; i < group.start + group.count; i++) {
          const radius = Math.hypot(uv.getX(i) - .5, uv.getY(i) - .5) * 2;
          assert.ok(radius < 1e-5 || Math.abs(radius - 1) < 1e-4, `${style}: cap boundary must carry the peel ring at its actual contour`);
        }
      }
    }
    manager.dispose();
  }
});

test('BANANA all intact and sliced exterior groups use the authored yellow peel', () => {
  const { manager, cut, body } = setup('banana');
  const intact = manager.root.getObjectByName('intact:fruit') as THREE.Mesh;
  const materials = intact.material as THREE.MeshStandardMaterial[];
  assert.ok(materials[0]?.map);
  assert.ok(materials[1]?.map === materials[0]?.map, 'banana front cannot inherit log end grain');
  cut();
  const sliced = body().material as THREE.MeshStandardMaterial[];
  assert.ok(sliced[1]?.map === sliced[0]?.map, 'banana cut exterior cannot inherit log end grain');
  manager.dispose();
});

test('COCONUT sealed cap has a true aperture and an inward bowl on each original fragment', () => {
  const { manager, cut, body } = setup('coconut'); cut();
  for (const half of ['halfA', 'halfB']) {
    const cap = (body(half).material as THREE.MeshStandardMaterial[])[2]!;
    const texture = cap.map as THREE.DataTexture;
    const data = texture.image.data as Uint8Array;
    const alpha = Array.from({ length: data.length / 4 }, (_, i) => data[i * 4 + 3]!);
    assert.ok(alpha.some(value => value === 0) && alpha.some(value => value === 255), 'coconut centre must be genuinely open');
    assert.ok(cap.alphaTest > 0, 'the cavity must reveal its recessed interior');
    const bowl = manager.root.getObjectByName(`coconut-cavity:fruit:${half}`) as THREE.Mesh;
    assert.ok(bowl, 'each coconut fragment needs its own recessed bowl');
    assert.equal(bowl.parent, body(half).parent, 'cavity belongs to the same fragment as the shell');
    const p = bowl.geometry.getAttribute('position');
    const shell = body(half).geometry;
    const group = shell.groups.find(group => group.materialIndex === 2)!;
    const normal = new THREE.Vector3().fromBufferAttribute(shell.getAttribute('normal'), group.start);
    const plane = new THREE.Plane(normal, -normal.dot(new THREE.Vector3().fromBufferAttribute(shell.getAttribute('position'), group.start)));
    let depth = 0;
    for (let i = 0; i < p.count; i++) {
      const d = plane.distanceToPoint(new THREE.Vector3().fromBufferAttribute(p, i));
      assert.ok(d <= .001, 'cavity geometry cannot protrude through the cut plane');
      depth = Math.max(depth, -d);
    }
    assert.ok(depth > .025, 'the coconut centre must be recessed rather than another flat disc');
  }
  manager.dispose();
});

test('FRUIT-OPEN both real cut surfaces turn toward the player without stretching their contour', () => {
  for (const style of ['orange-segment', 'banana', 'coconut'] as const) {
    const { manager, cut, body } = setup(style); cut();
    const initial = ['halfA', 'halfB'].map(half => {
      const mesh = body(half), points = mesh.geometry.getAttribute('position');
      const group = mesh.geometry.groups.find(group => group.materialIndex === 2)!;
      return Array.from({ length: group.count / 3 }, (_, triangle) => {
        const i = group.start + triangle * 3;
        return new THREE.Vector3().fromBufferAttribute(points, i + 1).distanceTo(new THREE.Vector3().fromBufferAttribute(points, i + 2));
      });
    });
    for (let frame = 0; frame < 120; frame++) {
      manager.advance(1 / 60);
      for (const [halfIndex, half] of ['halfA', 'halfB'].entries()) {
        const mesh = body(half), points = mesh.geometry.getAttribute('position');
        const group = mesh.geometry.groups.find(group => group.materialIndex === 2)!;
        for (let t = 0; t < group.count / 3; t++) {
          const i = group.start + t * 3;
          const length = new THREE.Vector3().fromBufferAttribute(points, i + 1).distanceTo(new THREE.Vector3().fromBufferAttribute(points, i + 2));
          const original = initial[halfIndex]![t]!;
          if (original > .005) assert.ok(Math.abs(length / original - 1) < .25, `${style} ${half}: real contour strain exceeds 25% at frame ${frame}`);
        }
        if (frame === 25) {
          mesh.updateWorldMatrix(true, false);
          const normal = new THREE.Vector3().fromBufferAttribute(mesh.geometry.getAttribute('normal'), group.start).transformDirection(mesh.matrixWorld);
          assert.ok(normal.z > .45, `${style} ${half}: whole fragment must reveal its real cut surface toward the player, got ${normal.z}`);
        }
      }
    }
    manager.dispose();
  }
});


test('COCONUT replay releases cut-only cavity resources before making new halves', () => {
  const { manager, cut, reset } = setup('coconut'); cut();
  const cavity = manager.root.getObjectByName('coconut-cavity:fruit:halfA') as THREE.Mesh;
  let geometryDisposed = false, materialDisposed = false;
  cavity.geometry.addEventListener('dispose', () => { geometryDisposed = true; });
  (cavity.material as THREE.Material).addEventListener('dispose', () => { materialDisposed = true; });
  reset();
  assert.ok(geometryDisposed && materialDisposed, 'replay must release both cavity buffers and the cut-only material');
  assert.equal(manager.root.getObjectByName('coconut-cavity:fruit:halfA'), undefined);
  cut();
  assert.ok(manager.root.getObjectByName('coconut-cavity:fruit:halfA'));
  manager.dispose();
});

test('FRUIT-LANDING gives each thick fragment one small rebound and stable floor contact', () => {
  for (const style of ['orange-segment', 'banana', 'coconut'] as const) {
    const { manager, cut, body } = setup(style); cut();
    const minY = () => ['halfA', 'halfB'].map(half => new THREE.Box3().setFromObject(body(half), true).min.y);
    for (let frame = 0; frame < 36; frame++) manager.advance(1 / 60);
    const contact = minY();
    for (let frame = 0; frame < 6; frame++) manager.advance(1 / 60);
    const rebound = minY();
    for (let frame = 0; frame < 18; frame++) manager.advance(1 / 60);
    const rest = minY();
    for (const index of [0, 1]) {
      assert.ok(rebound[index]! > contact[index]! + .005, `${style}: small visible rebound follows first contact`);
      assert.ok(Math.abs(rest[index]! - contact[index]!) < .001, `${style}: rebound settles back onto the same floor`);
    }
    manager.dispose();
  }
});
