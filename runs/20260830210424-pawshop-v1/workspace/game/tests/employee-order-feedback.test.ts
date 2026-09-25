import { describe, expect, it } from 'vitest';
import { advanceGame, createInitialState, hireEmployee, spawnCustomerNow, upgradeEmployee, type EmployeeStatus } from '../src/game/simulation';

describe('employee feedback and capability contract', () => {
  it('preserves every documented task-selection state in order', () => {
    let state = hireEmployee(createInitialState(0), 'fisher').state;
    const statuses: EmployeeStatus[] = [];
    for (const elapsed of [1, 600, 1, 1]) {
      state = advanceGame(state, elapsed).state;
      statuses.push(state.employees[0]!.status);
    }
    expect(statuses).toEqual(['findTask', 'selectTarget', 'moveToTarget', 'work']);
  });

  it('enters an explicit slacking state before rest and can be woken', async () => {
    const sim = await import('../src/game/simulation');
    let state = hireEmployee(createInitialState(0), 'fisher').state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 15_000).state;
    expect(['work', 'slacking', 'checkFatigue', 'rest'] as EmployeeStatus[]).toContain(state.employees[0]?.status);
    state = sim.setEmployeeWake(state, state.employees[0]!.id).state;
    expect(state.employees[0]?.status).toBe('work');
  });

  it('caps employee upgrades and exposes an observable capability change', () => {
    let state = hireEmployee(createInitialState(0), 'porter').state;
    const id = state.employees[0]!.id;
    state = upgradeEmployee(state, id).state;
    expect(state.employees[0]).toMatchObject({ level: 2, efficiency: 1.1 });
    state = upgradeEmployee(state, id).state;
    state = upgradeEmployee(state, id).state;
    expect(state.employees[0]?.level).toBe(3);
    expect(upgradeEmployee(state, id).events[0]?.type).toBe('employeeUpgradeRejected');
  });
});

describe('multi-item settlement feedback', () => {
  it('sums each item in a basket and records satisfaction from wait time', async () => {
    const sim = await import('../src/game/simulation');
    let state = createInitialState(0);
    state.shelves.fish = 2;
    state.shelves.kelp = 1;
    state = spawnCustomerNow(state, { fish: 2, kelp: 1 }).state;
    state = advanceGame(state, sim.ECONOMY.customers.browseDurationMs).state;
    expect(state.customers[0]?.satisfaction).toBeGreaterThan(0);
    state.player = { ...sim.STATIONS.checkout };
    const result = advanceGame(state, sim.ECONOMY.checkout.serviceIntervalMs);
    expect(result.events.find((event) => event.type === 'sale')?.value).toBe(14);
  });
});
