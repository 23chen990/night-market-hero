import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_OBSTACLES,
  CUSTOMER_ROUTE_DURATION_MS,
  customerLaneOffset,
  routeTransition,
  routeIntersectsObstacles,
  routeWaypoints,
  type CustomerRoutePlan,
} from '../src/ui/customer-routes';

const plan = (stage: CustomerRoutePlan['stage']): CustomerRoutePlan => ({
  stage,
  from: { x: 270, y: 824 },
  target: { x: 112, y: 542 },
  startedAtMs: 0,
  laneOffset: 0,
});

describe('customer route behavior', () => {
  it('keeps a saved checkout customer visible at the shelf before routing to checkout', () => {
    expect(routeTransition(plan('entry'), 'checkout', 220, { entryHoldMs: 220, travelMs: 660 })).toBe('shelf');
    expect(routeTransition(plan('shelf'), 'checkout', 659, { entryHoldMs: 220, travelMs: 660 })).toBeNull();
    expect(routeTransition(plan('shelf'), 'checkout', 660, { entryHoldMs: 220, travelMs: 660 })).toBe('checkout');
  });

  it('removes duplicate waypoints and assigns repeatable lanes to avoid customer overlap', () => {
    expect(routeWaypoints(plan('entry'), [{ x: 270, y: 770 }, { x: 270, y: 650 }])).toEqual([{ x: 270, y: 824 }]);
    const points = routeWaypoints(plan('shelf'), [{ x: 270, y: 770 }, { x: 270, y: 650 }]);
    expect(points[0]).toEqual({ x: 270, y: 824 });
    expect(points).toHaveLength(4);
    expect(customerLaneOffset(1)).not.toBe(customerLaneOffset(2));
    expect(customerLaneOffset(1)).toBe(customerLaneOffset(4));
  });

  it('routes shelf-bound customers around the solid checkout counter', () => {
    const points = routeWaypoints(plan('shelf'), [{ x: 270, y: 770 }, { x: 270, y: 650 }]);
    expect(routeIntersectsObstacles(points, CUSTOMER_OBSTACLES)).toBe(false);
  });

  it('uses a readable walking duration instead of a fly-through tween', () => {
    expect(CUSTOMER_ROUTE_DURATION_MS).toBeGreaterThanOrEqual(1_400);
  });

  it('supports a checkout-to-door exit leg', async () => {
    const routes = await import('../src/ui/customer-routes');
    expect(routes.CUSTOMER_EXIT_DURATION_MS).toBeGreaterThanOrEqual(1_000);
    expect(routes.routeTransition(plan('checkout'), 'leaving', routes.CUSTOMER_EXIT_DURATION_MS - 1, { entryHoldMs: 220, travelMs: routes.CUSTOMER_EXIT_DURATION_MS })).toBeNull();
    expect(routes.routeTransition(plan('checkout'), 'leaving', routes.CUSTOMER_EXIT_DURATION_MS, { entryHoldMs: 220, travelMs: routes.CUSTOMER_EXIT_DURATION_MS })).toBe('exit');
    expect(routes.routeWaypoints({ ...plan('exit'), from: { x: 224, y: 620 }, target: { x: 270, y: 824 } }, [{ x: 270, y: 770 }, { x: 270, y: 650 }])).toEqual([{ x: 224, y: 620 }, { x: 410, y: 620 }, { x: 410, y: 800 }, { x: 270, y: 824 }]);
  });

  it('routes checkout exits around the solid counter instead of through it', async () => {
    const routes = await import('../src/ui/customer-routes');
    const points = routes.routeWaypoints({ ...plan('exit'), from: { x: 224, y: 620 }, target: { x: 270, y: 824 } }, [{ x: 270, y: 770 }, { x: 270, y: 650 }]);
    expect(points.length).toBeGreaterThan(2);
    expect(routes.routeIntersectsObstacles(points, routes.CUSTOMER_OBSTACLES)).toBe(false);
  });
});
