import type { GameState } from '../game/simulation';

export type AdPlacement = 'upgrade_boost' | 'offline_double' | 'delivery_instant' | 'gull_bonus';
export const AD_PLACEMENTS: Record<AdPlacement, { cooldownMs: number }> = {
  upgrade_boost: { cooldownMs: 60_000 },
  offline_double: { cooldownMs: 120_000 },
  delivery_instant: { cooldownMs: 90_000 },
  gull_bonus: { cooldownMs: 90_000 },
};

export type AdReward =
  | { kind: 'upgrade_speed'; durationMs: number }
  | { kind: 'offline_multiplier'; multiplier: 2; durationMs: number }
  | { kind: 'delivery_instant'; durationMs: number }
  | { kind: 'gull_multiplier'; multiplier: 2; durationMs: number };
export type AdState = {
  impressionsByPlacement: Record<AdPlacement, number>;
  lastShownAtMs: Partial<Record<AdPlacement, number>>;
};
export type AdResult = { accepted: boolean; state: AdState; reward?: AdReward; reason?: 'cooldown' };

const placements = Object.keys(AD_PLACEMENTS) as AdPlacement[];
export function createAdState(): AdState {
  return { impressionsByPlacement: { upgrade_boost: 0, offline_double: 0, delivery_instant: 0, gull_bonus: 0 }, lastShownAtMs: {} };
}
export function canShowRewardedAd(state: AdState, placement: AdPlacement, nowMs: number) {
  const last = state.lastShownAtMs[placement];
  return last === undefined || nowMs - last >= AD_PLACEMENTS[placement].cooldownMs;
}

function rewardFor(placement: AdPlacement): AdReward {
  if (placement === 'upgrade_boost') return { kind: 'upgrade_speed', durationMs: 30_000 };
  if (placement === 'offline_double') return { kind: 'offline_multiplier', multiplier: 2, durationMs: 30_000 };
  if (placement === 'delivery_instant') return { kind: 'delivery_instant', durationMs: 30_000 };
  return { kind: 'gull_multiplier', multiplier: 2, durationMs: 30_000 };
}

export function grantRewardedAd(state: AdState, placement: AdPlacement, nowMs: number, _game?: GameState): AdResult {
  if (!canShowRewardedAd(state, placement, nowMs)) return { accepted: false, state, reason: 'cooldown' };
  const next: AdState = {
    impressionsByPlacement: { ...state.impressionsByPlacement, [placement]: state.impressionsByPlacement[placement] + 1 },
    lastShownAtMs: { ...state.lastShownAtMs, [placement]: nowMs },
  };
  return { accepted: true, state: next, reward: rewardFor(placement) };
}

export function normalizeAdState(raw: unknown): AdState {
  const base = createAdState();
  if (!raw || typeof raw !== 'object') return base;
  const value = raw as Record<string, unknown>;
  const rawImpressions = value.impressionsByPlacement;
  const rawLast = value.lastShownAtMs;
  const impressions = { ...base.impressionsByPlacement };
  if (rawImpressions && typeof rawImpressions === 'object') for (const placement of placements) {
    const count = (rawImpressions as Record<string, unknown>)[placement];
    if (typeof count === 'number' && Number.isFinite(count)) impressions[placement] = Math.max(0, Math.floor(count));
  }
  const lastShownAtMs: Partial<Record<AdPlacement, number>> = {};
  if (rawLast && typeof rawLast === 'object') for (const placement of placements) {
    const at = (rawLast as Record<string, unknown>)[placement];
    if (typeof at === 'number' && Number.isFinite(at)) lastShownAtMs[placement] = Math.max(0, at);
  }
  return { impressionsByPlacement: impressions, lastShownAtMs };
}
