import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as THREE from 'three';
import { SliceSimulation } from '../src/game-core';
import { ThreePresentationModel } from '../src/three-presentation';

test('LEGACY-MELON-VISUAL gameplay specimen retains the rich shape within its small-screen mesh budget', async () => {
  const { MelonVisualManager } = await import('../src/melon-visuals');
  const manager = new MelonVisualManager(() => new THREE.ShaderMaterial());
  const game = new SliceSimulation(31, 1);
  manager.sync(game.getState(), new ThreePresentationModel().sync(game.getState()));
  const specimen = manager.root.getObjectByName('melon:rune-1')!;
  let triangles = 0;
  specimen.traverse((object) => { if (object instanceof THREE.Mesh) triangles += object.geometry.index!.count / 3; });
  assert.ok(triangles <= 4500, `a small gameplay watermelon must not submit ${triangles} study-resolution triangles`);
  assert.equal(manager.facts()[0]!.materialMode, 'watermelon-rich');
  manager.dispose();
});

test('LEGACY-MELON-VISUAL normal launch preserves the retired deformable indexed skin', async () => {
  assert.ok(existsSync(new URL('../src/melon-visuals.ts', import.meta.url)), 'default melon visual module is not implemented');
  const { MelonVisualManager } = await import('../src/melon-visuals');
  const manager = new MelonVisualManager(() => new THREE.ShaderMaterial());
  const game = new SliceSimulation(31, 1);
  const presentation = new ThreePresentationModel();
  manager.sync(game.getState(), presentation.sync(game.getState()));
  assert.ok(manager.facts().some((item) => item.foodStyle === 'melon-jelly' && item.pieces === 1
    && item.materialMode === 'watermelon-rich'), 'watermelon keeps its original wedge and rich material before the cut');
  game.act('flip');
  for (let i = 0; i < 180 && !game.getState().events.some((event) => event.type === 'cut'); i++) game.advanceFrame(1 / 60);
  manager.sync(game.getState(), presentation.sync(game.getState()));
  manager.advance(1 / 60);
  const intact = manager.root.getObjectByName('melon-jelly:rune-1') as THREE.Mesh;
  const first = manager.facts().find((item: { id: string }) => item.id === 'rune-1')!;
  assert.equal(first.pieces, 2);
  assert.equal(first.cutAccepted, true);
  assert.ok(intact.geometry.index!.count > 0, 'real surgery must keep a closed indexed surface');
  assert.ok(first.topologyVersion > 0, 'real surgery must advance the softbody topology');
  assert.equal(first.inverted, 0);
  assert.ok(Math.abs(first.volRatio - 1) < 0.06);
  assert.equal(manager.root.getObjectByName('halfA:rune-1'), undefined);
  manager.dispose();
});

test('LEGACY-MELON-VISUAL replay clears old fragments and disposes their geometry', async () => {
  assert.ok(existsSync(new URL('../src/melon-visuals.ts', import.meta.url)), 'default melon visual module is not implemented');
  const { MelonVisualManager } = await import('../src/melon-visuals');
  const manager = new MelonVisualManager(() => new THREE.ShaderMaterial());
  const game = new SliceSimulation(31, 1);
  const presentation = new ThreePresentationModel();
  manager.sync(game.getState(), presentation.sync(game.getState()));
  game.act('flip'); game.advanceFrame(0.4);
  manager.sync(game.getState(), presentation.sync(game.getState()));
  const initial = manager.root.getObjectByName('melon-jelly:rune-1') as THREE.Mesh;
  let disposed = false;
  initial.geometry.addEventListener('dispose', () => { disposed = true; });
  game.reset(31); presentation.reset();
  manager.sync(game.getState(), presentation.sync(game.getState()));
  assert.ok(disposed);
  assert.equal(manager.facts().every((item: { pieces: number }) => item.pieces === 1), true);
  assert.ok(manager.facts().length > 0, 'replay restores the original intact watermelon specimens');
  manager.dispose();
});

test('LEGACY-MELON-VISUAL does not replace other food identities with a watermelon specimen', async () => {
  const { MelonVisualManager } = await import('../src/melon-visuals');
  const manager = new MelonVisualManager(() => new THREE.ShaderMaterial());
  const game = new SliceSimulation(31, 4);
  const state = game.getState();
  const frame = new ThreePresentationModel().sync(state);
  assert.ok(frame.cuttables.some((item) => item.foodStyle !== 'melon-jelly'), 'fixture must include non-melon cuttables');
  const cutFrame = {
    ...frame,
    cuttables: frame.cuttables.map((item) => ({ ...item, phase: 'cut' as const })),
  };

  manager.sync(state, cutFrame);

  assert.deepEqual(
    manager.facts().map((item) => item.id).sort(),
    cutFrame.cuttables.filter((item) => item.foodStyle === 'melon-jelly').map((item) => item.id).sort(),
    'the watermelon specimen renderer only owns watermelon; other food keeps its original geometry and material',
  );
  assert.ok(manager.facts().every((item) => item.renderer === 'melon-softbody'
    && item.materialMode === 'watermelon-rich'
    && item.pieces === 2
    && Math.abs(item.volRatio - 1) < 0.08
    && item.inverted === 0), 'non-melon cut branches must expose the same rich material and safe two-piece facts');
  manager.dispose();
});

test('LEGACY-MELON-VISUAL off-camera rich specimens skip thickness passes and return when the camera reaches them', async () => {
  const { MelonVisualManager } = await import('../src/melon-visuals');
  const manager = new MelonVisualManager(() => new THREE.ShaderMaterial());
  const game = new SliceSimulation(31, 1); manager.sync(game.getState(), new ThreePresentationModel().sync(game.getState()));
  manager.root.updateWorldMatrix(true, true);
  const target = manager.jellyMeshes[0]!; const bounds = new THREE.Box3().setFromObject(target); const centre = bounds.getCenter(new THREE.Vector3());
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.copy(centre).add(new THREE.Vector3(0, 0, 8)); camera.lookAt(centre);
  assert.ok(manager.visibleJellyMeshes(camera).includes(target));
  camera.position.x += 100; camera.lookAt(centre.clone().add(new THREE.Vector3(100, 0, 0)));
  assert.equal(manager.visibleJellyMeshes(camera).length, 0, 'off-camera objects must not render full-screen depth buffers');
  camera.position.copy(centre).add(new THREE.Vector3(0, 0, 8)); camera.lookAt(centre);
  assert.ok(manager.visibleJellyMeshes(camera).includes(target), 'visible objects must regain their actual rich depth path');
  manager.dispose();
});

test('LEGACY-MELON-VISUAL cut release follows the cut plane instead of a shared launch', async () => {
  const source = readFileSync(new URL('../src/melon-visuals.ts', import.meta.url), 'utf8');
  assert.match(source, /body\.releaseCut\(normal, 0\.22\)/);
  assert.doesNotMatch(source, /this\.body\.impulse\(/, 'the two halves must not receive one shared impulse');
  const { MelonBody } = await import('../src/melon-softbody.js');
  const body = new MelonBody();
  assert.equal(body.cut([1, 0, 0], 0, 0.16), true);
  assert.equal(body.componentCount, 2);
  body.releaseCut([1, 0, 0], 0.22);
  const released = body.stats();
  assert.ok(released.ke > 0.1, 'the plane-aligned release must be visible immediately');
  body.step(1 / 60);
  assert.equal(body.stats().inverted, 0);
  assert.equal(body.stats().safetyRollbacks, 0);
});

test.skip('LEGACY-MELON-VISUAL cut fragments deform at impact and their energy decays to a stable ground rest', async () => {
  const { MelonVisualManager } = await import('../src/melon-visuals');
  const manager = new MelonVisualManager(() => new THREE.ShaderMaterial());
  const game = new SliceSimulation(31, 1); const presentation = new ThreePresentationModel();
  manager.sync(game.getState(), presentation.sync(game.getState())); game.act('flip');
  for (let i = 0; i < 180 && !game.getState().cuts; i++) game.advanceFrame(1 / 60);
  manager.sync(game.getState(), presentation.sync(game.getState()));
  let peak = 0;
  for (let i = 0; i < 360; i++) {
    manager.advance(1 / 60);
    if (i % 30 === 0) peak = Math.max(peak, manager.facts()[0]!.ke);
  }
  const end = manager.facts()[0]!;
  assert.ok(peak > 0.01);
  assert.ok(end.ke < 0.01 && end.ke < peak * 0.01, 'fragments must lose their motion and settle');
  assert.equal(end.inverted, 0); assert.equal(end.safetyRollbacks, 0);
  assert.ok(end.bounds.min[1]! > -0.012, 'deformed visible skin must rest on the floor');
  manager.dispose();
});
