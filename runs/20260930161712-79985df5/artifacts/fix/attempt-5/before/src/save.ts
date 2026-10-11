import {
  createInitialState,
  type GameState,
  type SpatialShopConfig,
} from './simulation.js';

export const SAVE_SCHEMA_VERSION = 2;

function numeric(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function migrateSavedState(config: SpatialShopConfig, raw: unknown): GameState {
  const fresh = createInitialState(config);
  if (!raw || typeof raw !== 'object') return fresh;
  const candidate = raw as Partial<GameState> & { version?: unknown };
  const rawVersion = (raw as { version?: unknown }).version;
  const source = rawVersion === 1 || rawVersion === 2 ? candidate : null;
  if (!source) return fresh;
  const merged = {
    ...fresh,
    ...source,
    version: SAVE_SCHEMA_VERSION as 2,
    currency: Math.max(0, numeric(source.currency, fresh.currency)),
    cashPile: Math.max(0, numeric(source.cashPile, 0)),
    level: Math.max(1, numeric(source.level, 1)),
    randomSeed: numeric(source.randomSeed, fresh.randomSeed) >>> 0,
    stage: source.stage === 'settlement' || source.stage === 'market-selection' ? source.stage : 'operating',
    marketId: source.marketId ?? 'beach-stall',
    selectedRoute: source.selectedRoute ?? null,
    marketSelectionOpen: source.marketSelectionOpen ?? false,
    marketMarker: { ...fresh.marketMarker, ...(source.marketMarker ?? {}) },
    reducedMotion: source.reducedMotion ?? false,
    unlockedStationIds: Array.isArray(source.unlockedStationIds)
      ? [...source.unlockedStationIds].filter((stationId) => Boolean(fresh.stations[stationId]))
      : fresh.unlockedStationIds,
    feedback: Array.isArray(source.feedback) ? source.feedback.slice(-32) : [],
    feedbackEvents: numeric(source.feedbackEvents, 0),
    nextCustomerId: Math.max(1, numeric(source.nextCustomerId, 1)),
    nextQueueTicket: Math.max(1, numeric(source.nextQueueTicket, 1)),
  } as GameState;
  merged.player = {
    ...fresh.player,
    ...(source.player ?? {}),
    inventory: { ...fresh.player.inventory, ...(source.player?.inventory ?? {}) },
    capacity: Math.max(fresh.player.capacity, numeric(source.player?.capacity, fresh.player.capacity)),
    speed: Math.max(fresh.player.speed, numeric(source.player?.speed, fresh.player.speed)),
  };
  merged.stations = { ...fresh.stations };
  for (const [stationId, runtime] of Object.entries(source.stations ?? {})) {
    if (!merged.stations[stationId]) continue;
    merged.stations[stationId] = {
      ...merged.stations[stationId],
      ...runtime,
      stock: { ...merged.stations[stationId]!.stock, ...(runtime?.stock ?? {}) },
    };
  }
  merged.checkout = { ...fresh.checkout, ...(source.checkout ?? {}) };
  merged.perMarketProgress = { ...fresh.perMarketProgress };
  for (const [marketId, progress] of Object.entries(source.perMarketProgress ?? {})) {
    if (!merged.perMarketProgress[marketId as keyof typeof merged.perMarketProgress]) continue;
    const baseline = merged.perMarketProgress[marketId as keyof typeof merged.perMarketProgress]!;
    merged.perMarketProgress[marketId as keyof typeof merged.perMarketProgress] = {
      ...baseline,
      ...progress,
      smokedOrders: numeric(progress?.smokedOrders, baseline.smokedOrders),
      dualShelfOrders: numeric(progress?.dualShelfOrders, baseline.dualShelfOrders),
    };
  }
  merged.processors = { ...fresh.processors, ...(source.processors ?? {}) };
  merged.employees = { ...fresh.employees, ...(source.employees ?? {}) };
  merged.hireStations = { ...fresh.hireStations, ...(source.hireStations ?? {}) };
  merged.pressure = { ...fresh.pressure, ...(source.pressure ?? {}), seagull: { ...fresh.pressure.seagull, ...(source.pressure?.seagull ?? {}) } };
  merged.customers = (Array.isArray(source.customers) ? source.customers : [])
    .filter((customer) => Boolean(customer && typeof customer === 'object'))
    .filter((customer) => Boolean(merged.stations[customer.targetShelfId]) && Object.prototype.hasOwnProperty.call(merged.player.inventory, customer.productId))
    .map((customer) => ({
      ...customer,
      queueTicket: customer.queueTicket ?? null,
      shoppingList: customer.shoppingList ?? [{ productId: customer.productId, quantity: 1, collected: customer.basketValue > 0 ? 1 : 0, shelfId: customer.targetShelfId }],
      activeLineIndex: customer.activeLineIndex ?? 0,
      departureReason: customer.departureReason ?? null,
    }));
  return merged;
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify({ ...state, version: SAVE_SCHEMA_VERSION });
}
