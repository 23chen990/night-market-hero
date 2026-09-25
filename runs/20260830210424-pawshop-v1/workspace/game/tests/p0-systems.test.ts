import { describe, expect, it } from 'vitest';
import {
  advanceGame,
  createInitialState,
  hireEmployee,
  setEmployeeWake,
  upgradeEmployee,
  type EmployeeRole,
} from '../src/game/simulation';
import { GamePersistence, SAVE_KEY } from '../src/game/persistence';

describe('P0 employee automation', () => {
  it('runs an employee through explicit FSM states and fatigue recovery', () => {
    let state = createInitialState(0);
    const hired = hireEmployee(state, 'fisher');
    state = hired.state;
    expect(state.employees[0]).toMatchObject({ role: 'fisher', status: 'idle', level: 1 });
    state = advanceGame(state, 1).state;
    expect(state.employees[0]?.status).toBe('findTask');
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 2_000).state;
    expect(['selectTarget', 'moveToTarget', 'work', 'rest']).toContain(state.employees[0]?.status);
    state = setEmployeeWake(state, state.employees[0]!.id).state;
    expect(state.employees[0]?.status).toBe('work');
  });

  it('upgrades an employee without relying on unverified economy values', () => {
    let state = createInitialState(0);
    state = hireEmployee(state, 'porter').state;
    const result = upgradeEmployee(state, state.employees[0]!.id);
    expect(result.state.employees[0]).toMatchObject({ level: 2 });
    expect(result.events[0]?.type).toBe('employeeUpgraded');
  });
});

describe('P0 multi-item orders and persistence', () => {
  it('serves all requested items atomically and records satisfaction', async () => {
    const sim = await import('../src/game/simulation');
    let state = createInitialState(0);
    state.shelves.fish = 2;
    state.shelves.kelp = 1;
    const spawned = sim.spawnCustomerNow(state, { fish: 2, kelp: 1 });
    state = spawned.state;
    state = advanceGame(state, sim.ECONOMY.customers.browseDurationMs).state;
    expect(state.customers[0]).toMatchObject({ state: 'checkout' });
    expect(state.shelves).toEqual({ fish: 0, kelp: 0, shrimp: 0, crab: 0 });
    state.player = { ...sim.STATIONS.checkout };
    state = advanceGame(state, sim.ECONOMY.checkout.serviceIntervalMs).state;
    expect(state.telemetry.completedOrders).toBe(1);
    expect(state.customers[0]?.state).toBe('leaving');
    state = advanceGame(state, 1_500).state;
    expect(state.customers).toHaveLength(0);
  });

  it('round-trips employee and order state through the versioned save', () => {
    const memory = new Map<string, string>();
    const storage: Storage = {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
      removeItem: (key) => void memory.delete(key),
      clear: () => memory.clear(),
      key: (index) => [...memory.keys()][index] ?? null,
      get length() { return memory.size; },
    };
    const persistence = new GamePersistence(storage, () => 0, 0);
    let state = createInitialState(0);
    state = hireEmployee(state, 'courier').state;
    persistence.flush(state);
    expect(JSON.parse(memory.get(SAVE_KEY)!).employees).toHaveLength(1);
    expect(persistence.load().employees[0]?.role as EmployeeRole).toBe('courier');
  });
});
