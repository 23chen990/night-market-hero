import { describe, expect, it } from 'vitest';
import { advanceGame, advanceGameForRefresh, activateGullBonus, activateOfflineBonus, createInitialState, hireEmployee } from '../src/game/simulation';

describe('seagull exploration loop', () => {
  it('runs fly-out, explore, return and reward as observable phases', () => {
    let state = hireEmployee(createInitialState(0), 'gull').state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 1).state;
    state = advanceGame(state, 1).state;
    const departure = advanceGame(state, 1);
    expect(departure.events.some((event) => event.type === 'gullDeparted')).toBe(true);
    expect(departure.state.gull.phase).toBe('flying');

    const exploring = advanceGame(departure.state, 700);
    expect(exploring.events.some((event) => event.type === 'gullExploring')).toBe(true);
    expect(exploring.state.gull.phase).toBe('exploring');
    const returning = advanceGame(exploring.state, 700);
    expect(returning.state.gull.phase).toBe('returning');
    const landed = advanceGame(returning.state, 700);
    expect(landed.events.some((event) => event.type === 'gullReturned')).toBe(true);
    expect(landed.state.gull.phase).toBe('idle');
    expect(landed.state.currency).toBe(1);
  });

  it('applies the rewarded-ad bonus only to a future return', () => {
    let state = hireEmployee(createInitialState(0), 'gull').state;
    state = activateGullBonus(state, 30_000).state;
    expect(state.gull.bonusMultiplier).toBe(2);
  });

  it('doubles a gull return during offline recovery and then consumes the window', () => {
    let state = hireEmployee(createInitialState(0), 'gull').state;
    state = activateOfflineBonus(state, 10_000).state;
    state = advanceGameForRefresh(state, 1).state;
    state = advanceGameForRefresh(state, 1).state;
    state = advanceGameForRefresh(state, 1).state;
    state = advanceGameForRefresh(state, 1).state;
    state = advanceGameForRefresh(state, 700).state;
    state = advanceGameForRefresh(state, 700).state;
    state = advanceGameForRefresh(state, 700).state;
    state = advanceGameForRefresh(state, 700).state;
    expect(state.currency).toBe(2);
    expect(state.offline.bonusRemainingMs).toBeLessThan(10_000);
  });
});
