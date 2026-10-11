/* global structuredClone */
import {
  EMPLOYEE_DEFINITIONS,
  MARKET_DEFINITIONS,
  PROCESSOR_DEFINITIONS,
  SEAGULL_GRACE_MS,
  SEAGULL_LOSS_PERIOD_MS,
  STOCKOUT_PATIENCE_MS,
  getMarketDefinition,
  type EmployeeRole,
  type RevisionMarketId,
} from './revision.js';

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
export type ProcessorStation = StationBase & {
  kind: 'processor';
  inputProductId: string;
  outputProductId: string;
  inputShelfId: string;
  outputShelfId: string;
  cycleMs: number;
  capacity: number;
};
export type EmployeeStation = StationBase & { kind: 'employee'; role: EmployeeRole; hireCost: number; contributionIntervalMs: number };
export type MarketMarkerStation = StationBase & { kind: 'market-marker' };
export type UpgradeStation = StationBase & {
  kind: 'upgrade';
  target: 'player-capacity' | 'player-speed' | 'checkout-speed';
  amount: number;
  baseCost: number;
  costMultiplier: number;
  maxPurchases: number;
  purchaseIntervalMs: number;
};
export type StationDefinition = ProducerStation | ShelfStation | CheckoutStation | ConstructionStation | ProcessorStation | EmployeeStation | MarketMarkerStation | UpgradeStation;

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
  revision?: {
    marketIds?: RevisionMarketId[];
    processorIds?: string[];
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
  | 'upgrade'
  | 'processor-blocked'
  | 'processor-ready'
  | 'employee-hired'
  | 'runner-pickup'
  | 'runner-deposit'
  | 'cashier-service'
  | 'seagull-alert'
  | 'seagull-loss'
  | 'seagull-scared'
  | 'market-marker'
  | 'market-selected'
  | 'market-goal'
  | 'customer-shortage';
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
  shoppingList?: ShoppingLine[];
  activeLineIndex?: number;
  departureReason?: 'stockout' | 'completed' | null;
  packingRemainingMs?: number;
};

export type ShoppingLine = { productId: string; quantity: number; collected: number; shelfId: string };

export type ProcessorRuntimeState = {
  inputShelfId: string;
  outputShelfId: string;
  inputProductId: string;
  outputProductId: string;
  progressMs: number;
  ready: number;
  capacity: number;
  cycleMs: number;
  unlocked: boolean;
  blockedReason: 'input' | 'capacity' | null;
};

export type EmployeeRuntimeState = {
  role: EmployeeRole;
  funded: boolean;
  paid: number;
  hireCost: number;
  position: Position;
  cargo: number;
  cargoCapacity: number;
  targetShelfId: string | null;
  status: 'idle' | 'to-net' | 'to-shelf' | 'service';
  serviceProgressMs: number;
};

export type HireStationRuntimeState = { role: EmployeeRole; paid: number; remaining: number; completed: boolean };

export type SeagullPressureState = {
  active: boolean;
  targetShelfId: string | null;
  x: number;
  y: number;
  mode: 'approaching' | 'raiding' | 'scared';
  graceMs: number;
  lossTimerMs: number;
  lossPeriodMs: number;
};

export type PressureRuntimeState = {
  seagull: SeagullPressureState;
  lastLossSource: string | null;
  lastLossDestination: string | null;
};

export type MarketProgress = {
  goalProgress: number;
  settled: boolean;
  constructionTarget: number;
  smokedOrders: number;
  dualShelfOrders: number;
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
  version: 2;
  elapsedMs: number;
  randomSeed: number;
  currency: number;
  cashPile: number;
  cashCollectionArmed: boolean;
  nextMarketId: string | null;
  marketId: RevisionMarketId;
  selectedRoute: RevisionMarketId | null;
  perMarketProgress: Record<RevisionMarketId, MarketProgress>;
  marketMarker: { enabled: boolean; position: Position; interactionProgressMs: number };
  marketSelectionOpen: boolean;
  level: number;
  stage: 'operating' | 'settlement' | 'market-selection';
  reducedMotion: boolean;
  player: Position & {
    inventory: Record<string, number>;
    capacity: number;
    speed: number;
    interactionStationId: string | null;
    interactionProgressMs: number;
  };
  stations: Record<string, StationRuntimeState>;
  processors: Record<string, ProcessorRuntimeState>;
  employees: Record<EmployeeRole, EmployeeRuntimeState>;
  hireStations: Record<EmployeeRole, HireStationRuntimeState>;
  pressure: PressureRuntimeState;
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
  const marketProgress = Object.fromEntries(
    Object.values(MARKET_DEFINITIONS).map((market) => [market.id, {
      goalProgress: 0,
      settled: market.id === 'beach-stall',
      constructionTarget: market.constructionTarget,
      smokedOrders: 0,
      dualShelfOrders: 0,
    }]),
  ) as Record<RevisionMarketId, MarketProgress>;
  const processors = Object.fromEntries(
    Object.entries(PROCESSOR_DEFINITIONS).map(([id, processor]) => [id, {
      inputShelfId: processor.inputShelfId,
      outputShelfId: processor.outputShelfId,
      inputProductId: processor.inputProductId,
      outputProductId: processor.outputProductId,
      progressMs: 0,
      ready: 0,
      capacity: processor.capacity,
      cycleMs: processor.cycleMs,
      unlocked: false,
      blockedReason: 'input' as const,
    }]),
  ) as Record<string, ProcessorRuntimeState>;
  const employees = Object.fromEntries(
    Object.entries(EMPLOYEE_DEFINITIONS).map(([role, definition]) => [role, {
      role: role as EmployeeRole,
      funded: false,
      paid: 0,
      hireCost: definition.hireCost,
      position: { ...config.stations.find((station) => station.id === definition.stationId)?.position ?? { x: 0, y: 0 } },
      cargo: 0,
      cargoCapacity: definition.cargoCapacity,
      targetShelfId: role === 'runner' ? 'fish-shelf' : null,
      status: role === 'runner' ? 'to-net' as const : 'idle' as const,
      serviceProgressMs: 0,
    }]),
  ) as Record<EmployeeRole, EmployeeRuntimeState>;
  const hireStations = Object.fromEntries(
    Object.entries(EMPLOYEE_DEFINITIONS).map(([role, definition]) => [role, {
      role: role as EmployeeRole,
      paid: 0,
      remaining: definition.hireCost,
      completed: false,
    }]),
  ) as Record<EmployeeRole, HireStationRuntimeState>;
  const marker = config.stations.find((station) => station.kind === 'market-marker');
  return {
    version: 2,
    elapsedMs: 0,
    randomSeed: 1,
    currency: config.economy.startingCurrency,
    cashPile: 0,
    cashCollectionArmed: false,
    nextMarketId: null,
    marketId: 'beach-stall',
    selectedRoute: null,
    perMarketProgress: marketProgress,
    marketMarker: {
      enabled: false,
      position: { ...(marker?.position ?? { x: 420, y: 820 }) },
      interactionProgressMs: 0,
    },
    marketSelectionOpen: false,
    level: 1,
    stage: 'operating',
    reducedMotion: false,
    player: {
      ...config.player.start,
      inventory: emptyInventory(config),
      capacity: config.player.capacity,
      speed: config.player.speed,
      interactionStationId: null,
      interactionProgressMs: 0,
    },
    stations: Object.fromEntries(config.stations.map((station) => [station.id, stationRuntime(station)])),
    processors,
    employees,
    hireStations,
    pressure: {
      seagull: {
        active: false,
        targetShelfId: null,
        x: 0,
        y: 0,
        mode: 'scared',
        graceMs: SEAGULL_GRACE_MS,
        lossTimerMs: SEAGULL_LOSS_PERIOD_MS,
        lossPeriodMs: SEAGULL_LOSS_PERIOD_MS,
      },
      lastLossSource: null,
      lastLossDestination: null,
    },
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

export function getStationPosition(state: Pick<GameState, 'marketId'>, station: StationDefinition): Position {
  const marketPosition = getMarketDefinition(state.marketId).stationPositions[station.id];
  return marketPosition ? { ...marketPosition } : { ...station.position };
}

function isNearStation(config: SpatialShopConfig, state: GameState, station: StationDefinition): boolean {
  return isNear(config, state.player, getStationPosition(state, station));
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

function shelfStockCount(runtime: StationRuntimeState | undefined): number {
  return runtime ? Object.values(runtime.stock).reduce((sum, count) => sum + count, 0) : 0;
}

function updateProcessors(config: SpatialShopConfig, state: GameState, deltaMs: number): void {
  for (const station of config.stations) {
    if (station.kind !== 'processor' || !isUnlocked(state, station.id)) continue;
    const processor = state.processors[station.id] ?? state.processors.smokehouse;
    if (!processor) continue;
    processor.unlocked = true;
    const inputShelf = state.stations[processor.inputShelfId];
    if (processor.ready >= processor.capacity) {
      processor.blockedReason = 'capacity';
      continue;
    }
    if ((inputShelf?.stock[processor.inputProductId] ?? 0) <= 0) {
      processor.blockedReason = 'input';
      continue;
    }
    processor.blockedReason = null;
    processor.progressMs += deltaMs;
    while (processor.progressMs >= processor.cycleMs && processor.ready < processor.capacity) {
      const available = inputShelf?.stock[processor.inputProductId] ?? 0;
      if (available <= 0) {
        processor.blockedReason = 'input';
        break;
      }
      processor.progressMs -= processor.cycleMs;
      inputShelf!.stock[processor.inputProductId] = available - 1;
      processor.ready += 1;
      emitFeedback(state, 'processor-ready', getStationPosition(state, station), getStationPosition(state, station), { productId: processor.outputProductId, amount: 1 });
    }
  }
}

function updateEmployees(config: SpatialShopConfig, state: GameState, deltaMs: number): void {
  const runner = state.employees.runner;
  if (!runner?.funded) return;
  const net = config.stations.find((station) => station.id === 'net');
  const fishShelf = config.stations.find((station) => station.id === 'fish-shelf');
  if (!net || !fishShelf || net.kind !== 'producer' || fishShelf.kind !== 'shelf') return;
  const netPosition = getStationPosition(state, net);
  const shelfPosition = getStationPosition(state, fishShelf);
  if (runner.status === 'to-net') {
    if (moveToward(runner.position, netPosition, 130, deltaMs)) {
      const netRuntime = state.stations[net.id];
      const cargo = Math.min(runner.cargoCapacity, netRuntime?.ready ?? 0);
      if (cargo > 0) {
        netRuntime!.ready -= cargo;
        runner.cargo = cargo;
        runner.status = 'to-shelf';
        emitFeedback(state, 'runner-pickup', netPosition, runner.position, { productId: net.outputProductId, amount: cargo });
      }
    }
    return;
  }
  if (runner.status === 'to-shelf') {
    if (moveToward(runner.position, shelfPosition, 130, deltaMs)) {
      const shelfRuntime = state.stations[fishShelf.id];
      const available = fishShelf.capacity - shelfStockCount(shelfRuntime);
      const delivered = Math.min(runner.cargo, Math.max(0, available));
      if (delivered > 0) {
        shelfRuntime!.stock[net.outputProductId] = (shelfRuntime!.stock[net.outputProductId] ?? 0) + delivered;
        runner.cargo -= delivered;
        emitFeedback(state, 'runner-deposit', runner.position, shelfPosition, { productId: net.outputProductId, amount: delivered });
      }
      if (runner.cargo === 0) runner.status = 'to-net';
    }
  }
}

function chooseSeagullShelf(config: SpatialShopConfig, state: GameState): ShelfStation | undefined {
  return config.stations.find((station): station is ShelfStation => station.kind === 'shelf'
    && isUnlocked(state, station.id)
    && shelfStockCount(state.stations[station.id]) > 0
    && station.acceptsProductIds.some((productId) => (state.stations[station.id]?.stock[productId] ?? 0) > 0));
}

function updateShelfPressure(config: SpatialShopConfig, state: GameState, deltaMs: number): void {
  const pressure = state.pressure.seagull;
  if (state.level < 2 || state.stage !== 'operating') return;
  if (!pressure.active) {
    if (state.elapsedMs < 2_500) return;
    const target = chooseSeagullShelf(config, state);
    if (!target) return;
    const targetPosition = getStationPosition(state, target);
    pressure.active = true;
    pressure.targetShelfId = target.id;
    pressure.x = targetPosition.x + 120;
    pressure.y = targetPosition.y - 72;
    pressure.mode = 'approaching';
    pressure.graceMs = SEAGULL_GRACE_MS;
    pressure.lossTimerMs = SEAGULL_LOSS_PERIOD_MS;
    emitFeedback(state, 'seagull-alert', { x: pressure.x, y: pressure.y }, targetPosition);
    return;
  }
  const target = pressure.targetShelfId ? stationById(config, pressure.targetShelfId) : undefined;
  if (!target || target.kind !== 'shelf') {
    pressure.active = false;
    pressure.mode = 'scared';
    return;
  }
  const targetPosition = getStationPosition(state, target);
  if (pressure.mode === 'approaching') {
    if (moveToward(pressure, targetPosition, 100, deltaMs)) {
      pressure.mode = 'raiding';
      pressure.graceMs = SEAGULL_GRACE_MS;
      emitFeedback(state, 'seagull-alert', targetPosition, targetPosition);
    }
    return;
  }
  if (isNear(config, state.player, targetPosition) || isNear(config, state.player, pressure)) {
    pressure.active = false;
    pressure.mode = 'scared';
    pressure.targetShelfId = null;
    emitFeedback(state, 'seagull-scared', pressure, state.player);
    return;
  }
  if (pressure.graceMs > 0) {
    pressure.graceMs = Math.max(0, pressure.graceMs - deltaMs);
    return;
  }
  pressure.lossTimerMs -= deltaMs;
  if (pressure.lossTimerMs > 0) return;
  pressure.lossTimerMs += pressure.lossPeriodMs;
  const runtime = state.stations[target.id];
  const productId = target.acceptsProductIds.find((candidate) => (runtime?.stock[candidate] ?? 0) > 0);
  if (!productId || !runtime) {
    pressure.active = false;
    pressure.mode = 'scared';
    pressure.targetShelfId = null;
    return;
  }
  runtime.stock[productId] = Math.max(0, (runtime.stock[productId] ?? 0) - 1);
  state.pressure.lastLossSource = target.id;
  state.pressure.lastLossDestination = 'seagull';
  emitFeedback(state, 'seagull-loss', targetPosition, pressure, { productId, amount: 1 });
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
  if (!runtime || !isUnlocked(state, station.id) || !isNearStation(config, state, station)) return null;
  if (station.kind === 'shelf' && firstCarriedProduct(config, state, station.acceptsProductIds) && Object.values(runtime.stock).reduce((sum, count) => sum + count, 0) < station.capacity) return 0;
  if (station.kind === 'producer' && runtime.ready > 0 && carriedCount(state) < state.player.capacity) return 1;
  if (station.kind === 'processor') {
    const processor = state.processors[station.id] ?? state.processors.smokehouse;
    if (processor?.ready && carriedCount(state) < state.player.capacity) return 1;
  }
  if (station.kind === 'checkout' && state.checkout.queue > 0) return 2;
  if (station.kind === 'employee') {
    const employee = state.employees[station.role];
    const hire = state.hireStations[station.role];
    if (employee && hire && !employee.funded && hire.remaining > 0 && state.currency > 0) return 3;
  }
  if (station.kind === 'construction' && !runtime.completed && runtime.contributed < station.cost && state.currency > 0) return 3;
  if (station.kind === 'market-marker' && state.marketMarker.enabled && state.stage === 'operating') return 1;
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
  if (station.kind === 'market-marker' && state.marketMarker.enabled && state.stage === 'operating') {
    state.stage = 'market-selection';
    state.marketSelectionOpen = true;
    state.marketMarker.interactionProgressMs = 0;
    emitFeedback(state, 'market-marker', getStationPosition(state, station), state.player);
    return;
  }
  const runtime = state.stations[station.id];
  if (!runtime) return;
  state.player.interactionProgressMs += deltaMs;

  const interval = station.kind === 'producer'
    ? config.player.pickupIntervalMs
    : station.kind === 'processor'
      ? config.player.pickupIntervalMs
    : station.kind === 'shelf'
      ? config.player.depositIntervalMs
      : station.kind === 'construction'
        ? station.contributionIntervalMs
        : station.kind === 'employee'
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
    if (station.kind === 'processor') {
      const processor = state.processors[station.id] ?? state.processors.smokehouse;
      if (processor && processor.ready > 0 && carriedCount(state) < state.player.capacity) {
        processor.ready -= 1;
        state.player.inventory[processor.outputProductId] = (state.player.inventory[processor.outputProductId] ?? 0) + 1;
        emitFeedback(state, 'pickup', getStationPosition(state, station), state.player, { productId: processor.outputProductId, amount: 1 });
        continue;
      }
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
    if (station.kind === 'employee' && state.currency > 0) {
      const hire = state.hireStations[station.role];
      const employee = state.employees[station.role];
      if (hire && employee && !hire.completed && hire.remaining > 0) {
        state.currency -= 1;
        hire.paid += 1;
        hire.remaining = Math.max(0, hire.remaining - 1);
        employee.paid = hire.paid;
        if (hire.remaining === 0) {
          hire.completed = true;
          employee.funded = true;
          employee.status = station.role === 'runner' ? 'to-net' : 'service';
          emitFeedback(state, 'employee-hired', getStationPosition(state, station), getStationPosition(state, station), { amount: hire.paid });
        } else {
          emitFeedback(state, 'invest', state.player, getStationPosition(state, station), { amount: 1 });
        }
        continue;
      }
    }
    if (station.kind === 'market-marker' && state.marketMarker.enabled && state.stage === 'operating') {
      state.stage = 'market-selection';
      state.marketSelectionOpen = true;
      state.marketMarker.interactionProgressMs = 0;
      emitFeedback(state, 'market-marker', getStationPosition(state, station), state.player);
      break;
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

function producerAvailable(config: SpatialShopConfig, state: GameState, productId: string): boolean {
  if (productId === 'smoked-fish') return state.processors.smokehouse?.unlocked === true || isUnlocked(state, 'smokehouse');
  return config.stations.some((station) => station.kind === 'producer' && station.outputProductId === productId && isUnlocked(state, station.id));
}

function compatibleShelf(config: SpatialShopConfig, state: GameState, productId: string): ShelfStation | undefined {
  return config.stations.find((station): station is ShelfStation => station.kind === 'shelf'
    && isUnlocked(state, station.id)
    && station.acceptsProductIds.includes(productId));
}

function makeShoppingLines(config: SpatialShopConfig, state: GameState): ShoppingLine[] {
  const marketDemand = new Set(getMarketDefinition(state.marketId).demandProductIds);
  const available = config.customers.demand
    .filter((demand) => marketDemand.has(demand.productId) && producerAvailable(config, state, demand.productId))
    .map((demand) => ({ demand, shelf: compatibleShelf(config, state, demand.productId) }))
    .filter((candidate): candidate is { demand: { productId: string; weight: number }; shelf: ShelfStation } => Boolean(candidate.shelf));
  if (available.length === 0) return [];
  const first = available[Math.floor(nextRandom(state) * available.length)] ?? available[0];
  if (!first) return [];
  const expanded = state.level > 1 || state.marketId !== 'beach-stall';
  const extra = expanded
    ? available.find((candidate) => candidate.demand.productId !== first.demand.productId)
    : undefined;
  const lines: ShoppingLine[] = [{ productId: first.demand.productId, quantity: 1, collected: 0, shelfId: first.shelf.id }];
  if (extra) lines.push({ productId: extra.demand.productId, quantity: 1, collected: 0, shelfId: extra.shelf.id });
  else if (expanded) lines[0]!.quantity = 2;
  return lines;
}

function shoppingLinesForCustomer(config: SpatialShopConfig, state: GameState, customer: CustomerState): ShoppingLine[] {
  if (customer.shoppingList?.length) return customer.shoppingList;
  const fallbackShelf = compatibleShelf(config, state, customer.productId);
  customer.shoppingList = [{ productId: customer.productId, quantity: 1, collected: customer.basketValue > 0 ? 1 : 0, shelfId: fallbackShelf?.id ?? customer.targetShelfId }];
  customer.activeLineIndex = 0;
  customer.departureReason = customer.departureReason ?? null;
  return customer.shoppingList;
}

function currentShoppingLine(config: SpatialShopConfig, state: GameState, customer: CustomerState): ShoppingLine | undefined {
  const lines = shoppingLinesForCustomer(config, state, customer);
  return lines[customer.activeLineIndex ?? 0];
}

function queueCustomers(state: GameState): CustomerState[] {
  return state.customers
    .filter((customer) => (customer.phase === 'to-checkout' || customer.phase === 'queued') && customer.queueTicket !== null)
    .sort((left, right) => (left.queueTicket ?? Number.MAX_SAFE_INTEGER) - (right.queueTicket ?? Number.MAX_SAFE_INTEGER));
}

function updateQueueLayout(checkout: CheckoutStation, state: GameState): void {
  const customers = queueCustomers(state);
  const checkoutPosition = getStationPosition(state, checkout);
  customers.forEach((customer, index) => {
    customer.queuePosition = { x: checkoutPosition.x, y: checkoutPosition.y + 40 + index * 40 };
  });
  state.checkout.queue = customers.filter((customer) => customer.phase === 'queued').length;
}

function takeShelfProduct(config: SpatialShopConfig, state: GameState, customer: CustomerState, checkout: CheckoutStation): boolean {
  const line = currentShoppingLine(config, state, customer);
  if (!line) return false;
  const runtime = state.stations[line.shelfId];
  if (!runtime || (runtime.stock[line.productId] ?? 0) <= 0) return false;
  const shelf = stationById(config, line.shelfId);
  runtime.stock[line.productId] = (runtime.stock[line.productId] ?? 0) - 1;
  line.collected = Math.min(line.quantity, line.collected + 1);
  customer.productId = line.productId;
  customer.targetShelfId = line.shelfId;
  customer.basketValue += productById(config, line.productId)?.saleValue ?? 0;
  emitFeedback(state, 'customer-pickup', getStationPosition(state, shelf ?? checkout), customer, { productId: line.productId, amount: 1 });

  if (line.collected < line.quantity) {
    customer.phase = 'waiting-shelf';
    customer.patienceRemainingMs = STOCKOUT_PATIENCE_MS;
    return true;
  }
  const lines = shoppingLinesForCustomer(config, state, customer);
  const nextIndex = lines.findIndex((candidate, index) => index > (customer.activeLineIndex ?? 0) && candidate.collected < candidate.quantity);
  if (nextIndex >= 0) {
    customer.activeLineIndex = nextIndex;
    const nextLine = lines[nextIndex]!;
    customer.productId = nextLine.productId;
    customer.targetShelfId = nextLine.shelfId;
    customer.phase = 'to-shelf';
    customer.patienceRemainingMs = STOCKOUT_PATIENCE_MS;
    customer.queuePosition = null;
    return true;
  }
  customer.phase = 'to-checkout';
  customer.departureReason = 'completed';
  customer.queueTicket = state.nextQueueTicket;
  state.nextQueueTicket += 1;
  customer.queuePosition = null;
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
      const reachedShelf = moveToward(customer, getStationPosition(state, shelf), config.customers.moveSpeed, deltaMs);
      if (reachedShelf) {
        customer.phase = 'waiting-shelf';
        customer.patienceRemainingMs = STOCKOUT_PATIENCE_MS;
        // Reaching the shelf starts the wait. The arrival frame itself is free.
        if (takeShelfProduct(config, state, customer, checkout)) continue;
        continue;
      }
    }
    if (customer.phase === 'waiting-shelf') {
      if (takeShelfProduct(config, state, customer, checkout)) continue;
      customer.patienceRemainingMs -= deltaMs;
      if (customer.patienceRemainingMs <= 0) {
        customer.phase = 'leaving';
        customer.departureReason = 'stockout';
        emitFeedback(state, 'customer-shortage', customer, config.customers.exit, { productId: customer.productId });
      }
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
  const checkoutPosition = getStationPosition(state, checkout);
  for (const customer of state.customers) {
    if (customer.phase !== 'packing') continue;
    customer.packingRemainingMs = Math.max(0, (customer.packingRemainingMs ?? DEFAULT_CHECKOUT_PACKING_MS) - deltaMs);
    if ((customer.packingRemainingMs ?? 0) > 0) continue;
    customer.phase = 'leaving';
    state.cashPile += customer.basketValue;
    state.cashCollectionArmed = false;
    emitFeedback(state, 'checkout-pack', customer, checkoutPosition, { amount: customer.basketValue });
    const marketProgress = state.perMarketProgress[state.marketId];
    if (marketProgress && state.marketId !== 'beach-stall') {
      const lineProducts = new Set((customer.shoppingList ?? []).map((line) => line.productId));
      if (lineProducts.has('smoked-fish')) marketProgress.smokedOrders += 1;
      if (new Set((customer.shoppingList ?? []).map((line) => line.shelfId)).size >= 2) marketProgress.dualShelfOrders += 1;
      const authoredGoalMet = state.marketId === 'coral-cove-market'
        ? marketProgress.smokedOrders >= marketProgress.constructionTarget
        : marketProgress.dualShelfOrders >= marketProgress.constructionTarget;
      marketProgress.goalProgress = Math.min(marketProgress.constructionTarget, authoredGoalMet ? marketProgress.constructionTarget : marketProgress.goalProgress + 1);
      emitFeedback(state, 'market-goal', checkoutPosition, customer, { amount: marketProgress.goalProgress });
      if (authoredGoalMet && !marketProgress.settled) {
        marketProgress.settled = true;
        state.stage = 'settlement';
        state.marketMarker.enabled = false;
      }
    }
  }
  // REF-CASH-FLOW: player near checkout collects pending cash pile (step 3).
  // Service completion deposits into cashPile (step 2), not directly into wallet.
  const playerIsNear = isNear(config, state.player, checkoutPosition);
  if (!playerIsNear && state.cashPile > 0) state.cashCollectionArmed = true;
  if (playerIsNear && state.cashPile > 0 && state.cashCollectionArmed) {
    const collected = state.cashPile;
    state.currency += state.cashPile;
    state.cashPile = 0;
    state.cashCollectionArmed = false;
    emitFeedback(state, 'cash-collect', checkoutPosition, state.player, { amount: collected });
  }
  const queueHead = queueCustomers(state)[0];
  const cashierActive = state.employees.cashier?.funded === true;
  if (state.checkout.queue === 0 || (!playerIsNear && !cashierActive) || !queueHead || queueHead.phase !== 'queued') {
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
    emitFeedback(state, cashierActive && !playerIsNear ? 'cashier-service' : 'checkout-packing', customer, checkoutPosition, { amount: customer.basketValue });
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
  const shoppingList = makeShoppingLines(config, state);
  const firstLine = shoppingList[0];
  if (!firstLine) return state;
  state.customers.push({
    id: state.nextCustomerId,
    phase: 'to-shelf',
    productId: firstLine.productId,
    targetShelfId: firstLine.shelfId,
    patienceRemainingMs: STOCKOUT_PATIENCE_MS,
    basketValue: 0,
    queuePosition: null,
    queueTicket: null,
    shoppingList,
    activeLineIndex: 0,
    departureReason: null,
    ...config.customers.entrance,
  });
  state.nextCustomerId += 1;
  const shelf = stationById(config, firstLine.shelfId);
  emitFeedback(state, 'customer-arrival', config.customers.entrance, shelf ? getStationPosition(state, shelf) : config.customers.entrance, { productId: firstLine.productId });
  return state;
}

export function stepGame(config: SpatialShopConfig, stateValue: GameState, input: MoveInput, deltaMs: number): GameState {
  const state = cloneState(stateValue);
  if (state.stage === 'settlement' || state.stage === 'market-selection') return state;
  const safeDeltaMs = Math.max(0, Math.min(deltaMs, 1_000));
  state.elapsedMs += safeDeltaMs;
  updatePlayerMovement(config, state, input, safeDeltaMs);
  updateProducers(config, state, safeDeltaMs);
  updateProcessors(config, state, safeDeltaMs);
  updateEmployees(config, state, safeDeltaMs);
  updateShelfPressure(config, state, safeDeltaMs);
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
  state.marketSelectionOpen = false;
  state.marketMarker.enabled = true;
  state.marketMarker.interactionProgressMs = 0;
  state.marketMarker.position = { ...(getMarketDefinition(state.marketId).stationPositions['market-entry'] ?? { x: 420, y: 820 }) };
  if (!state.unlockedStationIds.includes('market-entry')) state.unlockedStationIds.push('market-entry');
  state.player.interactionStationId = null;
  state.player.interactionProgressMs = 0;
  state.checkout.serviceProgressMs = 0;
  return state;
}

export function selectMarket(stateValue: GameState, marketId: string): GameState {
  const state = cloneState(stateValue);
  if (state.stage !== 'market-selection' || !(marketId in MARKET_DEFINITIONS)) return state;
  const selected = getMarketDefinition(marketId);
  state.marketId = selected.id;
  state.selectedRoute = selected.id;
  state.nextMarketId = selected.id;
  state.stage = 'operating';
  state.marketSelectionOpen = false;
  state.marketMarker.enabled = false;
  state.marketMarker.position = { ...(selected.stationPositions['market-entry'] ?? { x: 420, y: 820 }) };
  state.perMarketProgress[selected.id] ??= {
    goalProgress: 0,
    settled: false,
    constructionTarget: selected.constructionTarget,
    smokedOrders: 0,
    dualShelfOrders: 0,
  };
  state.customers = [];
  state.checkout.queue = 0;
  state.checkout.serviceProgressMs = 0;
  state.pressure.seagull.active = false;
  state.pressure.seagull.targetShelfId = null;
  state.player.interactionStationId = null;
  state.player.interactionProgressMs = 0;
  emitFeedback(state, 'market-selected', selected.stationPositions['market-entry'] ?? { x: 420, y: 820 }, state.player);
  return state;
}

export function recordMarketGoal(stateValue: GameState, amount = 1): GameState {
  const state = cloneState(stateValue);
  const progress = state.perMarketProgress[state.marketId];
  if (!progress || state.marketId === 'beach-stall') return state;
  progress.goalProgress = Math.min(progress.constructionTarget, progress.goalProgress + Math.max(0, Math.floor(amount)));
  if (progress.goalProgress >= progress.constructionTarget) {
    progress.settled = true;
    state.stage = 'settlement';
    state.marketMarker.enabled = false;
  }
  return state;
}

export function restartRound(config: SpatialShopConfig, stateValue: GameState): GameState {
  const state = createInitialState(config);
  state.randomSeed = stateValue.randomSeed;
  return state;
}
