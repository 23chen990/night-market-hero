import { describe, expect, it } from 'vitest';
import generatedConfig from './generated/game-config.json';
import { advanceGame, continueRound, createInitialState, getStationPosition, recordMarketGoal, restartRound, selectMarket, setPlayerPosition, spawnCustomer, type SpatialShopConfig } from './simulation.js';
import { getMarketDefinition } from './revision.js';
import { migrateSavedState, serializeGameState } from './save.js';

const shop = generatedConfig.spatialShop as SpatialShopConfig;
const recordOf = (value: unknown): Record<string, any> => value as Record<string, any>;

describe('depth revision systems', () => {
  it('creates a compatible multi-line order after expansion and preserves quantity accounting', () => {
    let state = createInitialState(shop);
    const stateRecord = recordOf(state);
    stateRecord.level = 2;
    stateRecord.unlockedStationIds = [...state.unlockedStationIds, 'kelp-pool', 'kelp-shelf'];
    state = spawnCustomer(shop, state);
    const customer = state.customers[0];

    expect(customer).toBeDefined();
    expect(recordOf(customer).shoppingList?.length).toBeGreaterThanOrEqual(2);
    expect(recordOf(customer).shoppingList?.every((line: any) => line.quantity > 0 && line.collected <= line.quantity)).toBe(true);

    const lines = recordOf(customer).shoppingList as Array<{ productId: string; quantity: number; collected: number; shelfId: string }>;
    for (const line of lines) state.stations[line.shelfId]!.stock[line.productId] = line.quantity;
    const before = lines.reduce((sum, line) => sum + line.quantity, 0);
    state.customers[0]!.x = shop.stations.find((station) => station.id === lines[0]!.shelfId)!.position.x;
    state.customers[0]!.y = shop.stations.find((station) => station.id === lines[0]!.shelfId)!.position.y;
    state = advanceGame(shop, state, 50);
    expect(state.customers[0]!.queueTicket).toBeNull();
    expect(recordOf(state.customers[0]).shoppingList[0].collected).toBe(1);
    const stockAfterFirst = lines.reduce((sum, line) => sum + Object.values(state.stations[line.shelfId]!.stock).reduce((inner, count) => inner + count, 0), 0);
    expect(stockAfterFirst).toBe(before - 1);
    const second = recordOf(state.customers[0]).shoppingList[1];
    if (second) {
      state.customers[0]!.x = shop.stations.find((station) => station.id === second.shelfId)!.position.x;
      state.customers[0]!.y = shop.stations.find((station) => station.id === second.shelfId)!.position.y;
      state = advanceGame(shop, state, 50);
      expect(state.customers[0]!.queueTicket).not.toBeNull();
      expect(state.customers[0]!.basketValue).toBeGreaterThan(0);
    }
  });

  it('keeps a partial order out of checkout and excludes locked producers and shelves', () => {
    let state = createInitialState(shop);
    state = spawnCustomer(shop, state);
    expect(state.customers[0]!.shoppingList?.every((line) => state.unlockedStationIds.includes(line.shelfId))).toBe(true);
    const customer = state.customers[0]!;
    const shelf = shop.stations.find((station) => station.id === customer.targetShelfId)!;
    customer.x = shelf.position.x;
    customer.y = shelf.position.y;
    state.stations[customer.targetShelfId]!.stock[customer.productId] = 1;
    state = advanceGame(shop, state, 100);
    expect(state.customers[0]!.queueTicket).not.toBeNull();
    expect(state.customers[0]!.phase).toBe('to-checkout');
    expect(state.customers[0]!.shoppingList?.every((line) => line.collected === line.quantity)).toBe(true);
  });

  it('gates smokehouse processing on connected input and output capacity', () => {
    const state = createInitialState(shop);
    const processors = recordOf(state).processors;

    expect(processors?.smokehouse).toMatchObject({ inputShelfId: 'fish-shelf', outputShelfId: 'smoked-shelf' });
    expect(processors?.smokehouse?.blockedReason).toBe('input');
  });

  it('consumes processor input atomically, stops at capacity, then transfers matching output', () => {
    let state = createInitialState(shop);
    const stateRecord = recordOf(state);
    stateRecord.level = 2;
    stateRecord.unlockedStationIds = [...state.unlockedStationIds, 'smokehouse', 'smoked-shelf'];
    state.stations['fish-shelf']!.stock['fresh-fish'] = 1;
    state = advanceGame(shop, state, 1_599);
    expect(state.stations['fish-shelf']!.stock['fresh-fish']).toBe(1);
    expect(stateRecord.processors.smokehouse.ready).toBe(0);
    state = advanceGame(shop, state, 1);
    expect(state.stations['fish-shelf']!.stock['fresh-fish']).toBe(0);
    expect(recordOf(state).processors.smokehouse.ready).toBe(1);
    recordOf(state).processors.smokehouse.ready = recordOf(state).processors.smokehouse.capacity;
    state.stations['fish-shelf']!.stock['fresh-fish'] = 1;
    state = advanceGame(shop, state, 2_000);
    expect(state.stations['fish-shelf']!.stock['fresh-fish']).toBe(1);
    expect(recordOf(state).processors.smokehouse.blockedReason).toBe('capacity');
    state = setPlayerPosition(state, { x: 120, y: 420 });
    state = advanceGame(shop, state, shop.player.pickupIntervalMs);
    expect(state.player.inventory['smoked-fish']).toBe(1);
    state = setPlayerPosition(state, { x: 420, y: 520 });
    state = advanceGame(shop, state, shop.player.depositIntervalMs);
    expect(state.stations['smoked-shelf']!.stock['smoked-fish']).toBe(1);
  });

  it('funds employees in installments and gives the runner bounded physical cargo', () => {
    const state = createInitialState(shop);
    const employees = recordOf(state).employees;

    expect(employees?.runner).toMatchObject({ role: 'runner', cargo: 0, cargoCapacity: 2 });
    expect(employees?.cashier).toMatchObject({ role: 'cashier', cargo: 0 });
    expect(recordOf(state).hireStations?.runner?.remaining).toBeGreaterThan(0);
  });

  it('preserves hire currency through partial installments and gives the cashier one queue-head payment', () => {
    let state = createInitialState(shop);
    const stateRecord = recordOf(state);
    stateRecord.level = 2;
    stateRecord.unlockedStationIds = [...state.unlockedStationIds, 'runner-hire', 'cashier-hire'];
    state = setPlayerPosition(state, { x: 120, y: 820 });
    state = advanceGame(shop, state, 240);
    expect(stateRecord.hireStations.runner.paid).toBe(0);
    state.currency = 2;
    state = advanceGame(shop, state, 480);
    expect(recordOf(state).hireStations.runner.paid).toBe(2);
    expect(state.currency).toBe(0);
    state.currency = 5;
    state = setPlayerPosition(state, { x: 270, y: 820 });
    state = advanceGame(shop, state, 1_500);
    expect(recordOf(state).employees.cashier.funded).toBe(true);
    const checkout = shop.stations.find((station) => station.id === 'checkout')!;
    state.customers = [{ id: 80, x: 270, y: 680, phase: 'queued', productId: 'fresh-fish', targetShelfId: 'fish-shelf', patienceRemainingMs: 8_000, basketValue: 2, queuePosition: { x: 270, y: 680 }, queueTicket: 1 }];
    state.checkout.queue = 1;
    state = setPlayerPosition(state, { x: 20, y: 20 });
    state = advanceGame(shop, state, checkout.kind === 'checkout' ? checkout.serviceMs + 500 : 1_500);
    expect(state.cashPile).toBe(2);
    expect(state.currency).toBe(0);
    state = setPlayerPosition(state, checkout.position);
    state = advanceGame(shop, state, 50);
    expect(state.currency).toBe(2);
    expect(state.cashPile).toBe(0);
  });

  it('activates a shelf-local seagull pressure branch only after expansion', () => {
    let state = createInitialState(shop);
    const stateRecord = recordOf(state);
    stateRecord.level = 2;
    stateRecord.unlockedStationIds = [...state.unlockedStationIds, 'kelp-pool', 'kelp-shelf'];
    stateRecord.stations['fish-shelf'].stock['fresh-fish'] = 2;
    state = advanceGame(shop, state, 8_000);

    expect(recordOf(state).pressure?.seagull?.active).toBe(true);
    expect(recordOf(state).pressure?.seagull?.targetShelfId).toBe('fish-shelf');
  });

  it('uses grace and one-item cadence, then scares the seagull and preserves stock after approach', () => {
    let state = createInitialState(shop);
    const stateRecord = recordOf(state);
    stateRecord.level = 2;
    stateRecord.unlockedStationIds = [...state.unlockedStationIds, 'kelp-pool', 'kelp-shelf'];
    stateRecord.stations['fish-shelf'].stock['fresh-fish'] = 3;
    state = advanceGame(shop, state, 2_500);
    expect(recordOf(state).pressure.seagull.graceMs).toBeGreaterThan(0);
    const before = state.stations['fish-shelf']!.stock['fresh-fish'];
    state = advanceGame(shop, state, 1_000);
    expect(state.stations['fish-shelf']!.stock['fresh-fish']).toBe(before);
    state = advanceGame(shop, state, 1_000);
    state = advanceGame(shop, state, 2_200);
    state = advanceGame(shop, state, 1_000);
    expect(state.stations['fish-shelf']!.stock['fresh-fish']).toBe((before ?? 0) - 1);
    state = setPlayerPosition(state, { x: 270, y: 420 });
    state = advanceGame(shop, state, 50);
    expect(recordOf(state).pressure.seagull.active).toBe(false);
    const afterScare = state.stations['fish-shelf']!.stock['fresh-fish'];
    recordOf(state).stations['fish-shelf'].stock['fresh-fish'] = (afterScare ?? 0) + 1;
    state = advanceGame(shop, state, 4_400);
    expect(state.stations['fish-shelf']!.stock['fresh-fish']).toBe((afterScare ?? 0) + 1);
    const waiting = { id: 81, x: 266, y: 420, phase: 'to-shelf' as const, productId: 'fresh-fish', targetShelfId: 'fish-shelf', patienceRemainingMs: 8_000, basketValue: 0, queuePosition: null, queueTicket: null };
    state.customers = [waiting];
    state = advanceGame(shop, state, 50);
    expect(state.customers[0]!.patienceRemainingMs).toBe(8_000);
    state = advanceGame(shop, state, 50);
    expect(state.customers[0]!.departureReason).toBe('completed');
    recordOf(state).stations['fish-shelf'].stock['fresh-fish'] = 0;
    state.customers = [{ ...waiting, id: 82 }];
    state = advanceGame(shop, state, 50);
    expect(state.customers[0]!.patienceRemainingMs).toBe(8_000);
    state = advanceGame(shop, state, 8_000);
    expect(state.customers[0]!.departureReason).toBe('stockout');
  });

  it('opens the next-market selector only after stationary marker arrival', () => {
    let state = createInitialState(shop);
    state = continueRound({ ...state, stage: 'settlement' });
    const continued = recordOf(state);

    expect(continued.marketMarker?.enabled).toBe(true);
    expect(continued.stage).toBe('operating');
    const marker = continued.marketMarker.position;
    state = setPlayerPosition(state, marker);
    state = advanceGame(shop, state, 250);

    expect(state.stage).toBe('market-selection');
  });

  it('requires stationary marker input and validates world transitions while preserving upgrades', () => {
    let state = createInitialState(shop);
    state = continueRound({ ...state, stage: 'settlement' });
    const marker = recordOf(state).marketMarker.position;
    state = setPlayerPosition(state, marker);
    state = advanceGame(shop, state, 50, { x: 1, y: 0 });
    expect(state.stage).toBe('operating');
    state = setPlayerPosition(state, marker);
    state = advanceGame(shop, state, 50);
    expect(state.stage).toBe('market-selection');
    const before = state;
    expect(selectMarket(state, 'locked-market').marketId).toBe(before.marketId);
    const upgraded = recordOf(state);
    upgraded.stations['capacity-upgrade'].purchases = 1;
    upgraded.perMarketProgress['beach-stall'].goalProgress = 4;
    let coral = selectMarket(state, 'coral-cove-market');
    expect(coral.marketId).toBe('coral-cove-market');
    expect(coral.stage).toBe('operating');
    expect(recordOf(coral).stations['capacity-upgrade'].purchases).toBe(1);
    expect(getMarketDefinition(coral.marketId).stationPositions.net).not.toEqual(getMarketDefinition('beach-stall').stationPositions.net);
    expect(getMarketDefinition(coral.marketId).demandProductIds).not.toEqual(getMarketDefinition('beach-stall').demandProductIds);
    coral.customers = [{ id: 90, x: 280, y: 690, phase: 'queued', productId: 'fresh-fish', targetShelfId: 'fish-shelf', patienceRemainingMs: 8_000, basketValue: 4, queuePosition: { x: 280, y: 690 }, queueTicket: 1 }];
    coral.checkout.queue = 1;
    coral = setPlayerPosition(coral, getMarketDefinition('coral-cove-market').stationPositions.checkout ?? { x: 280, y: 650 });
    coral = advanceGame(shop, coral, 700 + 320 + 50);
    expect(coral.perMarketProgress['coral-cove-market']?.goalProgress).toBe(1);
    const settled = recordMarketGoal(recordMarketGoal(coral));
    expect(settled.stage).toBe('settlement');
    expect(continueRound(settled).stage).toBe('operating');
    expect(restartRound(shop, settled).marketId).toBe('beach-stall');
  });

  it('starts with a versioned save state and explicit active market', () => {
    const state = createInitialState(shop);
    const stateRecord = recordOf(state);

    expect(stateRecord.version).toBe(2);
    expect(stateRecord.marketId).toBe('beach-stall');
    expect(stateRecord.perMarketProgress).toEqual(expect.any(Object));
    expect(stateRecord.reducedMotion).toBe(false);
  });

  it('migrates a v1 save without stale entities and persists the new revision fields', () => {
    const legacy = createInitialState(shop) as unknown as Record<string, any>;
    legacy.version = 1;
    legacy.currency = 7;
    legacy.unlockedStationIds = ['net', 'fish-shelf', 'missing-shelf'];
    legacy.stations['kelp-build'] = { contributed: 2, completed: false, ready: 0, cycleProgressMs: 0, stock: {}, purchases: 0 };
    legacy.customers = [{ id: 99, phase: 'to-shelf', productId: 'missing-product', targetShelfId: 'missing-shelf', queueTicket: 2 }];
    const migrated = migrateSavedState(shop, legacy);
    const migratedRecord = recordOf(migrated);

    expect(migratedRecord.version).toBe(2);
    expect(migrated.currency).toBe(7);
    expect(migrated.unlockedStationIds).not.toContain('missing-shelf');
    expect(migrated.customers).toHaveLength(0);
    expect(migrated.stations['kelp-build']?.contributed).toBe(2);
    expect(migratedRecord.processors.smokehouse).toBeDefined();
    expect(JSON.parse(serializeGameState(migrated)).version).toBe(2);
  });
});
