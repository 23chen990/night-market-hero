/* global structuredClone */
export type Position = { x: number; y: number };
export type MoveInput = { x: number; y: number };

export type ProductDefinition = { id: string; name: string; color: string; saleValue: number };
type StationBase = { id: string; label: string; position: Position; initiallyUnlocked: boolean };
export type ProducerStation = StationBase & { kind: 'producer'; outputProductId: string; cycleMs: number; capacity: number };
export type ShelfStation = StationBase & { kind: 'shelf'; acceptsProductIds: string[]; capacity: number };
export type CheckoutStation = StationBase & { kind: 'checkout'; serviceMs: number };
export type ConstructionStation = StationBase & { kind: 'construction'; cost: number; contributionIntervalMs: number; unlockStationIds: string[] };
export type UpgradeStation = StationBase & {
  kind: 'upgrade'; target: 'player-capacity' | 'player-speed' | 'checkout-speed'; amount: number; baseCost: number; costMultiplier: number; maxPurchases: number; purchaseIntervalMs: number;
};
export type StationDefinition = ProducerStation | ShelfStation | CheckoutStation | ConstructionStation | UpgradeStation;
export type SpatialShopConfig = {
  schemaVersion: 1;
  world: { width: number; height: number };
  player: { start: Position; speed: number; capacity: number; interactionRadius: number; pickupIntervalMs: number; depositIntervalMs: number };
  economy: { startingCurrency: number };
  products: ProductDefinition[];
  stations: StationDefinition[];
  customers: { entrance: Position; exit: Position; spawnIntervalMs: number; moveSpeed: number; patienceMs: number; demand: Array<{ productId: string; weight: number }> };
  flowEvents: Array<{ id: string; label: string; kind: 'production-boost' | 'demand-rush'; stationIds: string[]; startsAtMs: number; durationMs: number; repeatEveryMs: number; multiplier: number }>;
};

export type CustomerPhase = 'to-shelf' | 'waiting-shelf' | 'to-checkout' | 'queued' | 'leaving' | 'left';
export type CustomerState = Position & { id: number; phase: CustomerPhase; productId: string; targetShelfId: string; patienceRemainingMs: number; basketValue: number };
export type StationRuntimeState = { ready: number; cycleProgressMs: number; stock: Record<string, number>; contributed: number; completed: boolean; purchases: number };
export type GameEvent = { id: number; kind: string; atMs: number; message: string };
export type GameState = {
  version: 1; elapsedMs: number; randomSeed: number; currency: number; level: number; stage: 'operating' | 'settlement';
  player: Position & { inventory: Record<string, number>; capacity: number; speed: number; interactionStationId: string | null; interactionProgressMs: number };
  stations: Record<string, StationRuntimeState>; unlockedStationIds: string[];
  checkout: { queue: number; serviceProgressMs: number; speedBonusMs: number };
  customers: CustomerState[]; nextCustomerId: number; nextCustomerSpawnMs: number; feedbackEvents: number;
  lastEvent: GameEvent | null; eventLog: GameEvent[];
};

const FIXED_STEP_MS = 50;
const clone = <T>(value: T): T => structuredClone(value);
const distance = (a: Position, b: Position): number => Math.hypot(a.x - b.x, a.y - b.y);
const emptyInventory = (config: SpatialShopConfig): Record<string, number> => Object.fromEntries(config.products.map((product) => [product.id, 0]));
const stationRuntime = (station: StationDefinition): StationRuntimeState => ({ ready: station.kind === 'producer' ? station.capacity : 0, cycleProgressMs: 0, stock: {}, contributed: 0, completed: false, purchases: 0 });

export function createInitialState(config: SpatialShopConfig): GameState {
  return {
    version: 1, elapsedMs: 0, randomSeed: 1, currency: config.economy.startingCurrency, level: 1, stage: 'operating',
    player: { ...config.player.start, inventory: emptyInventory(config), capacity: config.player.capacity, speed: config.player.speed, interactionStationId: null, interactionProgressMs: 0 },
    stations: Object.fromEntries(config.stations.map((station) => [station.id, stationRuntime(station)])),
    unlockedStationIds: config.stations.filter((station) => station.initiallyUnlocked).map((station) => station.id),
    checkout: { queue: 0, serviceProgressMs: 0, speedBonusMs: 0 }, customers: [], nextCustomerId: 1, nextCustomerSpawnMs: config.customers.spawnIntervalMs, feedbackEvents: 0,
    lastEvent: null, eventLog: [],
  };
}

function emit(state: GameState, kind: string, message: string): void {
  const event = { id: state.feedbackEvents + 1, kind, atMs: state.elapsedMs, message };
  state.feedbackEvents += 1; state.lastEvent = event; state.eventLog = [...state.eventLog.slice(-79), event];
}
function isUnlocked(state: GameState, stationId: string): boolean { return state.unlockedStationIds.includes(stationId); }
function isNear(config: SpatialShopConfig, a: Position, b: Position): boolean { return distance(a, b) <= config.player.interactionRadius; }
function carriedCount(state: GameState): number { return Object.values(state.player.inventory).reduce((sum, count) => sum + count, 0); }
function stockCount(stock: Record<string, number>): number { return Object.values(stock).reduce((sum, count) => sum + count, 0); }
function productName(config: SpatialShopConfig, id: string): string { return config.products.find((product) => product.id === id)?.name ?? id; }
function stationById(config: SpatialShopConfig, id: string): StationDefinition | undefined { return config.stations.find((station) => station.id === id); }

export function getProductionMultiplier(config: SpatialShopConfig, state: Pick<GameState, 'elapsedMs'>, stationId: string): number {
  return config.flowEvents.filter((event) => event.kind === 'production-boost' && event.stationIds.includes(stationId) && state.elapsedMs >= event.startsAtMs && (state.elapsedMs - event.startsAtMs) % event.repeatEveryMs < event.durationMs).reduce((multiplier, event) => multiplier * event.multiplier, 1);
}
export function getCustomerSpawnInterval(config: SpatialShopConfig, state: Pick<GameState, 'elapsedMs'>): number {
  return config.flowEvents.some((event) => event.kind === 'demand-rush' && state.elapsedMs >= event.startsAtMs && (state.elapsedMs - event.startsAtMs) % event.repeatEveryMs < event.durationMs) ? Math.max(500, config.customers.spawnIntervalMs / 2) : config.customers.spawnIntervalMs;
}

function moveToward(current: Position, target: Position, maxDistance: number): Position {
  const remaining = distance(current, target);
  if (remaining <= maxDistance || remaining === 0) return { ...target };
  return { x: current.x + (target.x - current.x) / remaining * maxDistance, y: current.y + (target.y - current.y) / remaining * maxDistance };
}
function chooseDemand(config: SpatialShopConfig, state: GameState): string {
  const total = config.customers.demand.reduce((sum, item) => sum + item.weight, 0);
  let roll = ((state.randomSeed * 1664525 + 1013904223) >>> 0) / 0x100000000 * total;
  state.randomSeed = (state.randomSeed * 1664525 + 1013904223) >>> 0;
  return config.customers.demand.find((item) => (roll -= item.weight) <= 0)?.productId ?? config.customers.demand[0]?.productId ?? 'fresh-fish';
}

export function spawnCustomer(config: SpatialShopConfig, stateValue: GameState, forcedProductId?: string): GameState {
  const state = clone(stateValue);
  const productId = forcedProductId ?? chooseDemand(config, state);
  const shelf = config.stations.find((station): station is ShelfStation => station.kind === 'shelf' && station.acceptsProductIds.includes(productId));
  if (!shelf) return state;
  state.customers.push({ id: state.nextCustomerId++, x: config.customers.entrance.x, y: config.customers.entrance.y, phase: 'to-shelf', productId, targetShelfId: shelf.id, patienceRemainingMs: config.customers.patienceMs, basketValue: config.products.find((product) => product.id === productId)?.saleValue ?? 0 });
  state.nextCustomerSpawnMs = state.elapsedMs + getCustomerSpawnInterval(config, state);
  emit(state, 'customer-arrived', `${productName(config, productId)}需求进入店铺`);
  return state;
}

function updateProducers(config: SpatialShopConfig, state: GameState, deltaMs: number): void {
  for (const station of config.stations) {
    if (station.kind !== 'producer' || !isUnlocked(state, station.id)) continue;
    const runtime = state.stations[station.id];
    if (!runtime) continue;
    if (runtime.ready >= station.capacity) { runtime.cycleProgressMs = 0; continue; }
    runtime.cycleProgressMs += deltaMs * getProductionMultiplier(config, state, station.id);
    while (runtime.cycleProgressMs >= station.cycleMs && runtime.ready < station.capacity) { runtime.cycleProgressMs -= station.cycleMs; runtime.ready += 1; emit(state, 'production-ready', `${station.label}准备好一份${productName(config, station.outputProductId)}`); }
  }
}

function consumeShelfStock(config: SpatialShopConfig, state: GameState, customer: CustomerState): boolean {
  const shelf = state.stations[customer.targetShelfId];
  if (!shelf || (shelf.stock[customer.productId] ?? 0) <= 0) return false;
  shelf.stock[customer.productId] = (shelf.stock[customer.productId] ?? 0) - 1; customer.phase = 'to-checkout'; customer.patienceRemainingMs = config.customers.patienceMs;
  emit(state, 'customer-stocked', `${productName(config, customer.productId)}已取货，前往收银`);
  return true;
}

function updateCustomers(config: SpatialShopConfig, state: GameState, deltaMs: number): void {
  const checkout = config.stations.find((station): station is CheckoutStation => station.kind === 'checkout');
  if (!checkout) return;
  for (const customer of state.customers) {
    if (customer.phase === 'left') continue;
    customer.patienceRemainingMs -= deltaMs;
    const step = config.customers.moveSpeed * deltaMs / 1000;
    if (customer.phase === 'to-shelf') {
      const shelf = stationById(config, customer.targetShelfId);
      if (shelf) customer.x = moveToward(customer, shelf.position, step).x, customer.y = moveToward(customer, shelf.position, step).y;
      if (shelf && isNear(config, customer, shelf.position)) { customer.phase = 'waiting-shelf'; consumeShelfStock(config, state, customer); }
    } else if (customer.phase === 'waiting-shelf') {
      consumeShelfStock(config, state, customer);
      if (customer.patienceRemainingMs <= 0 && customer.phase === 'waiting-shelf') { customer.phase = 'leaving'; emit(state, 'customer-stockout', `${productName(config, customer.productId)}缺货，顾客离店`); }
    } else if (customer.phase === 'to-checkout') {
      const next = moveToward(customer, checkout.position, step); customer.x = next.x; customer.y = next.y;
      if (isNear(config, customer, checkout.position)) { customer.phase = 'queued'; state.checkout.queue += 1; emit(state, 'customer-queued', '顾客进入结账队列'); }
    } else if (customer.phase === 'leaving') {
      const next = moveToward(customer, config.customers.exit, step); customer.x = next.x; customer.y = next.y;
      if (isNear(config, customer, config.customers.exit)) customer.phase = 'left';
    }
  }
}

function firstCarriedProduct(config: SpatialShopConfig, state: GameState, accepted: string[]): string | undefined {
  return config.products.find((product) => accepted.includes(product.id) && (state.player.inventory[product.id] ?? 0) > 0)?.id;
}
function upgradeCost(station: UpgradeStation, runtime: StationRuntimeState): number { return Math.ceil(station.baseCost * station.costMultiplier ** runtime.purchases); }
function activeInteraction(config: SpatialShopConfig, state: GameState): StationDefinition | undefined {
  const candidates: Array<{ station: StationDefinition; priority: number }> = [];
  for (const station of config.stations) {
    const runtime = state.stations[station.id]; if (!runtime || !isUnlocked(state, station.id) || !isNear(config, state.player, station.position)) continue;
    let priority: number | null = null;
    if (station.kind === 'shelf' && firstCarriedProduct(config, state, station.acceptsProductIds) && stockCount(runtime.stock) < station.capacity) priority = 0;
    else if (station.kind === 'producer' && runtime.ready > 0 && carriedCount(state) < state.player.capacity) priority = 1;
    else if (station.kind === 'checkout' && state.checkout.queue > 0) priority = 2;
    else if (station.kind === 'construction' && !runtime.completed && runtime.contributed < station.cost && state.currency > 0) priority = 3;
    else if (station.kind === 'upgrade' && runtime.purchases < station.maxPurchases && state.currency >= upgradeCost(station, runtime)) priority = 4;
    if (priority !== null) candidates.push({ station, priority });
  }
  return candidates.sort((a, b) => a.priority - b.priority || a.station.id.localeCompare(b.station.id))[0]?.station;
}

function applyUpgrade(state: GameState, station: UpgradeStation, runtime: StationRuntimeState): void {
  state.currency -= upgradeCost(station, runtime); runtime.purchases += 1; state.level += 1;
  if (station.target === 'player-capacity') state.player.capacity += station.amount;
  if (station.target === 'player-speed') state.player.speed += station.amount;
  if (station.target === 'checkout-speed') state.checkout.speedBonusMs += station.amount;
}

function updateInteraction(config: SpatialShopConfig, state: GameState, deltaMs: number): void {
  if (state.stage === 'settlement') return;
  const station = activeInteraction(config, state);
  if (!station) { state.player.interactionStationId = null; state.player.interactionProgressMs = 0; return; }
  if (state.player.interactionStationId !== station.id) { state.player.interactionStationId = station.id; state.player.interactionProgressMs = 0; }
  const runtime = state.stations[station.id]; if (!runtime) return;
  state.player.interactionProgressMs += deltaMs;
  if (station.kind === 'producer') {
    while (state.player.interactionProgressMs >= config.player.pickupIntervalMs && runtime.ready > 0 && carriedCount(state) < state.player.capacity) { state.player.interactionProgressMs -= config.player.pickupIntervalMs; runtime.ready -= 1; state.player.inventory[station.outputProductId] = (state.player.inventory[station.outputProductId] ?? 0) + 1; emit(state, 'pickup', `携带一份${productName(config, station.outputProductId)}`); }
  } else if (station.kind === 'shelf') {
    while (state.player.interactionProgressMs >= config.player.depositIntervalMs && stockCount(runtime.stock) < station.capacity) {
      const productId = firstCarriedProduct(config, state, station.acceptsProductIds); if (!productId) break;
      state.player.interactionProgressMs -= config.player.depositIntervalMs; state.player.inventory[productId] = (state.player.inventory[productId] ?? 0) - 1; runtime.stock[productId] = (runtime.stock[productId] ?? 0) + 1; emit(state, 'deposit', `${productName(config, productId)}补货完成`);
    }
  } else if (station.kind === 'checkout') {
    const serviceMs = Math.max(120, station.serviceMs - state.checkout.speedBonusMs);
    while (state.player.interactionProgressMs >= serviceMs && state.checkout.queue > 0) {
      state.player.interactionProgressMs -= serviceMs; state.checkout.queue -= 1;
      const customer = state.customers.find((item) => item.phase === 'queued'); if (customer) { customer.phase = 'leaving'; state.currency += customer.basketValue; emit(state, 'checkout-cash', `结算 +${customer.basketValue} 贝壳币`); }
    }
  } else if (station.kind === 'construction') {
    while (state.player.interactionProgressMs >= station.contributionIntervalMs && state.currency > 0 && runtime.contributed < station.cost) {
      state.player.interactionProgressMs -= station.contributionIntervalMs; state.currency -= 1; runtime.contributed += 1; emit(state, 'construction-payment', `扩建投入 ${runtime.contributed}/${station.cost}`);
    }
    if (runtime.contributed >= station.cost && !runtime.completed) {
      runtime.completed = true; state.unlockedStationIds = [...new Set([...state.unlockedStationIds, ...station.unlockStationIds])]; state.stage = 'settlement'; emit(state, 'construction-complete', '潮池扩建完成，进入阶段结算');
    }
  } else if (station.kind === 'upgrade') {
    const cost = upgradeCost(station, runtime);
    if (state.player.interactionProgressMs >= station.purchaseIntervalMs && state.currency >= cost && runtime.purchases < station.maxPurchases) { state.player.interactionProgressMs = 0; applyUpgrade(state, station, runtime); emit(state, 'upgrade', `${station.label}升级完成`); }
  }
}

export function stepGame(config: SpatialShopConfig, stateValue: GameState, input: MoveInput, deltaMs: number): GameState {
  const state = clone(stateValue);
  if (state.stage === 'settlement') return state;
  const seconds = deltaMs / 1000; const magnitude = Math.hypot(input.x, input.y);
  if (magnitude > 0) { const scale = Math.min(1, magnitude); state.player.x += input.x / magnitude * state.player.speed * seconds * scale; state.player.y += input.y / magnitude * state.player.speed * seconds * scale; }
  state.player.x = Math.min(config.world.width, Math.max(0, state.player.x)); state.player.y = Math.min(config.world.height, Math.max(0, state.player.y));
  state.elapsedMs += deltaMs;
  while (state.elapsedMs >= state.nextCustomerSpawnMs) { const next = spawnCustomer(config, state); state.customers = next.customers; state.nextCustomerId = next.nextCustomerId; state.nextCustomerSpawnMs = state.elapsedMs + getCustomerSpawnInterval(config, state); state.randomSeed = next.randomSeed; state.feedbackEvents = next.feedbackEvents; state.lastEvent = next.lastEvent; state.eventLog = next.eventLog; }
  updateProducers(config, state, deltaMs); updateCustomers(config, state, deltaMs); updateInteraction(config, state, deltaMs);
  return state;
}

export function advanceGame(config: SpatialShopConfig, stateValue: GameState, durationMs: number, input: MoveInput = { x: 0, y: 0 }): GameState {
  let state = clone(stateValue); let remaining = Math.max(0, durationMs);
  while (remaining > 0) { const step = Math.min(FIXED_STEP_MS, remaining); state = stepGame(config, state, input, step); remaining -= step; }
  return state;
}
export function setPlayerPosition(stateValue: GameState, position: Position): GameState { const state = clone(stateValue); state.player.x = position.x; state.player.y = position.y; return state; }
export function grantCurrency(stateValue: GameState, amount: number): GameState { const state = clone(stateValue); state.currency += Math.max(0, amount); return state; }
export function setRandomSeed(stateValue: GameState, seed: number): GameState { const state = clone(stateValue); state.randomSeed = seed >>> 0; return state; }
export function continueRound(stateValue: GameState): GameState { const state = clone(stateValue); state.stage = 'operating'; state.lastEvent = null; return state; }
export function restartRound(config: SpatialShopConfig, stateValue: GameState): GameState { const state = createInitialState(config); state.randomSeed = stateValue.randomSeed; return state; }
export function restoreState(config: SpatialShopConfig, raw: string | null): GameState {
  try {
    const value = raw ? JSON.parse(raw) as GameState : null;
    if (value?.version === 1 && value.player && value.stations && value.checkout && value.stage) return value;
  } catch { /* malformed or stale saves fall back safely */ }
  return createInitialState(config);
}
