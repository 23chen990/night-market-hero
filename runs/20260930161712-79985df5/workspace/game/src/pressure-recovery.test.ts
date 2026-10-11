import { describe, expect, it } from 'vitest';
import config from './generated/game-config.json';
import { advanceGame, createInitialState, setPlayerPosition, type GameState, type SpatialShopConfig } from './simulation.js';
import { migrateSavedState, serializeGameState } from './save.js';

const shop = config.spatialShop as SpatialShopConfig;
function chase(): GameState {
  let state = createInitialState(shop);
  state.level = 2;
  state.stations['fish-shelf']!.stock['fresh-fish'] = 8;
  state = advanceGame(shop, state, 8_000);
  expect(state.feedback.some(event => event.kind === 'seagull-loss')).toBe(true);
  state = advanceGame(shop, setPlayerPosition(state, { x: 270, y: 420 }), 50);
  expect(state.pressure.seagull.active).toBe(false);
  return state;
}

describe('seagull recovery interval and guarded shelves', () => {
  it('does not emit repeated arrival alerts while guarding a recovered shelf, even after relief expires', () => {
    let state = chase();
    const lastId = state.feedbackEvents;
    state = advanceGame(shop, state, 12_000);
    expect(state.pressure.seagull.active).toBe(false);
    expect(state.feedback.filter(event => event.id > lastId && event.kind === 'seagull-alert')).toEqual([]);
  });

  it('allows a readable four-second relief after leaving, then resumes eligible pressure', () => {
    let state = setPlayerPosition(chase(), { x: 270, y: 260 });
    const lastId = state.feedbackEvents;
    state = advanceGame(shop, state, 4_000);
    expect(state.pressure.seagull.active).toBe(false);
    expect(state.feedback.filter(event => event.id > lastId && event.kind === 'seagull-alert')).toEqual([]);
    state = advanceGame(shop, state, 8_000);
    expect(state.pressure.seagull.active).toBe(true);
    expect(state.feedback.some(event => event.id > lastId && event.kind === 'seagull-loss')).toBe(true);
  });

  it('skips a guarded stocked shelf and selects another eligible shelf', () => {
    let state = createInitialState(shop);
    state.level = 2;
    state.unlockedStationIds.push('kelp-shelf');
    state.stations['fish-shelf']!.stock['fresh-fish'] = 8;
    state.stations['kelp-shelf']!.stock.kelp = 8;
    state = advanceGame(shop, setPlayerPosition(state, { x: 270, y: 420 }), 3_000);
    expect(state.pressure.seagull.targetShelfId).toBe('kelp-shelf');
    expect(state.feedback.filter(event => event.kind === 'seagull-alert').every(event => event.target.x === 410)).toBe(true);
  });

  it('ends an approaching episode when the player reaches its target before the bird', () => {
    let state = createInitialState(shop);
    state.level = 2;
    state.stations['fish-shelf']!.stock['fresh-fish'] = 8;
    state = advanceGame(shop, state, 2_500);
    expect(state.pressure.seagull.mode).toBe('approaching');
    state = advanceGame(shop, setPlayerPosition(state, { x: 270, y: 420 }), 50);
    expect(state.pressure.seagull.active).toBe(false);
    expect(state.feedback.at(-1)?.kind).toBe('seagull-scared');
  });

  it('round-trips the remaining recovery interval and keeps it bounded for legacy or malformed saves', () => {
    const state = chase();
    const pressure = state.pressure.seagull as typeof state.pressure.seagull & { recoveryMs: number };
    expect(pressure).toEqual(expect.objectContaining({ recoveryMs: expect.any(Number) }));
    expect(pressure.recoveryMs).toBeGreaterThanOrEqual(4_000);
    expect(pressure.recoveryMs).toBeLessThanOrEqual(6_000);
    const restored = migrateSavedState(shop, JSON.parse(serializeGameState(state)));
    expect(restored.pressure.seagull).toEqual(state.pressure.seagull);
    const held = advanceGame(shop, setPlayerPosition(restored, { x: 270, y: 260 }), 4_000);
    expect(held.pressure.seagull.active).toBe(false);
    for (const invalid of [undefined, null, -1, Infinity, '5000']) {
      const raw = JSON.parse(serializeGameState(state));
      raw.pressure.seagull.recoveryMs = invalid;
      const loaded = migrateSavedState(shop, raw);
      expect((loaded.pressure.seagull as typeof pressure).recoveryMs).toBe(0);
    }
    const raw = JSON.parse(serializeGameState(state));
    raw.pressure.seagull.recoveryMs = 999_999;
    const loaded = migrateSavedState(shop, raw);
    expect((loaded.pressure.seagull as typeof pressure).recoveryMs).toBeLessThanOrEqual(6_000);
  });
});
