/* global structuredClone */
export type Position = { x: number; y: number };
export type MoveInput = { x: number; y: number };

export type ProductDefinition = {
  id: string;
  name: string;
  color: string;
  saleValue: number;
};

type StationBase = { id: string; label: string; position: Position; initiallyUnlocked: boolean };
export type ProducerStation = StationBase & { kind: 'producer'; outputProductId: string; cycleMs: number; capacity: number };
export type ShelfStation = StationBase & { kind: 'shelf'; acceptsProductIds: string[]; capacity: number };
export type CheckoutStation = StationBase & { kind: 'checkout'; serviceMs: number };
export type ConstructionStation = StationBase & { kind: 'construction'; cost: number; contributionIntervalMs: number; unlockStationIds: string[] };
export type UpgradeStation = StationBase & {
  kind: 'upgrade';
  target: 'player-capacity' | 'player-speed' | 'checkout-speed';
  amount: number;
  baseCost: number;
  costMultiplier: number;
  maxPurchases: number;
  purchaseIntervalMs: number;
};
export type StationDefinition = ProducerStation | ShelfStation | CheckoutStation | ConstructionStation | UpgradeStation;

export type SpatialShopConfig = {
  schemaVersion: 1;
  world: { width: number; height: number };
  player: {
    start: Position;
    speed: number;
    capacity: number;
    interactionRadius: number;
    pickupIntervalMs: number;
    depositIntervalMs: number;
  };
  economy: { startingCurrency: number };
  products: ProductDefinition[];
  stations: StationDefinition[];
  customers: {
    entrance: Position;
    exit: Position;
    spawnIntervalMs: number;
    moveSpeed: number;
    patienceMs: number;
    demand: Array<{ productId: string; weight: number }>;
  };
  flowEvents: Array<{
    id: string;
    label: string;
    kind: 'production-boost' | 'demand-rush';
    stationIds: string[];
    startsAtMs: number;
    durationMs: number;
    repeatEveryMs: number;
    multiplier: number;
  }>;
};

export type CustomerPhase = 'to-shelf' | 'waiting-shelf' | 'to-checkout' | 'queued' | 'packing' | 'leaving' | 'left';
export type FeedbackKind =
  | 'customer-arrival'
  | 'production-ready'
  | 'pickup'
  | 'deposit'
  | 'customer-pickup'
  | 'customer-queued'
  | 'checkout-packing'
  | 'checkout-pack'
  | 'cash-collect'
  | 'invest'
  | 'construction-complete'
  | 'upgrade';
export type FeedbackEvent = {
  id: number;
  kind: FeedbackKind;
  atMs: number;
  source: Position;
  target: Position;
  productId?: string;
  amount?: number;
};
export type CustomerState = Position & {
  id: number;
  phase: CustomerPhase;
  productId: string;
  targetShelfId: string;
  patienceRemainingMs: number;
  basketValue: number;
  queuePosition: Position | null;
  queueTicket: number | null;
  packingRemainingMs?: number;
};

export type StationRuntimeState = {
  ready: number;
  cycleProgressMs: number;
  stock: Record<string, number>;
  contributed: number;
  completed: boolean;
  purchases: number;
};

export type GameState = {
  version: 1;
  elapsedMs: number;
  randomSeed: number;
  currency: number;
  cashPile: number;
  cashCollectionArmed: boolean;
  nextMarketId: string | null;
  level: number;
  stage: 'operating' | 'settlement';
  player: Position & {
    inventory: Record<string, number>;
    capacity: number;
    speed: number;
    interactionStationId: string | null;
    interactionProgressMs: number;
  };
  stations: Record<string, StationRuntimeState>;
  unlockedStationIds: string[];
  checkout: { queue: number; serviceProgressMs: number; speedBonusMs: number };
  customers: CustomerState[];
  nextCustomerId: number;
  nextQueueTicket: number;
  feedbackEvents: number;
  feedback: FeedbackEvent[];
};

const FIXED_STEP_MS = 50;
export const DEFAULT_CHECKOUT_PACKING_MS = 320;

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function emptyInventory(config: SpatialShopConfig): Record<string, number> {
  return Object.fromEntries(config.products.map((product) => [product.id, 0]));
}

function stationRuntime(station: StationDefinition): StationRuntimeState {
  return {
    ready: station.kind === 'producer' ? station.capacity : 0,
    cycleProgressMs: 0,
    stock: {},
    contributed: 0,
    completed: false,
    purchases: 0,
  };
}

export function createInitialState(config: SpatialShopConfig): GameState {
  return {
    version: 1,
    elapsedMs: 0,
    randomSeed: 1,
    currency: config.economy.startingCurrency,
    cashPile: 0,
    cashCollectionArmed: false,
    nextMarketId: null,
    level: 1,
    stage: 'operating',
    player: {
      ...config.player.start,
      inventory: emptyInventory(config),
      capacity: config.player.capacity,
      speed: config.player.speed,
      interactionStationId: null,
      interactionProgressMs: 0,
    },
    stations: Object.fromEntries(config.stations.map((station) => [station.id, stationRuntime(station)])),
    unlockedStationIds: config.stations.filter((station) => station.initiallyUnlocked).map((station) => station.id),
    checkout: { queue: 0, serviceProgressMs: 0, speedBonusMs: 0 },
    customers: [],
    nextCustomerId: 1,
    nextQueueTicket: 1,
    feedbackEvents: 0,
    feedback: [],
  };
}

function emitFeedback(
  state: GameState,
  kind: FeedbackKind,
  source: Position,
  target: Position,
  details: Pick<FeedbackEvent, 'productId' | 'amount'> = {},
): void {
  const event: FeedbackEvent = {
    id: state.feedbackEvents + 1,
    kind,
    atMs: state.elapsedMs,
    source: { ...source },
    target: { ...target },
    ...details,
  };
  state.feedbackEvents = event.id;
  state.feedback = [...state.feedback.slice(-31), event];
}

function distance(left: Position, right: Position): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function isNear(config: SpatialShopConfig, left: Position, right: Position): boolean {
  return distance(left, right) <= config.player.interactionRadius;
}

function isUnlocked(state: GameState, stationId: string): boolean {
  return state.unlockedStationIds.includes(stationId);
}

function isFlowEventActive(state: Pick<GameState, 'elapsedMs'>, event: SpatialShopConfig['flowEvents'][number]): boolean {
  if (state.elapsedMs < event.startsAtMs) return false;
  return (state.elapsedMs - event.startsAtMs) % event.repeatEveryMs < event.durationMs;
}

export function getProductionMultiplier(config: SpatialShopConfig, state: Pick<GameState, 'elapsedMs'>, stationId: string): number {
  return config.flowEvents
    .filter((event) => event.kind === 'production-boost' && event.stationIds.includes(stationId) && isFlowEventActive(state, event))
    .reduce((multiplier, event) => multiplier * event.multiplier, 1);
}

export function getCustomerSpawnInterval(config: SpatialShopConfig, state: Pick<GameState, 'elapsedMs'>): number {
  const multiplier = config.flowEvents
    .filter((event) => event.kind === 'demand-rush' && isFlowEventActive(state, event))
    .reduce((value, event) => value * event.multiplier, 1);
  return config.customers.spawnIntervalMs / multiplier;
}

function updatePlayerMovement(config: SpatialShopConfig, state: GameState, input: MoveInput, deltaMs: number): void {
  const magnitude = Math.hypot(input.x, input.y);
  if (magnitude > 0) {
    const travel = state.player.speed * deltaMs / 1_000;
    state.player.x += input.x / magnitude * travel;
    state.player.y += input.y / magnitude * travel;
  }
  state.player.x = Math.min(config.world.width, Math.max(0, state.player.x));
  state.player.y = Math.min(config.world.height, Math.max(0, state.player.y));
}

function updateProducers(config: SpatialShopConfig, state: GameState, deltaMs: number): void {
  for (const station of config.stations) {
    if (station.kind !== 'producer' || !isUnlocked(state, station.id)) continue;
    const runtime = state.stations[station.id];
    if (!runtime) continue;
    if (runtime.ready >= station.capacity) {
      runtime.cycleProgressMs = 0;
      continue;
    }
    runtime.cycleProgressMs += deltaMs * getProductionMultiplier(config, state, station.id);
    while (runtime.cycleProgressMs >= station.cycleMs && runtime.ready < station.capacity) {
      runtime.cycleProgressMs -= station.cycleMs;
      runtime.ready += 1;
      emitFeedback(state, 'production-ready', station.position, station.position, { productId: station.outputProductId });
    }
  }
}

function carriedCount(state: GameState): number {
  return Object.values(state.player.inventory).reduce((sum, count) => sum + count, 0);
}

function firstCarriedProduct(config: SpatialShopConfig, state: GameState, accepted: string[]): string | undefined {
  return config.products.find((product) => accepted.includes(product.id) && (state.player.inventory[product.id] ?? 0) > 0)?.id;
}

function upgradeCost(station: UpgradeStation, runtime: StationRuntimeState): number {
  return Math.ceil(station.baseCost * station.costMultiplier ** runtime.purchases);
}

function interactionPriority(config: SpatialShopConfig, state: GameState, station: StationDefinition): number | null {
  const runtime = state.stations[station.id];
  if (!runtime || !isUnlocked(state, station.id) || !isNear(config, state.player, station.position)) return null;
  if (station.kind === 'shelf' && firstCarriedProduct(config, state, station.acceptsProductIds) && Object.values(runtime.stock).reduce((sum, count) => sum + count, 0) < station.capacity) return 0;
  if (station.kind === 'producer' && runtime.ready > 0 && carriedCount(state) < state.player.capacity) return 1;
  if (station.kind === 'checkout' && state.checkout.queue > 0) return 2;
  if (station.kind === 'construction' && !runtime.completed && runtime.contributed < station.cost && state.currency > 0) return 3;
  if (station.kind === 'upgrade' && runtime.purchases < station.maxPurchases && state.currency >= upgradeCost(station, runtime)) return 4;
  return null;
}

function activeInteraction(config: SpatialShopConfig, state: GameState): StationDefinition | undefined {
  return config.stations
    .map((station) => ({ station, priority: interactionPriority(config, state, station) }))
    .filter((candidate): candidate is { station: StationDefinition; priority: number } => candidate.priority !== null)
    .sort((left, right) => left.priority - right.priority || left.station.id.localeCompare(right.station.id))[0]?.station;
}

function applyUpgrade(state: GameState, station: UpgradeStation, runtime: StationRuntimeState): void {
  const cost = upgradeCost(station, runtime);
  state.currency -= cost;
  runtime.purchases += 1;
  state.level += 1;
  if (station.target === 'player-capacity') state.player.capacity += Math.floor(station.amount);
  if (station.target === 'player-speed') state.player.speed += station.amount;
  if (station.target === 'checkout-speed') state.checkout.speedBonusMs += station.amount;
  emitFeedback(state, 'upgrade', state.player, station.position, { amount: cost });
}

function updatePlayerInteraction(config: SpatialShopConfig, state: GameState, input: MoveInput, deltaMs: number): void {
  const station = activeInteraction(config, state);
  if (!station) {
    state.player.interactionStationId = null;
    state.player.interactionProgressMs = 0;
    return;
  }
  // BUG-MOVING-PAYMENT fix: player must be actually stationary to invest.
  // Moving (non-zero input) resets progress and never pays.
  if (input.x !== 0 || input.y !== 0) {
    state.player.interactionStationId = station.id;
    state.player.interactionProgressMs = 0;
    return;
  }
  if (state.player.interactionStationId !== station.id) {
    state.player.interactionStationId = station.id;
    state.player.interactionProgressMs = 0;
  }
  const runtime = state.stations[station.id];
  if (!runtime) return;
  state.player.interactionProgressMs += deltaMs;

  const interval = station.kind === 'producer'
    ? config.player.pickupIntervalMs
    : station.kind === 'shelf'
      ? config.player.depositIntervalMs
      : station.kind === 'construction'
        ? station.contributionIntervalMs
        : station.kind === 'upgrade'
          ? station.purchaseIntervalMs
          : Number.POSITIVE_INFINITY;

  while (state.player.interactionProgressMs >= interval) {
    state.player.interactionProgressMs -= interval;
    if (station.kind === 'producer' && runtime.ready > 0 && carriedCount(state) < state.player.capacity) {
      runtime.ready -= 1;
      state.player.inventory[station.outputProductId] = (state.player.inventory[station.outputProductId] ?? 0) + 1;
      emitFeedback(state, 'pickup', station.position, state.player, { productId: station.outputProductId, amount: 1 });
      continue;
    }
    if (station.kind === 'shelf') {
      const productId = firstCarriedProduct(config, state, station.acceptsProductIds);
      const shelfCount = Object.values(runtime.stock).reduce((sum, count) => sum + count, 0);
      if (productId && shelfCount < station.capacity) {
        state.player.inventory[productId] = (state.player.inventory[productId] ?? 0) - 1;
        runtime.stock[productId] = (runtime.stock[productId] ?? 0) + 1;
        emitFeedback(state, 'deposit', state.player, station.position, { productId, amount: 1 });
        continue;
      }
    }
    if (station.kind === 'construction' && state.currency > 0 && runtime.contributed < station.cost) {
      state.currency -= 1;
      runtime.contributed += 1;
      emitFeedback(state, 'invest', state.player, station.position, { amount: 1 });
      if (runtime.contributed >= station.cost) {
        runtime.completed = true;
        for (const stationId of station.unlockStationIds) {
          if (!state.unlockedStationIds.includes(stationId)) state.unlockedStationIds.push(stationId);
        }
        state.level += 1;
        state.stage = 'settlement';
        emitFeedback(state, 'construction-complete', station.position, station.position);
      }
      continue;
    }
    if (station.kind === 'upgrade' && runtime.purchases < station.maxPurchases && state.currency >= upgradeCost(station, runtime)) {
      applyUpgrade(state, station, runtime);
      continue;
    }
    state.player.interactionProgressMs = 0;
    break;
  }
}

function moveToward(entity: Position, target: Position, speed: number, deltaMs: number): boolean {
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const remaining = Math.hypot(dx, dy);
  const travel = speed * deltaMs / 1_000;
  if (remaining === 0 || remaining <= travel) {
    entity.x = target.x;
    entity.y = target.y;
    return true;
  }
  entity.x += dx / remaining * travel;
  entity.y += dy / remaining * travel;
  return false;
}

function stationById(config: SpatialShopConfig, stationId: string): StationDefinition | undefined {
  return config.stations.find((station) => station.id === stationId);
}

function productById(config: SpatialShopConfig, productId: string): ProductDefinition | undefined {
  return config.products.find((product) => product.id === productId);
}

function queueCustomers(state: GameState): CustomerState[] {
  return state.customers
    .filter((customer) => (customer.phase === 'to-checkout' || customer.phase === 'queued') && customer.queueTicket !== null)
    .sort((left, right) => (left.queueTicket ?? Number.MAX_SAFE_INTEGER) - (right.queueTicket ?? Number.MAX_SAFE_INTEGER));
}

function updateQueueLayout(checkout: CheckoutStation, state: GameState): void {
  const customers = queueCustomers(state);
  customers.forEach((customer, index) => {
    customer.queuePosition = { x: checkout.position.x, y: checkout.position.y + 40 + index * 40 };
  });
  state.checkout.queue = customers.filter((customer) => customer.phase === 'queued').length;
}

function takeShelfProduct(config: SpatialShopConfig, state: GameState, customer: CustomerState, checkout: CheckoutStation): boolean {
  const runtime = state.stations[customer.targetShelfId];
  if (!runtime || (runtime.stock[customer.productId] ?? 0) <= 0) return false;
  const shelf = stationById(config, customer.targetShelfId);
  runtime.stock[customer.productId] = (runtime.stock[customer.productId] ?? 0) - 1;
  customer.basketValue = productById(config, customer.productId)?.saleValue ?? 0;
  customer.phase = 'to-checkout';
  customer.queueTicket = state.nextQueueTicket;
  state.nextQueueTicket += 1;
  customer.queuePosition = null;
  emitFeedback(state, 'customer-pickup', shelf?.position ?? customer, customer, { productId: customer.productId, amount: 1 });
  updateQueueLayout(checkout, state);
  return true;
}

function updateCustomers(config: SpatialShopConfig, state: GameState, deltaMs: number): void {
  const checkout = config.stations.find((station): station is CheckoutStation => station.kind === 'checkout');
  if (!checkout) return;
  updateQueueLayout(checkout, state);
  for (const customer of state.customers) {
    const shelf = stationById(config, customer.targetShelfId);
    if (customer.phase === 'to-shelf' && shelf) {
      const reachedShelf = moveToward(customer, shelf.position, config.customers.moveSpeed, deltaMs);
      if (reachedShelf) {
        customer.phase = 'waiting-shelf';
        customer.patienceRemainingMs = config.customers.patienceMs;
        // Reaching the shelf starts the wait. The arrival frame itself is free.
        if (takeShelfProduct(config, state, customer, checkout)) continue;
        continue;
      }
    }
    if (customer.phase === 'waiting-shelf') {
      if (takeShelfProduct(config, state, customer, checkout)) continue;
      customer.patienceRemainingMs -= deltaMs;
      if (customer.patienceRemainingMs <= 0) customer.phase = 'leaving';
    }
    if (customer.phase === 'to-checkout' && customer.queuePosition) {
      if (moveToward(customer, customer.queuePosition, config.customers.moveSpeed, deltaMs)) {
        customer.phase = 'queued';
        emitFeedback(state, 'customer-queued', customer, customer.queuePosition);
      }
    }
    if (customer.phase === 'leaving' && moveToward(customer, config.customers.exit, config.customers.moveSpeed, deltaMs)) customer.phase = 'left';
  }
  updateQueueLayout(checkout, state);
}

function updateCheckout(config: SpatialShopConfig, state: GameState, deltaMs: number): void {
  const checkout = config.stations.find((station): station is CheckoutStation => station.kind === 'checkout');
  if (!checkout) return;
  for (const customer of state.customers) {
    if (customer.phase !== 'packing') continue;
    customer.packingRemainingMs = Math.max(0, (customer.packingRemainingMs ?? DEFAULT_CHECKOUT_PACKING_MS) - deltaMs);
    if ((customer.packingRemainingMs ?? 0) > 0) continue;
    customer.phase = 'leaving';
    state.cashPile += customer.basketValue;
    state.cashCollectionArmed = false;
    emitFeedback(state, 'checkout-pack', customer, checkout.position, { amount: customer.basketValue });
  }
  // REF-CASH-FLOW: player near checkout collects pending cash pile (step 3).
  // Service completion deposits into cashPile (step 2), not directly into wallet.
  const playerIsNear = isNear(config, state.player, checkout.position);
  if (!playerIsNear && state.cashPile > 0) state.cashCollectionArmed = true;
  if (playerIsNear && state.cashPile > 0 && state.cashCollectionArmed) {
    const collected = state.cashPile;
    state.currency += state.cashPile;
    state.cashPile = 0;
    state.cashCollectionArmed = false;
    emitFeedback(state, 'cash-collect', checkout.position, state.player, { amount: collected });
  }
  const queueHead = queueCustomers(state)[0];
  if (state.checkout.queue === 0 || !isNear(config, state.player, checkout.position) || !queueHead || queueHead.phase !== 'queued') {
    state.checkout.serviceProgressMs = 0;
    return;
  }
  const serviceMs = Math.max(100, checkout.serviceMs - state.checkout.speedBonusMs);
  state.checkout.serviceProgressMs += deltaMs;
  while (state.checkout.serviceProgressMs >= serviceMs && state.checkout.queue > 0) {
    state.checkout.serviceProgressMs -= serviceMs;
    const customer = queueCustomers(state)[0];
    if (!customer || customer.phase !== 'queued') {
      state.checkout.queue = 0;
      break;
    }
    customer.phase = 'packing';
    customer.packingRemainingMs = DEFAULT_CHECKOUT_PACKING_MS;
    emitFeedback(state, 'checkout-packing', customer, checkout.position, { amount: customer.basketValue });
    updateQueueLayout(checkout, state);
  }
}

function nextRandom(state: GameState): number {
  state.randomSeed = (Math.imul(state.randomSeed, 1_664_525) + 1_013_904_223) >>> 0;
  return state.randomSeed / 0x1_0000_0000;
}

function chooseDemand(config: SpatialShopConfig, state: GameState): { productId: string; shelfId: string } | undefined {
  const available = config.customers.demand.flatMap((demand) => {
    const shelf = config.stations.find((station): station is ShelfStation => station.kind === 'shelf' && isUnlocked(state, station.id) && station.acceptsProductIds.includes(demand.productId));
    return shelf ? [{ ...demand, shelfId: shelf.id }] : [];
  });
  const totalWeight = available.reduce((sum, demand) => sum + demand.weight, 0);
  let cursor = nextRandom(state) * totalWeight;
  for (const demand of available) {
    cursor -= demand.weight;
    if (cursor <= 0) return { productId: demand.productId, shelfId: demand.shelfId };
  }
  const fallback = available.at(-1);
  return fallback ? { productId: fallback.productId, shelfId: fallback.shelfId } : undefined;
}

export function spawnCustomer(config: SpatialShopConfig, stateValue: GameState): GameState {
  const state = cloneState(stateValue);
  const demand = chooseDemand(config, state);
  if (!demand) return state;
  state.customers.push({
    id: state.nextCustomerId,
    phase: 'to-shelf',
    productId: demand.productId,
    targetShelfId: demand.shelfId,
    patienceRemainingMs: config.customers.patienceMs,
    basketValue: 0,
    queuePosition: null,
    queueTicket: null,
    ...config.customers.entrance,
  });
  state.nextCustomerId += 1;
  const shelf = stationById(config, demand.shelfId);
  emitFeedback(state, 'customer-arrival', config.customers.entrance, shelf?.position ?? config.customers.entrance, { productId: demand.productId });
  return state;
}

export function stepGame(config: SpatialShopConfig, stateValue: GameState, input: MoveInput, deltaMs: number): GameState {
  const state = cloneState(stateValue);
  if (state.stage === 'settlement') return state;
  const safeDeltaMs = Math.max(0, Math.min(deltaMs, 1_000));
  state.elapsedMs += safeDeltaMs;
  updatePlayerMovement(config, state, input, safeDeltaMs);
  updateProducers(config, state, safeDeltaMs);
  updatePlayerInteraction(config, state, input, safeDeltaMs);
  updateCustomers(config, state, safeDeltaMs);
  updateCheckout(config, state, safeDeltaMs);
  return state;
}

export function advanceGame(config: SpatialShopConfig, stateValue: GameState, durationMs: number, input: MoveInput = { x: 0, y: 0 }): GameState {
  let state = cloneState(stateValue);
  let remaining = Math.max(0, durationMs);
  while (remaining > 0) {
    const step = Math.min(FIXED_STEP_MS, remaining);
    state = stepGame(config, state, input, step);
    remaining -= step;
  }
  return state;
}

export function setPlayerPosition(stateValue: GameState, position: Position): GameState {
  const state = cloneState(stateValue);
  state.player.x = position.x;
  state.player.y = position.y;
  state.player.interactionStationId = null;
  state.player.interactionProgressMs = 0;
  return state;
}

export function grantCurrency(stateValue: GameState, amount: number): GameState {
  const state = cloneState(stateValue);
  state.currency += Math.max(0, Math.floor(amount));
  return state;
}

export function setRandomSeed(stateValue: GameState, seed: number): GameState {
  const state = cloneState(stateValue);
  state.randomSeed = seed >>> 0;
  return state;
}

export function continueRound(stateValue: GameState, nextMarketId = 'coral-cove-market'): GameState {
  const state = cloneState(stateValue);
  state.stage = 'operating';
  state.nextMarketId = nextMarketId;
  state.player.interactionStationId = null;
  state.player.interactionProgressMs = 0;
  state.checkout.serviceProgressMs = 0;
  return state;
}

export function restartRound(config: SpatialShopConfig, stateValue: GameState): GameState {
  const state = createInitialState(config);
  state.randomSeed = stateValue.randomSeed;
  return state;
}
