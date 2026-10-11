import * as THREE from 'three';
import {
  FORMAL_CUT_ASSET_CONTRACT,
  type CutHalfPresentation,
  type CuttablePresentation,
  type PresentationFrame,
  type Vec3Tuple,
} from './three-presentation';
import { MECHANICS_DEMO_THEME } from './theme';
import type { AStyleTextureSet } from './a-style-texture-runtime';
import { splitClosedGeometry } from './cut-plane-geometry';
import { mapFruitCap, makeCoconutCavity, FruitCleave } from './fruit-cut-layers';
import { AuthoredCutBody, type AuthoredCutStats, type AuthoredDecoration, type AuthoredSurface } from './melon-softbody.js';
import type { SliceState } from './game-core';
import { sweepCleaveCentre } from './cleave-knife-profile';
import { PRESENTATION_SCALE, worldPointFromSimulation, supportPresentationTransform } from './three-presentation';

const WORLD_THEME = MECHANICS_DEMO_THEME.world;

export const APPLE_CLEAVE_TIMING = Object.freeze({ center: 0.12, openingEnd: 0.36, total: 0.48 });
const appleEase = (value: number): number => {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
export function sampleAppleCleave(seconds: number) {
  const t = Math.max(0, seconds);
  const opening = appleEase((t - APPLE_CLEAVE_TIMING.center) / (APPLE_CLEAVE_TIMING.openingEnd - APPLE_CLEAVE_TIMING.center));
  return { opening, roll: THREE.MathUtils.degToRad(6) * opening,
    landing: appleEase((t - APPLE_CLEAVE_TIMING.openingEnd) / (APPLE_CLEAVE_TIMING.total - APPLE_CLEAVE_TIMING.openingEnd)),
    stage: t <= APPLE_CLEAVE_TIMING.center ? 'entering' as const : t < APPLE_CLEAVE_TIMING.openingEnd ? 'opening' as const : t < APPLE_CLEAVE_TIMING.total ? 'landing' as const : 'settled' as const };
}

export interface AppleGround { minX: number; maxX: number; minZ: number; maxZ: number; y: number }
export interface AppleCleaveFacts {
  elapsed: number; opening: number; stage: ReturnType<typeof sampleAppleCleave>['stage'];
  centerCrossed: boolean; diameter: number; gap: number; roll: number; minY: number;
  normal: number[]; origin: number[]; contactY: number[];
  halfBounds: { min: number[]; max: number[] }[];
}

export interface ScreenProjection {
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
}

export interface CutCapFacts {
  half: 'halfA' | 'halfB';
  materialId: string;
  meshName: string;
  worldNormal: Vec3Tuple;
  cameraFacingScore: number;
  projection: ScreenProjection | null;
}

export interface CutVisualFacts {
  id: string;
  foodStyle: CuttablePresentation['foodStyle'];
  renderer: 'authored-static' | 'authored-softbody' | 'apple-cleave' | 'fruit-cleave';
  fruit: { elapsed: number; stage: 'opening' | 'landed' } | null;
  apple: AppleCleaveFacts | null;
  materialMode: 'food-original';
  softbody: AuthoredCutStats | null;
  identity: { sourceGeometry: string; exteriorColor: number | null; cutFaceColor: number; decorationFragments: number };
  phase: 'intact' | 'cut';
  skinKind: CuttablePresentation['skinKind'];
  lifecycle: 'intact' | 'falling' | 'landed';
  visibleHalves: number;
  capMaterialIds: string[];
  capMeshNames: string[];
  caps: CutCapFacts[];
  targetProjection: ScreenProjection | null;
}

function closedGeometryVolume(geometry: THREE.BufferGeometry): number {
  const positions = geometry.getAttribute('position');
  const indices = geometry.getIndex();
  const count = indices?.count ?? positions.count;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let signedVolume = 0;
  for (let index = 0; index < count; index += 3) {
    const readIndex = (offset: number): number => indices?.getX(index + offset) ?? index + offset;
    a.fromBufferAttribute(positions, readIndex(0));
    b.fromBufferAttribute(positions, readIndex(1));
    c.fromBufferAttribute(positions, readIndex(2));
    signedVolume += a.dot(b.clone().cross(c));
  }
  return Math.abs(signedVolume / 6);
}

export function balancedCutOffset(source: THREE.BufferGeometry, normal: THREE.Vector3, fallback: number): number {
  source.computeBoundingBox();
  const bounds = source.boundingBox;
  if (!bounds) return fallback;
  const projections: number[] = [];
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) projections.push(new THREE.Vector3(x, y, z).dot(normal));
    }
  }
  const min = Math.min(...projections);
  const max = Math.max(...projections);
  const span = max - min;
  if (!Number.isFinite(span) || span < 1e-6) return fallback;

  let low = min + span * 0.001;
  let high = max - span * 0.001;
  let best = Math.max(low, Math.min(high, fallback));
  let bestError = Number.POSITIVE_INFINITY;
  for (let iteration = 0; iteration < 10; iteration += 1) {
    const offset = (low + high) / 2;
    try {
      const candidate = splitClosedGeometry(source, new THREE.Plane(normal, -offset));
      const firstVolume = closedGeometryVolume(candidate.halves[0]);
      const secondVolume = closedGeometryVolume(candidate.halves[1]);
      candidate.halves.forEach((geometry) => geometry.dispose());
      candidate.caps.forEach((geometry) => geometry.dispose());
      const total = firstVolume + secondVolume;
      if (!(total > 1e-8)) break;
      const error = Math.abs(firstVolume / total - 0.5);
      if (error < bestError) {
        best = offset;
        bestError = error;
      }
      if (firstVolume < secondVolume) low = offset;
      else high = offset;
    } catch {
      break;
    }
  }
  return best;
}

function projectMesh(mesh: THREE.Mesh, camera: THREE.Camera, viewport: { width: number; height: number }): ScreenProjection | null {
  const geometry = mesh.geometry;
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) return null;
  mesh.updateWorldMatrix(true, false);
  const point = new THREE.Vector3();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        point.set(x, y, z).applyMatrix4(mesh.matrixWorld).project(camera);
        const screenX = (point.x * 0.5 + 0.5) * viewport.width;
        const screenY = (-point.y * 0.5 + 0.5) * viewport.height;
        minX = Math.min(minX, screenX);
        maxX = Math.max(maxX, screenX);
        minY = Math.min(minY, screenY);
        maxY = Math.max(maxY, screenY);
      }
    }
  }
  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);
  return { x: minX, y: minY, width, height, area: width * height };
}

export interface SharedCutResources {
  unitBox: THREE.BoxGeometry;
  unitSphere: THREE.SphereGeometry;
  unitCylinder: THREE.CylinderGeometry;
  unitLog: THREE.CylinderGeometry;
  dessertBase: THREE.ExtrudeGeometry;
  dessertHalfA: THREE.ExtrudeGeometry;
  dessertHalfB: THREE.ExtrudeGeometry;
  orangeWedge: THREE.ExtrudeGeometry;
  softCakeBase: THREE.ExtrudeGeometry;
  halfSigilA: THREE.ExtrudeGeometry;
  halfSigilB: THREE.ExtrudeGeometry;
  halfBoxA: THREE.BoxGeometry;
  halfBoxB: THREE.BoxGeometry;
  halfLogA: THREE.CylinderGeometry;
  halfLogB: THREE.CylinderGeometry;
  appleFruit: THREE.LatheGeometry;
  coconutFruit: THREE.SphereGeometry;
  bananaFruit: THREE.ExtrudeGeometry;
  capPlane: THREE.PlaneGeometry;
  capCircle: THREE.CircleGeometry;
  blockMaterial: THREE.MeshStandardMaterial;
  sigilMaterial: THREE.MeshStandardMaterial;
  skinMaterials: Record<CuttablePresentation['skinKind'], {
    outer: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
    secondary: THREE.MeshStandardMaterial;
    cap: THREE.MeshStandardMaterial;
  }>;
}

export interface CutVisualProvider {
  readonly kind: 'PROGRAMMATIC_ORIGINAL';
  readonly formalAssetContract: typeof FORMAL_CUT_ASSET_CONTRACT;
  readonly baseColorTextureIds: readonly string[];
  readonly texturedMaterialCount: number;
  createSharedResources(): SharedCutResources;
  createEntity(visual: CuttablePresentation, resources: SharedCutResources): CutVisualEntity;
  disposeSharedResources(resources: SharedCutResources): void;
}

function makeHalfSigilGeometry(side: -1 | 1): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  if (side < 0) {
    shape.moveTo(0, -1);
    shape.absarc(0, 0, 1, -Math.PI / 2, -Math.PI * 1.5, true);
  } else {
    shape.moveTo(0, -1);
    shape.absarc(0, 0, 1, -Math.PI / 2, Math.PI / 2, false);
  }
  shape.lineTo(0, -1);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1, curveSegments: 10 });
  geometry.translate(0, 0, -0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function makeHalfBoxGeometry(side: -1 | 1): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(0.5, 1, 1);
  geometry.translate(side * 0.25, 0, 0);
  return geometry;
}

function makeHalfLogGeometry(side: -1 | 1): THREE.CylinderGeometry {
  const geometry = new THREE.CylinderGeometry(1, 1, 0.5, 16, 1, false);
  geometry.rotateZ(Math.PI / 2);
  geometry.translate(side * 0.25, 0, 0);
  geometry.computeVertexNormals();
  return geometry;
}

function makeDessertBaseGeometry(): THREE.ExtrudeGeometry {
  // A short, layered cake slice reads as pastry at gameplay distance; it is
  // intentionally not a recolored circular sigil/crystal.
  const shape = new THREE.Shape();
  shape.moveTo(-1, -0.68);
  shape.lineTo(0.72, -0.68);
  shape.quadraticCurveTo(1, -0.68, 1, -0.38);
  shape.lineTo(0.82, 0.68);
  shape.lineTo(-1, 0.68);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.05, bevelSegments: 1, curveSegments: 4 });
  geometry.translate(0, 0, -0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function makeDessertHalfGeometry(side: -1 | 1): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  if (side < 0) {
    shape.moveTo(-1, -0.68); shape.lineTo(0, -0.68); shape.lineTo(0, 0.68); shape.lineTo(-1, 0.68);
  } else {
    shape.moveTo(0, -0.68); shape.lineTo(0.72, -0.68); shape.quadraticCurveTo(1, -0.68, 1, -0.38); shape.lineTo(0.82, 0.68); shape.lineTo(0, 0.68);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 4 });
  geometry.translate(0, 0, -0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function makeSoftCakeBaseGeometry(): THREE.ExtrudeGeometry {
  // A rounded-square steamed cake block: four corner arcs read as a soft
  // cake at gameplay distance; intentionally not the triangular dessert
  // slice and not a recolored crate.
  const shape = new THREE.Shape();
  const corner = 0.22;
  shape.moveTo(-1 + corner, -0.78);
  shape.lineTo(1 - corner, -0.78);
  shape.quadraticCurveTo(1, -0.78, 1, -0.78 + corner);
  shape.lineTo(1, 0.78 - corner);
  shape.quadraticCurveTo(1, 0.78, 1 - corner, 0.78);
  shape.lineTo(-1 + corner, 0.78);
  shape.quadraticCurveTo(-1, 0.78, -1, 0.78 - corner);
  shape.lineTo(-1, -0.78 + corner);
  shape.quadraticCurveTo(-1, -0.78, -1 + corner, -0.78);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.04, bevelSegments: 1, curveSegments: 6 });
  geometry.translate(0, 0, -0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function makeOrangeWedgeGeometry(): THREE.ExtrudeGeometry {
  // An orange segment reads as a wedge: two straight pith edges meeting at a
  // bottom tip with a curved rind arc over the top. Unit-ish footprint scaled
  // by radius in sync(); it is intentionally not a recolored sphere.
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.85);
  shape.lineTo(-0.72, 0.42);
  shape.quadraticCurveTo(0, 1.3, 0.72, 0.42);
  shape.lineTo(0, -0.85);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1, curveSegments: 10 });
  geometry.translate(0, 0, -0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function makeAppleGeometry(): THREE.LatheGeometry {
  // A continuous skin: both axial poles sit inside shallow five-lobed basins.
  // The upper shoulder is widest; the lower cheek tapers into a small calyx.
  const profile = [[0, -0.67], [0.22, -0.81], [0.38, -0.84], [0.57, -0.78],
    [0.75, -0.61], [0.87, -0.37], [0.96, -0.08], [1.0, 0.23],
    [1.02, 0.42], [0.96, 0.63], [0.83, 0.78], [0.61, 0.87],
    [0.39, 0.89], [0.22, 0.82], [0.11, 0.76], [0, 0.72]];
  const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r!, (y! - 0.025) / 0.865)), 24);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const angle = Math.atan2(z, x);
    const lobe = 1 + (0.008 + 0.018 * Math.abs(y) ** 4) * Math.cos(angle * 5 + 0.2);
    const cheek = 1 + 0.012 * Math.cos(angle + 0.45) * (1 - y * y);
    positions.setXYZ(i, x * lobe * cheek, y, z * lobe * cheek);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function makeCoconutGeometry(): THREE.SphereGeometry {
  const geometry = new THREE.SphereGeometry(1, 22, 14);
  const positions = geometry.getAttribute('position');
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    point.x *= 1.08;
    point.y *= 0.94;
    point.z *= 0.98;
    point.x += 0.035 * (1 - point.y * point.y);
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function makeBananaGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-1.12, -0.28);
  shape.quadraticCurveTo(-0.56, -0.62, 0.04, -0.3);
  shape.quadraticCurveTo(0.7, 0.02, 1.1, 0.58);
  shape.lineTo(0.78, 0.76);
  shape.quadraticCurveTo(0.36, 0.34, -0.08, 0.13);
  shape.quadraticCurveTo(-0.66, -0.12, -1.0, 0.0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.5,
    bevelEnabled: true,
    bevelSize: 0.045,
    bevelThickness: 0.04,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -0.25);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

type FoodTextureStyle = 'apple' | 'orange-segment' | 'banana' | 'coconut';
type FoodTextureLayer = 'outer' | 'cut';

function makeFoodTexture(style: FoodTextureStyle, layer: FoodTextureLayer): THREE.DataTexture {
  const size = style === 'apple' ? 256 : 128;
  const data = new Uint8Array(size * size * 4);
  const write = (index: number, colour: readonly [number, number, number]): void => {
    data[index] = Math.max(0, Math.min(255, Math.round(colour[0])));
    data[index + 1] = Math.max(0, Math.min(255, Math.round(colour[1])));
    data[index + 2] = Math.max(0, Math.min(255, Math.round(colour[2])));
    data[index + 3] = 255;
  };
  const distanceToRotatedEllipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number, angle: number): number => {
    const c = Math.cos(angle), s = Math.sin(angle);
    const dx = x - cx, dy = y - cy;
    const ux = c * dx + s * dy, uy = -s * dx + c * dy;
    return Math.sqrt((ux / rx) ** 2 + (uy / ry) ** 2);
  };
  const noise = (x: number, y: number): number => Math.sin(x * 71.13 + y * 113.7) * 0.5 + Math.sin(x * 173.1 - y * 47.2) * 0.25;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / (size - 1), v = y / (size - 1);
    const px = u * 2 - 1, py = v * 2 - 1, radius = Math.hypot(px, py);
    const grain = noise(u, v);
    let colour: [number, number, number];
    if (layer === 'outer') {
      if (style === 'apple') {
        const blush = Math.cos(u * Math.PI * 2 + 0.65) * Math.sin(v * Math.PI);
        const shoulder = Math.sin(v * Math.PI);
        colour = [164 + blush * 10 + shoulder * 12, 32 + blush * 4 + shoulder * 4, 30 + blush * 3];
      } else if (style === 'orange-segment') {
        colour = [245 + grain * 7, 113 + grain * 10, 23 + grain * 5];
        if (radius > 0.82) colour = [255 + grain * 3, 145 + grain * 8, 38 + grain * 4];
      } else if (style === 'banana') {
        const freckle = Math.max(0, Math.sin(u * 93 + v * 41) - 0.78) * 80;
        colour = [239 + grain * 7 - freckle, 194 + grain * 8 - freckle * 0.45, 57 + grain * 4];
      } else {
        const fibres = Math.abs(Math.sin(Math.atan2(py, px) * 19 + radius * 35));
        colour = [116 + grain * 10 - fibres * 17, 67 + grain * 8 - fibres * 12, 39 + grain * 5 - fibres * 7];
      }
    } else if (style === 'apple') {
      const angle = Math.atan2(py, px);
      const starRadius = 0.43 + 0.105 * Math.cos(5 * angle + 0.35);
      colour = radius >= 0.94 ? [174, 31, 29]
        : radius < starRadius ? [221, 182, 119] : [250, 226, 178];
      for (let seed = 0; seed < 5; seed++) {
        const direction = seed * Math.PI * 2 / 5 - 0.07;
        const distance = 0.31 + (seed % 2) * 0.018;
        const scale = [0.93, 1.08, 0.87, 1.02, 0.96][seed]!;
        if (distanceToRotatedEllipse(px, py, Math.cos(direction) * distance, Math.sin(direction) * distance,
          0.038 * scale, 0.074 * scale, direction + Math.PI / 2 + (seed - 2) * 0.075) < 1) colour = [63, 32, 20];
      }
    } else if (style === 'orange-segment') {
      const angle = Math.atan2(py, px);
      const segment = Math.abs(Math.sin(angle * 6));
      const pith = radius > 0.84 ? [249, 235, 190] : radius < 0.12 ? [255, 242, 203] : [255 - segment * 18, 145 + segment * 25, 29 + segment * 8];
      colour = [pith[0] + grain * 2, pith[1] + grain * 2, pith[2] + grain];
      if (radius > 0.84) colour = radius > 0.95 ? [244, 121, 22] : [255, 240, 190];
      const seeds = [[0.32, 0.05], [-0.26, 0.18], [0.18, -0.3]];
      if (seeds.some(([cx, cy]) => Math.hypot(px - cx, py - cy) < 0.035)) colour = [80, 42, 16];
    } else if (style === 'banana') {
      const fibre = Math.abs(Math.sin(px * 21 + py * 3.5));
      colour = [250 - fibre * 13 + grain * 2, 226 - fibre * 13 + grain * 2, 150 - fibre * 9];
      if (radius > 0.82) colour = radius > 0.94 ? [133, 91, 26] : [231, 184, 43];
      if (radius < 0.16) colour = [181, 128, 48];
      if (Math.hypot(px + 0.25, py - 0.22) < 0.035 || Math.hypot(px - 0.18, py + 0.2) < 0.035) colour = [104, 67, 24];
    } else {
      const shell = radius > 0.84 ? [108, 61, 35] : [245, 240, 218];
      const fibres = radius < 0.84 ? Math.abs(Math.sin(Math.atan2(py, px) * 23 + radius * 9)) * 9 : 0;
      colour = [shell[0] - fibres + grain * 2, shell[1] - fibres + grain * 2, shell[2] - fibres + grain];
      if (radius > 0.9) colour = [83, 46, 27];
      if (Math.hypot(px + 0.2, py - 0.1) < 0.04 || Math.hypot(px - 0.12, py + 0.2) < 0.04) colour = [125, 77, 42];
    }
    write((y * size + x) * 4, colour);
    if (layer === 'cut' && style === 'coconut' && radius < .56) data[(y * size + x) * 4 + 3] = 0;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function createSharedCutResources(textures?: AStyleTextureSet): SharedCutResources {
  const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 16, 1, false);
  unitCylinder.rotateX(Math.PI / 2);
  const unitLog = new THREE.CylinderGeometry(1, 1, 1, 16, 1, false);
  unitLog.rotateZ(Math.PI / 2);
  const withMap = (map: THREE.Texture | undefined): { map?: THREE.Texture } => map ? { map } : {};
  const skinMaterials: SharedCutResources['skinMaterials'] = {
    crate: {
      outer: new THREE.MeshStandardMaterial({ color: textures ? 0xffffff : WORLD_THEME.cuttableBlock, ...withMap(textures?.maps.crate.outer), roughness: 0.72, metalness: 0 }),
      secondary: new THREE.MeshStandardMaterial({ color: textures ? 0xffffff : WORLD_THEME.cuttableSigil, ...withMap(textures?.maps.crate.band), roughness: 0.8, metalness: 0 }),
      cap: new THREE.MeshStandardMaterial({ color: textures ? 0xffffff : WORLD_THEME.capA, ...withMap(textures?.maps.crate.cap), roughness: 0.68, metalness: 0 }),
    },
    log: {
      outer: new THREE.MeshStandardMaterial({ color: textures ? 0xffffff : 0x775038, ...withMap(textures?.maps.log.bark), roughness: 0.9, metalness: 0 }),
      secondary: new THREE.MeshStandardMaterial({ color: textures ? 0xffffff : WORLD_THEME.capB, ...withMap(textures?.maps.log.end), roughness: 0.76, metalness: 0 }),
      cap: new THREE.MeshStandardMaterial({ color: textures ? 0xffffff : WORLD_THEME.capA, ...withMap(textures?.maps.log.cap), roughness: 0.7, metalness: 0 }),
    },
    crystal: {
      outer: new THREE.MeshPhysicalMaterial({ color: textures ? 0xffffff : WORLD_THEME.cuttableSigil, ...withMap(textures?.maps.crystal.outer), roughness: 0.24, metalness: 0.02, clearcoat: 0.72, clearcoatRoughness: 0.2 }),
      secondary: new THREE.MeshStandardMaterial({ color: textures ? 0xffffff : WORLD_THEME.cuttableSigil, ...withMap(textures?.maps.crystal.frost), roughness: 0.34, metalness: 0.02 }),
      cap: new THREE.MeshStandardMaterial({ color: textures ? 0xffffff : WORLD_THEME.capA, ...withMap(textures?.maps.crystal.cap), emissive: 0x155b78, emissiveIntensity: 0.32, roughness: 0.3, metalness: 0.02 }),
    },
    dessert: {
      outer: new THREE.MeshStandardMaterial({ color: 0xffc48f, roughness: 0.62, metalness: 0 }),
      secondary: new THREE.MeshStandardMaterial({ color: 0xfff0d4, roughness: 0.7, metalness: 0 }),
      cap: new THREE.MeshStandardMaterial({ color: 0xffe0a8, roughness: 0.58, metalness: 0 }),
    },
  };
  return {
    unitBox: new THREE.BoxGeometry(1, 1, 1),
    unitSphere: new THREE.SphereGeometry(1, 12, 8),
    unitCylinder,
    unitLog,
    dessertBase: makeDessertBaseGeometry(),
    dessertHalfA: makeDessertHalfGeometry(-1),
    dessertHalfB: makeDessertHalfGeometry(1),
    orangeWedge: makeOrangeWedgeGeometry(),
    softCakeBase: makeSoftCakeBaseGeometry(),
    halfSigilA: makeHalfSigilGeometry(-1),
    halfSigilB: makeHalfSigilGeometry(1),
    halfBoxA: makeHalfBoxGeometry(-1),
    halfBoxB: makeHalfBoxGeometry(1),
    halfLogA: makeHalfLogGeometry(-1),
    halfLogB: makeHalfLogGeometry(1),
    appleFruit: makeAppleGeometry(),
    coconutFruit: makeCoconutGeometry(),
    bananaFruit: makeBananaGeometry(),
    capPlane: new THREE.PlaneGeometry(1, 2),
    capCircle: new THREE.CircleGeometry(1, 18),
    blockMaterial: new THREE.MeshStandardMaterial({ color: WORLD_THEME.cuttableBlock, roughness: 0.7, metalness: 0.04 }),
    sigilMaterial: new THREE.MeshStandardMaterial({ color: WORLD_THEME.cuttableSigil, roughness: 0.38, metalness: 0.08, emissive: WORLD_THEME.cuttableSigilEmissive, emissiveIntensity: 0.6 }),
    skinMaterials,
  };
}

export function disposeSharedCutResources(resources: SharedCutResources): void {
  resources.unitBox.dispose();
  resources.unitSphere.dispose();
  resources.unitCylinder.dispose();
  resources.unitLog.dispose();
  resources.dessertBase.dispose();
  resources.dessertHalfA.dispose();
  resources.dessertHalfB.dispose();
  resources.orangeWedge.dispose();
  resources.softCakeBase.dispose();
  resources.halfSigilA.dispose();
  resources.halfSigilB.dispose();
  resources.halfBoxA.dispose();
  resources.halfBoxB.dispose();
  resources.halfLogA.dispose();
  resources.halfLogB.dispose();
  resources.appleFruit.dispose();
  resources.coconutFruit.dispose();
  resources.bananaFruit.dispose();
  resources.capPlane.dispose();
  resources.capCircle.dispose();
  resources.blockMaterial.dispose();
  resources.sigilMaterial.dispose();
  for (const materialSet of Object.values(resources.skinMaterials)) {
    materialSet.outer.dispose();
    materialSet.secondary.dispose();
    materialSet.cap.dispose();
  }
}

export class CutVisualEntity {
  readonly root = new THREE.Group();
  private readonly intact: THREE.Mesh;
  private readonly halfRoots: readonly [THREE.Group, THREE.Group];
  private readonly capMaterials: readonly [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial];
  private readonly capMeshes: readonly [THREE.Mesh, THREE.Mesh];
  private readonly styleMaterials: THREE.Material[] = [];
  private readonly styleTextures: THREE.Texture[] = [];
  private phase: 'intact' | 'cut' = 'intact';
  private sliced = false;
  private readonly cutGeometry: THREE.BufferGeometry[] = [];
  private readonly cutMaterials: THREE.Material[] = [];
  private softbody: AuthoredCutBody | null = null;
  private fruitCut: FruitCleave | null = null;
  private readonly deformingMeshes: THREE.Mesh[] = [];
  private readonly cutDecorations: THREE.Mesh[] = [];
  private cutOrigin = new THREE.Vector3();
  private age = 0;
  private idleTime = 0;
  private sleeping = false;
  private appleCut: { normal: THREE.Vector3; origin: THREE.Vector3; diameter: number;
    elapsed: number; started: boolean; crossed: boolean; surfaces: AppleGround[]; contactY: number[];
    revealCaps: boolean; pivots: THREE.Vector3[]; rotations: THREE.Quaternion[] } | null = null;
  private previousAppleKnife: { x: number; y: number; angle: number } | null = null;

  get appleHalves(): readonly [THREE.Group, THREE.Group] { return this.halfRoots; }


  constructor(private visual: CuttablePresentation, resources: SharedCutResources) {
    this.root.name = `cuttable:${visual.id}`;
    const baseMaterialSet = resources.skinMaterials[visual.skinKind];
    const tint: Record<CuttablePresentation['foodStyle'], number> = {
      apple: 0xe6534a, banana: 0xf0c84b, coconut: 0x8b5a38, 'melon-jelly': 0xdb233d,
      cake: 0xf0b38b, pastry: 0xd58b4d, cheesecake: 0xffd6a0,
      dumpling: 0xe8d0b0, roast: 0xa85d3e, skewer: 0x8e4b32,
      'moon-fruit': 0x8d7df0, 'jade-bun': 0x43c9a0, 'spirit-orb': 0x55c6e8,
      'orange-segment': 0xf59a3e,
      'soft-cake': 0xa9d3ab,
      'cucumber-log': 0x3e8f4e,
    };
    const cloneTint = <T extends THREE.Material>(material: T): T => {
      const copy = material.clone() as T;
      if ('color' in copy) (copy as unknown as THREE.MeshStandardMaterial).color.setHex(tint[visual.foodStyle]);
      this.styleMaterials.push(copy);
      return copy;
    };
    const materialSet = { outer: cloneTint(baseMaterialSet.outer), secondary: cloneTint(baseMaterialSet.secondary), cap: cloneTint(baseMaterialSet.cap) };
    // Level 1 reads as low-poly fruit on a bright runway. Keep authored
    // textures for later structural blocks, while fruit-like targets use
    // matte palette colors that survive the small mobile viewport.
    // The orange segment also goes matte: the shared crystal atlas is a
    // green gem texture that would multiply over its orange tint.
    const matteFruitStyles: CuttablePresentation['foodStyle'][] = [
      'apple', 'coconut', 'moon-fruit', 'jade-bun', 'spirit-orb', 'orange-segment',
    ];
    if (visual.kind === 'block' || matteFruitStyles.includes(visual.foodStyle)) {
      materialSet.outer.map = null;
      materialSet.secondary.map = null;
      materialSet.cap.map = null;
    }
    const layeredFoods: FoodTextureStyle[] = ['apple', 'orange-segment', 'banana', 'coconut'];
    if (layeredFoods.includes(visual.foodStyle as FoodTextureStyle)) {
      const style = visual.foodStyle as FoodTextureStyle;
      const outerTexture = makeFoodTexture(style, 'outer');
      const cutTexture = makeFoodTexture(style, 'cut');
      materialSet.outer.map = outerTexture;
      materialSet.outer.color.setHex(0xffffff);
      materialSet.secondary.map = outerTexture;
      materialSet.secondary.color.setHex(0xffffff);
      materialSet.cap.map = cutTexture;
      materialSet.cap.color.setHex(0xffffff);
      this.styleTextures.push(outerTexture, cutTexture);
    }
    if (visual.foodStyle === 'apple') {
      materialSet.outer.roughness = 0.86; materialSet.outer.metalness = 0;
      materialSet.outer.flatShading = true;
      if (materialSet.outer instanceof THREE.MeshPhysicalMaterial) materialSet.outer.clearcoat = 0;
    }
    const intactGeometry = visual.foodStyle === 'orange-segment'
      ? resources.orangeWedge
      : visual.foodStyle === 'apple'
        ? resources.appleFruit
      : visual.foodStyle === 'coconut'
        ? resources.coconutFruit
      : visual.foodStyle === 'banana'
        ? resources.bananaFruit
      : visual.foodStyle === 'soft-cake'
        ? resources.softCakeBase
      : visual.skinKind === 'crate' ? resources.unitBox : visual.skinKind === 'log' ? resources.unitLog : visual.skinKind === 'dessert' ? resources.dessertBase : resources.unitSphere;
    // SphereGeometry has no material groups. Array materials submit only
    // grouped faces, so using the cylinder's material array hides the whole
    // intact sphere even though its bounds and cut halves remain visible.
    const bodyMaterial: THREE.Material | THREE.Material[] = visual.skinKind === 'crate' || visual.skinKind === 'crystal'
      ? materialSet.outer
      : [materialSet.outer, materialSet.secondary, materialSet.secondary];
    this.intact = new THREE.Mesh(intactGeometry, bodyMaterial);
    this.intact.name = `intact:${visual.id}`;
    if (visual.foodStyle === 'apple') this.intact.castShadow = this.intact.receiveShadow = true;
    if (visual.foodStyle === 'apple') {
      const stemMaterial = materialSet.secondary.clone();
      stemMaterial.color.setHex(0x4a2518);
      const leafMaterial = materialSet.secondary.clone();
      leafMaterial.color.setHex(0x4d9c43);
      this.styleMaterials.push(stemMaterial, leafMaterial);
      const stem = new THREE.Mesh(resources.unitBox, stemMaterial);
      stem.name = `apple-stem:${visual.id}`;
      stem.scale.set(0.065, 0.22, 0.065);
      stem.position.set(0.028, 0.91, 0.028);
      stem.rotation.z = -0.13;
      const leaf = new THREE.Mesh(resources.unitSphere, leafMaterial);
      leaf.name = `apple-leaf:${visual.id}`;
      leaf.scale.set(0.24, 0.035, 0.105);
      leaf.position.set(0.22, 1.018, 0.055);
      leaf.rotation.z = 0.12;
      this.intact.add(stem, leaf);
    }
    if (visual.foodStyle === 'banana') {
      const stemMaterial = materialSet.secondary.clone();
      stemMaterial.color.setHex(0x6c4423);
      stemMaterial.map = null;
      const tipMaterial = materialSet.cap.clone();
      tipMaterial.color.setHex(0x6b3d22);
      tipMaterial.map = null;
      this.styleMaterials.push(stemMaterial, tipMaterial);
      const stem = new THREE.Mesh(resources.unitBox, stemMaterial);
      stem.name = `banana-stem:${visual.id}`;
      stem.scale.set(0.13, 0.18, 0.16);
      stem.position.set(-1.07, -0.18, 0);
      const tip = new THREE.Mesh(resources.unitBox, tipMaterial);
      tip.name = `banana-tip:${visual.id}`;
      tip.scale.set(0.12, 0.16, 0.14);
      tip.position.set(1.02, 0.61, 0);
      this.intact.add(stem, tip);
    }
    if (visual.skinKind === 'crate') {
      const horizontalBand = new THREE.Mesh(resources.unitBox, materialSet.secondary);
      horizontalBand.name = `crate-band-horizontal:${visual.id}`;
      horizontalBand.scale.set(1.04, 0.16, 1.04);
      const verticalBand = new THREE.Mesh(resources.unitBox, materialSet.secondary);
      verticalBand.name = `crate-band-vertical:${visual.id}`;
      verticalBand.scale.set(0.15, 1.04, 1.04);
      this.intact.add(horizontalBand, verticalBand);
    }
    if (visual.skinKind === 'dessert') {
      const icing = new THREE.Mesh(resources.unitCylinder, materialSet.secondary);
      icing.name = `dessert-icing:${visual.id}`;
      icing.scale.set(0.84, 0.84, 1.12);
      icing.position.z = 0.06;
      const cream = new THREE.Mesh(resources.unitCylinder, materialSet.cap);
      cream.name = `dessert-cream:${visual.id}`;
      cream.scale.set(0.58, 0.58, 1.18);
      cream.position.z = 0.11;
      this.intact.add(icing, cream);
    }
    this.root.add(this.intact);

    const makeHalf = (half: 'halfA' | 'halfB', index: 0 | 1): { root: THREE.Group; cap: THREE.Mesh; material: THREE.MeshStandardMaterial } => {
      const halfRoot = new THREE.Group();
      halfRoot.name = `${half}:${visual.id}`;
      const bodyGeometry = visual.skinKind === 'crystal'
        ? (index === 0 ? resources.halfSigilA : resources.halfSigilB)
        : visual.skinKind === 'dessert'
          ? (index === 0 ? resources.dessertHalfA : resources.dessertHalfB)
        : visual.skinKind === 'log'
          ? (index === 0 ? resources.halfLogA : resources.halfLogB)
          : (index === 0 ? resources.halfBoxA : resources.halfBoxB);
      const halfBodyMaterial: THREE.Material | THREE.Material[] = visual.skinKind === 'log' || visual.skinKind === 'dessert'
        ? [materialSet.outer, materialSet.secondary, materialSet.cap]
        : materialSet.outer;
      const body = new THREE.Mesh(bodyGeometry, halfBodyMaterial);
      body.name = `closed-body:${visual.id}:${half}`;
      halfRoot.add(body);
      if (visual.skinKind === 'dessert') {
        // The icing must share the exact same half-slice silhouette as the
        // body; using the generic circular sigil halves makes the dropped
        // piece visibly change shape after cutting.
        const icing = new THREE.Mesh(index === 0 ? resources.dessertHalfA : resources.dessertHalfB, materialSet.secondary);
        icing.name = `dessert-icing:${visual.id}:${half}`;
        icing.scale.set(0.72, 0.56, 0.18);
        icing.position.z = 0.08;
        halfRoot.add(icing);
      }
      const fleshColor = ({
        apple: 0xffc5a9, banana: 0xfff0a5, coconut: 0xffeee0, cake: 0xffd7a4,
        pastry: 0xffc988, cheesecake: 0xffe1b1, dumpling: 0xf1dfc5, roast: 0xd89169,
        skewer: 0xd79a70, 'moon-fruit': 0xd9c9ff, 'jade-bun': 0xc2f0d5,
        'spirit-orb': 0xbfeeff, 'melon-jelly': 0xffd9d1, 'orange-segment': 0xffd9a0,
        'soft-cake': 0xdcefdc, 'cucumber-log': 0xd8ecd0,
      } as Record<CuttablePresentation['foodStyle'], number>)[visual.foodStyle];
      const fleshEmissive = ({
        apple: 0x6d2315, banana: 0x805b13, coconut: 0x5c4030, cake: 0x70421f,
        pastry: 0x70421f, cheesecake: 0x70421f, dumpling: 0x684632, roast: 0x572413,
        skewer: 0x572413, 'moon-fruit': 0x40306e, 'jade-bun': 0x1d6147,
        'spirit-orb': 0x1d5973, 'melon-jelly': 0x4d1f08, 'orange-segment': 0x8a4a10,
        'soft-cake': 0x2a5a30, 'cucumber-log': 0x3a6b35,
      } as Record<CuttablePresentation['foodStyle'], number>)[visual.foodStyle];
      const material = new THREE.MeshStandardMaterial({
        color: fleshColor,
        map: materialSet.cap.map,
        emissive: fleshEmissive,
        emissiveIntensity: visual.foodStyle === 'orange-segment' || visual.foodStyle === 'soft-cake' || visual.foodStyle === 'cucumber-log' ? 0.2 : visual.skinKind === 'crystal' ? 0.38 : 0.06,
        roughness: visual.skinKind === 'crystal' ? 0.3 : 0.6,
        side: THREE.DoubleSide,
      });
      // Cucumber cut face: pale flesh with a ring of seed dots drawn
      // procedurally (no new resource files; browser-only, tests fall back
      // to the plain flesh color).
      if (visual.foodStyle === 'cucumber-log' && typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#b9d8a8';
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(64 + Math.cos(angle) * 26, 64 + Math.sin(angle) * 26, 7, 11, angle, 0, Math.PI * 2);
          ctx.fill();
        }
        const dots = new THREE.CanvasTexture(canvas);
        material.map = dots;
        this.styleTextures.push(dots);
      }
      if (layeredFoods.includes(visual.foodStyle as FoodTextureStyle)) {
        material.color.setHex(0xffffff); material.emissive.setHex(0);
        material.emissiveIntensity = 0; material.roughness = 0.9;
      }
      if (visual.foodStyle === 'coconut') material.alphaTest = .5;
      const cap = new THREE.Mesh(visual.skinKind === 'log' ? resources.capCircle : resources.capPlane, material);
      cap.name = `capMaterial:${visual.id}:${half}`;
      // Cant the sealed cut face toward the oblique gameplay camera while preserving
      // a real transformed normal for each independently rotating half.
      // Match the cap plane to the actual model cut axis: logs run along X,
      // crates are split across X, while the extruded crystal's cut face is +Z.
      cap.rotation.y = visual.skinKind === 'log'
        ? -Math.PI / 2
        : visual.skinKind === 'crate' || visual.skinKind === 'dessert' ? Math.PI / 2 : 0;
      cap.renderOrder = 3;
      // Dessert bodies already carry their shaped cut face through the
      // extruded half geometry. The generic rectangular cap plane reads as a
      // square/coin pasted onto the pastry, so keep the cap fact for QA but do
      // not render that mismatched fallback surface.
      // Log and dessert half geometries already include their authored end
      // face. Rendering the generic cap overlay on either skin creates a
      // detached circular/square decal (the savory failure mode seen in QA).
      if (visual.skinKind === 'dessert' || visual.skinKind === 'log') cap.visible = false;
      halfRoot.add(cap);
      halfRoot.visible = false;
      this.root.add(halfRoot);
      return { root: halfRoot, cap, material };
    };
    const halfA = makeHalf('halfA', 0);
    const halfB = makeHalf('halfB', 1);
    this.halfRoots = [halfA.root, halfB.root];
    this.capMaterials = [halfA.material, halfB.material];
    this.capMeshes = [halfA.cap, halfB.cap];
    this.sync(visual);
  }

  sync(visual: CuttablePresentation, state?: SliceState): void {
    this.visual = visual;
    this.phase = visual.phase;
    this.intact.visible = visual.phase === 'intact';
    this.intact.position.fromArray(visual.position);
    this.intact.rotation.set(0, 0, visual.rotationZ);
    if (visual.skinKind === 'crystal') {
      const radius = visual.radius ?? visual.width / 2;
      const squash = visual.foodStyle === 'spirit-orb' ? 1.18 : visual.foodStyle === 'moon-fruit' ? 0.88 : 1;
      this.intact.scale.set(radius * squash, radius, visual.depth / 2);
    } else if (visual.skinKind === 'dessert') {
      const heightSpan = visual.foodStyle === 'soft-cake' ? 1.56 : 1.48;
      this.intact.scale.set(visual.width / 2, visual.height / heightSpan, visual.depth);
    } else if (visual.skinKind === 'log') {
      if (visual.foodStyle === 'banana') {
        // The authored banana profile is already curved in its local XY
        // silhouette; map its 2.2 × 1.38 footprint to the gameplay target
        // instead of stretching a straight cylinder.
        this.intact.scale.set(visual.width / 2.2, visual.height / 1.38, visual.depth / 0.5);
      } else {
        const bend = visual.foodStyle === 'skewer' ? 0.72 : 1;
        this.intact.scale.set(visual.width * bend, visual.height / 2, visual.depth / 2);
      }
    } else {
      const tier = visual.foodStyle === 'cake' || visual.foodStyle === 'cheesecake' ? 1.12 : visual.foodStyle === 'dumpling' ? 0.86 : 1;
      this.intact.scale.set(visual.width * tier, visual.height, visual.depth);
    }
    if (visual.foodStyle === 'apple') { this.syncApple(visual, state); return; }
    if (visual.phase === 'cut' && visual.cutPlane && (!this.sliced || state && !this.softbody && !this.fruitCut)) this.sliceAtContact(visual, Boolean(state));
    if (visual.phase === 'intact' && this.sliced) {
      this.clearSurgery(); this.sliced = false; this.softbody = null;
    }
    if (state && this.softbody) this.softbody.setGroundSurfaces(state.supports.filter((item) => item.active).map((support) => ({
      minX: (support.x - support.width / 2) * PRESENTATION_SCALE - this.cutOrigin.x,
      maxX: (support.x + support.width / 2) * PRESENTATION_SCALE - this.cutOrigin.x,
      minZ: -0.24 - this.cutOrigin.z, maxZ: 0.24 - this.cutOrigin.z,
      y: worldPointFromSimulation(support.x, support.y - support.height / 2)[1],
      velocityX: support.vx * PRESENTATION_SCALE,
    })));
    if (state && this.fruitCut) this.fruitCut.surfaces = state.supports.filter(support => support.active).map(support => {
      const transform = supportPresentationTransform(support, state.levelNumber);
      return { minX: (support.x - transform.width / 2) * PRESENTATION_SCALE, maxX: (support.x + transform.width / 2) * PRESENTATION_SCALE,
        minZ: -transform.depth / 2, maxZ: transform.depth / 2, y: worldPointFromSimulation(support.x, transform.topSimulationY)[1] };
    });
    visual.halves.forEach((half, index) => this.syncHalf(half, index as 0 | 1, visual));
    if (visual.phase === 'intact') this.halfRoots.forEach((root) => { root.visible = false; });
  }

  private clearSurgery(): void {
    this.fruitCut = null;
    this.cutMaterials.forEach(material => material.dispose()); this.cutMaterials.length = 0;
    this.cutGeometry.forEach((geometry) => geometry.dispose()); this.cutGeometry.length = 0;
    this.cutDecorations.forEach((mesh) => mesh.removeFromParent()); this.cutDecorations.length = 0;
    this.deformingMeshes.length = 0;
  }

  private syncApple(visual: CuttablePresentation, state?: SliceState): void {
    const previousKnife = this.previousAppleKnife;
    if (state) this.previousAppleKnife = { x: state.player.x, y: state.player.y, angle: state.player.angle };
    if (visual.phase === 'intact') {
      if (this.sliced) this.clearSurgery();
      this.sliced = false; this.appleCut = null;
      this.halfRoots.forEach(half => { half.visible = false; });
      return;
    }
    if (!visual.cutPlane) return;
    const target = state?.sigils.find(item => item.id === visual.id) ?? state?.blocks.find(item => item.id === visual.id);
    const impact = target?.cutImpact;
    if (!this.appleCut) {
      // The accepted default knife is rendered in z=0. The 2D contact normal
      // in the simulation describes its swept edge, not the blade's 3D plane.
      const normal = impact ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(...visual.cutPlane.normal).normalize();
      const origin = impact ? new THREE.Vector3(...worldPointFromSimulation(impact.targetX ?? target!.x, impact.targetY ?? target!.y)) : new THREE.Vector3(...visual.position);
      this.sliceApple(visual, normal, origin);
      this.appleCut!.revealCaps = Boolean(impact);
      this.appleCut!.started = !impact;
      this.appleCut!.crossed = !impact;
      this.appleCut!.elapsed = impact ? 0 : APPLE_CLEAVE_TIMING.center;
    }
    const cut = this.appleCut!;
    if (state) cut.surfaces = state.supports.filter(support => support.active).map(support => ({
      minX: (support.x - support.width / 2) * PRESENTATION_SCALE,
      maxX: (support.x + support.width / 2) * PRESENTATION_SCALE,
      minZ: -supportPresentationTransform(support, state.levelNumber).depth / 2,
      maxZ: supportPresentationTransform(support, state.levelNumber).depth / 2,
      y: worldPointFromSimulation(support.x, support.y - support.height / 2)[1],
    }));
    if (impact && state && !cut.crossed && previousKnife) {
      const crossing = sweepCleaveCentre(previousKnife, state.player, { x: impact.targetX ?? target!.x, y: impact.targetY ?? target!.y });
      if (crossing !== null) { cut.crossed = true; cut.started = true; cut.elapsed = APPLE_CLEAVE_TIMING.center; }
    }
    for (const [index, half] of visual.halves.entries()) {
      this.capMaterials[index as 0 | 1].name = half.capMaterialId;
      this.capMeshes[index as 0 | 1].name = `capMaterial:${half.capMaterialId}`;
    }
    this.setAppleCleaveTime(cut.elapsed);
  }

  private sliceApple(visual: CuttablePresentation, normal: THREE.Vector3, origin: THREE.Vector3): void {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), visual.cutPlane!.rotationZ), this.intact.scale);
    const source = this.intact.geometry.clone().applyMatrix4(matrix);
    source.computeBoundingBox();
    const bounds = source.boundingBox!;
    const offset = balancedCutOffset(source, normal, normal.dot(bounds.getCenter(new THREE.Vector3())));
    const plane = new THREE.Plane(normal, -offset);
    const split = splitClosedGeometry(source, plane);
    this.clearSurgery();
    this.appleCut = { normal, origin, diameter: bounds.max.x - bounds.min.x, elapsed: 0,
      started: false, crossed: false, surfaces: [], contactY: [0, 0], revealCaps: false,
      pivots: split.halves.map(geometry => geometry.boundingBox!.getCenter(new THREE.Vector3())),
      rotations: split.halves.map((geometry, index) => {
        const cap = geometry.groups.find(group => group.materialIndex === 2)!;
        const outward = new THREE.Vector3().fromBufferAttribute(geometry.getAttribute('normal'), cap.start).normalize();
        const towardPlayer = new THREE.Vector3(index === 0 ? .24 : -.24, .18, 1).normalize();
        return new THREE.Quaternion().setFromUnitVectors(outward, towardPlayer);
      }) };
    source.dispose();
    const exterior = Array.isArray(this.intact.material) ? this.intact.material[0]! : this.intact.material;
    for (const index of [0, 1] as const) {
      const half = this.halfRoots[index];
      const body = half.children[0] as THREE.Mesh;
      body.geometry = split.halves[index]; mapFruitCap(body.geometry);
      body.material = [exterior, exterior, this.capMaterials[index]];
      body.position.set(0, 0, 0); body.scale.setScalar(1);
      body.castShadow = body.receiveShadow = true;
      const cap = this.capMeshes[index];
      cap.geometry = split.caps[index]; mapFruitCap(cap.geometry);
      cap.rotation.set(0, 0, 0); cap.position.set(0, 0, 0); cap.scale.setScalar(1);
      cap.visible = false; // The very same cap triangles are already sealed into the body.
      this.cutGeometry.push(body.geometry, cap.geometry);
    }
    // Keep the entire crown on the side containing its attachment. Trim any
    // crossing triangles; never clone the stem or leaf onto the other half.
    const attachment = new THREE.Vector3(0.028, 0.805, 0.028).applyMatrix4(matrix);
    const owner: 0 | 1 = plane.distanceToPoint(attachment) < 0 ? 0 : 1;
    for (const child of this.intact.children) {
      if (!(child instanceof THREE.Mesh)) continue;
      child.updateMatrix();
      let geometry = child.geometry.clone().applyMatrix4(matrix.clone().multiply(child.matrix));
      const positions = geometry.getAttribute('position');
      let min = Infinity, max = -Infinity;
      for (let index = 0; index < positions.count; index++) {
        const d = plane.distanceToPoint(new THREE.Vector3().fromBufferAttribute(positions, index));
        min = Math.min(min, d); max = Math.max(max, d);
      }
      if (min < -1e-7 && max > 1e-7) {
        const parts = splitClosedGeometry(geometry, plane);
        geometry.dispose(); geometry = parts.halves[owner];
        parts.halves[1 - owner]!.dispose(); parts.caps.forEach(cap => cap.dispose());
      }
      const material = Array.isArray(child.material) ? child.material[0]! : child.material;
      const decoration = new THREE.Mesh(geometry, [material, material, material]);
      decoration.name = `cut-decoration:${child.name}:${owner}`;
      decoration.castShadow = decoration.receiveShadow = true;
      this.halfRoots[owner].add(decoration);
      this.cutGeometry.push(geometry); this.cutDecorations.push(decoration);
    }
    this.sliced = true;
  }

  /** Absolute sampling is used by the gallery; the default advances this same owner. */
  setAppleCleaveTime(seconds: number, surfaces?: readonly AppleGround[]): void {
    const cut = this.appleCut;
    if (!cut) return;
    if (surfaces) cut.surfaces = [...surfaces];
    cut.elapsed = Math.min(APPLE_CLEAVE_TIMING.total, Math.max(0, seconds));
    const frame = sampleAppleCleave(cut.elapsed);
    this.intact.position.copy(cut.origin);
    this.intact.visible = frame.opening === 0;
    const axis = new THREE.Vector3(-cut.normal.z, 0, cut.normal.x);
    if (axis.lengthSq() < 1e-6) axis.set(0, 0, 1);
    else axis.normalize();
    this.halfRoots.forEach((half, index) => {
      const side = index === 0 ? -1 : 1;
      half.visible = frame.opening > 0;
      half.scale.setScalar(1);
      if (cut.revealCaps) {
        // Default gameplay views the Z-plane cut obliquely. Turn both actual
        // hemispheres toward the player and open across the screen so the
        // nearer shell cannot hide the other cap as a thin edge.
        const pivot = cut.pivots[index]!;
        half.quaternion.identity().slerp(cut.rotations[index]!, frame.opening);
        half.position.copy(cut.origin).add(pivot).sub(pivot.clone().applyQuaternion(half.quaternion));
        half.position.x += side * cut.diameter * .56 * frame.opening;
      } else {
        // The isolated gallery retains its existing authored pose and clock.
        half.position.copy(cut.origin).addScaledVector(cut.normal, side * cut.diameter * .075 * frame.opening);
        half.quaternion.setFromAxisAngle(axis, -side * frame.roll);
      }
      if (cut.surfaces.length === 0) return;
      half.updateWorldMatrix(true, true);
      const body = half.children[0] as THREE.Mesh;
      const bounds = new THREE.Box3().setFromObject(body, true);
      let floor = 0;
      for (const surface of cut.surfaces) {
        if (bounds.max.x < surface.minX || bounds.min.x > surface.maxX || bounds.max.z < surface.minZ || bounds.min.z > surface.maxZ) continue;
        if (surface.y <= cut.origin.y + 1e-5) floor = Math.max(floor, surface.y);
      }
      cut.contactY[index] = floor;
      const toFloor = floor - bounds.min.y;
      half.position.y += toFloor > 0 ? toFloor : toFloor * frame.landing;
    });
    this.root.updateWorldMatrix(true, true);
  }

  private appleFacts(): AppleCleaveFacts | null {
    if (this.visual.foodStyle !== 'apple') return null;
    const cut = this.appleCut;
    const frame = sampleAppleCleave(cut?.elapsed ?? 0);
    const bounds = this.halfRoots.map(half => new THREE.Box3().setFromObject(half.children[0]!, true));
    const intactBounds = new THREE.Box3().setFromObject(this.intact, true);
    return { elapsed: cut?.elapsed ?? 0, opening: frame.opening, stage: frame.stage,
      centerCrossed: cut?.crossed ?? false, diameter: cut?.diameter ?? intactBounds.max.x - intactBounds.min.x,
      gap: cut?.revealCaps ? Math.max(0, bounds[1]!.min.x - bounds[0]!.max.x) : cut ? Math.abs(this.halfRoots[1].position.clone().sub(this.halfRoots[0].position).dot(cut.normal)) : 0,
      roll: frame.roll, minY: this.intact.visible ? intactBounds.min.y : Math.min(...bounds.map(box => box.min.y)),
      normal: cut?.normal.toArray() ?? [], origin: cut?.origin.toArray() ?? this.intact.position.toArray(),
      contactY: cut?.contactY ?? [], halfBounds: cut ? bounds.map(box => ({ min: box.min.toArray(), max: box.max.toArray() })) : [] };
  }

  private sliceAtContact(visual: CuttablePresentation, useSoftbody = false): void {
    const contact = visual.cutPlane!;
    const rigidFruit = visual.kind === 'sigil' && ['orange-segment', 'banana', 'coconut'].includes(visual.foodStyle);
    if (rigidFruit) useSoftbody = false;
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(0, useSoftbody ? visual.position[1] : 0, 0),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), contact.rotationZ), this.intact.scale);
    const source = this.intact.geometry.clone().applyMatrix4(matrix);
    source.computeBoundingBox();
    const normal = new THREE.Vector3(...contact.normal).normalize();
    const centre = source.boundingBox!.getCenter(new THREE.Vector3());
    // Use a normal-direction volume bisector.  Symmetric meshes keep their
    // geometric centre; asymmetric wedges get a genuinely near-even cut while
    // the blade normal remains unchanged.  A first-contact point is never
    // allowed to bias the rendered plane toward an edge.
    const offset = balancedCutOffset(source, normal, normal.dot(centre));
    const sliced = splitClosedGeometry(source, new THREE.Plane(normal, -offset));
    source.dispose();
    this.clearSurgery();
    const materials = Array.isArray(this.intact.material) ? this.intact.material : [this.intact.material, this.intact.material];
    for (const index of [0, 1] as const) {
      const root = this.halfRoots[index];
      const body = root.children[0] as THREE.Mesh;
      body.geometry = sliced.halves[index];
      if (['apple', 'orange-segment', 'banana', 'coconut'].includes(visual.foodStyle)) {
        mapFruitCap(body.geometry); mapFruitCap(sliced.caps[index]);
      }
      body.material = [materials[0]!, materials[1] ?? materials[0]!, this.capMaterials[index]];
      this.capMeshes[index].geometry = sliced.caps[index];
      this.capMeshes[index].rotation.set(0, 0, 0);
      this.capMeshes[index].visible = false; // sealed face is part of the closed body mesh
      for (const child of root.children) if (child.name.startsWith('dessert-icing:')) child.visible = false;
      this.cutGeometry.push(sliced.halves[index], sliced.caps[index]);
      if (useSoftbody) this.deformingMeshes.push(body);
    }
    const cavities: { mesh: THREE.Mesh; component: 0 | 1 }[] = [];
    if (visual.foodStyle === 'coconut') {
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, side: THREE.DoubleSide });
      this.cutMaterials.push(material);
      for (const component of [0, 1] as const) {
        const geometry = makeCoconutCavity(sliced.halves[component]);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `coconut-cavity:${visual.id}:${component === 0 ? 'halfA' : 'halfB'}`;
        this.halfRoots[component].add(mesh); this.cutDecorations.push(mesh); this.cutGeometry.push(geometry);
        cavities.push({ mesh, component });
      }
    }
    if (useSoftbody || rigidFruit) {
      const surface = (geometry: THREE.BufferGeometry): AuthoredSurface => {
        const attribute = geometry.getAttribute('position');
        const positions = new Float32Array(attribute.count * 3);
        for (let i = 0; i < attribute.count; i++) positions.set([attribute.getX(i), attribute.getY(i), attribute.getZ(i)], i * 3);
        return { positions, indices: geometry.index
          ? Uint32Array.from(geometry.index.array)
          : Uint32Array.from({ length: attribute.count }, (_, i) => i) };
      };
      const decorations: AuthoredDecoration[] = [];
      for (const { mesh, component } of cavities) {
        this.deformingMeshes.push(mesh); decorations.push({ ...surface(mesh.geometry), component });
      }
      for (const child of this.intact.children) {
        if (!(child instanceof THREE.Mesh)) continue;
        child.updateMatrix();
        const geometry = child.geometry.clone().applyMatrix4(matrix.clone().multiply(child.matrix));
        const positions = geometry.getAttribute('position'); let min = Infinity; let max = -Infinity;
        const p = new THREE.Vector3();
        for (let i = 0; i < positions.count; i++) {
          const distance = normal.dot(p.fromBufferAttribute(positions, i)) - offset;
          min = Math.min(min, distance); max = Math.max(max, distance);
        }
        const pieces: { geometry: THREE.BufferGeometry; side: 0 | 1 }[] = [];
        if (min < -1e-6 && max > 1e-6) {
          const cut = splitClosedGeometry(geometry, new THREE.Plane(normal, -offset));
          for (const side of [0, 1] as const) pieces.push({ geometry: cut.halves[side], side });
          cut.caps.forEach((cap) => cap.dispose()); geometry.dispose();
        } else pieces.push({ geometry, side: max <= 1e-6 ? 0 : 1 });
        const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
        for (const piece of pieces) {
          const mesh = new THREE.Mesh(piece.geometry, [childMaterials[0]!, childMaterials[1] ?? childMaterials[0]!, childMaterials[0]!]);
          mesh.name = `cut-decoration:${child.name}:${piece.side}`;
          this.halfRoots[piece.side].add(mesh); this.cutDecorations.push(mesh);
          this.cutGeometry.push(piece.geometry); this.deformingMeshes.push(mesh);
          decorations.push({ ...surface(piece.geometry), component: piece.side });
        }
      }
      if (useSoftbody) {
        const firmness = visual.skinKind === 'dessert' ? 0.25 : visual.skinKind === 'crate' ? 0.55 : 0.35;
        this.softbody = new AuthoredCutBody(sliced.halves.map(surface), decorations, { firmness, damping: 0.4, substeps: 6 });
        this.softbody.release(normal.toArray(), -offset, 0.32);
        this.cutOrigin.set(visual.position[0], 0, visual.position[2]);
        this.age = 0; this.idleTime = 0; this.sleeping = false;
        for (const [index, mesh] of this.deformingMeshes.entries()) {
          const record = this.softbody.surfaces[index]!;
          const buffer = new THREE.InterleavedBuffer(record.interleaved, 6).setUsage(THREE.DynamicDrawUsage);
          mesh.geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(buffer, 3, 0));
          mesh.geometry.setAttribute('normal', new THREE.InterleavedBufferAttribute(buffer, 3, 3));
          mesh.geometry.setIndex(new THREE.BufferAttribute(record.indices, 1));
          mesh.frustumCulled = false;
        }
      }
    }
    if (rigidFruit) {
      this.fruitCut = new FruitCleave(this.halfRoots, new THREE.Vector3(...visual.position), normal, Math.max(visual.width, visual.height));
      this.softbody = null;
    }
    this.sliced = true;
  }

  advance(dt: number, appleDelta = dt): void {
    if (this.fruitCut) { this.fruitCut.sample(this.fruitCut.elapsed + Math.min(Math.max(dt, 0), 1 / 30)); return; }
    if (this.appleCut) {
      if (this.appleCut.started && Number.isFinite(appleDelta) && appleDelta > 0) this.setAppleCleaveTime(this.appleCut.elapsed + appleDelta);
      return;
    }
    if (!this.softbody || this.sleeping || !(dt > 0)) return;
    this.softbody.step(dt); this.age += dt;
    if (this.age > 1.2) {
      this.idleTime = this.softbody.stats().maxV < 0.05 ? this.idleTime + dt : 0;
      if (this.idleTime > 0.75) this.sleeping = true;
    }
    for (const mesh of this.deformingMeshes) {
      (mesh.geometry.getAttribute('position') as THREE.InterleavedBufferAttribute).data.needsUpdate = true;
      mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
    }
  }

  private syncHalf(half: CutHalfPresentation, index: 0 | 1, visual: CuttablePresentation): void {
    const root = this.halfRoots[index];
    const body = root.children[0] as THREE.Mesh;
    const cap = this.capMeshes[index];
    root.visible = true;
    if (this.fruitCut) {
      body.scale.setScalar(1); body.position.set(0, 0, 0);
      this.capMaterials[index].name = half.capMaterialId; cap.name = `capMaterial:${half.capMaterialId}`;
      return;
    }
    if (this.softbody) {
      root.position.copy(this.cutOrigin); root.rotation.set(0, 0, 0); root.scale.setScalar(1);
      body.scale.setScalar(1); body.position.set(0, 0, 0);
      this.capMaterials[index].name = half.capMaterialId;
      cap.name = `capMaterial:${half.capMaterialId}`;
      return;
    }
    root.position.fromArray(half.position);
    root.rotation.set(half.rotationDepth * 0.35, half.rotationDepth, half.rotationZ);
    this.capMaterials[index].name = half.capMaterialId;
    cap.name = `capMaterial:${half.capMaterialId}`;
    if (this.sliced && visual.cutPlane) {
      root.rotation.z -= visual.cutPlane.rotationZ;
      body.scale.setScalar(1); body.position.set(0, 0, 0);
      cap.scale.setScalar(1); cap.position.set(0, 0, 0);
      return;
    }
    if (visual.skinKind === 'crystal') {
      const radius = visual.radius ?? visual.width / 2;
      body.scale.set(radius, radius, visual.depth);
      cap.scale.set(visual.depth, radius, 1);
      cap.position.set(0, 0, 0);
      const icing = root.children.find((child) => child.name.startsWith('dessert-icing:')) as THREE.Mesh | undefined;
      if (icing) {
        icing.scale.set(radius * 0.72, radius * 0.56, visual.depth * 0.42);
        icing.position.set(0, 0.02, visual.depth * 0.2);
      }
    } else if (visual.skinKind === 'dessert') {
      body.scale.set(visual.width * 0.92, visual.height * 0.82, visual.depth);
      body.position.set(0, 0, 0);
      cap.scale.set(visual.depth, visual.height * 0.41, 1);
      cap.position.set(0, 0, 0);
    } else if (visual.skinKind === 'log') {
      body.scale.set(visual.width, visual.height / 2, visual.depth / 2);
      body.position.set(0, 0, 0);
      cap.scale.set(visual.height / 2, visual.depth / 2, 1);
      cap.position.set(0, 0, 0);
    } else {
      body.scale.set(visual.width, visual.height, visual.depth);
      body.position.set(0, 0, 0);
      cap.scale.set(visual.depth, visual.height / 2, 1);
      cap.position.set(0, 0, 0);
    }
  }

  facts(camera?: THREE.Camera, viewport?: { width: number; height: number }): CutVisualFacts {
    this.root.updateWorldMatrix(true, true);
    const cameraPosition = camera?.getWorldPosition(new THREE.Vector3());
    const capPosition = new THREE.Vector3();
    const capQuaternion = new THREE.Quaternion();
    const capNormal = new THREE.Vector3();
    const toCamera = new THREE.Vector3();
    const caps = this.capMeshes.map((cap, index): CutCapFacts => {
      cap.getWorldPosition(capPosition);
      cap.getWorldQuaternion(capQuaternion);
      if (this.sliced) capNormal.fromBufferAttribute(cap.geometry.getAttribute('normal'), 0).applyQuaternion(capQuaternion).normalize();
      else capNormal.set(0, 0, 1).applyQuaternion(capQuaternion).normalize();
      const cameraFacingScore = cameraPosition
        ? Math.abs(toCamera.copy(cameraPosition).sub(capPosition).normalize().dot(capNormal))
        : 0;
      return {
        half: index === 0 ? 'halfA' : 'halfB',
        materialId: this.capMaterials[index]!.name,
        meshName: cap.name,
        worldNormal: [capNormal.x, capNormal.y, capNormal.z],
        cameraFacingScore,
        projection: camera && viewport ? projectMesh(cap, camera, viewport) : null,
      };
    });
    return {
      id: this.visual.id,
      foodStyle: this.visual.foodStyle,
      renderer: this.visual.foodStyle === 'apple' ? 'apple-cleave' : this.fruitCut ? 'fruit-cleave' : this.softbody ? 'authored-softbody' : 'authored-static',
      apple: this.appleFacts(),
      fruit: this.fruitCut ? { elapsed: this.fruitCut.elapsed, stage: this.fruitCut.elapsed >= .8 ? 'landed' : 'opening' } : null,
      materialMode: 'food-original',
      softbody: this.softbody?.stats() ?? null,
      identity: {
        sourceGeometry: this.intact.geometry.type,
        exteriorColor: (() => {
          const mesh = this.phase === 'cut' ? this.halfRoots[0].children[0] as THREE.Mesh : this.intact;
          const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          return material instanceof THREE.MeshStandardMaterial ? material.color.getHex() : null;
        })(),
        cutFaceColor: this.capMaterials[0].color.getHex(),
        decorationFragments: this.cutDecorations.length,
      },
      phase: this.visual.foodStyle === 'apple' && this.intact.visible ? 'intact' : this.phase,
      skinKind: this.visual.skinKind,
      lifecycle: this.phase === 'intact' ? 'intact' : this.visual.falling ? 'falling' : 'landed',
      visibleHalves: this.halfRoots.filter((root) => root.visible).length,
      capMaterialIds: this.capMaterials.map((material) => material.name),
      capMeshNames: this.capMeshes.map((mesh) => mesh.name),
      caps,
      targetProjection: camera && viewport ? projectMesh(this.intact, camera, viewport) : null,
    };
  }

  dispose(): void {
    this.clearSurgery(); this.softbody = null;
    this.capMaterials.forEach((material) => material.dispose());
    this.styleMaterials.forEach((material) => material.dispose());
    this.styleTextures.forEach((texture) => texture.dispose());
    this.root.removeFromParent();
  }
}

export class ProgrammaticOriginalProvider implements CutVisualProvider {
  readonly kind = 'PROGRAMMATIC_ORIGINAL' as const;
  readonly formalAssetContract = FORMAL_CUT_ASSET_CONTRACT;

  constructor(private readonly textures?: AStyleTextureSet) {}

  get baseColorTextureIds(): readonly string[] {
    return this.textures?.ids ?? [];
  }

  get texturedMaterialCount(): number {
    return this.textures?.texturedMaterialCount ?? 0;
  }

  createSharedResources(): SharedCutResources {
    return createSharedCutResources(this.textures);
  }

  createEntity(visual: CuttablePresentation, resources: SharedCutResources): CutVisualEntity {
    return new CutVisualEntity(visual, resources);
  }

  disposeSharedResources(resources: SharedCutResources): void {
    disposeSharedCutResources(resources);
    this.textures?.dispose();
  }
}

export class ThreeCutVisualManager {
  readonly root = new THREE.Group();
  private readonly resources: SharedCutResources;
  private readonly entities = new Map<string, CutVisualEntity>();

  constructor(private readonly provider: CutVisualProvider = new ProgrammaticOriginalProvider()) {
    this.root.name = 'programmatic-original-cuttables';
    this.resources = provider.createSharedResources();
  }

  sync(frame: PresentationFrame, state?: SliceState): void {
    const live = new Set(frame.cuttables.map((visual) => visual.id));
    for (const [id, entity] of this.entities) {
      if (live.has(id)) continue;
      entity.dispose();
      this.entities.delete(id);
    }
    for (const visual of frame.cuttables) {
      let entity = this.entities.get(visual.id);
      if (!entity) {
        entity = this.provider.createEntity(visual, this.resources);
        this.entities.set(visual.id, entity);
        this.root.add(entity.root);
      }
      entity.sync(visual, state);
    }
  }

  advance(dt: number, appleDelta = dt): void { for (const entity of this.entities.values()) entity.advance(dt, appleDelta); }

  facts(camera?: THREE.Camera, viewport?: { width: number; height: number }): CutVisualFacts[] {
    return [...this.entities.values()].map((entity) => entity.facts(camera, viewport));
  }

  baseColorFacts(): { ids: readonly string[]; texturedMaterialCount: number } {
    return { ids: this.provider.baseColorTextureIds, texturedMaterialCount: this.provider.texturedMaterialCount };
  }

  dispose(): void {
    for (const entity of this.entities.values()) entity.dispose();
    this.entities.clear();
    this.provider.disposeSharedResources(this.resources);
    this.root.removeFromParent();
  }
}
