import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('customer journey presentation contract', () => {
  it('owns an entry-held route state instead of restarting a tween every render', () => {
    const source = read('../src/main.ts');
    expect(source).toContain('customerRoutes');
    expect(source).toContain('CUSTOMER_ENTRY');
    expect(source).toContain('ENTRY_HOLD_MS');
    expect(source).toContain('drawCustomerRoute');
    expect(source).not.toContain('this.tweens.killTweensOf(view)');
  });

  it('normalizes loaded checkout customers through the same visible route stages', () => {
    const source = read('../src/main.ts');
    expect(source).toContain("this.beginCustomerRoute(customer.id, 'entry', CUSTOMER_ENTRY, CUSTOMER_ENTRY, 'shopping', customer.product)");
  });

  it('keeps the product cue and exposes shelf pickup as a visible transition', () => {
    const source = read('../src/main.ts');
    expect(source).toContain('customerPickedUp');
    expect(source).toContain('createProductGraphic(customer.product');
    expect(source).not.toContain('customerProductCues');
    expect(source).not.toContain('取货完成');
    expect(source).not.toContain('缺货');
    expect(source).not.toContain('去鲜鱼');
    expect(source).not.toContain('去海带');
  });

  it('draws the same compact lane-aware route used by the visitor motion', () => {
    const source = read('../src/main.ts');
    expect(source).toContain('const path = routeWaypoints(route, CUSTOMER_WAYPOINTS)');
    expect(source).toContain('routeTransition');
  });

  it('keeps debug route trails hidden in the shipped presentation', () => {
    const source = read('../src/main.ts');
    expect(source).toContain('const SHOW_CUSTOMER_ROUTES = false');
    expect(source).toContain('if (!SHOW_CUSTOMER_ROUTES) return;');
  });

  it('ticks customer motion even when the persisted customer state is unchanged', () => {
    const source = read('../src/main.ts');
    const guard = source.indexOf('if (!force && signature === this.visualSignature) return;');
    const motionTick = source.indexOf('this.syncCustomers();');
    expect(guard).toBeGreaterThan(-1);
    expect(motionTick).toBeGreaterThan(-1);
    expect(motionTick).toBeLessThan(guard);
  });

  it('demotes inactive route plaques and keeps route emphasis local', () => {
    const source = read('../src/main.ts');
    expect(source).toContain('activeRouteAlpha');
    expect(source).not.toContain('backgroundColor: \'rgba(22,58,74,.62)\'');
  });
  it('maps sale feedback events to distinct cue families', () => {
    const source = read('../src/main.ts');
    expect(source).toContain('feedbackKind');
    expect(source).toContain('cashCollected');
    expect(source).toContain('upgraded');
  });
  it('uses aisle waypoints and explicit facility visual states for competitor-gap branches', () => {
    const source = read('../src/main.ts');
    expect(source).toContain('CUSTOMER_WAYPOINTS');
    expect(source).toContain('facilityState');
    expect(source).toContain('coinToNode');
    expect(source).toContain('builtDevice');
  });
});

describe('customer lifecycle evidence', () => {
  it('emits a pickup event at the requested shelf only when stock is consumed', async () => {
    const sim = await import('../src/game/simulation');
    let stocked = sim.createInitialState(0);
    stocked.shelves.fish = 1;
    stocked = sim.spawnCustomerNow(stocked, 'fish').state;
    const result = sim.advanceGame(stocked, sim.ECONOMY.customers.browseDurationMs);
    expect(result.state.checkoutQueue).toEqual([1]);
    expect(result.events).toContainEqual({ type: 'customerPickedUp', product: 'fish', x: sim.STATIONS.fishShelf.x, y: sim.STATIONS.fishShelf.y });

    let waiting = sim.createInitialState(0);
    waiting = sim.spawnCustomerNow(waiting, 'fish').state;
    const waitingResult = sim.advanceGame(waiting, sim.ECONOMY.customers.browseDurationMs);
    expect(waitingResult.state.customers[0]?.state).toBe('waitingStock');
    expect(waitingResult.events.some((event) => event.type === 'customerPickedUp')).toBe(false);
  });
});
