/**
 * Authored world-object pickup contract for the default night patrol.
 * Offer positions are projected from the SAME source-pixel supports as the
 * panorama renderer. They are never based on the rider's current pose.
 */
import { segmentLengthPx, segmentStartPx, type VehicleId } from './endless.ts';
import { createNightCityRenderPlan, NIGHT_CITY_SUPPORT_CATALOG } from './night-city-renderer.ts';

export type EncounterAction = 'release' | 'high-release' | 'press' | 'stylish-release';
export interface AuthoredEncounter {
  instanceId: string;
  chunkId: string;
  supportId: string;
  supportX: number;
  supportY: number;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  requiredAction: EncounterAction;
  announceX: number;
}

const RECIPES: Record<VehicleId, {
  supportPattern: RegExp; heightOffset: number; radiusX: number; radiusY: number;
  requiredAction: EncounterAction; description: string;
}> = {
  '货运滑索': { supportPattern: /crossbeam|bridge-rail|eave-beam/, heightOffset: 350,
    radiusX: 90, radiusY: 98, requiredAction: 'release', description: '松开旧飞索，飞进吊轮挂环' },
  '纸鸢': { supportPattern: /eave-beam|walkway-beam|roof-rail/, heightOffset: 242,
    radiusX: 76, radiusY: 88, requiredAction: 'high-release', description: '借高挂点起飞，松手接住鸢绳' },
  '灯笼群': { supportPattern: /lantern|rope/, heightOffset: 166,
    radiusX: 84, radiusY: 90, requiredAction: 'press', description: '飞近灯绳结，按住接索' },
  '青鸾': { supportPattern: /left-eave-beam|right-eave-beam/, heightOffset: 190,
    radiusX: 88, radiusY: 92, requiredAction: 'stylish-release', description: '连续两次漂亮松手，腾空接青鸾' },
};

export function encounterInstructions(id: VehicleId): string { return RECIPES[id].description; }

/** Sweep in the *visible* world-space target ellipse, no invisible magnet. */
export function sweptEncounterContact(
  before: { x: number; y: number }, after: { x: number; y: number },
  circle: { x: number; y: number; radiusX: number; radiusY: number },
): boolean {
  const sx = (before.x - circle.x) / circle.radiusX;
  const sy = (before.y - circle.y) / circle.radiusY;
  const dx = (after.x - before.x) / circle.radiusX;
  const dy = (after.y - before.y) / circle.radiusY;
  const length = dx * dx + dy * dy;
  const t = length > 1e-8 ? Math.max(0, Math.min(1, -(sx * dx + sy * dy) / length)) : 0;
  return (sx + dx * t) ** 2 + (sy + dy * t) ** 2 <= 1;
}

/**
 * Socket choice is deterministic per seed / segment / vehicle. A support is
 * only eligible if it lies IN the real segment, beyond its opening entry.
 * This prevents spawning a late-offer behind the rider.
 */
export function planVehicleEncounter(seed: number, segment: number, id: VehicleId): AuthoredEncounter | null {
  const start = segmentStartPx(segment);
  const end = start + segmentLengthPx(segment);
  const nominal = start + Math.min(750, segmentLengthPx(segment) * 0.45);
  const plan = createNightCityRenderPlan(seed, start + 140, end - 60);
  const recipe = RECIPES[id];
  const matches = plan.chunks.flatMap(chunk => {
    const supports = NIGHT_CITY_SUPPORT_CATALOG[chunk.assetKey] ?? [];
    return supports.filter(s => recipe.supportPattern.test(s.supportId)).map(support => {
      const cx = (support.x1 + support.x2) / 2;
      const cy = (support.y1 + support.y2) / 2;
      const sx = chunk.mirrored ? chunk.cropRect.x + chunk.cropRect.width - cx : cx - chunk.cropRect.x;
      const x = chunk.startX - chunk.overlap + sx * chunk.sourceScale;
      const y = (cy - chunk.cropRect.y) * chunk.sourceScaleY;
      return { support, chunk, x, y };
    }).filter(o => o.x > start + (id === '青鸾' ? 120 : 310) && o.x < end - 135);
  });
  if (matches.length === 0) return null;
  matches.sort((a, b) => Math.abs(a.x - nominal) - Math.abs(b.x - nominal));
  const chosen = matches[0]!;
  const captureY = Math.max(175, Math.min(675, chosen.y + recipe.heightOffset));
  return {
    instanceId: `${seed}:${segment}:${chosen.chunk.index}:${id}`,
    chunkId: chosen.chunk.chunkId,
    supportId: chosen.support.supportId,
    supportX: chosen.x, supportY: chosen.y,
    x: chosen.x, y: captureY,
    radiusX: recipe.radiusX, radiusY: recipe.radiusY,
    requiredAction: recipe.requiredAction,
    announceX: Math.max(start - 600, chosen.x - 850),
  };
}

export function encounterActionEligible(
  action: EncounterAction,
  state: { tick: number; playerY: number; playerVx: number; inputHeld: boolean;
    attached: boolean; lastReleaseTick: number; lastPressTick: number; stylishTicks: readonly number[] },
): boolean {
  if (state.playerVx < 165 || state.attached) return false;
  const releaseAge = state.tick - state.lastReleaseTick;
  const recentlyReleased = releaseAge >= 0 && releaseAge < 130;
  if (action === 'release') return !state.inputHeld && recentlyReleased;
  if (action === 'high-release') return !state.inputHeld && releaseAge >= 0
    && releaseAge < 96 && state.playerY <= 540;
  if (action === 'press') return state.inputHeld && state.tick - state.lastPressTick >= 0
    && state.tick - state.lastPressTick <= 26;
  return !state.inputHeld && releaseAge >= 0 && releaseAge < 80 && state.playerY <= 455
    && state.stylishTicks.filter(t => state.tick - t <= 1200).length >= 2;
}

export function missedEncounterReason(action: EncounterAction, playerY: number, touchedButIneligible: boolean): string {
  if (touchedButIneligible) {
    if (action === 'high-release' && playerY > 540) return '高度不够，借高处挂点再试';
    if (action === 'stylish-release') return '需要连续两次漂亮松手';
    return action === 'press' ? '飞到灯绳旁时按住才接得上' : '松手时机不对';
  }
  return playerY > 610 ? '从下方掠过，没碰到挂环' : '错过挂环，下次提早调整高度';
}
