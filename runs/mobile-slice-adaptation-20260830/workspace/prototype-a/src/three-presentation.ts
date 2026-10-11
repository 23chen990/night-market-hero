import type { CutImpact, FinishOption, FoodStyle, SafeSupport, SliceState } from './game-core';

export type Vec3Tuple = readonly [number, number, number];

export const FORMAL_CUT_ASSET_CONTRACT = Object.freeze({
  sourceBlend: null,
  lowPolyGlb: null,
  intact: null,
  halfA: null,
  halfB: null,
  capMaterial: null,
  status: 'NOT_PRODUCED' as const,
});

export const MAIN_3D_RESOURCE_CONTRACT = Object.freeze({
  runtimeKind: 'PROGRAMMATIC_ORIGINAL' as const,
  externalAssets: [] as readonly string[],
  glbLoadedAtRuntime: false,
  dracoLoadedAtRuntime: false,
  futureFormalAssetContract: 'Blender source + low-poly GLB + intact + halfA + halfB + capMaterial',
  platformScope: 'web-lite development and QA only',
});

export const PRESENTATION_SCALE = 1 / 100;
export const SIMULATION_FLOOR_Y = 700;
/** World-space top surface of the rendered ground, aligned to simulation y=700. */
export const GROUND_VISUAL_TOP_Y = 0;

export interface CameraSpec {
  projection: 'perspective';
  fov: number;
  aspect: number;
  near: number;
  far: number;
  position: Vec3Tuple;
  target: Vec3Tuple;
}

/**
 * Keep the opening knife left of the first support on portrait screens
 * without changing the desktop reaction corridor.
 */
export function cameraLeadSimulation(width: number, height: number): number {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  return safeWidth / safeHeight < 0.75 ? 180 : 255;
}

const CAMERA_TARGET_Y_MIN = 40;
const CAMERA_TARGET_Y_MAX = SIMULATION_FLOOR_Y;
const CAMERA_VERTICAL_LOOKAHEAD = 100;
const CAMERA_VERTICAL_DEAD_ZONE_UP = 140;

export function cameraTargetSimulationY(knifeY: number): number {
  return Math.max(CAMERA_TARGET_Y_MIN, Math.min(CAMERA_TARGET_Y_MAX, knifeY + CAMERA_VERTICAL_LOOKAHEAD));
}

export function cameraFollowTargetSimulationY(knifeY: number, currentTargetY: number | undefined): number {
  const desired = cameraTargetSimulationY(knifeY);
  if (currentTargetY === undefined || knifeY < currentTargetY - CAMERA_VERTICAL_DEAD_ZONE_UP) return desired;
  if (knifeY > currentTargetY + CAMERA_VERTICAL_LOOKAHEAD) return desired;
  return currentTargetY;
}

export function resolveCameraTarget(
  targetX: number,
  followTargetSimulationY: number,
  finishOptions: readonly FinishOption[] = [],
): { targetX: number; targetSimulationY: number; blend: number } {
  const wallX = finishOptions[0]?.x;
  if (wallX === undefined) return { targetX, targetSimulationY: followTargetSimulationY, blend: 0 };
  const approach = Math.max(0, Math.min(1, (targetX - wallX * PRESENTATION_SCALE + 8) / 4));
  const blend = approach * approach * (3 - 2 * approach);
  return {
    targetX: Math.min(targetX, wallX * PRESENTATION_SCALE - 1.2),
    targetSimulationY: followTargetSimulationY * (1 - blend) + 390 * blend,
    blend,
  };
}

export interface FogSpec {
  near: number;
  far: number;
}

export interface KnifeTransform {
  position: Vec3Tuple;
  rotationZ: number;
  depth: number;
}

export interface CutHalfPresentation {
  id: 'halfA' | 'halfB';
  position: Vec3Tuple;
  rotationZ: number;
  rotationDepth: number;
  capMaterialId: string;
  closedGeometry: true;
}

export interface CuttablePresentation {
  id: string;
  kind: 'sigil' | 'block';
  skinKind: 'crate' | 'log' | 'crystal' | 'dessert';
  foodStyle: FoodStyle;
  phase: 'intact' | 'cut';
  position: Vec3Tuple;
  width: number;
  height: number;
  depth: number;
  radius: number | null;
  falling: boolean;
  rotationZ: number;
  cutPlane?: { normal: Vec3Tuple; point: Vec3Tuple; rotationZ: number };
  halves: readonly CutHalfPresentation[];
}

function contactPlane(impact: CutImpact | undefined): CuttablePresentation['cutPlane'] {
  if (!impact) return undefined;
  return {normal: [impact.normalX, -impact.normalY, 0],
    // The blade angle is the intentional variable.  The first swept contact
    // is only a collision-detection detail; using it as the plane origin makes
    // grazing hits produce visibly uneven halves.  Keep every cut centred on
    // the authored target while preserving the real incident normal.
    point: [0, 0, 0],
    rotationZ: -(impact.targetAngle ?? 0)};
}

export interface SupportPresentationTransform {
  width: number;
  height: number;
  depth: number;
  topSimulationY: number;
  centerSimulationY: number;
}

/**
 * Level 1 is the default slice-first journey.  Its collision supports can
 * still be tall or vertical for the platformer recovery rules, but the player
 * should see simple low steps whose top face stays exactly on that collision
 * surface.  Other levels retain their authored structural presentation.
 */
export function supportPresentationTransform(
  support: Pick<SafeSupport, 'x' | 'y' | 'width' | 'height'>,
  levelNumber: number | undefined,
): SupportPresentationTransform {
  const topSimulationY = support.y - support.height / 2;
  if (levelNumber !== 1) {
    return {
      width: support.width,
      height: support.height,
      depth: 0.48,
      topSimulationY,
      centerSimulationY: support.y,
    };
  }
  const height = Math.min(22, support.height);
  const width = support.height > support.width * 1.6 ? Math.max(92, support.width) : support.width;
  return {
    width,
    height,
    // Keep the tabletop readable without placing its front face in front of
    // the recessed cut surfaces of the Level 1 food objects.
    depth: 0.12,
    topSimulationY,
    centerSimulationY: topSimulationY + height / 2,
  };
}

export function cuttableDepth(style: FoodStyle, width: number, height: number): number {
  if (style === 'apple' || style === 'coconut' || style === 'moon-fruit' || style === 'spirit-orb' || style === 'orange-segment') return Math.min(width, height) * 0.82;
  if (style === 'banana' || style === 'roast' || style === 'skewer' || style === 'cucumber-log') return Math.min(width, height) * 0.78;
  return Math.min(width, height) * 0.62;
}

export function cuttableSkinKind(kind: CuttablePresentation['kind'], width: number, height: number): CuttablePresentation['skinKind'] {
  if (kind === 'sigil') return 'crystal';
  return width >= height * 1.6 ? 'log' : 'crate';
}

export function skinKindForFoodStyle(style: FoodStyle, kind: CuttablePresentation['kind'], width: number, height: number): CuttablePresentation['skinKind'] {
  if (style === 'cake' || style === 'pastry' || style === 'cheesecake' || style === 'soft-cake') return 'dessert';
  if (style === 'banana' || style === 'roast' || style === 'skewer' || style === 'cucumber-log') return 'log';
  if (style === 'dumpling' || style === 'jade-bun') return 'crate';
  if (style === 'coconut') return 'crystal';
  return cuttableSkinKind(kind, width, height);
}

export interface CutHalfMotion {
  position: Vec3Tuple;
  rotationZ: number;
  rotationDepth: number;
}

const CUT_SPLIT_RESPONSE = 4.2;

function cutSplitProgress(ageSeconds: number): number {
  const age = Math.max(0, Number.isFinite(ageSeconds) ? ageSeconds : 0);
  // Start moving at the impact frame and reach a readable opening over a
  // short continuous arc. No hold or hit-stop is introduced in this curve.
  return 1 - Math.exp(-CUT_SPLIT_RESPONSE * age);
}

export function sigilCutMotion(ageSeconds: number, side: -1 | 1): CutHalfMotion {
  const age = Math.max(0, Number.isFinite(ageSeconds) ? ageSeconds : 0);
  const ease = cutSplitProgress(age);
  // Begin at the actual blade centre. The old fixed offset made the pieces
  // look pre-separated before the knife had visibly crossed the fruit.
  const lateral = side * 0.54 * ease || 0;
  const arc = 0.45 * age - 1.8 * age * age;
  const vertical = Math.max(-1.1, arc);
  const depth = side * 0.18 * ease || 0;
  return {
    position: [lateral, vertical, depth],
    rotationZ: side * Math.min(0.92, age * 1.6) || 0,
    rotationDepth: side * Math.min(0.92, age * 1.3) || 0,
  };
}

export function blockCutMotion(ageSeconds: number, side: -1 | 1): CutHalfMotion {
  const age = Math.max(0, Number.isFinite(ageSeconds) ? ageSeconds : 0);
  const ease = cutSplitProgress(age);
  return {
    // Block fragments already have a small physics-driven launch. This
    // presentation-only offset makes the first plane-aligned split readable
    // without changing their collision or gameplay trajectory.
    position: [side * 0.16 * ease || 0, 0, side * 0.05 * ease || 0],
    rotationZ: side * Math.min(0.76, age * 1.15) || 0,
    rotationDepth: side * Math.min(0.96, age * 1.35) || 0,
  };
}

export interface PresentationFrame {
  knife: KnifeTransform;
  cuttables: CuttablePresentation[];
  newCutIds: string[];
}

export interface PerformanceResult {
  frames: number;
  medianMs: number;
  p95Ms: number;
  over50Percent: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  dpr: number;
  withinTargets: boolean;
}

export function worldPointFromSimulation(x: number, y: number, depth = 0): Vec3Tuple {
  return [x * PRESENTATION_SCALE, (SIMULATION_FLOOR_Y - y) * PRESENTATION_SCALE, depth];
}

export function createCameraSpec(
  width: number,
  height: number,
  targetX = 3.2,
  finishOptions: readonly FinishOption[] = [],
  followTargetSimulationY: number | undefined = undefined,
): CameraSpec {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const aspect = safeWidth / safeHeight;
  const resolved = resolveCameraTarget(
    targetX,
    followTargetSimulationY === undefined ? 390 : followTargetSimulationY,
    finishOptions,
  );
  targetX = resolved.targetX;
  const portraitDistance = Math.max(1 + resolved.blend * 0.6, 0.95 / aspect);
  // Keep the whole result wall in view before a choice, then stop following
  // beyond it. Opening framing is unchanged and approach zoom is continuous.
  // Keep the knife inside a generous vertical corridor while it flies. The
  // renderer smooths this target, so this pure spec only describes the
  // settled framing and never introduces frame-to-frame camera jitter.
  const targetSimulationY = resolved.targetSimulationY;
  const target: Vec3Tuple = [targetX, (SIMULATION_FLOOR_Y - targetSimulationY) * PRESENTATION_SCALE, 0];
  return {
    projection: 'perspective',
    fov: 24,
    aspect,
    near: 0.1,
    far: 90,
    position: [targetX + 3.8 * portraitDistance, target[1] + 5.1 * portraitDistance, 13.2 * portraitDistance],
    target,
  };
}

export function createFogSpec(width: number, height: number): FogSpec {
  const camera = createCameraSpec(width, height);
  const near = Math.max(20, camera.position[2] + 4);
  return { near, far: near + 40 };
}

export function knifeTransformFromState(state: SliceState): KnifeTransform {
  return {
    position: worldPointFromSimulation(state.player.x, state.player.y),
    rotationZ: -state.player.angle,
    depth: 0.24,
  };
}

export function capFacingScore(camera: CameraSpec, capNormal: Vec3Tuple): number {
  const view: Vec3Tuple = [
    camera.position[0] - camera.target[0],
    camera.position[1] - camera.target[1],
    camera.position[2] - camera.target[2],
  ];
  const viewLength = Math.hypot(...view);
  const normalLength = Math.hypot(...capNormal);
  if (viewLength === 0 || normalLength === 0) return 0;
  return Math.abs((view[0] * capNormal[0] + view[1] * capNormal[1] + view[2] * capNormal[2]) / (viewLength * normalLength));
}

function percentile(sorted: readonly number[], ratio: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))]!;
}

function rounded(value: number, decimals = 3): number {
  const power = 10 ** decimals;
  return Math.round(value * power) / power;
}

export function summarizePerformance(
  frameTimes: readonly number[],
  rendererInfo: { drawCalls: number; triangles: number; geometries?: number; textures?: number },
  dpr: number,
): PerformanceResult {
  const samples = frameTimes.filter((sample) => Number.isFinite(sample) && sample >= 0);
  const sorted = [...samples].sort((left, right) => left - right);
  const median = sorted.length % 2 === 0 && sorted.length > 0
    ? (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2
    : percentile(sorted, 0.5);
  const over50Percent = samples.length === 0 ? 0 : samples.filter((sample) => sample > 50).length / samples.length * 100;
  const result = {
    frames: samples.length,
    medianMs: rounded(median),
    p95Ms: rounded(percentile(sorted, 0.95)),
    over50Percent: rounded(over50Percent),
    drawCalls: Math.max(0, Math.floor(rendererInfo.drawCalls)),
    triangles: Math.max(0, Math.floor(rendererInfo.triangles)),
    geometries: Math.max(0, Math.floor(rendererInfo.geometries ?? 0)),
    textures: Math.max(0, Math.floor(rendererInfo.textures ?? 0)),
    dpr: rounded(dpr),
  };
  return {
    ...result,
    withinTargets: result.frames >= 600
      && result.medianMs <= 20
      && result.p95Ms <= 33.4
      && result.over50Percent <= 1
      && result.drawCalls <= 90
      && result.triangles <= 75_000,
  };
}

function capMaterialId(targetId: string, half: 'halfA' | 'halfB'): string {
  return `PROGRAMMATIC_ORIGINAL:cap:${targetId}:${half}`;
}

export class ThreePresentationModel {
  private readonly cutLedger = new Set<string>();

  reset(): void {
    this.cutLedger.clear();
  }

  sync(state: SliceState): PresentationFrame {
    const newCutIds: string[] = [];
    const cuttables: CuttablePresentation[] = [];
    for (const sigil of state.sigils) {
      if (sigil.cut && !this.cutLedger.has(sigil.id)) {
        this.cutLedger.add(sigil.id);
        newCutIds.push(sigil.id);
      }
      const phase = sigil.cut ? 'cut' : 'intact';
      const position = worldPointFromSimulation(sigil.x, sigil.y);
      const negativeMotion = sigilCutMotion(sigil.splitAge, -1);
      const positiveMotion = sigilCutMotion(sigil.splitAge, 1);
      const plane = contactPlane(sigil.cutImpact);
      const separation = (motion: ReturnType<typeof sigilCutMotion>): Vec3Tuple => [
        position[0] + (plane?.normal[0] ?? 1) * motion.position[0],
        position[1] + (plane?.normal[1] ?? 0) * motion.position[0] + motion.position[1], motion.position[2],
      ];
      cuttables.push({
        id: sigil.id,
        kind: 'sigil',
        skinKind: skinKindForFoodStyle(sigil.foodStyle, 'sigil', sigil.radius * 2, sigil.radius * 2),
        foodStyle: sigil.foodStyle,
        phase,
        position,
        width: sigil.radius * 2 * PRESENTATION_SCALE,
        height: sigil.radius * 2 * PRESENTATION_SCALE,
        depth: cuttableDepth(sigil.foodStyle, sigil.radius * 2 * PRESENTATION_SCALE, sigil.radius * 2 * PRESENTATION_SCALE),
        radius: sigil.radius * PRESENTATION_SCALE,
        falling: sigil.cut && sigil.vy !== 0,
        rotationZ: 0,
        ...(plane ? {cutPlane: plane} : {}),
        halves: phase === 'cut' && sigil.foodStyle !== 'melon-jelly' ? [
          {
            id: 'halfA',
            position: separation(negativeMotion),
            rotationZ: negativeMotion.rotationZ,
            rotationDepth: negativeMotion.rotationDepth,
            capMaterialId: capMaterialId(sigil.id, 'halfA'),
            closedGeometry: true,
          },
          {
            id: 'halfB',
            position: separation(positiveMotion),
            rotationZ: positiveMotion.rotationZ,
            rotationDepth: positiveMotion.rotationDepth,
            capMaterialId: capMaterialId(sigil.id, 'halfB'),
            closedGeometry: true,
          },
        ] : [],
      });
    }
    for (const block of state.blocks) {
      if (block.cut && !this.cutLedger.has(block.id)) {
        this.cutLedger.add(block.id);
        newCutIds.push(block.id);
      }
      const phase = block.cut ? 'cut' : 'intact';
      const position = worldPointFromSimulation(block.x, block.y);
      const fragments = state.fragments.filter((fragment) => fragment.sourceId === block.id).slice(0, 2);
      const fallbackAge = block.cut ? 0.08 : 0;
      const halves: CutHalfPresentation[] = phase === 'cut' ? (['halfA', 'halfB'] as const).map((half, index) => {
        const fragment = fragments[index];
        const age = fragment?.age ?? fallbackAge;
        const fragmentPosition = fragment ? worldPointFromSimulation(fragment.x, fragment.y) : position;
        const depthSide = index === 0 ? -1 : 1;
        const rawNormalX = block.cutImpact?.normalX ?? 1;
        const rawNormalY = block.cutImpact ? -block.cutImpact.normalY : 0;
        const normalLength = Math.hypot(rawNormalX, rawNormalY) || 1;
        const normalX = rawNormalX / normalLength;
        const normalY = rawNormalY / normalLength;
        const release = blockCutMotion(age, depthSide);
        return {
          id: half,
          position: [
            fragmentPosition[0] + normalX * release.position[0],
            fragmentPosition[1] + normalY * release.position[0] + release.position[1],
            depthSide * (0.2 + age * 0.2) + release.position[2],
          ],
          rotationZ: -(fragment?.angle ?? block.angle) + release.rotationZ,
          rotationDepth: release.rotationDepth,
          capMaterialId: capMaterialId(block.id, half),
          closedGeometry: true,
        };
      }) : [];
      cuttables.push({
        id: block.id,
        kind: 'block',
        skinKind: skinKindForFoodStyle(block.foodStyle, 'block', block.width, block.height),
        foodStyle: block.foodStyle,
        phase,
        position,
        width: block.width * PRESENTATION_SCALE,
        height: block.height * PRESENTATION_SCALE,
        depth: cuttableDepth(block.foodStyle, block.width * PRESENTATION_SCALE, block.height * PRESENTATION_SCALE),
        radius: null,
        falling: block.falling,
        rotationZ: -block.angle,
        ...(block.cutImpact ? {cutPlane: contactPlane(block.cutImpact)} : {}),
        halves,
      });
    }
    return { knife: knifeTransformFromState(state), cuttables, newCutIds };
  }
}
