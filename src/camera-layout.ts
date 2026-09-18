/**
 * Shared world-to-screen projection for the night-city scene.
 *
 * Gameplay remains in world units.  This module owns only the presentation
 * camera so that desktop and phone viewports use the same logical origin,
 * aspect and look-ahead.  Keeping the projection pure also makes resize and
 * screenshot QA deterministic.
 */

export const LOGICAL_VIEWPORT = Object.freeze({
  width: 1_672,
  height: 941,
  aspect: 1_672 / 941,
});

export interface CameraLayoutOptions {
  width: number;
  height: number;
  lookAhead?: number;
  logicalWidth?: number;
  logicalHeight?: number;
}

export interface CameraLayout {
  width: number;
  height: number;
  logicalWidth: number;
  logicalHeight: number;
  aspect: number;
  lookAhead: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface CameraWorldBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface CameraPlayerPoint {
  x: number;
  y: number;
}

export interface CameraProjection {
  zoom: number;
  scrollX: number;
  scrollY: number;
  worldViewportWidth: number;
  worldViewportHeight: number;
  playerScreenX: number;
  playerScreenY: number;
  playerVisible: boolean;
}

function finitePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Build a logical 16:9 camera layout for a real DOM/Phaser viewport. */
export function createCameraLayout(options: CameraLayoutOptions): CameraLayout {
  const width = finitePositive(options.width, LOGICAL_VIEWPORT.width);
  const height = finitePositive(options.height, LOGICAL_VIEWPORT.height);
  const logicalWidth = finitePositive(options.logicalWidth ?? LOGICAL_VIEWPORT.width, LOGICAL_VIEWPORT.width);
  const logicalHeight = finitePositive(options.logicalHeight ?? LOGICAL_VIEWPORT.height, LOGICAL_VIEWPORT.height);
  const lookAhead = clamp(Number.isFinite(options.lookAhead ?? 0.32) ? options.lookAhead ?? 0.32 : 0.32, 0, 0.5);
  // Fit the authored stage vertically. The shell is full-viewport, so a
  // landscape aspect mismatch expands or crops the horizontal world instead
  // of exposing a CSS letterbox around the raster scene.
  const zoom = height / logicalHeight;
  // Phaser's camera is explicitly pinned to origin (0,0) by FlightScene.  Do
  // not add a second letterbox offset here: the #app shell owns safe-area
  // placement, while world coordinates and the camera matrix stay identical.
  const offsetX = 0;
  const offsetY = 0;
  return {
    width,
    height,
    logicalWidth,
    logicalHeight,
    aspect: logicalWidth / logicalHeight,
    lookAhead,
    zoom,
    offsetX,
    offsetY,
  };
}

/** Project a world point and clamp the camera to the supplied world bounds. */
export function projectCamera(
  layout: CameraLayout,
  player: CameraPlayerPoint,
  bounds: CameraWorldBounds,
): CameraProjection {
  const zoom = finitePositive(layout.zoom, 1);
  const worldViewportWidth = layout.width / zoom;
  const worldViewportHeight = layout.height / zoom;
  const worldLeft = Number.isFinite(bounds.left) ? bounds.left : 0;
  const worldRight = Number.isFinite(bounds.right) ? Math.max(worldLeft, bounds.right) : worldLeft + worldViewportWidth;
  const worldTop = Number.isFinite(bounds.top) ? bounds.top : 0;
  const worldBottom = Number.isFinite(bounds.bottom) ? Math.max(worldTop, bounds.bottom) : worldTop + worldViewportHeight;
  const maxScrollX = Math.max(worldLeft, worldRight - worldViewportWidth);
  const maxScrollY = Math.max(worldTop, worldBottom - worldViewportHeight);
  const targetX = player.x - worldViewportWidth * layout.lookAhead;
  // This is a side-view runner. Keep the vertical origin fixed during jumps;
  // the streamed panorama is screen-complete at this origin and must never
  // uncover the application shell while the player changes height.
  const targetY = worldTop;
  const scrollX = clamp(Number.isFinite(targetX) ? targetX : worldLeft, worldLeft, maxScrollX);
  const scrollY = clamp(Number.isFinite(targetY) ? targetY : worldTop, worldTop, maxScrollY);
  const playerScreenX = (player.x - scrollX) * zoom + layout.offsetX;
  const playerScreenY = (player.y - scrollY) * zoom + layout.offsetY;
  return {
    zoom,
    scrollX,
    scrollY,
    worldViewportWidth,
    worldViewportHeight,
    playerScreenX,
    playerScreenY,
    playerVisible: playerScreenX >= -1 && playerScreenX <= layout.width + 1
      && playerScreenY >= -1 && playerScreenY <= layout.height + 1,
  };
}
