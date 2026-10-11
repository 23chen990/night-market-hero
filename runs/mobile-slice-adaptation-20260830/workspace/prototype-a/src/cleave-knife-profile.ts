/** The accepted standalone knife, expressed before its quarter-turn into z/y. */
export const CLEAVE_KNIFE_OUTLINE = [
  [-1.05, -0.21], [1.1, -0.21], [1.2, -0.1], [1.07, 0.21], [-1.05, 0.21],
] as const;
export const GAME_CLEAVE_KNIFE_SCALE = 0.7;
export const CLEAVE_EDGE_Y = -0.21;
export const CLEAVE_EDGE_TOLERANCE = 0.085;

interface Pose { x: number; y: number; angle: number }

export function cleaveBladeContainsCentre(pose: Pose, target: { x: number; y: number }): boolean {
  const dx = target.x - pose.x, dy = target.y - pose.y;
  const scale = GAME_CLEAVE_KNIFE_SCALE * 100;
  const x = (dx * Math.cos(pose.angle) + dy * Math.sin(pose.angle)) / scale;
  const y = (dx * Math.sin(pose.angle) - dy * Math.cos(pose.angle)) / scale;
  return x >= CLEAVE_KNIFE_OUTLINE[0]![0] && x <= CLEAVE_KNIFE_OUTLINE[2]![0]
    && Math.abs(y - CLEAVE_EDGE_Y) <= CLEAVE_EDGE_TOLERANCE;
}

/** Sweep the actual visible blade across the fruit centre, including rotation. */
export function sweepCleaveCentre(from: Pose, to: Pose, target: { x: number; y: number }): number | null {
  const at = (t: number): Pose => ({ x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t, angle: from.angle + (to.angle - from.angle) * t });
  if (cleaveBladeContainsCentre(from, target)) return 0;
  const steps = Math.max(8, Math.ceil(Math.abs(to.angle - from.angle) * 32),
    Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 2));
  for (let i = 1; i <= steps; i++) {
    if (!cleaveBladeContainsCentre(at(i / steps), target)) continue;
    let lo = (i - 1) / steps, hi = i / steps;
    for (let pass = 0; pass < 24; pass++) {
      const mid = (lo + hi) / 2;
      if (cleaveBladeContainsCentre(at(mid), target)) hi = mid; else lo = mid;
    }
    return hi;
  }
  return null;
}
