import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import type { FoodStyle } from '../src/game-core';
import { SliceSimulation } from '../src/game-core';
import { ThreeCutVisualManager } from '../src/three-cut-visuals';
import { ThreePresentationModel, type CuttablePresentation, type PresentationFrame } from '../src/three-presentation';

function frameFor(foodStyle: FoodStyle, skinKind: CuttablePresentation['skinKind']): PresentationFrame {
  const frame = new ThreePresentationModel().sync(new SliceSimulation(31, 1).getState());
  return { ...frame, cuttables: [{ id: 'original-food', kind: 'sigil', skinKind, foodStyle, phase: 'intact',
    position: [2, 2, 0], width: 0.9, height: 0.8, depth: 0.5, radius: 0.4,
    falling: false, rotationZ: 0.17, halves: [] }] };
}

function cutFrame(frame: PresentationFrame): PresentationFrame {
  return { ...frame, cuttables: frame.cuttables.map((item) => ({ ...item, phase: 'cut',
    cutPlane: { normal: [0.8, 0.6, 0], point: [0, 0, 0], rotationZ: item.rotationZ },
    halves: (['halfA', 'halfB'] as const).map((id) => ({ id, position: item.position,
      rotationZ: 0, rotationDepth: 0, capMaterialId: id, closedGeometry: true })) })) };
}

function volume(mesh: THREE.Mesh): number {
  mesh.updateWorldMatrix(true, false);
  const positions = mesh.geometry.getAttribute('position'); const indices = mesh.geometry.index;
  const p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]; let sum = 0;
  for (let i = 0; i < (indices?.count ?? positions.count); i += 3) {
    for (let k = 0; k < 3; k++) p[k]!.fromBufferAttribute(positions, indices?.getX(i + k) ?? i + k).applyMatrix4(mesh.matrixWorld);
    sum += p[0]!.dot(p[1]!.clone().cross(p[2]!)) / 6;
  }
  return Math.abs(sum);
}

test('AUTHORED-CUT keeps original closed food geometry and exterior material across the cut', () => {
  const cases: [FoodStyle, CuttablePresentation['skinKind']][] = [
    ['apple', 'crystal'], ['banana', 'log'], ['coconut', 'crystal'], ['orange-segment', 'crystal'],
    ['cake', 'dessert'], ['pastry', 'dessert'], ['cheesecake', 'crate'], ['soft-cake', 'dessert'],
    ['dumpling', 'crate'], ['roast', 'log'], ['skewer', 'log'], ['cucumber-log', 'log'],
    ['moon-fruit', 'crystal'], ['jade-bun', 'crystal'], ['spirit-orb', 'crystal'],
  ];
  for (const [style, kind] of cases) {
    const manager = new ThreeCutVisualManager(); const frame = frameFor(style, kind);
    const state = new SliceSimulation(31, 1).getState(); manager.sync(frame, state);
    const intact = manager.root.getObjectByName('intact:original-food') as THREE.Mesh;
    intact.updateWorldMatrix(true, true);
    const transformedSource = intact.geometry.clone().applyMatrix4(intact.matrixWorld);
    transformedSource.computeBoundingBox();
    const worldBounds = transformedSource.boundingBox!.clone(); transformedSource.dispose();
    const originalVolume = volume(intact);
    const originalMaterial = Array.isArray(intact.material) ? intact.material[0] : intact.material;
    manager.sync(cutFrame(frame), state);
    assert.equal(manager.facts()[0]!.renderer, style === 'apple' ? 'apple-cleave' : ['orange-segment', 'banana', 'coconut'].includes(style) ? 'fruit-cleave' : 'authored-softbody', `${style}: use its declared cut owner`);
    assert.equal(manager.facts()[0]!.materialMode, 'food-original');
    const union = new THREE.Box3(); let cutVolume = 0;
    for (const half of ['halfA', 'halfB']) {
      const mesh = manager.root.getObjectByName(`closed-body:original-food:${half}`) as THREE.Mesh;
      union.union(new THREE.Box3().setFromObject(mesh)); cutVolume += volume(mesh);
      assert.ok(Array.isArray(mesh.material)); assert.equal(mesh.material[0], originalMaterial, `${style}: do not replace its exterior`);
    }
    assert.ok(union.min.distanceTo(worldBounds.min) < 1e-4 && union.max.distanceTo(worldBounds.max) < 1e-4, `${style}: cut fragments must reconstruct the original bounds`);
    assert.ok(Math.abs(cutVolume / originalVolume - 1) < 0.002, `${style}: source volume must survive surgery`);
    assert.equal(manager.root.getObjectByName('melon-seeds:original-food'), undefined);
    manager.dispose();
  }
});

test('FOOD-IDENTITY four requested foods use authored silhouettes before and after the cut', () => {
  const cases: [FoodStyle, CuttablePresentation['skinKind']][] = [
    ['apple', 'crystal'], ['orange-segment', 'crystal'], ['banana', 'log'], ['coconut', 'crystal'],
  ];
  for (const [style, kind] of cases) {
    const manager = new ThreeCutVisualManager(); const frame = frameFor(style, kind);
    const state = new SliceSimulation(31, 1).getState(); manager.sync(frame, state);
    const intact = manager.root.getObjectByName('intact:original-food') as THREE.Mesh;
    const sourceVertices = intact.geometry.getAttribute('position').count;
    if (style === 'banana') assert.equal(intact.geometry.type, 'ExtrudeGeometry', 'banana must read as a curved authored food, not a cylinder'); 
    if (style === 'apple' || style === 'coconut') assert.ok(sourceVertices > 200, style + ' needs a rounded authored silhouette with enough contour detail');
    const intactMaterial = Array.isArray(intact.material) ? intact.material[0] : intact.material;
    assert.ok((intactMaterial as THREE.MeshStandardMaterial).map, style + ': outer skin texture is missing');
    assert.ok(sourceVertices > 20, style + ': source geometry must be visible at gameplay scale');
    manager.sync(cutFrame(frame), state);
    for (const half of ['halfA', 'halfB']) {
      const body = manager.root.getObjectByName('closed-body:original-food:' + half) as THREE.Mesh;
      assert.ok(body.geometry.getAttribute('position').count > 0, style + ': cut half has no visible source surface');
      assert.ok((body.material as THREE.MeshStandardMaterial[])[2]?.map, style + ': layered cut-face texture is missing');
    }
    manager.dispose();
  }
});

test('FOOD-IDENTITY four requested foods retain a recognizable cut silhouette during opening', () => {
  const cases: [FoodStyle, CuttablePresentation['skinKind']][] = [
    ['apple', 'crystal'], ['orange-segment', 'crystal'], ['banana', 'log'], ['coconut', 'crystal'],
  ];
  for (const [style, kind] of cases) {
    const manager = new ThreeCutVisualManager(); const frame = frameFor(style, kind);
    const state = new SliceSimulation(31, 1).getState(); manager.sync(frame, state); manager.sync(cutFrame(frame), state);
    const bodies = () => ['halfA', 'halfB'].map((half) => manager.root.getObjectByName('closed-body:original-food:' + half) as THREE.Mesh);
    const initial = bodies().reduce((sum, mesh) => sum + volume(mesh), 0);
    for (let i = 0; i < 30; i++) manager.advance(1 / 60);
    const opened = bodies().reduce((sum, mesh) => sum + volume(mesh), 0);
    assert.ok(Math.abs(opened / initial - 1) < 0.12, style + ': opening should keep the source silhouette volume');
    manager.dispose();
  }
});

test('FOOD-IDENTITY four requested foods expose a layered sealed source cap', () => {
  const cases: [FoodStyle, CuttablePresentation['skinKind']][] = [
    ['apple', 'crystal'], ['orange-segment', 'crystal'], ['banana', 'log'], ['coconut', 'crystal'],
  ];
  for (const [style, kind] of cases) {
    const manager = new ThreeCutVisualManager(); const frame = frameFor(style, kind);
    const state = new SliceSimulation(31, 1).getState(); manager.sync(frame, state); manager.sync(cutFrame(frame), state);
    const faces: THREE.Mesh[] = [];
    manager.root.traverse((object) => {
      if (object instanceof THREE.Mesh && object.name.startsWith('food-cut-face:original-food:')) faces.push(object);
    });
    assert.equal(faces.length, 0, `${style}: the sealed source cap replaces the generic overlay`);
    for (const half of ['halfA', 'halfB']) {
      const body = manager.root.getObjectByName(`closed-body:original-food:${half}`) as THREE.Mesh;
      assert.ok(Array.isArray(body.material), `${style}: source fragment needs a cap material slot`);
      assert.ok(body.geometry.groups.some((group) => group.materialIndex === 2), `${style}: source fragment needs sealed cap triangles`);
    }
    manager.dispose();
  }
});

test('FOOD-IDENTITY cut faces stay on the sealed source fragments instead of floating as generic plates', () => {
  const cases: [FoodStyle, CuttablePresentation['skinKind']][] = [
    ['apple', 'crystal'], ['orange-segment', 'crystal'], ['banana', 'log'], ['coconut', 'crystal'],
  ];
  for (const [style, kind] of cases) {
    const manager = new ThreeCutVisualManager();
    const frame = frameFor(style, kind);
    const state = new SliceSimulation(31, 1).getState();
    manager.sync(frame, state);
    manager.sync(cutFrame(frame), state);
    const floatingFaces: THREE.Object3D[] = [];
    manager.root.traverse((object) => {
      if (object.name.startsWith('food-cut-face:')) floatingFaces.push(object);
    });
    assert.equal(floatingFaces.length, 0, `${style}: no generic camera-facing plate may replace the sealed source cap`);
    for (const half of ['halfA', 'halfB']) {
      const body = manager.root.getObjectByName(`closed-body:original-food:${half}`) as THREE.Mesh;
      assert.ok(body.geometry.getAttribute('position').count > 0, `${style}: sealed source fragment is empty`);
      assert.ok(Array.isArray(body.material), `${style}: source fragment must retain a distinct cap material group`);
      assert.ok(body.geometry.groups.some((group) => group.materialIndex === 2), `${style}: source fragment has no sealed cap group`);
    }
    manager.dispose();
  }
});

test('AUTHORED-CUT preserves and binds original decoration layers to their own fragment', () => {
  const manager = new ThreeCutVisualManager(); const frame = frameFor('soft-cake', 'dessert');
  const state = new SliceSimulation(31, 1).getState(); manager.sync(frame, state);
  const intact = manager.root.getObjectByName('intact:original-food') as THREE.Mesh;
  assert.equal(intact.children.length, 2);
  manager.sync(cutFrame(frame), state);
  const decorations: THREE.Mesh[] = [];
  manager.root.traverse((object) => { if (object instanceof THREE.Mesh && object.name.startsWith('cut-decoration:')) decorations.push(object); });
  assert.ok(decorations.length >= 2, 'icing and cream must survive the cut as bound source layers');
  assert.ok(decorations.every((mesh) => mesh.visible && mesh.geometry.getAttribute('position').count > 0));
  manager.dispose();
});

test('AUTHORED-CUT compatibility-only moon-fruit retains the XPBD safety kernel', () => {
  const manager = new ThreeCutVisualManager(); const frame = frameFor('moon-fruit', 'crystal');
  const state = new SliceSimulation(31, 1).getState(); manager.sync(frame, state); manager.sync(cutFrame(frame), state);
  assert.equal(manager.facts()[0]!.renderer, 'authored-softbody');
  assert.ok(manager.facts()[0]!.softbody!.openingSpeed > 0.5, 'the cut must start with an opposite rolling release like the watermelon reference');
  let peakEnergy = 0; let maximumDeformation = 0;
  for (let i = 0; i < 360; i++) {
    manager.advance(1 / 60);
    const body = manager.facts()[0]!.softbody!;
    assert.equal(body.inverted, 0); assert.ok(Math.abs(body.volRatio - 1) < 0.08);
    peakEnergy = Math.max(peakEnergy, body.ke); maximumDeformation = Math.max(maximumDeformation, body.localShapeError);
  }
  const end = manager.facts()[0]!.softbody!;
  assert.equal(end.kernel, 'watermelon-xpbd'); assert.equal(end.componentCount, 2);
  assert.ok(peakEnergy > 0.01); assert.ok(maximumDeformation > 0.001, 'softbody must bend locally, not only translate rigid halves');
  assert.ok(end.ke < 0.01 && end.ke < peakEnergy * 0.01, 'motion must decay to rest');
  assert.ok(end.minY > -0.012); manager.dispose();
});

test('AUTHORED-CUT actual banana structural step retains its volume through floor impact', () => {
  const game = new SliceSimulation(22, 1); const state = game.getState();
  const block = state.blocks.find((item) => item.id === 'level1-rainbow-step-a')!;
  assert.equal(block.foodStyle, 'banana');
  const presentation = new ThreePresentationModel(); const manager = new ThreeCutVisualManager();
  const onlyStep = (frame: PresentationFrame) => ({ ...frame, cuttables: frame.cuttables.filter((item) => item.id === block.id) });
  manager.sync(onlyStep(presentation.sync(state)), state);
  block.cut = true; block.solid = false;
  block.cutImpact = { normalX: -0.9512533542132554, normalY: 0.30841053175601985,
    targetX: block.x, targetY: block.y, targetAngle: 0, pointX: 1364.202834500015, pointY: 437,
    velocityX: 150, velocityY: 35, angularVelocity: 7.258796521797366 };
  manager.sync(onlyStep(presentation.sync(state)), state);
  for (let frame = 0; frame < 480; frame++) {
    manager.advance(1 / 60); const body = manager.facts()[0]!.softbody!;
    assert.equal(body.inverted, 0, `structural step frame ${frame}`);
    assert.ok(Math.abs(body.volRatio - 1) < 0.08, `structural step frame ${frame}: volume ${body.volRatio}`);
  }
  assert.ok(manager.facts()[0]!.softbody!.ke < 0.01, 'the original step fragments must settle');
  manager.dispose();
});

test('APPLE-CUT-002 uses its real sealed cap and one attached stem/leaf owner', () => {
  const manager = new ThreeCutVisualManager();
  const frame = frameFor('apple', 'crystal');
  manager.sync(frame);
  manager.sync(cutFrame(frame));
  const root = manager.root.getObjectByName('cuttable:original-food')!;
  const halves = ['halfA', 'halfB'].map(id => root.getObjectByName(`${id}:original-food`)!);
  const decorations = halves.map(half => half.children.filter(child => child.name.includes('apple-stem') || child.name.includes('apple-leaf')));
  assert.equal(decorations.flat().filter(child => child.name.includes('apple-stem')).length, 1, 'stem belongs to exactly one half');
  assert.equal(decorations.flat().filter(child => child.name.includes('apple-leaf')).length, 1, 'leaf belongs to exactly one half');
  assert.equal(decorations.filter(children => children.length > 0).length, 1, 'stem and leaf share one half owner');
  const normal = new THREE.Vector3(0.8, 0.6, 0);
  for (const [index, half] of halves.entries()) {
    const body = half.children[0] as THREE.Mesh;
    const capGroup = body.geometry.groups.find(group => group.materialIndex === 2)!;
    const positions = body.geometry.getAttribute('position');
    const uvs = body.geometry.getAttribute('uv');
    const plane = new THREE.Plane(normal, -normal.dot(new THREE.Vector3().fromBufferAttribute(positions, capGroup.start)));
    assert.ok(capGroup.count > 30);
    for (let vertex = capGroup.start; vertex < capGroup.start + capGroup.count; vertex++) {
      assert.ok(Math.abs(plane.distanceToPoint(new THREE.Vector3().fromBufferAttribute(positions, vertex))) < 1e-5);
      const r = Math.hypot(uvs.getX(vertex) - 0.5, uvs.getY(vertex) - 0.5) * 2;
      assert.ok(r < 1e-5 || Math.abs(r - 1) < 1e-4, 'UV boundary follows actual cap contour, never a bounding-circle overlay');
    }
    for (const decoration of decorations[index] as THREE.Mesh[]) {
      const p = decoration.geometry.getAttribute('position');
      for (let vertex = 0; vertex < p.count; vertex++) assert.ok(plane.distanceToPoint(new THREE.Vector3().fromBufferAttribute(p, vertex)) * (index === 0 ? -1 : 1) >= -1e-5, 'decoration cannot cross its half plane');
    }
    assert.equal(half.children.filter(child => child.name.startsWith('food-cut-face:')).length, 0, 'apple must render its actual cap, with no floating face');
  }
  manager.dispose();
});

test('APPLE-SKIN-004 is matte and low-frequency; flesh has a thin red edge, warm core and five seeds', () => {
  const manager = new ThreeCutVisualManager();
  manager.sync(frameFor('apple', 'crystal'));
  const intact = manager.root.getObjectByName('intact:original-food') as THREE.Mesh;
  const material = intact.material as THREE.MeshPhysicalMaterial;
  assert.ok(material.roughness >= 0.8 && material.clearcoat === 0 && material.metalness === 0, 'skin must not inherit the crystal specular coat');
  assert.equal(material.flatShading, true, 'low-poly faces carry the broad shading');
  const outer = material.map!.image as { data: Uint8Array; width: number; height: number };
  let variation = 0;
  for (let y = 0; y < outer.height; y++) for (let x = 1; x < outer.width; x++) variation += Math.abs(outer.data[(y * outer.width + x) * 4]! - outer.data[(y * outer.width + x - 1) * 4]!);
  assert.ok(variation / (outer.height * (outer.width - 1)) < 0.6, 'no repeated high-frequency skin bands/noise');
  const cap = manager.root.getObjectByName('capMaterial:original-food:halfA') as THREE.Mesh;
  const texture = ((cap.material as THREE.MeshStandardMaterial).map as THREE.DataTexture).image;
  const data = texture.data as Uint8Array, size = texture.width;
  let area = 0, core = 0, ring = 0; const dark = new Set<number>();
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const radius = Math.hypot(x / (size - 1) * 2 - 1, y / (size - 1) * 2 - 1);
    if (radius > 0.97) continue;
    area++; const i = (y * size + x) * 4, red = data[i]!, green = data[i + 1]!, blue = data[i + 2]!;
    if (red < 100 && green < 80) dark.add(y * size + x);
    else if (red > green * 1.8) { ring++; assert.ok(radius >= 0.9, 'skin ring is confined to the edge'); }
    else if (green < 200) core++;
    else assert.ok(red > green && green > blue, 'flesh must be warm cream');
  }
  assert.ok(ring / area > 0.025 && ring / area < 0.10, '4–8% radial red skin ring');
  assert.ok(core / area >= 0.12 && core / area <= 0.24, '12–24% core/star area');
  let count = 0;
  while (dark.size) {
    count++; const pending = [dark.values().next().value!]; dark.delete(pending[0]!);
    while (pending.length) for (const next of [pending[pending.length - 1]! - 1, pending[pending.length - 1]! + 1, pending[pending.length - 1]! - size, pending.pop()! + size]) if (dark.delete(next)) pending.push(next);
  }
  assert.ok(count >= 4 && count <= 6, `4–6 distinct seed regions, got ${count}`);
  manager.dispose();
});
