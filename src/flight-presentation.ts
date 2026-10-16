/** Presentation dimensions only: no collision, anchor selection or input changes. */
export function flightPresentation(zoom: number) {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  return {
    heroSize: 150,
    // A tiny scale-only rim looked unchanged on Canvas: the texture contains
    // large transparent areas and Phaser tintFill is WebGL-only. Retain the
    // subtle two-pixel center rim, plus FOUR truly offset tinted-silhouette
    // images built from the existing art. Offset is physical screen pixels,
    // never game/world collision or a reward magnet.
    heroRimSize: 150 + 4 / safeZoom,
    heroRimAlpha: 0.56,
    heroOutlineOffsetPixels: 2.8,
    heroOutlineAlpha: 0.58,
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

/** Four offset copies of a cyan alpha-mask texture: works in Canvas AND WebGL.
 * Every copy uses the same authored body pose, rotation and pixel scale.
 * Only the drawn pixels move. Actual player position/anchors do not change.
 */
export function applyFlightSilhouetteOutlines(
  outlines: readonly IdentityImage[],
  player: { x: number; y: number; vx: number; vy: number },
  zoom: number,
): void {
  const style = flightPresentation(zoom);
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const dx = style.heroOutlineOffsetPixels / safeZoom;
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
  const angle = Math.atan2(player.vy, player.vx);
  for (let i = 0; i < directions.length; i++) {
    const sprite = outlines[i];
    if (!sprite) continue;
    sprite.setPosition(player.x + directions[i]![0] * dx, player.y + directions[i]![1] * dx)
      .setRotation(angle)
      .setDisplaySize(style.heroSize, style.heroSize)
      .setAlpha(style.heroOutlineAlpha);
  }
}
