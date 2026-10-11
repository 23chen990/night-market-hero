export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

const SAFE_MARGIN = 36;

export function finishLabelPosition(point: ScreenPoint, viewport: ViewportSize, margin = SAFE_MARGIN): ScreenPoint | null {
  const safeWidth = Math.max(1, viewport.width);
  const safeHeight = Math.max(1, viewport.height);
  const safeMargin = Math.max(0, margin);
  if (point.x < safeMargin || point.x > safeWidth - safeMargin || point.y < safeMargin || point.y > safeHeight - safeMargin) return null;
  return {
    x: point.x,
    y: point.y,
  };
}
