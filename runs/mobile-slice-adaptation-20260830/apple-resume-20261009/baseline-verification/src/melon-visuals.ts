/**
 * @deprecated Preserved for the old softbody study and legacy regression
 * tests. The default game deliberately does not instantiate this manager;
 * watermelon uses GameWatermelonVisuals and closed original halves instead.
 */
import * as THREE from 'three';
import { MelonBody, type MelonSurface } from './melon-softbody.js';
import type { CutImpact, FoodStyle, SliceState } from './game-core';
import { PRESENTATION_SCALE, worldPointFromSimulation, type CuttablePresentation, type PresentationFrame } from './three-presentation';

export interface MelonVisualFacts {
  id: string;
  foodStyle: FoodStyle;
  renderer: 'melon-softbody';
  materialMode: 'intact-stand-in' | 'watermelon-rich';
  pieces: number;
  cutAccepted: boolean;
  topologyVersion: number;
  volRatio: number;
  inverted: number;
  ke: number;
  shapeError: number;
  minY: number;
  safetyRollbacks: number;
  material: { firmness: number; damping: number };
  bounds: { min: number[]; max: number[] };
}

const MATERIAL = Object.freeze({ firmness: 0.35, damping: 0.35 });
// The full study kernel remains the default for deterministic physics tests.
// Runtime presentation uses one coarser volumetric layer so a real cut can
// finish inside a frame budget while preserving the same closed-surface,
// volume-safe and damped response.
const RENDER_BODY_OPTIONS = Object.freeze({ ...MATERIAL, tetSpacing: 0.5, tetLayers: 1, substeps: 6, surfaceDetailScale: 0.25 });

let referenceBounds: THREE.Box3 | undefined;
function specimenReferenceBounds(): THREE.Box3 {
  if (!referenceBounds) {
    // Rendering detail must not move a cut plane across tetrahedron boundaries.
    // Keep physical placement and surgery identical to the original specimen.
    const specimen = new MelonBody({ ...RENDER_BODY_OPTIONS, surfaceDetailScale: 1 });
    specimen.setPose(0, [Math.PI / 2, 0, 0]);
    referenceBounds = new THREE.Box3();
    const vertices = specimen.surfaces.jelly.interleaved;
    const point = new THREE.Vector3();
    for (let i = 0; i < vertices.length; i += 6) referenceBounds.expandByPoint(point.set(vertices[i]!, vertices[i + 1]!, vertices[i + 2]!));
  }
  return referenceBounds;
}

const INTACT_COLORS: Readonly<Record<FoodStyle, number>> = Object.freeze({
  apple: 0xb9e36b,
  banana: 0xf4d35e,
  coconut: 0xd7c2a2,
  cake: 0xf3c58b,
  pastry: 0xd79a54,
  cheesecake: 0xffe0aa,
  dumpling: 0xd8b48a,
  roast: 0x9f5b3d,
  skewer: 0xc67a3d,
  'moon-fruit': 0x9a8cff,
  'jade-bun': 0x72d6b2,
  'spirit-orb': 0xb58cff,
  'melon-jelly': 0xe95259,
  'orange-segment': 0xf0a64e,
  'soft-cake': 0xffc98d,
  'cucumber-log': 0x9bcf7b,
} as const);

function makeIntactMaterial(foodStyle: FoodStyle): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: INTACT_COLORS[foodStyle],
    roughness: 0.58,
    metalness: 0.02,
    flatShading: true,
  });
}

function makeGeometry(surface: MelonSurface): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const dynamic = new THREE.InterleavedBuffer(surface.interleaved, 6).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(dynamic, 3, 0));
  geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(dynamic, 3, 3));
  geometry.setAttribute('rest', new THREE.BufferAttribute(surface.rest, 3));
  geometry.setIndex(new THREE.BufferAttribute(surface.indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

class MelonVisual {
  readonly body = new MelonBody(RENDER_BODY_OPTIONS);
  readonly root = new THREE.Group();
  readonly jelly: THREE.Mesh;
  private readonly meshes: Record<'jelly' | 'seeds' | 'bubbles', THREE.Mesh>;
  private readonly seedMaterial = new THREE.MeshPhysicalMaterial({ color: 0x24140f, roughness: 0.24, clearcoat: 0.8 });
  private readonly bubbleMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffd9d1, roughness: 0.06, transparent: true, opacity: 0.2, depthWrite: false });
  private version = -1;
  private scale = 1;
  private anchorX = 0;
  private cut = false;
  private cutAccepted = false;
  private age = 0;
  private idleTime = 0;
  private sleeping = false;
  private placedPosition: [number, number] | null = null;
  private placedSize: [number, number] | null = null;
  private materialMode: 'intact-stand-in' | 'watermelon-rich' = 'intact-stand-in';

  constructor(readonly id: string, readonly foodStyle: FoodStyle, visual: CuttablePresentation, private readonly factory: (origin: readonly [number, number]) => THREE.ShaderMaterial) {
    this.root.name = `melon:${id}`;
    this.body.setPose(0, [Math.PI / 2, 0, 0]);
    this.jelly = new THREE.Mesh(makeGeometry(this.body.surfaces.jelly), makeIntactMaterial(foodStyle));
    this.jelly.name = `melon-jelly:${id}`;
    this.jelly.frustumCulled = true;
    this.meshes = {
      jelly: this.jelly,
      seeds: new THREE.Mesh(makeGeometry(this.body.surfaces.seeds), this.seedMaterial),
      bubbles: new THREE.Mesh(makeGeometry(this.body.surfaces.bubbles), this.bubbleMaterial),
    };
    this.meshes.seeds.name = `melon-seeds:${id}`;
    this.meshes.bubbles.name = `melon-bubbles:${id}`;
    this.root.add(...Object.values(this.meshes));
    const size = specimenReferenceBounds().getSize(new THREE.Vector3());
    this.scale = Math.min(visual.width / size.x, visual.height / size.y);
    this.root.scale.setScalar(this.scale);
    this.version = this.body.topologyVersion;
    this.place(visual);
    this.activateRichMaterial();
  }

  private place(visual: CuttablePresentation): void {
    if (this.placedPosition
      && this.placedSize
      && this.placedPosition[0] === visual.position[0]
      && this.placedPosition[1] === visual.position[1]
      && this.placedSize[0] === visual.width
      && this.placedSize[1] === visual.height) return;
    this.anchorX = visual.position[0];
    this.root.position.set(this.anchorX, 0, 0.18);
    this.body.setPose(visual.position[1] / this.scale, [Math.PI / 2, 0, 0]);
    this.placedPosition = [visual.position[0], visual.position[1]];
    this.placedSize = [visual.width, visual.height];
    this.updateGeometry();
  }

  sync(visual: CuttablePresentation, state: SliceState): void {
    if (!this.cut) this.place(visual);
    this.body.setGroundSurfaces(state.supports.filter((item) => item.active).map((support) => ({
      minX: ((support.x - support.width / 2) * PRESENTATION_SCALE - this.anchorX) / this.scale,
      maxX: ((support.x + support.width / 2) * PRESENTATION_SCALE - this.anchorX) / this.scale,
      minZ: (-0.24 - this.root.position.z) / this.scale,
      maxZ: (0.24 - this.root.position.z) / this.scale,
      y: worldPointFromSimulation(support.x, support.y - support.height / 2)[1] / this.scale,
      velocityX: support.vx * PRESENTATION_SCALE / this.scale,
    })));
    if (visual.phase === 'cut' && !this.cut) {
      const event = [...state.events].reverse().find((item) => item.type === 'cut' && item.targetId === this.id);
      this.performCut(event?.cutImpact);
    }
  }

  private performCut(impact?: CutImpact): void {
    this.activateRichMaterial();
    const normal: [number, number, number] = impact ? [impact.normalX, -impact.normalY, 0] : [1, 0, 0];
    const centre = specimenReferenceBounds().getCenter(new THREE.Vector3());
    centre.y += this.placedPosition![1] / this.scale;
    const centreOffset = normal[0] * centre.x + normal[1] * centre.y;
    // Match the non-melon renderer: keep the incident blade normal, but make
    // the split itself pass through the specimen centre.
    this.cutAccepted = this.body.cut(normal, -centreOffset, 0.16);
    if (!this.cutAccepted) this.cutAccepted = this.body.cut(normal, -centreOffset, 0.16);
    this.cut = true;
    if (this.cutAccepted) {
      // Keep the release on the cut plane. The softbody kernel assigns the
      // two component sides; a bounded component release makes the first
      // visible opening readable without launching the whole fruit upward.
      this.body.releaseCut(normal, 0.22);
    }
    this.updateGeometry();
  }

  private activateRichMaterial(): void {
    if (this.materialMode === 'watermelon-rich') return;
    const previous = this.jelly.material as THREE.Material;
    const material = this.factory(this.body.origin);
    if (material.uniforms.uScale) material.uniforms.uScale.value = 1 / this.scale;
    this.jelly.material = material;
    previous.dispose();
    this.materialMode = 'watermelon-rich';
  }

  advance(dt: number): void {
    if (!this.cut || this.sleeping || !(dt > 0)) return;
    this.body.step(dt);
    this.age += dt;
    if (this.age > 1.2) {
      const stats = this.body.stats();
      this.idleTime = stats.maxV < 0.05 ? this.idleTime + dt : 0;
      if (this.idleTime > 0.75) this.sleeping = true;
    }
    this.updateGeometry();
  }

  private updateGeometry(): void {
    for (const name of ['jelly', 'seeds', 'bubbles'] as const) {
      const mesh = this.meshes[name];
      if (this.version !== this.body.topologyVersion) {
        const previous = mesh.geometry;
        mesh.geometry = makeGeometry(this.body.surfaces[name]);
        previous.dispose();
      } else {
        const attribute = mesh.geometry.getAttribute('position') as THREE.InterleavedBufferAttribute;
        attribute.data.needsUpdate = true;
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
      }
    }
    this.version = this.body.topologyVersion;
  }

  facts(): MelonVisualFacts {
    const stats = this.body.stats();
    const bounds = new THREE.Box3().setFromObject(this.jelly);
    return { id: this.id, foodStyle: this.foodStyle, renderer: 'melon-softbody', materialMode: this.materialMode, pieces: this.body.componentCount, cutAccepted: this.cutAccepted,
      topologyVersion: this.body.topologyVersion, volRatio: stats.volRatio, inverted: stats.inverted,
      ke: stats.ke, shapeError: stats.shapeError, minY: stats.minY * this.scale, safetyRollbacks: stats.safetyRollbacks,
      material: MATERIAL, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() } };
  }

  get isRichMaterial(): boolean { return this.materialMode === 'watermelon-rich'; }

  dispose(): void {
    Object.values(this.meshes).forEach((mesh) => mesh.geometry.dispose());
    (this.jelly.material as THREE.Material).dispose();
    this.seedMaterial.dispose(); this.bubbleMaterial.dispose(); this.root.removeFromParent();
  }
}

export class MelonVisualManager {
  readonly root = new THREE.Group();
  private readonly entities = new Map<string, MelonVisual>();
  private previousTime = -1;
  private runKey = '';

  constructor(private readonly factory: (origin: readonly [number, number]) => THREE.ShaderMaterial) {}

  sync(state: SliceState, frame: PresentationFrame): void {
    const key = `${state.seed}:${state.levelNumber}:${state.phase}`;
    if (this.runKey !== key || state.worldTime < this.previousTime || state.worldTime === 0 && this.previousTime > 0) this.clear();
    this.runKey = key; this.previousTime = state.worldTime;
    // Only watermelon owns the study's wedge, seeds and striped-rind shader.
    // Keep that same identity before and after cutting. Other foods reuse
    // the XPBD solver through their original authored geometry renderer.
    const visuals = frame.cuttables.filter((item) => item.foodStyle === 'melon-jelly');
    const live = new Set(visuals.map((item) => item.id));
    for (const [id, entity] of this.entities) if (!live.has(id)) { entity.dispose(); this.entities.delete(id); }
    for (const visual of visuals) {
      let entity = this.entities.get(visual.id);
      if (!entity) { entity = new MelonVisual(visual.id, visual.foodStyle, visual, this.factory); this.entities.set(visual.id, entity); this.root.add(entity.root); }
      entity.sync(visual, state);
    }
  }

  advance(dt: number): void { for (const entity of this.entities.values()) entity.advance(dt); }
  get jellyMeshes(): THREE.Mesh[] { return [...this.entities.values()].filter((entity) => entity.isRichMaterial).map((entity) => entity.jelly); }
  visibleJellyMeshes(camera: THREE.PerspectiveCamera): THREE.Mesh[] {
    this.root.updateWorldMatrix(true, true); camera.updateMatrixWorld(true);
    const projection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(projection);
    return this.jellyMeshes.filter((mesh) => frustum.intersectsObject(mesh));
  }
  facts(): MelonVisualFacts[] { return [...this.entities.values()].map((entity) => entity.facts()); }
  private clear(): void { this.entities.forEach((entity) => entity.dispose()); this.entities.clear(); }
  dispose(): void { this.clear(); this.root.removeFromParent(); }
}
