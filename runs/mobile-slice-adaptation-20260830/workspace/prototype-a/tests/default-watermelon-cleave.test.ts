import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { SliceSimulation } from '../src/game-core';

test('DEFAULT-CLEAVE centre crossing records the target centre after entry, not the first fruit rim', () => {
  const game = new SliceSimulation(31, 1); const initial=game.getState().sigils[0]!;
  const centre={x:initial.x,y:initial.y};
  game.act('flip'); game.step(1/120);
  assert.equal(game.getState().sigils[0]!.cut, false, 'one peripheral surface frame must not open the watermelon');
  for(let i=0;i<120 && !game.getState().sigils[0]!.cut;i++) game.step(1/120);
  const event=game.getState().events.find(e=>e.type==='cut' && e.targetId===initial.id);
  assert.ok(event?.cutImpact,'normal opening launch must eventually put the accepted visible blade through centre');
  assert.ok(Math.hypot(event.cutImpact.pointX-centre.x,event.cutImpact.pointY-centre.y)<1e-6,'the event must name the actual centre crossing');
  assert.ok(game.getState().worldTime>0.025,'entry and centre must be separate visible moments');
});

test('DEFAULT-CLEAVE old watermelon softbody has no default renderer owner', () => {
  const renderer=readFileSync(new URL('../src/three-world-renderer.ts',import.meta.url),'utf8');
  assert.ok(!/new MelonVisualManager|new MelonMaterialPipeline/.test(renderer),'default journey must retire the rejected watermelon path');
});

test('DEFAULT-CLEAVE original watermelon halves stay closed, plane-aligned and reset on replay', async () => {
  const {existsSync}=await import('node:fs');
  assert.ok(existsSync(new URL('../src/game-watermelon-visuals.ts',import.meta.url)),'approved closed-half runtime owner is missing');
  const {GameWatermelonVisuals}=await import('../src/game-watermelon-visuals');
  const {ThreePresentationModel}=await import('../src/three-presentation');
  const game=new SliceSimulation(31,1); const presentation=new ThreePresentationModel();
  const manager=new GameWatermelonVisuals(); manager.sync(game.getState(),presentation.sync(game.getState()));
  const before=manager.facts()[0]!; assert.equal(before.renderer,'watermelon-cleave'); assert.equal(before.pieces,1);
  const initialMesh=manager.root.getObjectByName('cleave-intact:rune-1') as THREE.Mesh;
  const original=initialMesh.geometry; const exterior=initialMesh.material;
  game.act('flip');for(let i=0;i<120 && !game.getState().sigils[0]!.cut;i++) game.step(1/120);
  manager.sync(game.getState(),presentation.sync(game.getState()));
  const start=manager.facts()[0]!;assert.equal(start.pieces,2);assert.equal(start.opening,0);
  assert.deepEqual(start.cutPlaneNormal,[0,0,1],'the shared preview knife now flips in xy, so its blade plane is z=0');
  for(const id of ['halfA','halfB']){
    const mesh=manager.root.getObjectByName(`cleave-body:rune-1:${id}`) as THREE.Mesh;
    assert.equal((mesh.material as THREE.Material[])[0],exterior,'retain the original stripe texture across surgery');
    assert.ok(mesh.geometry.groups.some(group=>group.materialIndex===2 && group.count>0),'closed flesh is actual half geometry');
  }
  game.step(0.14);manager.sync(game.getState(),presentation.sync(game.getState()));
  const middle=manager.facts()[0]!;assert.ok(middle.opening>0 && middle.opening<1,'opening remains readable, not one-frame explosion');
  assert.equal(original,initialMesh.geometry,'the original sphere definition is reused');
  for(let i=0;i<240;i++){game.step(1/120);manager.sync(game.getState(),presentation.sync(game.getState()));}
  assert.ok(manager.facts().every(f=>f.minY>=-1e-6),'every half respects the visible floor');
  const replay=new SliceSimulation(31,1);manager.sync(replay.getState(),presentation.sync(replay.getState()));
  assert.ok(manager.facts().every(f=>f.pieces===1 && f.opening===0));manager.dispose();
});
