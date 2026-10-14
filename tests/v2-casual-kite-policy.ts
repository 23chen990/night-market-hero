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
