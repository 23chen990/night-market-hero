import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import * as THREE from 'three';
function volume(geometry:THREE.BufferGeometry):number {
  const pos=geometry.getAttribute('position'),idx=geometry.index;
  const points=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];let total=0;
  for(let i=0;i<(idx?.count??pos.count);i+=3){for(let k=0;k<3;k++)points[k]!.fromBufferAttribute(pos,idx?.getX(i+k)??i+k);total+=points[0]!.dot(points[1]!.clone().cross(points[2]!))/6;}
  return Math.abs(total);
}

test('FOOD-CLEAVE every original style has equal closed halves with its own exterior and flesh',async()=>{
  assert.ok(existsSync(new URL('../src/food-cleave.ts',import.meta.url)),'original food preview factory missing');
  const {FOOD_CLEAVE_SAMPLES,FoodCleavePreview}=await import('../src/food-cleave');
  assert.equal(FOOD_CLEAVE_SAMPLES.length,15);
  for(const sample of FOOD_CLEAVE_SAMPLES){
    const preview=new FoodCleavePreview(sample);const sourceVolume=volume(preview.sourceGeometry);
    const bodies=preview.halves.map(half=>half.children[0] as THREE.Mesh);
    const values=bodies.map(body=>volume(body.geometry));
    assert.ok(Math.abs((values[0]!+values[1]!)/sourceVolume-1)<0.002,`${sample.id}: preserve original volume`);
    assert.ok(Math.abs(values[0]!/sourceVolume-0.5)<0.008,`${sample.id}: cut near the volume middle`);
    assert.ok(bodies.every(body=>body.geometry.groups.some(group=>group.materialIndex===2 && group.count>0)),'cap is sealed original geometry');
    assert.equal((bodies[0]!.material as THREE.Material[])[0],preview.originalExterior);
    assert.notEqual((bodies[0]!.material as THREE.Material[])[2],preview.originalExterior);
    const original=new THREE.Box3().setFromBufferAttribute(preview.sourceGeometry.getAttribute('position') as THREE.BufferAttribute);
    const reconstructed=new THREE.Box3();bodies.forEach(body=>reconstructed.union(new THREE.Box3().setFromBufferAttribute(body.geometry.getAttribute('position') as THREE.BufferAttribute)));
    assert.ok(reconstructed.min.distanceTo(original.min)<1e-4 && reconstructed.max.distanceTo(original.max)<1e-4,`${sample.id}: same shape at cut`);
    preview.dispose();
  }
});

test('FOOD-CLEAVE decoration layers are split and attached, and normal timing never penetrates the table',async()=>{
  assert.ok(existsSync(new URL('../src/food-cleave.ts',import.meta.url)),'original food preview factory missing');
  const {FOOD_CLEAVE_SAMPLES,FoodCleavePreview}=await import('../src/food-cleave');
  for(const sample of FOOD_CLEAVE_SAMPLES){
    const preview=new FoodCleavePreview(sample);
    if(['cake','soft-cake','dumpling','jade-bun'].includes(sample.id)) assert.ok(preview.halves.reduce((n,half)=>n+half.children.length-1,0)>=2,`${sample.id}: keep original decorations`);
    preview.apply(sample.id === 'apple' ? 0.12 : 0.22);assert.equal(preview.facts().opening,0);
    preview.apply(0.6); assert.ok(preview.halves[0]!.rotation.z>0 && preview.halves[1]!.rotation.z<0,`${sample.id}: gallery cut faces turn toward the preview camera`);
    for(let i=0;i<=126;i++){preview.apply(i/120);const facts=preview.facts();assert.ok(facts.minY>=0.25-1e-6,`${sample.id}: table penetration at ${i/120}`);}
    preview.apply(0);assert.equal(preview.facts().opening,0);preview.dispose();
  }
});

test('APPLE-CLEAVE-003 follows a short continuous center cut with bounded gap and roll', async () => {
  const { FoodCleavePreview } = await import('../src/food-cleave');
  const preview = new FoodCleavePreview({ id: 'apple', label: '苹果', kind: 'sigil' });
  preview.apply(0.12);
  assert.equal(preview.facts().opening, 0, 'the apple stays closed while the blade is entering');
  preview.apply(0.36);
  const centerOpening = preview.facts().opening;
  assert.ok(centerOpening > 0, 'the two halves begin continuously after the center crossing');
  preview.apply(0.48);
  const diameter = preview.sourceGeometry.boundingBox!.max.x - preview.sourceGeometry.boundingBox!.min.x;
  const centreGap = Math.abs(preview.halves[1]!.position.x - preview.halves[0]!.position.x);
  assert.ok(centreGap / diameter >= 0.08 && centreGap / diameter <= 0.16, 'final apple gap must be 8–16% of its diameter');
  const relativeRoll = preview.halves[0].quaternion.angleTo(preview.halves[1].quaternion);
  assert.ok(relativeRoll >= THREE.MathUtils.degToRad(6) && relativeRoll <= THREE.MathUtils.degToRad(14), 'relative roll between halves must stay within 6–14 degrees');
  preview.apply(0.56);
  assert.ok(Math.abs(preview.facts().minY - 0.25) <= diameter * 0.02, 'settled apple halves must contact the table without hovering');
  preview.dispose();
});
