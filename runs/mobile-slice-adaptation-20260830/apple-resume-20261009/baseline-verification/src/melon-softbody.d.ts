export type Vec3 = readonly [number, number, number];

export interface MelonBodyOptions {
  firmness?: number;
  damping?: number;
  substeps?: number;
  tetSpacing?: number;
  tetLayers?: number;
  surfaceDetailScale?: number;
}

export interface MelonGroundSurface {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  velocityX?: number;
}

export interface MelonSurface {
  readonly interleaved: Float32Array;
  readonly rest: Float32Array;
  readonly aux: Float32Array;
  readonly indices: Uint32Array;
  readonly count: number;
}

export interface MelonStats {
  readonly volRatio: number;
  readonly inverted: number;
  readonly minTetRatio: number;
  readonly ke: number;
  readonly minY: number;
  readonly maxV: number;
  readonly shapeError: number;
  readonly componentCount: number;
  readonly safetyRejects: number;
  readonly safetyRollbacks: number;
  readonly contacts: number;
  readonly contactBudgetHits: number;
}

export class MelonBody {
  constructor(options?: MelonBodyOptions);
  readonly origin: readonly [number, number];
  readonly surfaces: Record<'jelly' | 'seeds' | 'bubbles', MelonSurface>;
  readonly componentCount: number;
  readonly topologyVersion: number;
  setPose(lift: number, rotation: Vec3): void;
  cut(normal: Vec3, offset: number, impulse?: number): boolean;
  step(dt: number): void;
  setMaterial(options: { firmness?: number; damping?: number }): void;
  setVelocity(linear: Vec3, angular?: Vec3): void;
  impulse(vector: Vec3): void;
  releaseCut(normal: Vec3, speed?: number): void;
  setGroundSurfaces(surfaces: readonly MelonGroundSurface[]): void;
  stats(): MelonStats;
}

export interface AuthoredSurface {
  positions: Float32Array;
  indices: Uint32Array;
}
export interface AuthoredDecoration extends AuthoredSurface { component: 0 | 1 }
export interface AuthoredCutStats extends MelonStats {
  kernel: 'watermelon-xpbd';
  localShapeError: number;
  openingSpeed: number;
}
export class AuthoredCutBody {
  constructor(fragments: readonly AuthoredSurface[], decorations?: readonly AuthoredDecoration[], options?: MelonBodyOptions);
  readonly surfaces: readonly MelonSurface[];
  release(normal: Vec3, offset: number, speed?: number, twist?: number): void;
  step(dt: number): void;
  setGroundSurfaces(surfaces: readonly MelonGroundSurface[]): void;
  stats(): AuthoredCutStats;
}
