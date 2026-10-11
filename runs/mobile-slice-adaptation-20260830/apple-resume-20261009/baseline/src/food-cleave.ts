import * as THREE from 'three';
import type { FoodStyle } from './game-core';
import { APPLE_CLEAVE_TIMING, sampleAppleCleave, CutVisualEntity, balancedCutOffset, createSharedCutResources, disposeSharedCutResources } from './three-cut-visuals';
import { skinKindForFoodStyle, type CuttablePresentation } from './three-presentation';
import { splitClosedGeometry } from './cut-plane-geometry';
import { WATERMELON, CLEAVE_TIMING, WatermelonCleaveController, sampleCleave, type CleaveState } from './watermelon-cleave';

class AppleCleaveController {
  private status: CleaveState['status'] = 'ready';
  private elapsed = 0;
  private cycles = 0;

  start(): boolean {
    if (this.status === 'cutting') return false;
    this.status = 'cutting'; this.elapsed = 0; this.cycles++;
    return true;
  }
  advance(seconds: number): void {
    if (this.status !== 'cutting' || !Number.isFinite(seconds) || seconds <= 0) return;
    this.elapsed = Math.min(APPLE_CLEAVE_TIMING.total, this.elapsed + seconds);
    if (this.elapsed >= APPLE_CLEAVE_TIMING.total) this.status = 'settled';
  }
  advanceVisible(seconds: number, speed: number): void { this.advance(seconds * speed); }
  reset(): void { this.status = 'ready'; this.elapsed = 0; }
  getState(): CleaveState {
    const frame = sampleCleave(this.elapsed * CLEAVE_TIMING.center / APPLE_CLEAVE_TIMING.center);
    frame.stage = sampleAppleCleave(this.elapsed).stage;
    return { status: this.status, elapsed: this.elapsed, cycles: this.cycles, frame };
  }
}

export function createFoodCleaveController(id: string) {
  return id === 'apple' ? new AppleCleaveController() : new WatermelonCleaveController();
}

export interface FoodCleaveSample { id: Exclude<FoodStyle, 'melon-jelly'>; label: string; kind: 'sigil' | 'block' }
export const FOOD_CLEAVE_SAMPLES: readonly FoodCleaveSample[] = [
  {id:'apple',label:'苹果',kind:'sigil'}, {id:'orange-segment',label:'橙瓣',kind:'sigil'},
  {id:'banana',label:'香蕉',kind:'sigil'}, {id:'coconut',label:'椰子',kind:'sigil'},
  {id:'cake',label:'蛋糕',kind:'sigil'}, {id:'pastry',label:'酥点',kind:'sigil'},
  {id:'cheesecake',label:'芝士蛋糕',kind:'sigil'}, {id:'soft-cake',label:'软糕',kind:'sigil'},
  {id:'cucumber-log',label:'黄瓜',kind:'sigil'}, {id:'dumpling',label:'团子',kind:'sigil'},
  {id:'roast',label:'烤肉',kind:'sigil'}, {id:'skewer',label:'肉串',kind:'sigil'},
  {id:'moon-fruit',label:'月光果',kind:'sigil'}, {id:'jade-bun',label:'翡翠包',kind:'sigil'},
  {id:'spirit-orb',label:'灵珠',kind:'sigil'},
];

/** Original authored geometry/materials, assembled as the exact closed halves. */
export class FoodCleavePreview {
  readonly root = new THREE.Group();
  readonly halves: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
  readonly sourceGeometry: THREE.BufferGeometry;
  readonly originalExterior: THREE.Material;
  readonly centreY: number;
  readonly separationScale: number;
  private readonly resources = createSharedCutResources();
  private readonly owner: CutVisualEntity;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private opening = 0;

  constructor(readonly sample: FoodCleaveSample) {
    const width = sample.id === 'banana' || sample.id === 'skewer' || sample.id === 'cucumber-log' ? 1.85 : 1.65;
    const height = sample.id === 'banana' || sample.id === 'skewer' || sample.id === 'cucumber-log' ? 1.1 : 1.65;
    const visual: CuttablePresentation = { id: sample.id, foodStyle: sample.id, kind: sample.kind,
      skinKind: skinKindForFoodStyle(sample.id, sample.kind, width, height), phase: 'intact', position: [0,0,0],
      width, height, depth: 1.45, radius: width / 2, falling: false, rotationZ: 0, halves: [] };
    this.owner = new CutVisualEntity(visual, this.resources);
    const intact = this.owner.root.getObjectByName(`intact:${sample.id}`) as THREE.Mesh;
    intact.updateMatrix();
    const matrix = intact.matrix.clone();
    this.sourceGeometry = intact.geometry.clone().applyMatrix4(matrix);
    this.sourceGeometry.computeBoundingBox();
    const bounds = this.sourceGeometry.boundingBox!;
    const normal = new THREE.Vector3(1,0,0);
    const offset = balancedCutOffset(this.sourceGeometry, normal, bounds.getCenter(new THREE.Vector3()).x);
    const y = bounds.getCenter(new THREE.Vector3()).y;
    if (sample.id === 'apple') {
      this.originalExterior = (Array.isArray(intact.material) ? intact.material[0] : intact.material)!;
      this.centreY = WATERMELON.tableTop - bounds.min.y;
      this.separationScale = 1;
      this.owner.sync({ ...visual, phase: 'cut', position: [0, this.centreY, 0],
        cutPlane: { normal: [1, 0, 0], point: [offset, this.centreY, 0], rotationZ: 0 },
        halves: [0, 1].map(index => ({ id: index === 0 ? 'halfA' : 'halfB', position: [0, this.centreY, 0],
          rotationZ: 0, rotationDepth: 0, capMaterialId: `apple-cap-${index}`, closedGeometry: true })) });
      this.halves = [...this.owner.appleHalves];
      this.root.add(this.owner.root);
      this.apply(0);
      return;
    }
    const translation = new THREE.Matrix4().makeTranslation(-offset,-y,0);
    this.sourceGeometry.applyMatrix4(translation); this.sourceGeometry.computeBoundingBox();
    const sourceMaterials = Array.isArray(intact.material) ? intact.material : [intact.material];
    this.originalExterior = sourceMaterials[0]!;
    const caps = [0,1].map(index => (this.owner.root.getObjectByName(`capMaterial:${sample.id}:${index===0?'halfA':'halfB'}`) as THREE.Mesh).material as THREE.Material);
    const split = splitClosedGeometry(this.sourceGeometry, new THREE.Plane(normal,0));
    split.caps.forEach(cap=>cap.dispose());
    const textureBounds = this.sourceGeometry.boundingBox!;
    split.halves.forEach((geometry,index)=>{
      this.remapCap(geometry,textureBounds);
      const body = new THREE.Mesh(geometry,[sourceMaterials[0]!,sourceMaterials[1]??sourceMaterials[0]!,caps[index]!]);
      body.name = `food-cleave-body:${sample.id}:${index}`; body.castShadow = true; body.receiveShadow = true;
      this.halves[index]!.add(body); this.geometries.push(geometry);
    });
    // Slice every original decoration with the same plane and bind each
    // resulting layer to its own half; no floating generic cap overlays.
    for(const child of intact.children){
      if(!(child instanceof THREE.Mesh))continue;
      child.updateMatrix();
      const geometry = child.geometry.clone().applyMatrix4(translation.clone().multiply(matrix).multiply(child.matrix));
      geometry.computeBoundingBox();
      const childBounds=geometry.boundingBox!;
      const pieces:{geometry:THREE.BufferGeometry;side:0|1}[]=[];
      if(childBounds.min.x < -1e-6 && childBounds.max.x > 1e-6){
        const cut=splitClosedGeometry(geometry,new THREE.Plane(normal,0));
        cut.halves.forEach((part,index)=>pieces.push({geometry:part,side:index as 0|1}));
        cut.caps.forEach(cap=>cap.dispose());geometry.dispose();
      }else pieces.push({geometry,side:childBounds.max.x<=1e-6?0:1});
      const materials=Array.isArray(child.material)?child.material:[child.material];
      for(const piece of pieces){
        const mesh=new THREE.Mesh(piece.geometry,[materials[0]!,materials[1]??materials[0]!,materials[0]!]);
        mesh.name=`food-cleave-layer:${child.name}:${piece.side}`;mesh.castShadow=true;mesh.receiveShadow=true;
        this.halves[piece.side].add(mesh);this.geometries.push(piece.geometry);
      }
    }
    this.root.add(...this.halves);this.root.updateWorldMatrix(true,true);
    const originalBounds=new THREE.Box3().setFromObject(this.root,true);
    this.centreY=WATERMELON.tableTop-originalBounds.min.y;
    this.separationScale=Math.hypot(originalBounds.getSize(new THREE.Vector3()).x/2,originalBounds.getSize(new THREE.Vector3()).y/2)/WATERMELON.radius;
    this.apply(0);
  }

  private remapCap(geometry:THREE.BufferGeometry,bounds:THREE.Box3):void{
    const pos=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
    for(const group of geometry.groups.filter(group=>group.materialIndex===2))for(let i=group.start;i<group.start+group.count;i++){
      uv.setXY(i,(pos.getY(i)-bounds.min.y)/(bounds.max.y-bounds.min.y),(pos.getZ(i)-bounds.min.z)/(bounds.max.z-bounds.min.z));
    }
  }

  apply(seconds:number):void{
    if (this.sample.id === 'apple') {
      this.owner.setAppleCleaveTime(seconds, [{ minX: -4, maxX: 4, minZ: -2.1, maxZ: 2.1, y: WATERMELON.tableTop }]);
      this.opening = sampleAppleCleave(seconds).opening;
      this.root.updateWorldMatrix(true, true);
      return;
    }
    const frame=sampleCleave(seconds);
    this.opening=Math.abs(frame.halves[0].position[0])/1.02;
    this.halves.forEach((half,index)=>{
      const pose=frame.halves[index];
      half.position.set(pose.position[0]*this.separationScale,this.centreY+(pose.position[1]-WATERMELON.centerY)*this.separationScale,0);
      // The gallery camera is above and in front of the table.  A slightly
      // stronger outward roll makes both sealed cut faces readable in the
      // preview still while the default game keeps the accepted watermelon
      // timing and roll unchanged.
      half.rotation.z=pose.rotationZ*2.4;
      this.root.updateWorldMatrix(true,true);
      const bounds=new THREE.Box3().setFromObject(half,true);
      if(bounds.min.y<WATERMELON.tableTop)half.position.y+=WATERMELON.tableTop-bounds.min.y;
    });
    this.root.updateWorldMatrix(true,true);
  }

  facts(){
    const apple = this.sample.id === 'apple' ? this.owner.facts().apple : null;
    const bounds=new THREE.Box3().setFromObject(this.root,true);
    return {id:this.sample.id,label:this.sample.label,opening:this.opening,pieces:2,
      minY:apple?.minY ?? bounds.min.y,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}, apple,
      decorationPieces:this.halves.reduce((n,half)=>n+half.children.length-1,0)};
  }

  dispose():void{
    this.root.removeFromParent();this.geometries.forEach(geometry=>geometry.dispose());
    this.sourceGeometry.dispose();this.owner.dispose();disposeSharedCutResources(this.resources);
  }
}
