import { describe, expect, it } from 'vitest';

type SimulationModule = typeof import('../../prototypes/spatial-logistics-core/src/simulation.js');

async function loadSimulation(): Promise<SimulationModule | null> {
  return import('../../prototypes/spatial-logistics-core/src/simulation.js').catch(() => null);
}

describe('spatial logistics core prototype', () => {
  it('completes the proximity-driven stock-to-sale loop without an interact button', async () => {
    const simulation = await loadSimulation();
    expect(simulation, 'the reusable spatial logistics simulation should exist').not.toBeNull();
    if (!simulation) return;

    let state = simulation.createInitialState();
    state = simulation.setPlayerPosition(state, simulation.STATIONS.producer);
    state = simulation.advanceGame(state, 600);
    expect(state.player.carry).toBeGreaterThan(0);

    state = simulation.setPlayerPosition(state, simulation.STATIONS.shelf);
    state = simulation.advanceGame(state, 600);
    expect(state.player.carry).toBe(0);
    expect(state.shelf.stock).toBeGreaterThan(0);

    state = simulation.spawnCustomer(state);
    state = simulation.advanceGame(state, 4_000);
    expect(state.checkout.queue).toBeGreaterThan(0);

    state = simulation.setPlayerPosition(state, simulation.STATIONS.checkout);
    state = simulation.advanceGame(state, 1_200);
    expect(state.currency).toBeGreaterThan(0);
    expect(state.checkout.queue).toBe(0);
  });

  it('normalizes diagonal movement and keeps the player inside the world', async () => {
    const simulation = await loadSimulation();
    expect(simulation, 'the reusable spatial logistics simulation should exist').not.toBeNull();
    if (!simulation) return;

    const initial = simulation.createInitialState();
    const horizontal = simulation.stepGame(initial, { x: 1, y: 0 }, 1_000);
    const diagonal = simulation.stepGame(initial, { x: 1, y: 1 }, 1_000);
    const horizontalDistance = Math.hypot(horizontal.player.x - initial.player.x, horizontal.player.y - initial.player.y);
    const diagonalDistance = Math.hypot(diagonal.player.x - initial.player.x, diagonal.player.y - initial.player.y);
    expect(diagonalDistance).toBeCloseTo(horizontalDistance, 5);

    const atEdge = simulation.setPlayerPosition(initial, { x: 950, y: 530 });
    const clamped = simulation.stepGame(atEdge, { x: 1, y: 1 }, 10_000);
    expect(clamped.player.x).toBeLessThanOrEqual(simulation.WORLD.width - simulation.WORLD.playerRadius);
    expect(clamped.player.y).toBeLessThanOrEqual(simulation.WORLD.height - simulation.WORLD.playerRadius);
  });

  it('spends currency in the upgrade zone and increases carrying capacity once', async () => {
    const simulation = await loadSimulation();
    expect(simulation, 'the reusable spatial logistics simulation should exist').not.toBeNull();
    if (!simulation) return;

    let state = simulation.grantCurrency(simulation.createInitialState(), 10);
    const originalCapacity = state.player.capacity;
    state = simulation.setPlayerPosition(state, simulation.STATIONS.upgrade);
    state = simulation.advanceGame(state, 1_000);
    expect(state.player.capacity).toBeGreaterThan(originalCapacity);
    expect(state.currency).toBeLessThan(10);

    const upgradedCapacity = state.player.capacity;
    state = simulation.advanceGame(state, 1_000);
    expect(state.player.capacity).toBe(upgradedCapacity);
  });
});
