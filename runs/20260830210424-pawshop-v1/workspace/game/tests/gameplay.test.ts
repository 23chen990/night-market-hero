import { describe, expect, it } from 'vitest';
import { loadContract } from './contracts';

type Simulation = typeof import('../src/game/simulation');

const loadSimulation = () => loadContract<Simulation>(
  () => import('../src/game/simulation'),
  'game simulation',
);

describe('spatial idle-shop simulation', () => {
  it('removes the world carrier workshop while keeping direct carrier upgrades', async () => {
    const sim = await loadSimulation();
    expect(Object.keys(sim.STATIONS)).not.toContain('upgrade');

    const state = sim.createInitialState(0);
    state.currency = 40;
    const upgraded = sim.purchaseCarrierUpgrade(state);
    expect(upgraded.state.capacity).toBe(6);
    expect(upgraded.state.currency).toBe(0);
  });

  it('declares a customer door entry point below the checkout counter', async () => {
    const sim = await loadSimulation();
    expect(sim.CUSTOMER_ENTRY.y).toBeGreaterThan(sim.STATIONS.checkout.y);
    expect(sim.CUSTOMER_ENTRY.x).toBe(sim.STATIONS.checkout.x);
  });

  it('produces autonomous shrimp batches of two and stops at the visible buffer cap of four', async () => {
    const sim = await loadSimulation();
    let state = sim.createInitialState(0);
    state.facilities.shrimpTrap.unlocked = true;
    state = sim.advanceGame(state, 4_200).state;
    expect(state.facilities.shrimpTrap.buffer).toBe(2);
    state = sim.advanceGame(state, 4_200).state;
    expect(state.facilities.shrimpTrap.buffer).toBe(4);
    state = sim.advanceGame(state, 8_400).state;
    expect(state.facilities.shrimpTrap.buffer).toBe(4);
  });

  it('latches crab at one ready slot and raises only its ready capacity to two', async () => {
    const sim = await loadSimulation();
    let state = sim.createInitialState(0);
    state.facilities.crabPot.unlocked = true;
    state = sim.advanceGame(state, 20_800).state;
    expect(state.facilities.crabPot.readyCount).toBe(1);

    state.currency = 98;
    state = sim.purchaseFacilityUpgrade(state, 'crabPotReadyCapacity').state;
    expect(state.facilities.crabPot.readyCapacity).toBe(2);
    expect(state.currency).toBe(0);
    state = sim.advanceGame(state, 10_400).state;
    expect(state.facilities.crabPot.readyCount).toBe(2);
  });

  it('applies each local facility upgrade only to its declared axis', async () => {
    const sim = await loadSimulation();
    let fish = sim.createInitialState(0);
    fish.currency = 48;
    fish = sim.purchaseFacilityUpgrade(fish, 'fishNetSpeed').state;
    fish.player = { ...sim.STATIONS.fishSource };
    fish = sim.advanceGame(fish, 439).state;
    expect(fish.carrying.fish).toBe(0);
    fish = sim.advanceGame(fish, 1).state;
    expect(fish.carrying.fish).toBe(1);

    let shrimp = sim.createInitialState(0);
    shrimp.facilities.shrimpTrap.unlocked = true;
    shrimp.currency = 80;
    shrimp = sim.purchaseFacilityUpgrade(shrimp, 'shrimpTrapSpeed').state;
    shrimp = sim.advanceGame(shrimp, 3_499).state;
    expect(shrimp.facilities.shrimpTrap.buffer).toBe(0);
    shrimp = sim.advanceGame(shrimp, 1).state;
    expect(shrimp.facilities.shrimpTrap.buffer).toBe(2);
    expect(shrimp.facilities.crabPot.readyCapacity).toBe(1);
  });

  it('shares one carrier capacity across four products and delivers to independent shelf caps', async () => {
    const sim = await loadSimulation();
    let state = sim.createInitialState(0);
    state.facilities.shrimpTrap = { ...state.facilities.shrimpTrap, unlocked: true, buffer: 2 };
    state.facilities.crabPot = { ...state.facilities.crabPot, unlocked: true, readyCount: 1 };
    state.carrying = { fish: 1, kelp: 1, shrimp: 1, crab: 0 };
    state.player = { ...sim.STATIONS.crabPot };
    state = sim.advanceGame(state, 240).state;
    expect(state.carrying).toEqual({ fish: 1, kelp: 1, shrimp: 1, crab: 1 });
    expect(Object.values(state.carrying).reduce((sum, count) => sum + count, 0)).toBe(4);

    state.capacity = 8;
    state.capacityTier = 2;
    state.carrying.shrimp = 2;
    state.player = { ...sim.STATIONS.shrimpShelf };
    state = sim.advanceGame(state, 480).state;
    expect(state.shelves).toEqual({ fish: 0, kelp: 0, shrimp: 2, crab: 0 });
    expect(sim.ECONOMY.shelves.capacityByProduct).toEqual({ fish: 8, kelp: 8, shrimp: 6, crab: 3 });
  });

  it('enforces fish→kelp→shrimp→crab progression without charging early investments', async () => {
    const sim = await loadSimulation();
    let state = sim.createInitialState(0);
    state.currency = 508;
    state.player = { ...sim.STATIONS.kelpSource };
    state = sim.advanceGame(state, 10_000).state;
    expect(state.currency).toBe(508);
    expect(state.construction.invested).toBe(0);
    state.telemetry.completedOrders = 1;
    state = sim.advanceGame(state, 96 * 220).state;
    expect(state.construction.kelpUnlocked).toBe(true);
    expect(state.currency).toBe(412);

    state.construction = { invested: 96, kelpUnlocked: true };
    state.player = { ...sim.STATIONS.shrimpTrap };
    state = sim.advanceGame(state, 10_000).state;
    expect(state.currency).toBe(412);
    expect(state.facilities.shrimpTrap.invested).toBe(0);

    state.telemetry.completedOrders = 18;
    state = sim.advanceGame(state, 144 * 220).state;
    expect(state.facilities.shrimpTrap.unlocked).toBe(true);
    expect(state.currency).toBe(268);

    state.player = { ...sim.STATIONS.crabPot };
    state = sim.advanceGame(state, 20_000).state;
    expect(state.facilities.crabPot.invested).toBe(0);
    state.progression.completedSalesByProduct.shrimp = 10;
    state = sim.advanceGame(state, 268 * 220).state;
    expect(state.facilities.crabPot.unlocked).toBe(true);
    expect(state.currency).toBe(0);
  });

  it('lets one shrimp waiter substitute once at half patience while crab never substitutes', async () => {
    const sim = await loadSimulation();
    let state = sim.createInitialState(0);
    state.facilities.shrimpTrap.unlocked = true;
    state.facilities.crabPot.unlocked = true;
    state.shelves.fish = 2;
    state = sim.spawnCustomerNow(state, 'shrimp').state;
    state = sim.spawnCustomerNow(state, 'shrimp').state;
    expect(state.customers.map((customer) => customer.product)).toEqual(['shrimp', 'fish']);
    state = sim.advanceGame(state, sim.ECONOMY.customers.browseDurationMs).state;
    state = sim.advanceGame(state, sim.ECONOMY.customers.stockPatienceMs / 2).state;
    expect(state.customers.find((customer) => customer.id === 1)).toMatchObject({
      product: 'fish',
      state: 'checkout',
      substitutionUsed: true,
    });

    state = sim.spawnCustomerNow(state, 'crab').state;
    state = sim.advanceGame(state, sim.ECONOMY.customers.browseDurationMs).state;
    state = sim.advanceGame(state, 7_000).state;
    const crab = state.customers.find((customer) => customer.product === 'crab');
    expect(crab).toMatchObject({ state: 'waitingStock', patienceRemainingMs: 7_000, substitutionUsed: false });
  });

  it('uses the kelp source as the only investment node and unlocks harvesting in place', async () => {
    const sim = await loadSimulation();
    expect(Object.keys(sim.STATIONS)).not.toContain('construction');

    let state = sim.createInitialState(0);
    state.currency = 100;
    state.telemetry.completedOrders = 1;
    state.player = { ...sim.OLD_CONSTRUCTION_LOCATION };
    state = sim.advanceGame(state, 2_200).state;
    expect(state.construction.invested).toBe(0);

    state.player = { ...sim.STATIONS.kelpSource };
    let result = sim.advanceGame(state, 1_100);
    state = result.state;
    expect(state.construction.invested).toBe(5);
    expect(state.currency).toBe(95);

    result = sim.advanceGame(state, 91 * 220);
    state = result.state;
    expect(state.construction).toEqual({ invested: 96, kelpUnlocked: true });
    expect(result.events).toContainEqual({
      type: 'kelpUnlocked',
      x: sim.STATIONS.kelpSource.x,
      y: sim.STATIONS.kelpSource.y,
    });

    const currencyAtUnlock = state.currency;
    state = sim.advanceGame(state, 650).state;
    expect(state.currency).toBe(currencyAtUnlock);
    expect(state.carrying.kelp).toBe(1);
  });

  it('preserves partial kelp investment through normalization', async () => {
    const sim = await loadSimulation();
    const loaded = sim.normalizeSave({
      version: 4,
      currency: 27,
      construction: { invested: 63 },
      shelves: { fish: 4, kelp: 2 },
    }, 4_000);
    expect(loaded.construction).toEqual({ invested: 63, kelpUnlocked: false });
    expect(loaded.currency).toBe(27);
  });

  it('enforces one shared carrying capacity for mixed fish and kelp loads', async () => {
    const sim = await loadSimulation();
    let state = sim.createInitialState(0);
    state.construction = { invested: 96, kelpUnlocked: true };
    state.carrying = { fish: 3, kelp: 0, shrimp: 0, crab: 0 };
    state.player = { ...sim.STATIONS.kelpSource };
    state = sim.advanceGame(state, 1_300).state;
    expect(state.carrying).toEqual({ fish: 3, kelp: 1, shrimp: 0, crab: 0 });

    state.player = { ...sim.STATIONS.fishSource };
    state = sim.advanceGame(state, 1_040).state;
    expect(state.carrying.fish + state.carrying.kelp).toBe(4);

    const legacy = sim.normalizeSave({
      version: 3,
      player: { capacity: 4, inventory: { fish: 3, kelp: 4 } },
      upgrade: { purchases: 0 },
    }, 0);
    expect(legacy.capacity).toBe(8);
    expect(legacy.carrying).toEqual({ fish: 3, kelp: 4, shrimp: 0, crab: 0 });
  });

  it('requires kelp unlock for the 6→8 carrier tier in direct and proximity purchases', async () => {
    const sim = await loadSimulation();
    let state = sim.createInitialState(0);
    state.currency = 200;
    state = sim.purchaseCarrierUpgrade(state).state;
    expect({ capacity: state.capacity, currency: state.currency }).toEqual({ capacity: 6, currency: 160 });

    const directLocked = sim.purchaseCarrierUpgrade(state);
    expect(directLocked.state).toEqual(state);
    expect(directLocked.events).toContainEqual({ type: 'upgradeRejected', reason: 'kelpLocked' });

    state = sim.advanceGame(state, 1_000).state;
    expect({ capacity: state.capacity, currency: state.currency }).toEqual({ capacity: 6, currency: 160 });
    state.construction = { invested: 96, kelpUnlocked: true };
    state = sim.purchaseCarrierUpgrade(state).state;
    expect({ capacity: state.capacity, currency: state.currency }).toEqual({ capacity: 8, currency: 72 });
    const rejected = sim.purchaseCarrierUpgrade(state);
    expect(rejected.state).toEqual(state);
    expect(rejected.events).toContainEqual({ type: 'upgradeRejected', reason: 'max' });
  });

  it('creates product-specific physical shell tokens from the shared economy', async () => {
    const sim = await loadSimulation();
    let state = sim.createInitialState(0);
    let result = sim.completeOrderForTest(state, 'fish');
    state = result.state;
    expect(state.tokens.at(-1)?.value).toBe(sim.ECONOMY.products.fish.saleReward);
    result = sim.completeOrderForTest(state, 'kelp');
    expect(result.state.tokens.at(-1)?.value).toBe(sim.ECONOMY.products.kelp.saleReward);
  });

  it('keeps a served customer in a leaving state until the door exit completes', async () => {
    const sim = await loadSimulation();
    let state = sim.createInitialState(0);
    state.player = { ...sim.STATIONS.checkout };
    state.shelves.fish = 1;
    state = sim.spawnCustomerNow(state, 'fish').state;
    const customer = state.customers[0]!;
    customer.state = 'checkout';
    state.checkoutQueue = [customer.id];
    state = sim.advanceGame(state, sim.ECONOMY.checkout.serviceIntervalMs).state;
    expect(state.customers[0]?.state).toBe('leaving');
    expect(state.checkoutQueue).toEqual([]);
    state = sim.advanceGame(state, 1_199).state;
    expect(state.customers).toHaveLength(1);
    state = sim.advanceGame(state, 1).state;
    expect(state.customers).toHaveLength(0);
  });

  it('keeps the first-spawn delay separate and increases cadence after kelp unlock', async () => {
    const sim = await loadSimulation();
    let state = sim.createInitialState(0);
    state = sim.advanceGame(state, 21_999).state;
    expect(state.customers).toHaveLength(0);
    state = sim.advanceGame(state, 1).state;
    expect(state.customers).toHaveLength(1);
    state = sim.advanceGame(state, 5_500).state;
    expect(state.customers).toHaveLength(2);

    state.construction = { invested: 96, kelpUnlocked: true };
    const progressBefore = state.timers.nextCustomerInMs;
    state = sim.advanceGame(state, progressBefore).state;
    expect(state.customers).toHaveLength(3);
    expect(state.timers.nextCustomerInMs).toBe(4_200);
  });

  it('uses the configured browse duration and lands deterministic first sale in its milestone window', async () => {
    const sim = await loadSimulation();
    expect(sim.ECONOMY.customers.browseDurationMs).toBe(2_400);
    let state = sim.createInitialState(0);
    state.shelves.fish = 1;
    state.player = { ...sim.STATIONS.checkout };
    let firstSaleAt: number | null = null;
    while (state.simulationTimeMs < 40_000 && firstSaleAt === null) {
      const result = sim.advanceGame(state, 20);
      state = result.state;
      if (result.events.some((event) => event.type === 'sale')) firstSaleAt = state.simulationTimeMs;
    }
    expect(firstSaleAt).not.toBeNull();
    expect(firstSaleAt!).toBeGreaterThanOrEqual(25_000);
    expect(firstSaleAt!).toBeLessThanOrEqual(40_000);
  });

  it('hard-stops delivery at 8 and retains carried overflow', async () => {
    const sim = await loadSimulation();
    for (const product of ['fish', 'kelp'] as const) {
      let state = sim.createInitialState(0);
      state.construction = { invested: 96, kelpUnlocked: true };
      state.shelves[product] = 8;
      state.carrying[product] = 2;
      state.player = { ...sim.STATIONS[`${product}Shelf`] };
      state = sim.advanceGame(state, 2_400).state;
      expect(state.shelves[product]).toBe(8);
      expect(state.carrying[product]).toBe(2);
    }

    let boundary = sim.createInitialState(0);
    boundary.shelves.fish = 7;
    boundary.carrying.fish = 2;
    boundary.player = { ...sim.STATIONS.fishShelf };
    boundary = sim.advanceGame(boundary, 480).state;
    expect(boundary.shelves.fish).toBe(8);
    expect(boundary.carrying.fish).toBe(1);
  });

  it('never cross-delivers products and does not bank progress while a shelf is full', async () => {
    const sim = await loadSimulation();
    let state = sim.createInitialState(0);
    state.shelves.fish = 8;
    state.carrying = { fish: 1, kelp: 1, shrimp: 0, crab: 0 };
    state.player = { ...sim.STATIONS.fishShelf };
    state = sim.advanceGame(state, 2_400).state;
    expect(state.timers.delivery.fish).toBe(0);
    expect(state.carrying.kelp).toBe(1);

    state.shelves.fish = 7;
    state = sim.advanceGame(state, 239).state;
    expect(state.shelves.fish).toBe(7);
    state = sim.advanceGame(state, 1).state;
    expect(state.shelves.fish).toBe(8);
    expect(state.carrying.fish).toBe(0);
  });

  it('clamps invalid legacy shelf values without losing unrelated progress', async () => {
    const sim = await loadSimulation();
    const state = sim.normalizeSave({
      version: 4,
      currency: 77,
      shelves: { fish: -4, kelp: 21 },
      construction: { invested: 42 },
    }, 0);
    expect(state.shelves).toEqual({ fish: 0, kelp: 8, shrimp: 0, crab: 0 });
    expect(state.currency).toBe(77);
    expect(state.construction.invested).toBe(42);
  });

  it('keeps queue order, collects physical tokens by proximity, and records local telemetry only once', async () => {
    const sim = await loadSimulation();
    let state = sim.createInitialState(0);
    state.shelves.fish = 2;
    state = sim.spawnCustomerNow(state, 'fish').state;
    state = sim.spawnCustomerNow(state, 'fish').state;
    state = sim.advanceGame(state, sim.ECONOMY.customers.browseDurationMs).state;
    expect(state.checkoutQueue).toEqual([1, 2]);

    state.player = { ...sim.STATIONS.checkout };
    state = sim.advanceGame(state, 1_400).state;
    expect(state.tokens.map((token) => token.value)).toEqual([4, 4]);
    expect(state.telemetry.completedOrders).toBe(2);
    expect(state.currency).toBe(0);

    state = sim.advanceGame(state, 300).state;
    expect(state.currency).toBe(8);
    expect(state.tokens).toHaveLength(0);
    expect(state.telemetry.first.cashCollection).toBeTypeOf('number');
    expect(state.telemetry.networkRequests).toBe(0);
  });

  it('never emits a full-screen camera flash for repeating interactions', async () => {
    const sim = await loadSimulation();
    const state = sim.createInitialState(0);
    state.player = { ...sim.STATIONS.fishSource };
    const result = sim.advanceGame(state, 5_200);
    expect(result.events.some((event) => event.type === 'cameraFlash')).toBe(false);
  });

  it('records every required first-session milestone once with no network dependency', async () => {
    const sim = await loadSimulation();
    let state = sim.createInitialState(0);
    state = sim.movePlayer(state, sim.STATIONS.fishSource).state;
    state = sim.advanceGame(state, 520).state;
    state.player = { ...sim.STATIONS.fishShelf };
    state = sim.advanceGame(state, 240).state;
    state = sim.completeOrderForTest(state, 'fish').state;
    state.player = { ...sim.STATIONS.checkout };
    state = sim.advanceGame(state, 300).state;
    state.currency = 200;
    state.player = { ...sim.STATIONS.kelpSource };
    state = sim.advanceGame(state, 96 * 220).state;
    state = sim.purchaseCarrierUpgrade(state).state;
    expect(state.telemetry.first).toMatchObject({
      move: expect.any(Number),
      pickup: expect.any(Number),
      stock: expect.any(Number),
      sale: expect.any(Number),
      cashCollection: expect.any(Number),
      buildInvestment: expect.any(Number),
      unlock: expect.any(Number),
      upgrade: expect.any(Number),
    });
    expect(state.telemetry.networkRequests).toBe(0);
    expect(state.telemetry.movementDistance).toBeGreaterThan(0);
  });
});
