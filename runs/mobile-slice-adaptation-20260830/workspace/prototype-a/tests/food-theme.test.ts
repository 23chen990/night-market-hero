import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { LEVEL_CATALOG } from '../src/game-levels';
import { createCourse } from '../src/game-core';
import { createSharedCutResources, disposeSharedCutResources, CutVisualEntity } from '../src/three-cut-visuals';
import { skinKindForFoodStyle, cuttableDepth, type CuttablePresentation } from '../src/three-presentation';

test('FOOD-THEME-RED-001 locks level families to one food theme without cross-theme mixing', () => {
  const expected = [
    'fruit', 'fruit', 'fruit',
    'dessert', 'dessert', 'dessert',
    'savory', 'savory', 'savory',
    'mystic', 'mystic', 'mystic',
  ];
  assert.deepEqual(LEVEL_CATALOG.levels.map((level) => level.foodTheme), expected);
  for (const level of LEVEL_CATALOG.levels) {
    assert.ok(level.foodStyles.length >= 2, `level ${level.number} needs multiple cuttable styles`);
    assert.ok(new Set(level.foodStyles).size >= 2);
    assert.ok(level.blocks.every((block) => block.pathRole), `level ${level.number} hard blocks need path roles`);
  }
});

test('FOOD-THEME-RED-002 runtime course carries authored style ids to every cuttable object', () => {
  for (const level of LEVEL_CATALOG.levels) {
    const course = createCourse(31 + level.number, level.number);
    const styles = new Set([...course.sigils, ...course.blocks].map((item) => item.foodStyle));
    assert.ok(styles.size >= 2, `level ${level.number} runtime styles collapsed`);
    for (const style of styles) assert.ok(level.foodStyles.includes(style));
  }
});

test('FOOD-THEME-RED-003 authored lengths increase world distance, not only timer labels', () => {
  const finishes = LEVEL_CATALOG.levels.map((level) => level.finishX);
  assert.ok(finishes[11]! > finishes[0]! * 1.3, 'late course must be materially longer');
  assert.ok(finishes.every((x, index) => index === 0 || x >= finishes[index - 1]!));
  assert.ok(LEVEL_CATALOG.levels.every((level) => level.courseSegments.at(-1)!.endX === level.finishX));
});

test('FOOD-THEME-RED-004 dessert presentation uses a cake-slice profile, not circular sigil geometry', () => {
  const resources = createSharedCutResources();
  resources.dessertBase.computeBoundingBox();
  resources.dessertHalfA.computeBoundingBox();
  resources.dessertHalfB.computeBoundingBox();
  const bounds = resources.dessertBase.boundingBox!;
  assert.ok(bounds.max.x - bounds.min.x > (bounds.max.y - bounds.min.y) * 1.05, 'dessert profile should have a distinct slice silhouette');
  assert.ok(resources.dessertHalfA.boundingBox!.max.x - resources.dessertHalfA.boundingBox!.min.x > 0.8);
  assert.ok(resources.dessertHalfB.boundingBox!.max.x - resources.dessertHalfB.boundingBox!.min.x > 0.6);
  disposeSharedCutResources(resources);
});

test('FOOD-THEME-RED-007 cucumber log reuses the log skin with long-fruit depth and level 8 placement', () => {
  assert.equal(skinKindForFoodStyle('cucumber-log', 'block', 110, 34), 'log', 'cucumber must render through the log skin branch');
  const depth = cuttableDepth('cucumber-log', 1.1, 0.34);
  assert.ok(Math.abs(depth - 0.34 * 0.78) < 1e-9, 'cucumber depth must use the long-fruit 0.78 coefficient');
  const level8 = LEVEL_CATALOG.levels[7]!;
  assert.ok(level8.foodStyles.includes('cucumber-log'), 'level 8 must declare cucumber-log');
  assert.ok(level8.blocks.some((block) => block.foodStyle === 'cucumber-log'), 'level 8 must place a cucumber-log block');
});

test('FOOD-THEME-RED-006 soft cake uses a rounded-square profile, not the dessert slice', () => {
  const resources = createSharedCutResources();
  resources.softCakeBase.computeBoundingBox();
  resources.dessertBase.computeBoundingBox();
  const soft = resources.softCakeBase.boundingBox!;
  const dessert = resources.dessertBase.boundingBox!;
  const softRatio = (soft.max.y - soft.min.y) / (soft.max.x - soft.min.x);
  const dessertRatio = (dessert.max.y - dessert.min.y) / (dessert.max.x - dessert.min.x);
  assert.ok(softRatio > 0.65, 'soft cake must read as a plump rounded square');
  assert.ok(softRatio > dessertRatio, 'soft cake silhouette must differ from the triangular dessert slice');
  const visual: CuttablePresentation = {
    id: 'soft-cake-test', kind: 'block', skinKind: 'dessert', foodStyle: 'soft-cake',
    phase: 'intact', position: [0, 0, 0], width: 1, height: 0.36, depth: 0.3, radius: null,
    falling: false, rotationZ: 0, halves: [],
  };
  const entity = new CutVisualEntity(visual, resources);
  const intact = entity.root.children[0] as THREE.Mesh;
  assert.equal(intact.geometry, resources.softCakeBase, 'soft cake intact body must be the rounded-square geometry');
  entity.dispose();
  disposeSharedCutResources(resources);
});

test('FOOD-THEME-RED-005 orange segment uses a wedge profile and restores intact on replay', () => {
  const resources = createSharedCutResources();
  resources.orangeWedge.computeBoundingBox();
  const bounds = resources.orangeWedge.boundingBox!;
  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;
  assert.ok(height > width * 1.1, 'orange wedge must read as a standing segment, not a round fruit');
  const visual: CuttablePresentation = {
    id: 'orange-test', kind: 'sigil', skinKind: 'crystal', foodStyle: 'orange-segment',
    phase: 'intact', position: [0, 0, 0], width: 2, height: 2, depth: 0.6, radius: 1,
    falling: false, rotationZ: 0, halves: [],
  };
  const entity = new CutVisualEntity(visual, resources);
  const intact = entity.root.children[0] as THREE.Mesh;
  assert.equal(intact.geometry, resources.orangeWedge, 'orange segment intact body must be the wedge, not the sigil sphere');
  entity.sync({ ...visual, phase: 'cut', cutPlane: { normal: [0.6, 0.8, 0], point: [0, 0, 0], rotationZ: 0 }, halves: [
    { id: 'halfA', position: [0, 0, 0], rotationZ: 0, rotationDepth: 0, capMaterialId: 'cap-a', closedGeometry: true },
    { id: 'halfB', position: [0, 0, 0], rotationZ: 0, rotationDepth: 0, capMaterialId: 'cap-b', closedGeometry: true },
  ] });
  assert.equal(intact.visible, false, 'cut phase hides the intact wedge');
  entity.sync(visual);
  assert.equal(intact.visible, true, 'replay restores the intact wedge');
  assert.equal(intact.geometry, resources.orangeWedge, 'replay keeps the shared wedge geometry (no leak, no rebuild)');
  entity.dispose();
  disposeSharedCutResources(resources);
});
