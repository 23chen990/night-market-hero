import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { SliceSimulation } from '../src/game-core';
import { getLevelDefinition } from '../src/game-levels';
import {
  ThreePresentationModel,
  supportPresentationTransform,
  skinKindForFoodStyle,
  type CuttablePresentation,
} from '../src/three-presentation';
import { CutVisualEntity, createSharedCutResources, disposeSharedCutResources } from '../src/three-cut-visuals';

const support = (id: string, x: number, y: number, width: number, height: number) => ({
  id, x, y, baseX: x, baseY: y, vx: 0, vy: 0, width, height, active: true,
});

test('SLICE-MASTER-PLACEMENT-007 renders tall collision supports as low steps at their true top', () => {
  const transform = supportPresentationTransform(support('white-column', 1260, 400, 34, 180), 1);
  assert.ok(transform.height <= 24, 'level-1 visual step must stay shallow');
  assert.ok(transform.width >= 90, 'a narrow wall should become a readable step');
  assert.equal(transform.topSimulationY, 310, 'the step top must remain on the authored collision top');
  assert.equal(transform.centerSimulationY, 310 + transform.height / 2);
});

test('SLICE-MASTER-PLACEMENT-007 keeps non-default levels on their authored support geometry', () => {
  const transform = supportPresentationTransform(support('l2-wall', 1960, 420, 32, 150), 2);
  assert.equal(transform.width, 32);
  assert.equal(transform.height, 150);
  assert.equal(transform.centerSimulationY, 420);
});

test('SLICE-MASTER-PLACEMENT-007 includes an intentional same-step fruit stack', () => {
  const level = getLevelDefinition(1);
  const groups = new Map<string, typeof level.sigils>();
  for (const sigil of level.sigils) {
    if (!sigil.supportSurfaceId) continue;
    const group = groups.get(sigil.supportSurfaceId) ?? [];
    group.push(sigil);
    groups.set(sigil.supportSurfaceId, group);
  }
  const stack = [...groups.values()].find((group) => group.length >= 3 && group.some((sigil, index) =>
    group.slice(index + 1).some((other) => Math.abs(sigil.x - other.x) < sigil.radius + other.radius)));
  assert.ok(stack && stack.length >= 3, 'level 1 must author a three-fruit same-step stack');
  const overlaps = stack.some((sigil, index) => stack.slice(index + 1).some((other) =>
    Math.abs(sigil.x - other.x) < sigil.radius + other.radius));
  assert.ok(overlaps, 'fruit stack must visibly overlap in x');
  const state = new SliceSimulation(31, 1);
  state.step(1 / 60);
  const stackIds = new Set(stack.slice(0, 3).map((sigil) => sigil.id));
  const settled = state.getState().sigils.filter((sigil) => stackIds.has(sigil.id));
  assert.ok(Math.max(...settled.map((sigil) => sigil.y)) - Math.min(...settled.map((sigil) => sigil.y)) <= 4, 'same-step fruit must share a contact height');
});

test('SLICE-MASTER-PLACEMENT-007 keeps Level 1 food on one low continuous tabletop band', () => {
  const level = getLevelDefinition(1);
  const foodSupportIds = new Set(level.sigils
    .filter((sigil) => sigil.id !== 'level1-reward-token')
    .map((sigil) => sigil.supportSurfaceId)
    .filter((id): id is string => Boolean(id)));
  const foodSupports = level.supports.filter((surface) => foodSupportIds.has(surface.id));
  const tops = foodSupports.map((surface) => surface.y - surface.height / 2);
  assert.ok(foodSupports.length >= 3, 'Level 1 needs several authored food tabletops');
  assert.ok(tops.every((top) => top >= 445 && top <= 525), `food tabletops must stay low, got ${tops.join(', ')}`);
  assert.ok(Math.max(...tops) - Math.min(...tops) <= 48, `food tabletops should read as one continuous band, got ${tops.join(', ')}`);

  const state = new SliceSimulation(31, 1).getState();
  for (const item of state.sigils) {
    const surface = state.supports.find((candidate) => candidate.id === item.supportSurfaceId)!;
    assert.ok(Math.abs(item.y + item.radius - (surface.y - surface.height / 2)) < 0.01,
      `${item.id} must start with its bottom touching ${surface.id}`);
  }
});

test('SLICE-MASTER-CUT-CENTER-008 sends an off-center hit to a centered presentation plane', () => {
  const simulation = new SliceSimulation(31, 2);
  const target = simulation.getState().sigils[0]!;
  simulation.act('flip');
  simulation.debugSetBladePose(target.x - 20, target.y + target.radius * 0.55, 0.7);
  simulation.debugSetVelocity(0, 0);
  simulation.step(1 / 120);
  const state = simulation.getState();
  const event = state.events.find((candidate) => candidate.type === 'cut' && candidate.targetId === target.id);
  assert.ok(event?.cutImpact, 'the off-center natural contact must cut the target');
  const visual = new ThreePresentationModel().sync(state).cuttables.find((candidate) => candidate.id === target.id)!;
  assert.deepEqual(visual.cutPlane?.point, [0, 0, 0], 'cut plane must pass through the target center');
  assert.deepEqual(visual.cutPlane?.normal, [event.cutImpact!.normalX, -event.cutImpact!.normalY, 0]);
});

test('SLICE-MASTER-STYLE-009 treats coconut as a round fruit rather than a crate', () => {
  assert.equal(skinKindForFoodStyle('coconut', 'sigil', 68, 68), 'crystal');
  const resources = createSharedCutResources();
  const visual: CuttablePresentation = {
    id: 'coconut-test', kind: 'sigil', skinKind: 'crystal', foodStyle: 'coconut', phase: 'intact',
    position: [0, 0, 0], width: 0.68, height: 0.68, depth: 0.5, radius: 0.34, falling: false, rotationZ: 0, halves: [],
  };
  const entity = new CutVisualEntity(visual, resources);
  const intact = entity.root.children[0] as unknown as { geometry: unknown };
  assert.equal(intact.geometry, resources.coconutFruit, 'coconut must use the authored rounded fruit silhouette');
  entity.dispose();
  disposeSharedCutResources(resources);
});

function closedMeshVolume(mesh: THREE.Mesh): number {
  const positions = mesh.geometry.getAttribute('position');
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let signed = 0;
  for (let index = 0; index < positions.count; index += 3) {
    a.fromBufferAttribute(positions, index);
    b.fromBufferAttribute(positions, index + 1);
    c.fromBufferAttribute(positions, index + 2);
    signed += a.dot(b.clone().cross(c));
  }
  return Math.abs(signed / 6);
}

test('SLICE-MASTER-CUT-CENTER-008 balances an oblique cut for asymmetric fruit', () => {
  const resources = createSharedCutResources();
  const visual: CuttablePresentation = {
    id: 'orange-balance', kind: 'sigil', skinKind: 'crystal', foodStyle: 'orange-segment',
    phase: 'intact', position: [0, 0, 0], width: 2, height: 2, depth: 0.6, radius: 1,
    falling: false, rotationZ: 0, halves: [],
  };
  const entity = new CutVisualEntity(visual, resources);
  entity.sync({ ...visual, phase: 'cut', cutPlane: { normal: [0.6, 0.8, 0], point: [0, 0, 0], rotationZ: 0 }, halves: [
    { id: 'halfA', position: [0, 0, 0], rotationZ: 0, rotationDepth: 0, capMaterialId: 'a', closedGeometry: true },
    { id: 'halfB', position: [0, 0, 0], rotationZ: 0, rotationDepth: 0, capMaterialId: 'b', closedGeometry: true },
  ] });
  const first = closedMeshVolume((entity.root.children[1] as THREE.Group).children[0] as THREE.Mesh);
  const second = closedMeshVolume((entity.root.children[2] as THREE.Group).children[0] as THREE.Mesh);
  const ratio = first / (first + second);
  assert.ok(ratio >= 0.45 && ratio <= 0.55, `orange halves should be near-even, got ${ratio.toFixed(3)}`);
  entity.dispose();
  disposeSharedCutResources(resources);
});
