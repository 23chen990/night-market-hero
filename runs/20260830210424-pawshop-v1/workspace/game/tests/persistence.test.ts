import { describe, expect, it } from 'vitest';
import { loadContract } from './contracts';

type Persistence = typeof import('../src/game/persistence');
type Simulation = typeof import('../src/game/simulation');

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>();
  writes = 0;
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.writes += 1; this.values.set(key, value); }
}

describe('versioned refresh recovery', () => {
  it('migrates save-v4 to save-v5 while preserving in-flight state and defaulting new fields', async () => {
    const persistence = await loadContract<Persistence>(() => import('../src/game/persistence'), 'persistence');
    const storage = new MemoryStorage();
    storage.setItem(persistence.PREVIOUS_SAVE_KEY, JSON.stringify({
      version: 4,
      currency: 73,
      capacityTier: 1,
      capacity: 6,
      carrying: { fish: 2, kelp: 1 },
      shelves: { fish: 5, kelp: 4 },
      construction: { invested: 96, kelpUnlocked: true },
      player: { x: 270, y: 696 },
      customers: [{ id: 4, product: 'kelp', state: 'checkout', browseRemainingMs: 0, patienceRemainingMs: 8_000 }],
      checkoutQueue: [4],
      tokens: [{ id: 9, value: 4, x: 270, y: 730, pickupRemainingMs: 120 }],
      nextCustomerId: 5,
      nextTokenId: 10,
      randomSeed: 123,
      simulationTimeMs: 31_400,
      telemetry: { completedOrders: 22 },
      savedAtMs: 5_000,
    }));
    const state = new persistence.GamePersistence(storage, () => 5_000).load();
    expect(state.version).toBe(5);
    expect(state.currency).toBe(73);
    expect(state.carrying).toEqual({ fish: 2, kelp: 1, shrimp: 0, crab: 0 });
    expect(state.shelves).toEqual({ fish: 5, kelp: 4, shrimp: 0, crab: 0 });
    expect(state.customers).toHaveLength(1);
    expect(state.checkoutQueue).toEqual([4]);
    expect(state.tokens).toHaveLength(1);
    expect(state.facilities.shrimpTrap).toMatchObject({ unlocked: false, invested: 0, buffer: 0 });
    expect(state.facilities.crabPot).toMatchObject({ unlocked: false, invested: 0, readyCount: 0, readyCapacity: 1 });
    expect(state.progression.totalCompletedSales).toBe(22);
    expect(storage.getItem(persistence.SAVE_KEY)).not.toBeNull();
  });

  it('clamps v5 facility timers and buffers and never produces traps during refresh recovery', async () => {
    const persistence = await loadContract<Persistence>(() => import('../src/game/persistence'), 'persistence');
    const storage = new MemoryStorage();
    storage.setItem(persistence.SAVE_KEY, JSON.stringify({
      version: 5,
      facilities: {
        shrimpTrap: { unlocked: true, invested: 144, buffer: 99, soakRemainingMs: 99_000 },
        crabPot: { unlocked: true, invested: 268, readyCount: 99, readyCapacity: 99, latchRemainingMs: 99_000 },
      },
      facilityUpgrades: { crabPotReadyCapacity: true },
      savedAtMs: 1_000,
    }));
    const state = new persistence.GamePersistence(storage, () => 51_000).load();
    expect(state.facilities.shrimpTrap.buffer).toBe(4);
    expect(state.facilities.shrimpTrap.soakRemainingMs).toBeLessThanOrEqual(4_200);
    expect(state.facilities.crabPot.readyCount).toBe(2);
    expect(state.facilities.crabPot.readyCapacity).toBe(2);
    expect(state.facilities.crabPot.latchRemainingMs).toBeLessThanOrEqual(10_400);
  });

  it('round-trips production progress from save-v4 and advances an in-flight pickup after refresh', async () => {
    const persistence = await loadContract<Persistence>(() => import('../src/game/persistence'), 'persistence');
    const sim = await loadContract<Simulation>(() => import('../src/game/simulation'), 'game simulation');
    const storage = new MemoryStorage();
    let now = 10_000;
    const saves = new persistence.GamePersistence(storage, () => now);
    const state = sim.createInitialState(now);
    state.player = { ...sim.STATIONS.fishSource };
    state.timers.harvest.fish = 320;
    state.currency = 12;
    saves.flush(state);

    now += 250;
    const refreshed = new persistence.GamePersistence(storage, () => now).load();
    expect(refreshed.version).toBe(persistence.CURRENT_SAVE_VERSION);
    expect(refreshed.currency).toBe(12);
    expect(refreshed.carrying.fish).toBe(1);
    expect(refreshed.timers.harvest.fish).toBe(50);
  });

  it('migrates the real seaside-v4 key and nested player shape to the V5 save key', async () => {
    const persistence = await loadContract<Persistence>(() => import('../src/game/persistence'), 'persistence');
    const storage = new MemoryStorage();
    storage.setItem(persistence.LEGACY_SAVE_KEY, JSON.stringify({
      version: 3,
      currency: 55,
      player: { capacity: 6, inventory: { fish: 2, kelp: 3 } },
      upgrade: { purchases: 1 },
      construction: { invested: 6, required: 12, unlocked: false },
      shelves: { fish: 5, kelp: 2 },
      savedAtMs: 2_000,
    }));
    const state = new persistence.GamePersistence(storage, () => 2_000).load();
    expect(state.version).toBe(5);
    expect(state.currency).toBe(55);
    expect(state.capacity).toBe(6);
    expect(state.carrying).toEqual({ fish: 2, kelp: 3, shrimp: 0, crab: 0 });
    expect(state.construction.invested).toBe(48);
    expect(storage.getItem(persistence.SAVE_KEY)).not.toBeNull();
  });

  it('maps an unlocked legacy tide pool to 96/96', async () => {
    const sim = await loadContract<Simulation>(() => import('../src/game/simulation'), 'game simulation');
    const state = sim.normalizeSave({
      version: 3,
      construction: { invested: 3, required: 12, unlocked: true },
    }, 0);
    expect(state.construction).toEqual({ invested: 96, kelpUnlocked: true });
  });

  it('chooses the smallest legal tier that preserves legacy mixed inventory up to eight', async () => {
    const sim = await loadContract<Simulation>(() => import('../src/game/simulation'), 'game simulation');
    const state = sim.normalizeSave({
      version: 3,
      player: { capacity: 4, inventory: { fish: 3, kelp: 4 } },
      upgrade: { purchases: 0 },
    }, 0);
    expect(state.capacity).toBe(8);
    expect(state.carrying).toEqual({ fish: 3, kelp: 4, shrimp: 0, crab: 0 });

    const aboveMaximum = sim.normalizeSave({
      version: 3,
      player: { capacity: 8, inventory: { fish: 4, kelp: 6 } },
      upgrade: { purchases: 2 },
    }, 0);
    expect(aboveMaximum.capacity).toBe(8);
    expect(aboveMaximum.carrying.fish + aboveMaximum.carrying.kelp).toBe(8);
  });

  it('migrates real V4 in-flight customers, checkout queue, and shell tokens', async () => {
    const persistence = await loadContract<Persistence>(() => import('../src/game/persistence'), 'persistence');
    const storage = new MemoryStorage();
    storage.setItem(persistence.LEGACY_SAVE_KEY, JSON.stringify({
      version: 3,
      elapsedMs: 31_400,
      currency: 19,
      player: { capacity: 6, inventory: { fish: 1, kelp: 2 }, x: 270, y: 696 },
      upgrade: { purchases: 1 },
      construction: { invested: 12, required: 12, kelpUnlocked: true },
      shelves: { fish: 4, kelp: 3 },
      customers: [
        { id: 7, productId: 'fish', phase: 'waiting-stock', patienceRemainingMs: 4_200, basketValue: 0, x: 132, y: 540 },
        { id: 8, productId: 'kelp', phase: 'queued', patienceRemainingMs: 8_000, basketValue: 6, x: 270, y: 650 },
        { id: 9, productId: 'fish', phase: 'to-shelf', patienceRemainingMs: 9_000, basketValue: 0, x: 80, y: 470 },
        { id: 10, productId: 'fish', phase: 'left', patienceRemainingMs: 0, basketValue: 4, x: 518, y: 690 },
      ],
      checkout: { queue: [8], serviceProgressMs: 350 },
      shellTokens: [
        { id: 21, value: 6, ageMs: 120, x: 270, y: 730 },
      ],
      nextCustomerId: 11,
      nextTokenId: 22,
      savedAtMs: 5_000,
    }));

    const state = new persistence.GamePersistence(storage, () => 5_000).load();
    expect(state.customers.map(({ id, product, state: phase }) => ({ id, product, phase }))).toEqual([
      { id: 7, product: 'fish', phase: 'waitingStock' },
      { id: 8, product: 'kelp', phase: 'checkout' },
      { id: 9, product: 'fish', phase: 'shopping' },
    ]);
    expect(state.customers[0]?.patienceRemainingMs).toBe(4_200);
    expect(state.checkoutQueue).toEqual([8]);
    expect(state.timers.checkout).toBe(350);
    expect(state.tokens).toEqual([{ id: 21, value: 6, x: 270, y: 730, pickupRemainingMs: 180 }]);
    expect(state.simulationTimeMs).toBe(31_400);
    expect(state.nextCustomerId).toBe(11);
    expect(state.nextTokenId).toBe(22);
  });

  it('restores a customer waiting countdown instead of resetting patience on refresh', async () => {
    const persistence = await loadContract<Persistence>(() => import('../src/game/persistence'), 'persistence');
    const sim = await loadContract<Simulation>(() => import('../src/game/simulation'), 'game simulation');
    const storage = new MemoryStorage();
    let now = 40_000;
    const saves = new persistence.GamePersistence(storage, () => now);
    let state = sim.createInitialState(now);
    state = sim.spawnCustomerNow(state, 'fish').state;
    state = sim.advanceGame(state, sim.ECONOMY.customers.browseDurationMs).state;
    expect(state.customers[0]?.state).toBe('waitingStock');
    state.customers[0]!.patienceRemainingMs = 6_000;
    saves.flush(state);

    now += 2_500;
    const refreshed = new persistence.GamePersistence(storage, () => now).load();
    expect(refreshed.customers[0]?.state).toBe('waitingStock');
    expect(refreshed.customers[0]?.patienceRemainingMs).toBe(3_500);
  });

  it('throttles time-driven saves but flushes key progress immediately', async () => {
    const persistence = await loadContract<Persistence>(() => import('../src/game/persistence'), 'persistence');
    const sim = await loadContract<Simulation>(() => import('../src/game/simulation'), 'game simulation');
    const storage = new MemoryStorage();
    let now = 0;
    const saves = new persistence.GamePersistence(storage, () => now, 1_000);
    const state = sim.createInitialState(now);
    saves.tick(state);
    now = 400;
    saves.tick(state);
    now = 1_000;
    saves.tick(state);
    expect(storage.writes).toBe(2);
    saves.keyChange(state);
    expect(storage.writes).toBe(3);
  });
});
