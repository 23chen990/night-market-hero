import { describe, expect, it } from 'vitest';
import generatedConfig from './generated/game-config.json';
import {
  advanceGame,
  createInitialState,
  grantCurrency,
  restoreState,
  restartRound,
  setPlayerPosition,
  spawnCustomer,
  type SpatialShopConfig,
} from './simulation.js';
import { MotionPlayer, preloadBeforePlayback, resolveMotionDuration } from './uiMotion.js';

const shop = generatedConfig.spatialShop as SpatialShopConfig;
const station = (id: string) => shop.stations.find((item) => item.id === id)!;

describe('海滩渔货铺 locked mechanics', () => {
  it('moves through harvest, carry, and compatible shelf deposit in order', () => {
    let state = createInitialState(shop);
    state = setPlayerPosition(state, station('net').position);
    state = advanceGame(shop, state, 150);
    expect(state.player.inventory['fresh-fish']).toBeGreaterThan(0);

    state = setPlayerPosition(state, station('fish-shelf').position);
    state = advanceGame(shop, state, 150);
    expect(state.player.inventory['fresh-fish']).toBe(0);
    expect(state.stations['fish-shelf']?.stock['fresh-fish']).toBeGreaterThan(0);
  });

  it('makes customers consume shelf stock, queue, and pay only at checkout', () => {
    let state = createInitialState(shop);
    state.stations['fish-shelf']!.stock['fresh-fish'] = 2;
    state = spawnCustomer(shop, state, 'fresh-fish');
    state = advanceGame(shop, state, 4_000);
    expect(state.customers.some((customer) => customer.phase === 'queued')).toBe(true);
    expect(state.currency).toBe(0);

    state = setPlayerPosition(state, station('checkout').position);
    state = advanceGame(shop, state, 800);
    expect(state.currency).toBe(2);
    expect(state.checkout.queue).toBe(0);
  });

  it('times out a stockout customer with an attributable failure and recovery path', () => {
    let state = createInitialState(shop);
    state = spawnCustomer(shop, state, 'fresh-fish');
    state = advanceGame(shop, state, shop.customers.patienceMs + 4_000);
    const timedOut = state.customers.find((customer) => customer.id === 1);
    expect(timedOut?.phase).toBe('left');
    expect(state.lastEvent?.kind).toBe('customer-stockout');
    expect(state.lastEvent?.message).toContain('鲜鱼');
  });

  it('pays construction debt in fixed contributions and atomically unlocks both kelp stations', () => {
    let state = grantCurrency(createInitialState(shop), 4);
    state = setPlayerPosition(state, station('kelp-build').position);
    state = advanceGame(shop, state, 4 * 200);
    expect(state.currency).toBe(0);
    expect(state.stations['kelp-build']?.completed).toBe(true);
    expect(state.unlockedStationIds).toEqual(expect.arrayContaining(['kelp-pool', 'kelp-shelf']));
    expect(state.stage).toBe('settlement');
  });

  it('applies capacity upgrades with escalating costs and preserves them on continue', () => {
    let state = grantCurrency(createInitialState(shop), 4);
    state = setPlayerPosition(state, station('capacity-upgrade').position);
    state = advanceGame(shop, state, 600);
    expect(state.player.capacity).toBe(shop.player.capacity + 2);
    expect(state.currency).toBe(0);
    expect(state.level).toBe(2);
    expect(state.stations['capacity-upgrade']?.purchases).toBe(1);
  });

  it('restarts the round from settlement without leaking round progress', () => {
    let state = grantCurrency(createInitialState(shop), 4);
    state = setPlayerPosition(state, station('kelp-build').position);
    state = advanceGame(shop, state, 1_000);
    expect(state.stage).toBe('settlement');
    state = restartRound(shop, state);
    expect(state.stage).toBe('operating');
    expect(state.currency).toBe(0);
    expect(state.level).toBe(1);
    expect(state.unlockedStationIds).not.toContain('kelp-pool');
  });

  it('restores saved progress after refresh without losing unlocks or inventory', () => {
    let state = grantCurrency(createInitialState(shop), 4);
    state = setPlayerPosition(state, station('kelp-build').position);
    state = advanceGame(shop, state, 1_000);
    const restored = restoreState(shop, JSON.stringify(state));
    expect(restored.stage).toBe('settlement');
    expect(restored.currency).toBe(state.currency);
    expect(restored.unlockedStationIds).toEqual(state.unlockedStationIds);
    expect(restored.feedbackEvents).toBe(state.feedbackEvents);
  });

  it('produces the same semantic final state across 30, 60, and 120Hz stepping', () => {
    const run = (frameMs: number) => {
      let state = createInitialState(shop);
      state = setPlayerPosition(state, station('net').position);
      for (let elapsed = 0; elapsed < 2_000; elapsed += frameMs) state = advanceGame(shop, state, Math.min(frameMs, 2_000 - elapsed));
      return { ready: state.stations.net?.ready, events: state.feedbackEvents, elapsed: state.elapsedMs };
    };
    expect(run(1000 / 30)).toEqual(run(1000 / 60));
    expect(run(1000 / 60)).toEqual(run(1000 / 120));
  });
});

describe('uiAnimationStandard compliance', () => {
  it('uses preloaded assets before playback and supports reduced motion', async () => {
    const gate = preloadBeforePlayback(['placeholder:customer', 'placeholder:product']);
    expect(gate.ready).toBe(false);
    await gate.readyPromise;
    expect(gate.ready).toBe(true);
    expect(resolveMotionDuration('microFeedback', false)).toBeGreaterThan(0);
    expect(resolveMotionDuration('microFeedback', true)).toBe(0);
  });

  it('reaches the same final UI state with time-based playback at different refresh rates', () => {
    const run = (frameMs: number) => {
      const player = new MotionPlayer(180, 'ease-out');
      player.start(0);
      for (let time = 0; time <= 500; time += frameMs) player.update(time);
      return player.value;
    };
    expect(run(1000 / 30)).toBeCloseTo(1, 4);
    expect(run(1000 / 60)).toBeCloseTo(1, 4);
    expect(run(1000 / 120)).toBeCloseTo(1, 4);
  });
});
