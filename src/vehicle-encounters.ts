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
  // Same fixed authored support. Its longer visible tether matches the real
  // post-pulley high-roof flight without granting the kite automatically.
  '纸鸢': { supportPattern: /eave-beam|walkway-beam|roof-rail/, heightOffset: 286,
    radiusX: 76, radiusY: 120, requiredAction: 'high-release', description: '借高挂点起飞，松手接住鸢绳' },
  // A low street-level knot is still hung from the SAME real source support.
  // Pressing during true physical contact remains mandatory: never auto-award.
  // Real supported knot on a visibly longer hanging line: low-route
  // releases can now physically reach it without an invisible collision
  // extension, an auto-equipped ride, or moving the target with the rider.
  '灯笼群': { supportPattern: /lantern|rope/, heightOffset: 270,
    radiusX: 84, radiusY: 100, requiredAction: 'press', description: '松开旧绳，再按住接实体灯绳' },
  // The blue-green bird remains a genuinely elevated, world-supported
  // encounter. Moving its VISIBLE perch 24 world pixels below the same beam
  // avoids an impossible near-miss at the crest of a real prior-roof swing.
  // Its radii, real stylish streak requirement, release window and physics
  // are unchanged; there is no rider-following magnet.
  '青鸾': { supportPattern: /left-eave-beam|right-eave-beam/, heightOffset: 214,
    radiusX: 88, radiusY: 92, requiredAction: 'stylish-release', description: '先攒两次漂亮松手，沿高线离索接青鸾' },
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

/**
 * A player who already earned TWO consecutive real stylish rope releases may
 * use an ordinary *final boarding* release beside the visible Qingluan ring.
 * That last release is not a third stylish action and does NOT award a ride:
 * the original swept-ellipse contact, fresh release, speed and two-release
 * checks still decide the outcome. Everywhere else an ordinary release
 * breaks the consecutive streak as before.
 *
 * This corrects the high-roof edge case where the player slows at the apex
 * while entering the ring and loses previously earned preparation.
 */
export function preserveBirdPreparationForFinalBoarding(args: {
  player: { x: number; y: number };
  tick: number;
  releasedRealAnchor: boolean;
  stylishTicks: readonly number[];
  offers: readonly {
    id: VehicleId; status: string;
    x: number; y: number; radiusX?: number; radiusY?: number;
  }[];
}): boolean {
  if (!args.releasedRealAnchor) return false;
  if (args.stylishTicks.filter(t => t <= args.tick && args.tick - t <= 1200).length < 2)
    return false;
  return args.offers.some(offer =>
    offer.id === '青鸾' && offer.status === 'available'
    && Math.abs(args.player.x - offer.x) <= (offer.radiusX ?? 88) + 80
    && Math.abs(args.player.y - offer.y) <= (offer.radiusY ?? 92) + 85,
  );
}

export function encounterActionEligible(
  action: EncounterAction,
  state: { tick: number; playerY: number; playerVx: number; inputHeld: boolean;
    attached: boolean; lastReleaseTick: number; lastPressTick: number; stylishTicks: readonly number[];
    contactCenterY?: number; contactRadiusY?: number },
): boolean {
  if (state.playerVx < 165 || state.attached) return false;
  const releaseAge = state.tick - state.lastReleaseTick;
  // The first pulley is a one-finger precision grab. A 40-tick / 0.33s
  // release window was shorter than the REAL swing travel time from the
  // visible yellow ring's approach (~230 world units at 500+ units/sec).
  // Allow up to 64 fixed steps (~0.53s), but still require a genuine
  // released physical rope, no held input, forward velocity, and ACTUAL
  // intersection with the unchanged visible world-space ellipse.
  const recentlyReleased = releaseAge >= 0 && releaseAge <= 64;
  if (action === 'release') return !state.inputHeld && recentlyReleased;
  // A high-roof launch takes real airtime. The old 0.54s clock invalidated
  // physical handle crossings after a genuine release; preserve the SAME
  // visible ellipse and require an actual recent rope-release input edge.
  // 130 fixed ticks = 1.08 seconds of travel, not an invisible pickup range.
  if (action === 'high-release') return !state.inputHeld && releaseAge >= 0
    && releaseAge <= 130 && state.playerY <= (state.contactCenterY !== undefined && state.contactRadiusY !== undefined
      ? state.contactCenterY + state.contactRadiusY * .9 : 520);
  if (action === 'press') return state.inputHeld && state.tick - state.lastPressTick >= 0
    && state.tick - state.lastPressTick <= 26;
  // Qingluan used to reject genuine contact in the visible lower wing-ring
  // (e.g. center y=404, drawn ring to y=496, but a hidden hard cap y=455).
  // The SWEPT ELLIPSE already enforces physical contact. Keep two real
  // stylish releases and the 80-tick window, with NO invisible magnet.
  const birdVisibleBottom = state.contactCenterY !== undefined
    && state.contactRadiusY !== undefined
    ? state.contactCenterY + state.contactRadiusY : 455;
  return !state.inputHeld && releaseAge >= 0 && releaseAge < 80
    && state.playerY <= birdVisibleBottom
    && state.stylishTicks.filter(t => t <= state.tick
      && state.tick - t <= 1200).length >= 2;
}

export function missedEncounterReason(
  action: EncounterAction, playerY: number, touchedButIneligible: boolean,
  contactCenterY?: number, contactRadiusY?: number,
  context?: { stylishReleaseCount: number; attached: boolean; inputHeld: boolean; releaseAge: number },
): string {
  if (touchedButIneligible) {
    const visibleLowerBand = contactCenterY !== undefined && contactRadiusY !== undefined
      ? contactCenterY + contactRadiusY * .9 : 590;
    if (action === 'high-release' && playerY > visibleLowerBand)
      return '高度不够，借高处挂点再试';
    if (action === 'stylish-release') {
      // The old message incorrectly blamed missing stylish releases even
      // when the player had qualified but stayed attached or dove too low.
      // Never hide the actual reason behind an unrelated generic hint.
      if (!context) return '需要连续两次漂亮松手';
      if (context.stylishReleaseCount < 2)
        return `还差${2 - context.stylishReleaseCount}次漂亮松手，先抓高处屋檐再松手`;
      if (context.attached || context.inputHeld)
        return '青鸾在眼前！先松开旧飞索，再飞进翼环';
      const birdVisibleBottom = contactCenterY !== undefined && contactRadiusY !== undefined
        ? contactCenterY + contactRadiusY : 455;
      if (playerY > birdVisibleBottom)
        return '青鸾在上方，借前一根高处飞索提升高度';
      if (context.releaseAge < 0 || context.releaseAge >= 80)
        return '松手太早了，靠近青鸾发光圈再离开飞索';
      return '青鸾接取时机不对，沿高线继续练习';
    }
    return action === 'press'
      ? '碰到了灯绳！先松开旧飞索，再靠近时重新按住'
      : '松手时机不对';
  }
  // When the body never entered the real world-space ring, "missed" must
  // describe WHICH side of this particular target was actually missed.
  // A hard-coded y=610 gave the same vague, sometimes reversed explanation
  // to a high pulley, low lantern and Qingluan. Only the player's actual
  // height relative to the AUTHORED ellipse matters; no pickup thresholds
  // or physics are changed here.
  if (Number.isFinite(contactCenterY) && Number.isFinite(contactRadiusY)
    && contactRadiusY! > 0) {
    if (playerY < contactCenterY! - contactRadiusY!)
      return '从挂环上方飞过：下次提前走低屋檐';
    if (playerY > contactCenterY! + contactRadiusY!)
      return '从挂环下方飞过：下次先接高处屋檐升高';
    return '擦过挂环边缘：下次对准发光圈中心';
  }
  return playerY > 610 ? '从下方掠过，没碰到挂环' : '错过挂环，下次提早调整高度';
}
