export interface CutImpactProfile {
  /** Normalized progress through the short blade-crossing accent. */
  progress: number;
  /** Opacity of the transient cut line. */
  opacity: number;
  /** Length in presentation-world units. */
  length: number;
  /** Thickness in presentation-world units. */
  thickness: number;
}

export const CUT_IMPACT_DURATION_SECONDS = 0.28;

/** Convert a wall-clock frame delta without ever withholding gameplay time. */
export function continuousGameplayDeltaSeconds(wallDeltaMs: number): number {
  return Math.max(0, wallDeltaMs) / 1000;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * The visual accent starts on the blade plane, grows as the two halves begin
 * to travel, then fades away. It is deliberately independent of simulation
 * time so it cannot pause or slow the playable cut.
 */
export function cutImpactProfile(ageSeconds: number): CutImpactProfile {
  const safeAge = Number.isFinite(ageSeconds) ? ageSeconds : ageSeconds > 0 ? CUT_IMPACT_DURATION_SECONDS : 0;
  const progress = clamp01(safeAge / CUT_IMPACT_DURATION_SECONDS);
  if (progress >= 1) return { progress: 1, opacity: 0, length: 0, thickness: 0 };
  const growth = 1 - (1 - progress) ** 2;
  const fadeStart = 0.58;
  const fade = progress <= fadeStart ? 1 : clamp01((1 - progress) / (1 - fadeStart));
  const contactBoost = 0.82 + 0.18 * clamp01(progress / 0.14);
  return {
    progress,
    opacity: contactBoost * fade,
    length: 0.18 + growth * 1.1,
    thickness: 0.08 - progress * 0.04,
  };
}
