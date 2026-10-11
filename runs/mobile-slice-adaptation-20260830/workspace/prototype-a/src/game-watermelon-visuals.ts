import * as THREE from 'three';
import type { SliceState } from './game-core';
import type { CuttablePresentation, PresentationFrame, Vec3Tuple } from './three-presentation';
import { PRESENTATION_SCALE, worldPointFromSimulation, supportPresentationTransform } from './three-presentation';
import { WATERMELON, CLEAVE_TIMING, createWatermelonGeometry, sampleCleave } from './watermelon-cleave';
import { createWatermelonMaterials } from './cleave-visuals';

export interface GameWatermelonFacts {
  id: string;
  foodStyle: 'melon-jelly';
  renderer: 'watermelon-cleave';
  materialMode: 'watermelon-original';
  phase: 'intact' | 'cut';
  pieces: number;
  age: number;
  opening: number;
  minY: number;
  cutPlaneNormal: Vec3Tuple;
  position: number[];
  halfBounds: { min: number[]; max: number[] }[];
}

/** Accepted original sphere halves; the gameplay knife lies in z=0. */
export class GameWatermelonVisuals {
  readonly root = new THREE.Group();
  private readonly geometry = createWatermelonGeometry(new THREE.Vector3(0, 0, 1));
  private readonly materials = createWatermelonMaterials();
  private readonly entities = new Map<string, { root: THREE.Group; intact: THREE.Mesh;
    halves: [THREE.Group, THREE.Group]; phase: 'intact' | 'cut'; age: number; opening: number }>();
  private previousTime = 0;

  constructor() { this.root.name = 'accepted-watermelon-cleaves'; }

  private create(visual: CuttablePresentation) {
    const root = new THREE.Group(); root.name = `cleave-watermelon:${visual.id}`;
    const intact = new THREE.Mesh(this.geometry.source, this.materials.rind);
    intact.name = `cleave-intact:${visual.id}`; root.add(intact);
    const halves = this.geometry.halves.map((geometry, index) => {
      const half = new THREE.Group();
      const body = new THREE.Mesh(geometry, [this.materials.rind, this.materials.rind, this.materials.flesh]);
      body.name = `cleave-body:${visual.id}:${index === 0 ? 'halfA' : 'halfB'}`;
      half.add(body); half.visible = false; root.add(half); return half;
    }) as [THREE.Group, THREE.Group];
    this.root.add(root);
    const entity = { root, intact, halves, phase: visual.phase, age: 0, opening: 0 };
    this.entities.set(visual.id, entity); return entity;
  }

  sync(state: SliceState, frame: PresentationFrame): void {
    const delta = Math.min(1 / 30, Math.max(0, state.worldTime - this.previousTime));
    this.previousTime = state.worldTime;
    const visuals = frame.cuttables.filter(visual => visual.foodStyle === 'melon-jelly');
    const live = new Set(visuals.map(visual => visual.id));
    for (const [id, entity] of this.entities) if (!live.has(id)) { entity.root.removeFromParent(); this.entities.delete(id); }
    for (const visual of visuals) {
      const entity = this.entities.get(visual.id) ?? this.create(visual);
      const isNewCut = entity.phase !== 'cut' && visual.phase === 'cut';
      if (visual.phase === 'intact' || isNewCut) entity.age = 0;
      else if (visual.phase === 'cut') entity.age = Math.min(CLEAVE_TIMING.total, entity.age + delta);
      entity.phase = visual.phase;
      const scale = (visual.radius ?? visual.width / 2) / WATERMELON.radius;
      entity.root.position.fromArray(visual.position); entity.root.scale.setScalar(scale);
      entity.intact.visible = visual.phase === 'intact';
      const sample = sampleCleave(CLEAVE_TIMING.center + entity.age);
      entity.opening = Math.abs(sample.halves[0].position[0]) / 1.02;
      if (visual.phase === 'intact') entity.opening = 0;
      entity.halves.forEach((half, index) => {
        half.visible = visual.phase === 'cut';
        half.position.set(0, sample.halves[index].position[1] - WATERMELON.centerY, sample.halves[index].position[0]);
        half.rotation.set(-sample.halves[index].rotationZ * 1.3, 0, 0);
        if (!half.visible) return;
        // Fragments leave narrow tables naturally; while their centre is still
        // above a table, clamp against its top. The ground always remains solid.
        const centre = half.getWorldPosition(new THREE.Vector3());
        let floor = 0;
        for (const support of state.supports) {
          if (!support.active || Math.abs(centre.z) > supportPresentationTransform(support, state.levelNumber).depth / 2) continue;
          const lo = (support.x - support.width / 2) * PRESENTATION_SCALE;
          const hi = (support.x + support.width / 2) * PRESENTATION_SCALE;
          if (centre.x < lo || centre.x > hi) continue;
          const top = worldPointFromSimulation(support.x, support.y - support.height / 2)[1];
          if (top <= visual.position[1] + 0.1) floor = Math.max(floor, top);
        }
        const bounds = new THREE.Box3().setFromObject(half, true);
        if (bounds.min.y < floor) half.position.y += (floor - bounds.min.y) / scale;
      });
    }
  }

  facts(): GameWatermelonFacts[] {
    return [...this.entities].map(([id, entity]) => {
      entity.root.updateWorldMatrix(true, true);
      const halfBounds = entity.phase === 'cut' ? entity.halves.map(half => {
        const box = new THREE.Box3().setFromObject(half, true);
        return { min: box.min.toArray(), max: box.max.toArray() };
      }) : [];
      const bounds = entity.phase === 'intact' ? new THREE.Box3().setFromObject(entity.intact, true) : null;
      return { id, foodStyle: 'melon-jelly', renderer: 'watermelon-cleave', materialMode: 'watermelon-original',
        phase: entity.phase, pieces: entity.phase === 'cut' ? 2 : 1, age: entity.age, opening: entity.opening,
        minY: bounds?.min.y ?? Math.min(...halfBounds.map(bounds => bounds.min[1]!)),
        cutPlaneNormal: [0, 0, 1], position: entity.root.position.toArray(), halfBounds };
    });
  }

  dispose(): void {
    this.entities.clear(); this.root.clear(); this.root.removeFromParent();
    this.geometry.source.dispose(); this.geometry.halves.forEach(part => part.dispose());
    this.geometry.caps.forEach(part => part.dispose()); this.materials.dispose();
  }
}
