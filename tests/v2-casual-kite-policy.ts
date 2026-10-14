/** Conservative one-finger QA policy, applied only to actual browser input.
 * A player may hold the old roof rope to pass the optional kite, but must
 * release above its illustrated ellipse before the pendulum reverses.
 * Never changes the game world, pursuer, rewards or collision checks.
 */
export function shouldHoldConservativeKiteRope(
  player: { x: number; y: number; vx: number },
  kite: { x: number; y: number; radiusY?: number },
): boolean {
  const aboveVisibleKite = player.y < kite.y - (kite.radiusY ?? 120) - 6;
  const pastSocket = player.x >= kite.x - 15;
  const aboutToReverse = player.x >= kite.x - 65 && player.vx < 210;
  return !(pastSocket && aboveVisibleKite) && !aboutToReverse;
}

/** A separate natural keyboard journey may approach this visible kite high
 * above the ring and run out of forward speed BEFORE reaching its center.
 * Drop the old REAL rope now, instead of holding until the player swings
 * backward or falls. This is only a true-input decision, never game physics.
 */
export function isConservativeKiteApexDanger(
  player: { x: number; y: number; vx: number },
  kite: { x: number; y: number; radiusY?: number },
  isAttached: boolean,
): boolean {
  return isAttached && player.x >= kite.x - 350
    && player.x <= kite.x + 140 && player.vx >= 0 && player.vx < 260
    && player.y < kite.y - (kite.radiusY ?? 120) - 6;
}

/** True-input option to MISS a low pulley without trapping a rider high on
 * an old roof rope until the natural pendulum stalls and guards catch up.
 * Evaluated from the same visible player and hanging handle geometry as
 * a real human sees. No hidden physics/grapple/entitlement changes.
 */
export function shouldReleaseConservativePulleyRope(
  player: { x: number; y: number; vx: number; vy: number },
  pulley: { x: number; y: number; radiusY?: number },
  isAttached: boolean,
): boolean {
  const aboveVisibleHandle = player.y < pulley.y - (pulley.radiusY ?? 98) - 8;
  const nearHandle = player.x >= pulley.x - 255 && player.x <= pulley.x + 165;
  const stillMovingForward = player.vx >= 210 && player.vy < 185;
  const approachingReversal = isAttached
    && player.x >= pulley.x - 110 && player.vx < 280;
  return aboveVisibleHandle && nearHandle
    && (stillMovingForward || approachingReversal);
}
