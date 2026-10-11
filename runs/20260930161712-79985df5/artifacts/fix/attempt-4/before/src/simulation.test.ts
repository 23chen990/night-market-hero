import { describe, expect, it } from 'vitest';
import generatedConfig from './generated/game-config.json';
import {
  advanceGame,
  continueRound,
  createInitialState,
  DEFAULT_CHECKOUT_PACKING_MS,
  restartRound,
  setPlayerPosition,
  spawnCustomer,
  type GameState,
  type SpatialShopConfig,
} from './simulation.js';

const shop = generatedConfig.spatialShop as SpatialShopConfig;

describe('generated spatial shop core', () => {
  it('collects and deposits the configured product', () => {
    const producer = shop.stations.find((station) => station.kind === 'producer' && station.initiallyUnlocked);
    const shelf = shop.stations.find((station) => station.kind === 'shelf' && station.initiallyUnlocked);
    expect(producer?.kind).toBe('producer');
    expect(shelf?.kind).toBe('shelf');
    if (producer?.kind !== 'producer' || shelf?.kind !== 'shelf') return;

    let state = createInitialState(shop);
    state = setPlayerPosition(state, producer.position);
    state = advanceGame(shop, state, shop.player.pickupIntervalMs + 10);
    expect(state.player.inventory[producer.outputProductId]).toBe(1);

    state = setPlayerPosition(state, shelf.position);
    state = advanceGame(shop, state, shop.player.depositIntervalMs + 10);
    expect(state.stations[shelf.id]?.stock[producer.outputProductId]).toBe(1);
  });

  it('is deterministic for equal state, input, and duration', () => {
    const initial = createInitialState(shop);
    expect(advanceGame(shop, initial, 1_000, { x: 1, y: 0 })).toEqual(advanceGame(shop, initial, 1_000, { x: 1, y: 0 }));
  });

  it('never asks for a product before its producer and shelf are unlocked', () => {
    let state = createInitialState(shop);
    for (let index = 0; index < 64; index += 1) state = spawnCustomer(shop, state);
    expect(state.customers.every((customer) => state.unlockedStationIds.includes(customer.targetShelfId))).toBe(true);
    expect(state.customers.every((customer) => {
      const shelf = shop.stations.find((station) => station.id === customer.targetShelfId);
      return shelf?.kind !== 'shelf' || shelf.acceptsProductIds.includes(customer.productId);
    })).toBe(true);
  });

  it('starts the patience clock only after the customer reaches an empty shelf', () => {
    const shelf = shop.stations.find((station) => station.id === 'fish-shelf');
    expect(shelf?.kind).toBe('shelf');
    if (shelf?.kind !== 'shelf') return;
    let state = createInitialState(shop);
    state.customers = [{
      id: 1,
      x: shelf.position.x - 4,
      y: shelf.position.y,
      phase: 'to-shelf',
      productId: 'fresh-fish',
      targetShelfId: shelf.id,
      patienceRemainingMs: shop.customers.patienceMs,
      basketValue: 0,
      queuePosition: null,
      queueTicket: null,
    }];
    state.nextCustomerId = 2;

    state = advanceGame(shop, state, 50);
    expect(state.customers[0]?.phase).toBe('waiting-shelf');
    expect(state.customers[0]?.patienceRemainingMs).toBe(shop.customers.patienceMs);

    state = advanceGame(shop, state, 7_999);
    expect(state.customers[0]?.phase).toBe('waiting-shelf');
    state = advanceGame(shop, state, 1);
    expect(state.customers[0]?.phase).toBe('leaving');
  });

  it('does not pay while moving, then pays in stationary intervals only', () => {
    const construction = shop.stations.find((station) => station.id === 'kelp-build');
    expect(construction?.kind).toBe('construction');
    if (construction?.kind !== 'construction') return;
    let state = createInitialState(shop);
    state.currency = 3;
    state = setPlayerPosition(state, construction.position);
    const moving = advanceGame(shop, state, construction.contributionIntervalMs * 2, { x: 1, y: 0 });
    expect(moving.currency).toBe(3);
    expect(moving.stations[construction.id]?.contributed).toBe(0);
    const stopped = advanceGame(shop, setPlayerPosition(moving, construction.position), construction.contributionIntervalMs);
    expect(stopped.currency).toBe(2);
    expect(stopped.stations[construction.id]?.contributed).toBe(1);
  });

  it('assigns unique queue slots and moves the next customer to the head after service', () => {
    const checkout = shop.stations.find((station) => station.id === 'checkout');
    expect(checkout?.kind).toBe('checkout');
    if (checkout?.kind !== 'checkout') return;
    let state = createInitialState(shop);
    state.customers = [1, 2].map((id) => ({
      id,
      x: checkout.position.x - 1_000,
      y: checkout.position.y + 40,
      phase: 'to-checkout' as const,
      productId: 'fresh-fish',
      targetShelfId: 'fish-shelf',
      patienceRemainingMs: shop.customers.patienceMs,
      basketValue: 2,
      queuePosition: null,
      queueTicket: id,
    }));
    state.nextCustomerId = 3;

    const assigned = advanceGame(shop, state, 50);
    expect(assigned.customers[0]?.queuePosition).not.toEqual(assigned.customers[1]?.queuePosition);

    state = advanceGame(shop, assigned, 8_000);
    expect(state.customers.filter((customer) => customer.phase === 'queued')).toHaveLength(2);
    const headY = checkout.position.y + 40;
    state = setPlayerPosition(state, checkout.position);
    state = advanceGame(shop, state, checkout.serviceMs + 50);
    const remaining = state.customers.find((customer) => customer.phase === 'queued');
    expect(remaining?.queuePosition?.y).toBe(headY);
  });

  it('does not let a later queued customer overtake an earlier ticket still walking to checkout', () => {
    const checkout = shop.stations.find((station) => station.id === 'checkout');
    expect(checkout?.kind).toBe('checkout');
    if (checkout?.kind !== 'checkout') return;
    let state = createInitialState(shop);
    state.customers = [
      {
        id: 1,
        x: checkout.position.x - 1_000,
        y: checkout.position.y + 40,
        phase: 'to-checkout',
        productId: 'fresh-fish',
        targetShelfId: 'fish-shelf',
        patienceRemainingMs: shop.customers.patienceMs,
        basketValue: 2,
        queuePosition: { x: checkout.position.x, y: checkout.position.y + 40 },
        queueTicket: 1,
      },
      {
        id: 2,
        x: checkout.position.x,
        y: checkout.position.y + 80,
        phase: 'queued',
        productId: 'fresh-fish',
        targetShelfId: 'fish-shelf',
        patienceRemainingMs: shop.customers.patienceMs,
        basketValue: 2,
        queuePosition: { x: checkout.position.x, y: checkout.position.y + 80 },
        queueTicket: 2,
      },
    ];
    state.checkout.queue = 1;
    state = setPlayerPosition(state, checkout.position);

    state = advanceGame(shop, state, checkout.serviceMs + 50);

    expect(state.customers.find((customer) => customer.id === 1)?.phase).toBe('to-checkout');
    expect(state.customers.find((customer) => customer.id === 2)?.phase).toBe('queued');
    expect(state.cashPile).toBe(0);
    expect(state.feedback.some((event) => event.kind === 'checkout-pack')).toBe(false);
  });

  it('keeps service money on the counter until the player collects it', () => {
    const checkout = shop.stations.find((station) => station.id === 'checkout');
    expect(checkout?.kind).toBe('checkout');
    if (checkout?.kind !== 'checkout') return;
    let state = createInitialState(shop);
    state.customers = [{
      id: 1,
      x: checkout.position.x,
      y: checkout.position.y + 40,
      phase: 'queued',
      productId: 'fresh-fish',
      targetShelfId: 'fish-shelf',
      patienceRemainingMs: shop.customers.patienceMs,
      basketValue: 2,
      queuePosition: { x: checkout.position.x, y: checkout.position.y + 40 },
      queueTicket: 1,
    }];
    state.checkout.queue = 1;
    state = setPlayerPosition(state, checkout.position);
    state = advanceGame(shop, state, checkout.serviceMs + DEFAULT_CHECKOUT_PACKING_MS + 50);
    expect(state.currency).toBe(0);
    expect(state.cashPile).toBe(2);
    state = advanceGame(shop, setPlayerPosition(state, { x: 0, y: 0 }), 50);
    expect(state.currency).toBe(0);
    state = advanceGame(shop, setPlayerPosition(state, checkout.position), 50);
    expect(state.currency).toBe(2);
    expect(state.cashPile).toBe(0);
  });

  it('shows a packing phase before service cash reaches the counter', () => {
    const checkout = shop.stations.find((station) => station.id === 'checkout');
    expect(checkout?.kind).toBe('checkout');
    if (checkout?.kind !== 'checkout') return;
    let state = createInitialState(shop);
    state.customers = [{
      id: 1,
      x: checkout.position.x,
      y: checkout.position.y + 40,
      phase: 'queued',
      productId: 'fresh-fish',
      targetShelfId: 'fish-shelf',
      patienceRemainingMs: shop.customers.patienceMs,
      basketValue: 2,
      queuePosition: { x: checkout.position.x, y: checkout.position.y + 40 },
      queueTicket: 1,
    }];
    state.checkout.queue = 1;
    state = setPlayerPosition(state, checkout.position);

    state = advanceGame(shop, state, checkout.serviceMs);
    expect(state.customers[0]?.phase).toBe('packing');
    expect(state.customers[0]?.packingRemainingMs).toBe(DEFAULT_CHECKOUT_PACKING_MS);
    expect(state.cashPile).toBe(0);
    expect(state.currency).toBe(0);
    expect(state.feedback.at(-1)?.kind).toBe('checkout-packing');

    state = advanceGame(shop, state, DEFAULT_CHECKOUT_PACKING_MS - 50);
    expect(state.customers[0]?.phase).toBe('packing');
    expect(state.cashPile).toBe(0);

    state = advanceGame(shop, state, 100);
    expect(state.customers[0]?.phase).toBe('leaving');
    expect(state.cashPile).toBe(2);
    expect(state.currency).toBe(0);
    expect(state.feedback.at(-1)?.kind).toBe('checkout-pack');

    state = advanceGame(shop, setPlayerPosition(state, { x: 0, y: 0 }), 50);
    state = advanceGame(shop, setPlayerPosition(state, checkout.position), 50);
    expect(state.cashPile).toBe(0);
    expect(state.currency).toBe(2);
    expect(state.feedback.at(-1)?.kind).toBe('cash-collect');
  });

  it('enters settlement after construction and supports continue and restart', () => {
    const construction = shop.stations.find((station) => station.id === 'kelp-build');
    expect(construction?.kind).toBe('construction');
    if (construction?.kind !== 'construction') return;
    let state = createInitialState(shop);
    state.currency = construction.cost;
    state = setPlayerPosition(state, construction.position);
    state = advanceGame(shop, state, construction.contributionIntervalMs * construction.cost);
    expect(state.stations[construction.id]?.completed).toBe(true);
    expect(state.stage).toBe('settlement');
    expect(state.unlockedStationIds).toEqual(expect.arrayContaining(construction.unlockStationIds));

    const continued = continueRound(state);
    expect(continued.stage).toBe('operating');
    expect(continued.stations[construction.id]?.completed).toBe(true);
    const restarted = restartRound(shop, continued);
    expect(restarted.stage).toBe('operating');
    expect(restarted.stations[construction.id]?.completed).toBe(false);
    expect(restarted.unlockedStationIds).not.toContain('kelp-pool');
  });

  it('restart returns a clean feedback state for presentation replay', () => {
    const initial = createInitialState(shop);
    initial.feedback = [{
      id: 1,
      kind: 'construction-complete',
      atMs: 100,
      source: { x: 410, y: 720 },
      target: { x: 410, y: 720 },
    }];
    initial.feedbackEvents = 1;
    initial.stage = 'settlement';

    const restarted = restartRound(shop, initial);

    expect(restarted.stage).toBe('operating');
    expect(restarted.feedback).toEqual([]);
    expect(restarted.feedbackEvents).toBe(0);
  });

  it('records the selected next market while preserving the operating progression', () => {
    const settled = createInitialState(shop);
    settled.stage = 'settlement';

    const continued = continueRound(settled, 'coral-cove-market');

    expect(continued.stage).toBe('operating');
    expect(continued.nextMarketId).toBe('coral-cove-market');
    expect(restartRound(shop, continued).nextMarketId).toBeNull();
  });

  it('keeps the feedback trail attributable to each local action', () => {
    const producer = shop.stations.find((station) => station.id === 'net');
    const shelf = shop.stations.find((station) => station.id === 'fish-shelf');
    expect(producer?.kind).toBe('producer');
    expect(shelf?.kind).toBe('shelf');
    if (producer?.kind !== 'producer' || shelf?.kind !== 'shelf') return;
    let state: GameState = createInitialState(shop);
    state = setPlayerPosition(state, producer.position);
    state = advanceGame(shop, state, shop.player.pickupIntervalMs + 10);
    expect(state.feedback.at(-1)?.kind).toBe('pickup');
    state = setPlayerPosition(state, shelf.position);
    state = advanceGame(shop, state, shop.player.depositIntervalMs + 10);
    expect(state.feedback.at(-1)?.kind).toBe('deposit');
  });
});
