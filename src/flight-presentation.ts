/** Presentation dimensions only: no collision, anchor selection or input changes. */
export function flightPresentation(zoom: number) {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  return {
    heroSize: 150,
    // Two screen pixels around the existing alpha silhouette at phone sizes.
    heroRimSize: 150 + 4 / safeZoom,
    heroRimAlpha: 0.72,
    idleAnchorSize: 30,
    eligibleAnchorSize: 54,
    attachedAnchorSize: 56,
    idleAnchorAlpha: 0.46,
    eligibleAnchorAlpha: 0.98,
  };
}

interface IdentityImage {
  setPosition(x: number, y: number): IdentityImage;
  setRotation(angle: number): IdentityImage;
  setDisplaySize(width: number, height: number): IdentityImage;
  setAlpha(alpha: number): IdentityImage;
}

export function applyFlightIdentity(
  hero: IdentityImage,
  rim: IdentityImage,
  player: { x: number; y: number; vx: number; vy: number },
  zoom: number,
): void {
  const style = flightPresentation(zoom);
  const angle = Math.atan2(player.vy, player.vx);
  hero.setPosition(player.x, player.y).setRotation(angle)
    .setDisplaySize(style.heroSize, style.heroSize).setAlpha(1);
  rim.setPosition(player.x, player.y).setRotation(angle)
    .setDisplaySize(style.heroRimSize, style.heroRimSize).setAlpha(style.heroRimAlpha);
}
