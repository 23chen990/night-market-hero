import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import * as food from '../src/food-cleave';
import { SliceSimulation } from '../src/game-core';
import { ThreePresentationModel } from '../src/three-presentation';
import { ThreeCutVisualManager } from '../src/three-cut-visuals';

test('APPLE gallery clock gates its actual blade at the shared center time and settles in 0.48 seconds', () => {
  assert.ok('createFoodCleaveController' in food, 'gallery needs the apple clock, not the watermelon clock');
  const controller = (food as typeof food & { createFoodCleaveController: (id: string) => import('../src/watermelon-cleave').WatermelonCleaveController }).createFoodCleaveController('apple');
  assert.equal(controller.start(), true);
  controller.advance(0.12);
  const center = controller.getState();
  assert.equal(center.frame.stage, 'entering');
  assert.ok(Math.abs(center.frame.knife.edgeY - 1.3) < 1e-6, 'the visible knife crosses the same center as the halves');
  controller.advance(0.36);
  assert.equal(controller.getState().status, 'settled');
  assert.equal(controller.getState().elapsed, 0.48);
  controller.reset();
  assert.equal(controller.getState().elapsed, 0);
  assert.equal(controller.getState().status, 'ready');
});

test('APPLE gallery shares sealed cap UVs, a single crown owner and replay geometry with the default visual', () => {
  const preview = new food.FoodCleavePreview({ id: 'apple', label: 'apple', kind: 'sigil' });
  assert.ok(preview.root.getObjectByName('intact:apple'), 'gallery must render the shared intact apple owner');
  const decorations = preview.halves.flatMap(half => half.children.filter(child => /apple-(stem|leaf)/.test(child.name)));
  assert.equal(decorations.length, 2);
  assert.equal(decorations[0]!.parent, decorations[1]!.parent);
  const geometry = (preview.halves[0].children[0] as THREE.Mesh).geometry;
  const uv = geometry.getAttribute('uv');
  for (const group of geometry.groups.filter(group => group.materialIndex === 2)) {
    for (let i = group.start; i < group.start + group.count; i++) {
      const radius = Math.hypot(uv.getX(i) - 0.5, uv.getY(i) - 0.5) * 2;
      assert.ok(radius < 1e-5 || Math.abs(radius - 1) < 1e-4);
    }
  }
  preview.apply(0.48); preview.apply(0);
  assert.equal(preview.root.getObjectByName('intact:apple')!.visible, true);
  assert.ok(preview.halves.every(half => !half.visible));
  assert.equal((preview.halves[0].children[0] as THREE.Mesh).geometry, geometry);
  preview.dispose();
});

test('APPLE default keeps its intact skin at rim contact until the visible blade sweeps through center', () => {
  const game = new SliceSimulation(31, 2);
  const model = new ThreePresentationModel();
  const manager = new ThreeCutVisualManager();
  const target = game.getState().sigils.find(item => item.foodStyle === 'apple')!;
  manager.sync(model.sync(game.getState()), game.getState());
  game.act('flip');
  game.debugSetBladePose(target.x - target.radius - 12, target.y, 0.7);
  game.debugSetVelocity(0, 0); game.step(1 / 120);
  assert.equal(game.getState().sigils.find(item => item.id === target.id)!.cut, true, 'the fixture must represent actual rim contact');
  manager.sync(model.sync(game.getState()), game.getState());
  manager.advance(0.4);
  assert.equal(manager.facts().find(item => item.id === target.id)!.visibleHalves, 0);
  game.debugSetBladePose(target.x, target.y - 14.7, 0);
  manager.sync(model.sync(game.getState()), game.getState());
  for (let i = 0; i < 60; i++) manager.advance(1 / 120);
  const result = manager.facts().find(item => item.id === target.id)!;
  assert.equal(result.visibleHalves, 2);
  assert.equal(result.apple!.centerCrossed, true);
  assert.deepEqual(result.apple!.normal, [0, 0, 1]);
  assert.equal(result.apple!.stage, 'settled');
  manager.sync(model.sync(new SliceSimulation(31, 2).getState()), new SliceSimulation(31, 2).getState());
  assert.equal(manager.facts().find(item => item.id === target.id)!.phase, 'intact');
  manager.dispose();
});


test('APPLE late frames preserve elapsed time in the visible gallery clock', () => {
  const controller = food.createFoodCleaveController('apple');
  controller.start();
  for (let i = 0; i < 6; i++) controller.advanceVisible(0.08, 1);
  assert.equal(controller.getState().status, 'settled', 'six 80 ms frames must finish the 480 ms cut');
  controller.reset(); controller.start();
  controller.advanceVisible(0.3, 0.4);
  assert.ok(Math.abs(controller.getState().elapsed - 0.12) < 1e-8, 'slow motion scales real elapsed time');
});

test('APPLE default analytic clock advances through late frames without losing time', () => {
  const game = new SliceSimulation(31, 2);
  const model = new ThreePresentationModel();
  const manager = new ThreeCutVisualManager();
  const target = game.getState().sigils.find(item => item.foodStyle === 'apple')!;
  manager.sync(model.sync(game.getState()), game.getState());
  game.act('flip');
  game.debugSetBladePose(target.x - target.radius - 12, target.y, 0.7);
  game.debugSetVelocity(0, 0); game.step(1 / 120);
  manager.sync(model.sync(game.getState()), game.getState());
  game.debugSetBladePose(target.x, target.y - 14.7, 0);
  manager.sync(model.sync(game.getState()), game.getState());
  for (let i = 0; i < 5; i++) manager.advance(0.08);
  assert.equal(manager.facts().find(item => item.id === target.id)!.apple!.stage, 'settled');
  manager.dispose();
});

test('APPLE rune-7 opens two thick source hemispheres with both real flesh caps readable', () => {
  const game = new SliceSimulation(31, 1), model = new ThreePresentationModel(), manager = new ThreeCutVisualManager();
  const state = game.getState();
  const target = state.sigils.find(item => item.id === 'rune-7')!;
  Object.assign(state.player, { x: target.x - target.radius - 12, y: target.y, angle: .7 });
  manager.sync(model.sync(state), state);
  target.cut = true;
  target.cutImpact = { normalX: .8, normalY: .6, targetX: target.x, targetY: target.y, targetAngle: 0,
    pointX: target.x, pointY: target.y, velocityX: 150, velocityY: 0, angularVelocity: 7 };
  // Exact default rendering branch fixture; normal-input proof is a separate browser gate.
  manager.sync(model.sync(state), state);
  Object.assign(state.player, { x: target.x, y: target.y - 14.7, angle: 0 });
  manager.sync(model.sync(state), state);
  for (let i = 0; i < 60; i++) manager.advance(1 / 120);
  manager.facts();
  const halves = ['halfA', 'halfB'].map(half => manager.root.getObjectByName(`closed-body:rune-7:${half}`) as THREE.Mesh);
  const normalToPlayer = new THREE.Vector3(.15, .25, 1).normalize();
  const boxes = halves.map(mesh => {
    const cap = mesh.geometry.groups.find(group => group.materialIndex === 2)!;
    const normal = new THREE.Vector3().fromBufferAttribute(mesh.geometry.getAttribute('normal'), cap.start).transformDirection(mesh.matrixWorld);
    assert.ok(normal.dot(normalToPlayer) > .65, 'each sealed flesh cap must face the player, not the other hemisphere');
    const box = new THREE.Box3().setFromObject(mesh, true);
    assert.ok(box.max.z - box.min.z > .15, 'the visible closed half must retain hemisphere thickness');
    return box;
  });
  const overlap = Math.max(0, Math.min(boxes[0]!.max.x, boxes[1]!.max.x) - Math.max(boxes[0]!.min.x, boxes[1]!.min.x));
  const width = Math.min(boxes[0]!.max.x - boxes[0]!.min.x, boxes[1]!.max.x - boxes[1]!.min.x);
  assert.ok(overlap / width < .2, 'the two thick apple halves must not collapse into one overlapping strip');
  manager.dispose();
});
