import * as THREE from 'three';
import { splitClosedGeometry } from './cut-plane-geometry';
import { CLEAVE_KNIFE_OUTLINE } from './cleave-knife-profile';

export const WATERMELON = Object.freeze({ radius: 1.05, centerY: 1.3, tableTop: 0.25 });
export const CLEAVE_TIMING = Object.freeze({ center: 0.22, strokeEnd: 0.32, opening: 0.28, total: 1.05 });
const BLADE_HALF_HEIGHT = 0.21;
const smooth = (value: number): number => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
type Point = [number, number, number];

export interface CleaveFrame {
  stage: 'entering' | 'opening' | 'landing' | 'settled';
  knife: { position: Point; edgeY: number; planeNormal: Point };
  halves: readonly [{ position: Point; rotationZ: number }, { position: Point; rotationZ: number }];
}

/** Both closed halves come from one original sphere, including its original UVs. */
export function createWatermelonGeometry(normal = new THREE.Vector3(1, 0, 0)) {
  const source = new THREE.SphereGeometry(WATERMELON.radius, 48, 32);
  const split = splitClosedGeometry(source, new THREE.Plane(normal.clone().normalize(), 0));
  const u = Math.abs(normal.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const v = normal.clone().cross(u).normalize();
  const point = new THREE.Vector3();
  for (const half of split.halves) {
    const positions = half.getAttribute('position');
    const uv = half.getAttribute('uv');
    for (const group of half.groups.filter(group => group.materialIndex === 2)) {
      for (let i = group.start; i < group.start + group.count; i++) {
        point.fromBufferAttribute(positions, i);
        uv.setXY(i, 0.5 + point.dot(u) / (2 * WATERMELON.radius), 0.5 + point.dot(v) / (2 * WATERMELON.radius));
      }
    }
  }
  return { source, ...split };
}

/** Bake the real blade bottom at -BLADE_HALF_HEIGHT, including bevel and edge thickness. */
export function createCleaveKnifeGeometry() {
  const outline = new THREE.Shape();
  CLEAVE_KNIFE_OUTLINE.forEach(([x, y], index) => index === 0 ? outline.moveTo(x, y) : outline.lineTo(x, y));
  outline.closePath();
  const blade = new THREE.ExtrudeGeometry(outline, { depth: 0.055, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1, steps: 1 });
  blade.rotateY(-Math.PI / 2);
  blade.translate(0.0275, 0.006, 0);
  blade.computeBoundingBox();
  const edge = new THREE.BoxGeometry(0.021, 0.016, 2.15);
  edge.translate(0, -BLADE_HALF_HEIGHT + 0.008, 0.025);
  edge.computeBoundingBox();
  return { blade, edge };
}

/** The edge and the two caps share x=0. Opening is gated by that edge's centre crossing. */
export function sampleCleave(timeSeconds: number): CleaveFrame {
  const t = Math.max(0, timeSeconds);
  const speed = 7.8;
  const startY = WATERMELON.centerY + speed * CLEAVE_TIMING.center;
  const edgeY = t <= CLEAVE_TIMING.strokeEnd
    ? startY - speed * t
    : startY - speed * CLEAVE_TIMING.strokeEnd + 0.18 * smooth((t - CLEAVE_TIMING.strokeEnd) / 0.25);
  const opening = smooth((t - CLEAVE_TIMING.center) / CLEAVE_TIMING.opening);
  const roll = 0.92 * smooth((t - CLEAVE_TIMING.center - 0.1) / 0.46);
  const fallAge = Math.max(0, Math.min(1, (t - 0.42) / 0.4));
  const lift = 0.10 * 4 * fallAge * (1 - fallAge);
  const half = (side: -1 | 1) => ({
    position: [side * 1.02 * opening || 0, WATERMELON.centerY + lift, 0] as Point,
    rotationZ: -side * roll || 0,
  });
  return {
    stage: t < CLEAVE_TIMING.center ? 'entering' : t < 0.48 ? 'opening' : t < CLEAVE_TIMING.total ? 'landing' : 'settled',
    knife: { position: [0, edgeY + BLADE_HALF_HEIGHT, 6.2 * smooth((t - 0.29) / 0.29)], edgeY, planeNormal: [1, 0, 0] },
    halves: [half(-1), half(1)],
  };
}

export interface CleaveState {
  status: 'ready' | 'cutting' | 'settled';
  elapsed: number;
  cycles: number;
  frame: CleaveFrame;
}

export class WatermelonCleaveController {
  private status: CleaveState['status'] = 'ready';
  private elapsed = 0;
  private cycles = 0;

  start(): boolean {
    if (this.status === 'cutting') return false;
    this.status = 'cutting';
    this.elapsed = 0;
    this.cycles++;
    return true;
  }

  advance(seconds: number): void {
    if (this.status !== 'cutting' || !Number.isFinite(seconds) || seconds <= 0) return;
    this.elapsed = Math.min(CLEAVE_TIMING.total, this.elapsed + seconds);
    if (this.elapsed >= CLEAVE_TIMING.total) this.status = 'settled';
  }

  advanceVisible(seconds: number, speed: number): void {
    this.advance(Math.min(seconds, 1 / 30) * speed);
  }

  reset(): void {
    this.status = 'ready';
    this.elapsed = 0;
  }

  getState(): CleaveState {
    return { status: this.status, elapsed: this.elapsed, cycles: this.cycles, frame: sampleCleave(this.elapsed) };
  }
}
