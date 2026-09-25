import type { Point } from '../game/simulation';

export type CustomerRouteStage = 'entry' | 'shelf' | 'checkout' | 'exit';
export type CustomerRouteLifecycle = 'shopping' | 'waitingStock' | 'checkout' | 'leaving';

export type CustomerRoutePlan = {
  stage: CustomerRouteStage;
  from: Point;
  target: Point;
  startedAtMs: number;
  laneOffset: number;
};

export type RouteDurations = {
  entryHoldMs: number;
  travelMs: number;
};

export type CustomerObstacle = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** World-space footprints for the solid shop fixtures. Customers route around
 * these, while their visual bodies remain presentation-only. */
export const CUSTOMER_OBSTACLES: readonly CustomerObstacle[] = [
  { id: 'checkout-counter', x: 170, y: 650, width: 200, height: 120 },
  { id: 'fish-shelf', x: 50, y: 395, width: 166, height: 135 },
  { id: 'kelp-shelf', x: 324, y: 395, width: 166, height: 135 },
];

/** A deliberately calm walk speed: the whole shelf route takes about 2.4s. */
export const CUSTOMER_ROUTE_DURATION_MS = 2_400 as const;
export const CUSTOMER_EXIT_DURATION_MS = 1_500 as const;

/** Stable three-lane assignment keeps simultaneous visitors from sharing the
 * exact same spine while preserving a repeatable route after a save/load. */
export function customerLaneOffset(customerId: number): number {
  const lane = ((Math.max(1, Math.floor(customerId)) - 1) % 3) - 1;
  return lane * 52;
}

/** Return the next presentation stage, never skipping the shelf stop. */
export function routeTransition(
  route: CustomerRoutePlan,
  lifecycle: CustomerRouteLifecycle,
  elapsedMs: number,
  durations: RouteDurations,
): CustomerRouteStage | null {
  const elapsed = Math.max(0, elapsedMs);
  if (route.stage === 'entry' && elapsed >= Math.max(0, durations.entryHoldMs)) return 'shelf';
  if (route.stage === 'shelf' && lifecycle === 'checkout' && elapsed >= Math.max(0, durations.travelMs)) return 'checkout';
  if (route.stage === 'checkout' && lifecycle === 'leaving' && elapsed >= Math.max(0, durations.travelMs)) return 'exit';
  return null;
}

function isCollinear(a: Point, b: Point, c: Point): boolean {
  return Math.abs((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)) < 0.001;
}

/** Build a compact, lane-aware polyline and remove duplicate/collinear nodes. */
export function routeWaypoints(route: CustomerRoutePlan, baseWaypoints: readonly Point[]): Point[] {
  if (route.stage === 'entry') return [{ ...route.from }];
  const raw = route.stage === 'checkout'
    ? [route.from, route.target]
    : route.stage === 'exit'
      ? [route.from, { x: 410, y: route.from.y }, { x: 410, y: 800 }, route.target]
    : (() => {
      const leftSide = route.target.x < route.from.x;
      const baseX = leftSide ? 138 : 402;
      const laneX = baseX + route.laneOffset * 0.18;
      const lower = baseWaypoints[0]?.y ?? 770;
      const upper = baseWaypoints.at(-1)?.y ?? 650;
      return [route.from, { x: laneX, y: lower }, { x: laneX, y: upper }, route.target];
    })();
  const deduped = raw.filter((point, index) => index === 0 || point.x !== raw[index - 1]!.x || point.y !== raw[index - 1]!.y);
  if (deduped.length < 3) return deduped;
  const compact: Point[] = [deduped[0]!];
  for (let index = 1; index < deduped.length - 1; index += 1) {
    const previous = compact[compact.length - 1]!;
    const current = deduped[index]!;
    const next = deduped[index + 1]!;
    if (!isCollinear(previous, current, next)) compact.push(current);
  }
  compact.push(deduped[deduped.length - 1]!);
  return compact;
}

function pointInside(point: Point, obstacle: CustomerObstacle): boolean {
  return point.x > obstacle.x && point.x < obstacle.x + obstacle.width
    && point.y > obstacle.y && point.y < obstacle.y + obstacle.height;
}

function segmentIntersectsRect(from: Point, to: Point, obstacle: CustomerObstacle): boolean {
  if (pointInside(from, obstacle) || pointInside(to, obstacle)) return true;
  let t0 = 0;
  let t1 = 1;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    const ratio = q / p;
    if (p < 0) {
      if (ratio > t1) return false;
      if (ratio > t0) t0 = ratio;
    } else {
      if (ratio < t0) return false;
      if (ratio < t1) t1 = ratio;
    }
    return true;
  };
  return clip(-dx, from.x - obstacle.x)
    && clip(dx, obstacle.x + obstacle.width - from.x)
    && clip(-dy, from.y - obstacle.y)
    && clip(dy, obstacle.y + obstacle.height - from.y);
}

export function routeIntersectsObstacles(points: readonly Point[], obstacles: readonly CustomerObstacle[]): boolean {
  return points.slice(1).some((point, index) => obstacles.some((obstacle) => (
    segmentIntersectsRect(points[index]!, point, obstacle)
  )));
}
