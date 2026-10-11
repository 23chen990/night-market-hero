import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { SliceSimulation } from '../src/game-core';
import { ThreePresentationModel, type CuttablePresentation } from '../src/three-presentation';
import { balancedCutOffset, CutVisualEntity, createSharedCutResources, disposeSharedCutResources } from '../src/three-cut-visuals';

type WithPlane = CuttablePresentation & {cutPlane?: {normal: readonly [number, number, number]; point: readonly [number, number, number]; rotationZ: number}};

test('SLICE-ANGLE-005 actual non-melon cut propagates its knife plane through presentation', () => {
  const game = new SliceSimulation(31, 2);
  const target = game.getState().sigils[0]!;
  game.act('flip'); game.debugSetBladePose(target.x - 20, target.y, 0.7); game.debugSetVelocity(0, 0); game.step(1 / 120);
  const state = game.getState();
  const event = state.events.find(e=>e.type==='cut' && e.targetId===target.id)!;
  assert.ok(event?.cutImpact, 'an actual cut is required');
  const visual = new ThreePresentationModel().sync(state).cuttables.find(v=>v.id===target.id)! as WithPlane;
  assert.ok(visual.cutPlane, 'the non-melon renderer must receive its contact plane');
  assert.deepEqual(visual.cutPlane.normal, [event.cutImpact.normalX, -event.cutImpact.normalY, 0]);
});

for (const [skinKind,foodStyle] of [['crystal','apple'],['log','banana'],['crate','coconut'],['dessert','cake'],['crystal','orange-segment'],['dessert','soft-cake'],['log','cucumber-log']] as const) {
  test(`SLICE-ANGLE-005 ${foodStyle} seals the actual oblique plane without changing its intact silhouette`, () => {
    const resources=createSharedCutResources();
    const normal = new THREE.Vector3(0.6, 0.8, 0);
    const visual:WithPlane = {id:'angle-test',kind:'sigil',skinKind,foodStyle,phase:'intact',position:[0,0,0],width:2,height:2,depth:0.6,radius:1,falling:false,rotationZ:0,halves:[]};
    const entity=new CutVisualEntity(visual,resources);
    const intactMesh=entity.root.children[0] as THREE.Mesh;
    intactMesh.updateWorldMatrix(true,false);
    const source = intactMesh.geometry.clone().applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0), intactMesh.scale,
    ));
    source.computeBoundingBox();
    const cutOffset = balancedCutOffset(source, normal, normal.dot(source.boundingBox!.getCenter(new THREE.Vector3())));
    entity.sync({...visual, phase:'cut',cutPlane:{normal:[normal.x,normal.y,normal.z],point:[0,0,0],rotationZ:0},halves:[
      {id:'halfA',position:[0,0,0],rotationZ:0,rotationDepth:0,capMaterialId:'cap-a',closedGeometry:true},
      {id:'halfB',position:[0,0,0],rotationZ:0,rotationDepth:0,capMaterialId:'cap-b',closedGeometry:true},
    ]} as CuttablePresentation);
    const facts=entity.facts();
    assert.ok(Math.abs(new THREE.Vector3(...facts.caps[0]!.worldNormal).dot(normal))>0.999, 'closed cut face must follow the blade, not the prefab X/Z split');
    for(const [index,side] of [[1,-1],[2,1]] as const) {
      const body=entity.root.children[index]!.children[0] as THREE.Mesh;
      body.updateWorldMatrix(true,false);
      const positions=body.geometry.getAttribute('position');
      for(let i=0;i<positions.count;i++) {
        const point=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(body.matrixWorld);
        assert.ok((normal.dot(point) - cutOffset)*side>=-1e-5, `half ${index} crosses the real knife plane`);
      }
    }
    source.dispose();
    entity.dispose();disposeSharedCutResources(resources);
  });
}

test('CUTTABLE-POSE-006 round fruit has volume instead of an invariant thin badge', () => {
  const frame=new ThreePresentationModel().sync(new SliceSimulation(31,2).getState());
  const fruit=frame.cuttables.find(v=>v.kind==='sigil' && v.foodStyle==='apple')!;
  assert.ok(fruit.depth>=fruit.width*0.6, 'round fruit depth must track its size');
});

test('APPLE-VISUAL-001 uses a stable dimpled shoulder profile instead of a sphere', () => {
  const resources = createSharedCutResources();
  const geometry = resources.appleFruit;
  const positions = geometry.getAttribute('position');
  assert.ok(positions.count >= 200 && positions.count <= 600, 'stable low-poly contour budget');
  const second = createSharedCutResources();
  assert.deepEqual(positions.array, second.appleFruit.getAttribute('position').array, 'replay must reuse deterministic topology');
  disposeSharedCutResources(second);
  let minY = Infinity; let maxY = -Infinity; let minX = Infinity; let maxX = -Infinity; let minZ = Infinity; let maxZ = -Infinity;
  const axisYs: number[] = [];
  const rings: { y: number; radius: number }[] = [];
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index); const y = positions.getY(index); const z = positions.getZ(index);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    const radius = Math.hypot(x, z);
    if (radius < 1e-5) axisYs.push(y);
    rings.push({ y, radius });
  }
  const height = maxY - minY;
  const topAxis = Math.max(...axisYs); const bottomAxis = Math.min(...axisYs);
  const topRim = Math.max(...rings.filter(({ y, radius }) => y > topAxis + 0.04 && radius > 0.2).map(({ y }) => y));
  const bottomRim = Math.min(...rings.filter(({ y, radius }) => y < bottomAxis - 0.04 && radius > 0.2).map(({ y }) => y));
  assert.ok((topRim - topAxis) / height >= 0.06 && (topRim - topAxis) / height <= 0.12, 'top dimple depth must be 6–12% of height');
  assert.ok((bottomAxis - bottomRim) / height >= 0.06 && (bottomAxis - bottomRim) / height <= 0.12, 'bottom dimple depth must be 6–12% of height');
  const shoulder = rings.filter(({ y }) => y >= minY + height * 0.52 && y <= minY + height * 0.76).reduce((best, ring) => ring.radius > best.radius ? ring : best, { y: 0, radius: 0 });
  const maximum = Math.max(...rings.map(({ radius }) => radius));
  assert.ok(shoulder.radius >= maximum * 0.999, 'maximum width must sit in the upper shoulder band');
  const lowerRadius = Math.max(...rings.filter(({ y }) => y >= minY + height * 0.16 && y <= minY + height * 0.34).map(({ radius }) => radius));
  assert.ok(lowerRadius < shoulder.radius * 0.96, 'lower half must narrow below the shoulder');
  assert.ok(Math.abs((maxX - minX) - (maxZ - minZ)) / Math.max(maxX - minX, maxZ - minZ) <= 0.06, 'profile asymmetry must stay within 6%');
  disposeSharedCutResources(resources);
});
