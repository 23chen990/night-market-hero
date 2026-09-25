import { describe, expect, it } from 'vitest';
import {
  advanceGame,
  activateDeliveryInstant,
  createDeliveryOrder,
  createInitialState,
  hireEmployee,
  normalizeSave,
  type DeliveryOrder,
} from '../src/game/simulation';

describe('delivery loop', () => {
  it('moves a queued order through pickup, transit, completion and income', () => {
    let state = createInitialState(0);
    state.shelves.fish = 1;
    state = hireEmployee(state, 'courier').state;
    const queued = createDeliveryOrder(state, 'fish');
    state = queued.state;
    expect(state.delivery.orders[0]).toMatchObject<Partial<DeliveryOrder>>({ product: 'fish', phase: 'queued', quantity: 1 });

    state = advanceGame(state, 1).state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 1).state;
    const pickup = advanceGame(state, 700);
    expect(pickup.events.some((event) => event.type === 'deliveryPickedUp')).toBe(true);
    expect(pickup.state.shelves.fish).toBe(0);
    expect(pickup.state.delivery.orders[0]?.phase).toBe('inTransit');

    const completed = advanceGame(pickup.state, 700);
    expect(completed.events.some((event) => event.type === 'deliveryCompleted')).toBe(true);
    expect(completed.state.delivery.orders).toHaveLength(0);
    expect(completed.state.currency).toBe(4);
  });

  it('round-trips an in-transit order without losing its progress', () => {
    let state = createInitialState(0);
    state.shelves.kelp = 1;
    state = hireEmployee(state, 'courier').state;
    state = createDeliveryOrder(state, 'kelp').state;
    state = advanceGame( state, 1).state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 700).state;
    const restored = normalizeSave(state, 0);
    expect(restored.delivery.orders[0]).toMatchObject({ product: 'kelp', phase: 'inTransit' });
  });

  it('completes the next pickup immediately while the rewarded instant window is active', () => {
    let state = createInitialState(0);
    state.shelves.fish = 1;
    state = hireEmployee(state, 'courier').state;
    state = createDeliveryOrder(state, 'fish').state;
    state = activateDeliveryInstant(state, 30_000).state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 1).state;
    const result = advanceGame(state, 1);
    expect(result.events.map((event) => event.type)).toEqual(expect.arrayContaining(['deliveryPickedUp', 'deliveryCompleted']));
    expect(result.state.delivery.orders).toHaveLength(0);
    expect(result.state.currency).toBe(4);
  });
});
