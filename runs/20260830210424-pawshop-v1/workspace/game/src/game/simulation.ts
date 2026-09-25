import { ECONOMY, PRODUCT_IDS, type ProductId } from './economy';
import { createAdState, normalizeAdState, type AdState } from '../platform/ads';

export { ECONOMY, type ProductId };
export { PRODUCT_IDS } from './economy';

export const CURRENT_SAVE_VERSION = 5 as const;

export type Point = { x: number; y: number };
export type CustomerState = 'shopping' | 'waitingStock' | 'checkout' | 'leaving';
export type FacilityUpgradeId = keyof typeof ECONOMY.facilityUpgrades;

export type Customer = {
  id: number;
  product: ProductId;
  state: CustomerState;
  browseRemainingMs: number;
  patienceRemainingMs: number;
  substitutionUsed: boolean;
  order?: Partial<Record<ProductId, number>>;
  satisfaction?: number;
};

export type EmployeeRole = 'fisher' | 'porter' | 'courier' | 'gull';
export type EmployeeStatus = 'idle' | 'findTask' | 'selectTarget' | 'moveToTarget' | 'work' | 'slacking' | 'return' | 'checkFatigue' | 'rest';
export type Employee = { id: number; role: EmployeeRole; status: EmployeeStatus; level: number; efficiency: number; fatigue: number; workProgressMs?: number; wakeRequested?: boolean };
export type DeliveryOrder = { id: number; product: ProductId; quantity: number; reward: number; phase: 'queued' | 'inTransit'; progressMs: number };
export type DeliveryState = { orders: DeliveryOrder[]; nextOrderId: number; instantRemainingMs: number };
export type GullPhase = 'idle' | 'flying' | 'exploring' | 'returning';
export type GullState = { phase: GullPhase; remainingMs: number; reward: number; bonusMultiplier: 1 | 2; bonusRemainingMs: number };
export type OfflineState = { multiplier: 1 | 2; bonusRemainingMs: number };
export type AreaId = 1 | 2 | 3 | 4 | 5 | 6;
export type AreaProgress = { unlocked: AreaId[]; active: AreaId };
export type SystemSave = { saveVersion: typeof CURRENT_SAVE_VERSION; ads: AdState };

export type ShellToken = {
  id: number;
  value: number;
  x: number;
  y: number;
  pickupRemainingMs: number;
};

export type FirstTelemetry = {
  move: number | null;
  pickup: number | null;
  stock: number | null;
  sale: number | null;
  cashCollection: number | null;
  buildInvestment: number | null;
  unlock: number | null;
  upgrade: number | null;
};

export type GameTelemetry = {
  first: FirstTelemetry;
  fullCarrierMs: number;
  emptyShelfMs: Record<ProductId, number>;
  completedOrders: number;
  movementDistance: number;
  networkRequests: 0;
};

type ShrimpTrapState = {
  unlocked: boolean;
  invested: number;
  buffer: number;
  soakRemainingMs: number;
};

type CrabPotState = {
  unlocked: boolean;
  invested: number;
  readyCount: number;
  readyCapacity: number;
  latchRemainingMs: number;
};

export type GameState = {
  version: typeof CURRENT_SAVE_VERSION;
  currency: number;
  capacityTier: number;
  capacity: number;
  carrying: Record<ProductId, number>;
  shelves: Record<ProductId, number>;
  construction: { invested: number; kelpUnlocked: boolean };
  facilities: { shrimpTrap: ShrimpTrapState; crabPot: CrabPotState };
  facilityUpgrades: Record<FacilityUpgradeId, boolean>;
  facilityExperience: { fishNet: boolean; shrimpBatchesCollected: number; crabsSold: number };
  progression: {
    totalCompletedSales: number;
    completedSalesByProduct: Record<ProductId, number>;
  };
  player: Point;
  customers: Customer[];
  employees: Employee[];
  delivery: DeliveryState;
  gull: GullState;
  offline: OfflineState;
  checkoutQueue: number[];
  tokens: ShellToken[];
  timers: {
    harvest: Record<ProductId, number>;
    delivery: Record<ProductId, number>;
    investment: number;
    facilityInvestment: { shrimp: number; crab: number };
    facilityUpgrade: Record<FacilityUpgradeId, number>;
    checkout: number;
    upgrade: number;
    nextCustomerInMs: number;
  };
  nextCustomerId: number;
  nextTokenId: number;
  randomSeed: number;
  simulationTimeMs: number;
  savedAtMs: number;
  telemetry: GameTelemetry;
  areas: AreaProgress;
  ads: AdState;
  system: SystemSave;
};

export type GameEvent = {
  type: string;
  x?: number;
  y?: number;
  product?: ProductId;
  value?: number;
  reason?: string;
};

export type StepResult = { state: GameState; events: GameEvent[] };

export const STATIONS = {
  fishSource: { x: 82, y: 178, radius: 62 },
  kelpSource: { x: 458, y: 184, radius: 62 },
  shrimpTrap: { x: 116, y: 310, radius: 62 },
  crabPot: { x: 424, y: 310, radius: 62 },
  fishShelf: { x: 112, y: 456, radius: 58 },
  kelpShelf: { x: 428, y: 456, radius: 58 },
  shrimpShelf: { x: 112, y: 584, radius: 58 },
  crabShelf: { x: 428, y: 584, radius: 58 },
  checkout: { x: 270, y: 718, radius: 70 },
} as const;

// Customers enter from the shop door below the checkout counter before walking to a shelf.
// Keeping this in the simulation module makes the visual route a single source of truth.
export const CUSTOMER_ENTRY: Point = { x: STATIONS.checkout.x, y: 824 };

export const OLD_CONSTRUCTION_LOCATION: Point = { x: 468, y: 876 };

const emptyProducts = (): Record<ProductId, number> => ({ fish: 0, kelp: 0, shrimp: 0, crab: 0 });
const defaultTelemetry = (): GameTelemetry => ({
  first: {
    move: null,
    pickup: null,
    stock: null,
    sale: null,
    cashCollection: null,
    buildInvestment: null,
    unlock: null,
    upgrade: null,
  },
  fullCarrierMs: 0,
  emptyShelfMs: emptyProducts(),
  completedOrders: 0,
  movementDistance: 0,
  networkRequests: 0,
});

export function createInitialState(nowMs = Date.now()): GameState {
  return {
    version: CURRENT_SAVE_VERSION,
    currency: 0,
    capacityTier: 0,
    capacity: ECONOMY.carrier.initialCapacity,
    carrying: emptyProducts(),
    shelves: emptyProducts(),
    construction: { invested: 0, kelpUnlocked: false },
    facilities: {
      shrimpTrap: { unlocked: false, invested: 0, buffer: 0, soakRemainingMs: ECONOMY.products.shrimp.productionCycleMs },
      crabPot: {
        unlocked: false,
        invested: 0,
        readyCount: 0,
        readyCapacity: ECONOMY.products.crab.bufferCapacity,
        latchRemainingMs: ECONOMY.products.crab.productionCycleMs,
      },
    },
    facilityUpgrades: { fishNetSpeed: false, shrimpTrapSpeed: false, crabPotReadyCapacity: false },
    facilityExperience: { fishNet: false, shrimpBatchesCollected: 0, crabsSold: 0 },
    progression: { totalCompletedSales: 0, completedSalesByProduct: emptyProducts() },
    player: { x: 270, y: 646 },
    customers: [],
    employees: [],
    delivery: { orders: [], nextOrderId: 1, instantRemainingMs: 0 },
    gull: { phase: 'idle', remainingMs: 0, reward: 0, bonusMultiplier: 1, bonusRemainingMs: 0 },
    offline: { multiplier: 1, bonusRemainingMs: 0 },
    checkoutQueue: [],
    tokens: [],
    timers: {
      harvest: emptyProducts(),
      delivery: emptyProducts(),
      investment: 0,
      facilityInvestment: { shrimp: 0, crab: 0 },
      facilityUpgrade: { fishNetSpeed: 0, shrimpTrapSpeed: 0, crabPotReadyCapacity: 0 },
      checkout: 0,
      upgrade: 0,
      nextCustomerInMs: ECONOMY.customers.firstSpawnDelayMs,
    },
    nextCustomerId: 1,
    nextTokenId: 1,
    randomSeed: 1,
    simulationTimeMs: 0,
    savedAtMs: nowMs,
    telemetry: defaultTelemetry(),
    areas: { unlocked: [1], active: 1 },
    ads: createAdState(),
    system: { saveVersion: CURRENT_SAVE_VERSION, ads: createAdState() },
  };
}

const finite = (value: unknown, fallback = 0) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);
const whole = (value: unknown, fallback = 0) => Math.max(0, Math.floor(finite(value, fallback)));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';
const CARRIER_CAPACITIES = [ECONOMY.carrier.initialCapacity, ...ECONOMY.carrier.tiers.map((tier) => tier.capacity)];

function smallestCarrierTierFor(value: number) {
  const tier = CARRIER_CAPACITIES.findIndex((capacity) => value <= capacity);
  return tier < 0 ? ECONOMY.carrier.maxPurchases : tier;
}

function normalizeFirst(raw: unknown): FirstTelemetry {
  const value = isRecord(raw) ? raw : {};
  const stamp = (key: keyof FirstTelemetry) => {
    const candidate = finite(value[key], Number.NaN);
    return Number.isFinite(candidate) ? Math.max(0, candidate) : null;
  };
  return {
    move: stamp('move'), pickup: stamp('pickup'), stock: stamp('stock'), sale: stamp('sale'),
    cashCollection: stamp('cashCollection'), buildInvestment: stamp('buildInvestment'),
    unlock: stamp('unlock'), upgrade: stamp('upgrade'),
  };
}

function productFrom(raw: unknown): ProductId {
  return PRODUCT_IDS.includes(raw as ProductId) ? raw as ProductId : 'fish';
}

function normalizeCustomers(raw: unknown): Customer[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): Customer[] => {
    if (!isRecord(entry)) return [];
    const legacyPhase = typeof entry.phase === 'string' ? entry.phase : null;
    if (legacyPhase === 'leaving' || legacyPhase === 'left') return [];
    const product = productFrom(entry.product ?? entry.productId);
    const state: CustomerState = entry.state === 'checkout' || legacyPhase === 'queued' || legacyPhase === 'to-checkout'
      ? 'checkout'
      : entry.state === 'waitingStock' || legacyPhase === 'waiting-stock' || legacyPhase === 'waiting-shelf'
        ? 'waitingStock'
        : 'shopping';
    const defaultPatience = product === 'crab' ? ECONOMY.customers.crabStockPatienceMs : ECONOMY.customers.stockPatienceMs;
    return [{
      id: Math.max(1, whole(entry.id, 1)),
      product,
      state,
      browseRemainingMs: whole(entry.browseRemainingMs, ECONOMY.customers.browseDurationMs),
      patienceRemainingMs: whole(entry.patienceRemainingMs, defaultPatience),
      substitutionUsed: entry.substitutionUsed === true,
      order: isRecord(entry.order) ? PRODUCT_IDS.reduce<Partial<Record<ProductId, number>>>((result, product) => {
        const count = whole((entry.order as Record<string, unknown>)[product]);
        if (count > 0) result[product] = count;
        return result;
      }, {}) : undefined,
      satisfaction: typeof entry.satisfaction === 'number' ? clamp(entry.satisfaction, 0, 1) : undefined,
    }];
  }).slice(0, ECONOMY.customers.maxActive);
}

export function normalizeSave(raw: unknown, nowMs = Date.now()): GameState {
  const base = createInitialState(nowMs);
  if (!isRecord(raw)) return base;

  const legacyV3 = whole(raw.version) === 3;
  const rawPlayer = isRecord(raw.player) ? raw.player : {};
  const rawUpgrade = isRecord(raw.upgrade) ? raw.upgrade : {};
  const rawCapacity = whole(legacyV3 ? rawPlayer.capacity : raw.capacity, ECONOMY.carrier.initialCapacity);
  const rawCarrying = legacyV3
    ? (isRecord(rawPlayer.inventory) ? rawPlayer.inventory : { fish: rawPlayer.inventory })
    : isRecord(raw.carrying) ? raw.carrying : isRecord(raw.inventory) ? raw.inventory : { fish: raw.inventory };
  const requested = PRODUCT_IDS.reduce<Record<ProductId, number>>((result, product) => {
    result[product] = whole(rawCarrying[product]);
    return result;
  }, emptyProducts());
  const carriedTotal = PRODUCT_IDS.reduce((sum, product) => sum + requested[product], 0);
  const tierForCapacity = smallestCarrierTierFor(rawCapacity);
  const tierForInventory = smallestCarrierTierFor(carriedTotal);
  const rawTier = legacyV3
    ? Math.max(tierForCapacity, tierForInventory, whole(rawUpgrade.purchases))
    : whole(raw.capacityTier, tierForCapacity);
  const capacityTier = clamp(rawTier, 0, ECONOMY.carrier.maxPurchases);
  const capacity = CARRIER_CAPACITIES[capacityTier] ?? ECONOMY.carrier.initialCapacity;
  let remainingCapacity = capacity;
  const carrying = PRODUCT_IDS.reduce<Record<ProductId, number>>((result, product) => {
    result[product] = Math.min(remainingCapacity, requested[product]);
    remainingCapacity -= result[product];
    return result;
  }, emptyProducts());

  const rawShelves = isRecord(raw.shelves) ? raw.shelves : {};
  const shelves = PRODUCT_IDS.reduce<Record<ProductId, number>>((result, product) => {
    result[product] = clamp(whole(rawShelves[product]), 0, ECONOMY.shelves.capacityByProduct[product]);
    return result;
  }, emptyProducts());
  const rawConstruction = isRecord(raw.construction) ? raw.construction : {};
  const legacyUnlocked = rawConstruction.unlocked === true || rawConstruction.kelpUnlocked === true;
  const legacyRequired = Math.max(1, whole(rawConstruction.required, ECONOMY.legacyV4.kelpInvestmentCost));
  const invested = legacyV3
    ? legacyUnlocked ? ECONOMY.kelpUnlock.investmentCost : clamp(
      Math.floor(whole(rawConstruction.invested) / legacyRequired * ECONOMY.kelpUnlock.investmentCost),
      0,
      ECONOMY.kelpUnlock.investmentCost,
    )
    : clamp(whole(rawConstruction.invested), 0, ECONOMY.kelpUnlock.investmentCost);

  const rawFacilities = isRecord(raw.facilities) ? raw.facilities : {};
  const rawShrimp = isRecord(rawFacilities.shrimpTrap) ? rawFacilities.shrimpTrap : {};
  const rawCrab = isRecord(rawFacilities.crabPot) ? rawFacilities.crabPot : {};
  const rawFacilityUpgrades = isRecord(raw.facilityUpgrades) ? raw.facilityUpgrades : {};
  const facilityUpgrades = {
    fishNetSpeed: rawFacilityUpgrades.fishNetSpeed === true,
    shrimpTrapSpeed: rawFacilityUpgrades.shrimpTrapSpeed === true,
    crabPotReadyCapacity: rawFacilityUpgrades.crabPotReadyCapacity === true,
  };
  const shrimpCycle = facilityUpgrades.shrimpTrapSpeed
    ? ECONOMY.facilityUpgrades.shrimpTrapSpeed.productionCycleMs
    : ECONOMY.products.shrimp.productionCycleMs;
  const readyCapacity = facilityUpgrades.crabPotReadyCapacity
    ? ECONOMY.facilityUpgrades.crabPotReadyCapacity.readyCapacity
    : ECONOMY.products.crab.bufferCapacity;

  const rawTimers = isRecord(raw.timers) ? raw.timers : {};
  const rawCheckout = isRecord(raw.checkout) ? raw.checkout : {};
  const rawHarvest = isRecord(rawTimers.harvest) ? rawTimers.harvest : {};
  const rawDelivery = isRecord(rawTimers.delivery) ? rawTimers.delivery : {};
  const rawFacilityInvestment = isRecord(rawTimers.facilityInvestment) ? rawTimers.facilityInvestment : {};
  const rawFacilityUpgradeTimers = isRecord(rawTimers.facilityUpgrade) ? rawTimers.facilityUpgrade : {};
  const customers = normalizeCustomers(raw.customers);
  const rawEmployees = Array.isArray(raw.employees) ? raw.employees : [];
  const employees: Employee[] = rawEmployees.flatMap((entry): Employee[] => {
    if (!isRecord(entry)) return [];
    const roles: EmployeeRole[] = ['fisher', 'porter', 'courier', 'gull'];
    const statuses: EmployeeStatus[] = ['idle','findTask','selectTarget','moveToTarget','work','slacking','return','checkFatigue','rest'];
    const role = roles.includes(entry.role as EmployeeRole) ? entry.role as EmployeeRole : 'porter';
    const status = statuses.includes(entry.status as EmployeeStatus) ? entry.status as EmployeeStatus : 'idle';
    const level = clamp(whole(entry.level, 1), 1, 3);
    return [{ id: Math.max(1, whole(entry.id, 1)), role, status, level, efficiency: clamp(finite(entry.efficiency, 1 + (level - 1) * 0.1), 1, 1.2), fatigue: clamp(finite(entry.fatigue), 0, 1), workProgressMs: whole(entry.workProgressMs), wakeRequested: entry.wakeRequested === true }];
  }).slice(0, 8);
  const rawDeliveryState = isRecord(raw.delivery) ? raw.delivery : {};
  const deliveryOrders: DeliveryOrder[] = Array.isArray(rawDeliveryState.orders)
    ? rawDeliveryState.orders.flatMap((entry): DeliveryOrder[] => {
      if (!isRecord(entry)) return [];
      const product = productFrom(entry.product);
      const phase = entry.phase === 'inTransit' ? 'inTransit' : 'queued';
      return [{
        id: Math.max(1, whole(entry.id, 1)),
        product,
        quantity: Math.max(1, whole(entry.quantity, 1)),
        reward: whole(entry.reward, ECONOMY.products[product].saleReward),
        phase,
        progressMs: Math.min(whole(entry.progressMs), ECONOMY.checkout.serviceIntervalMs - 1),
      }];
    }).slice(0, 8)
    : [];
  const nextDeliveryId = Math.max(
    whole(rawDeliveryState.nextOrderId, 1),
    deliveryOrders.reduce((max, order) => Math.max(max, order.id + 1), 1),
  );
  const deliveryInstantRemainingMs = Math.max(0, whole(rawDeliveryState.instantRemainingMs));
  const rawGull = isRecord(raw.gull) ? raw.gull : {};
  const gullPhases: GullPhase[] = ['idle', 'flying', 'exploring', 'returning'];
  const gullPhase = gullPhases.includes(rawGull.phase as GullPhase) ? rawGull.phase as GullPhase : 'idle';
  const rawOffline = isRecord(raw.offline) ? raw.offline : {};
  const validIds = new Set(customers.map((customer) => customer.id));
  const rawQueue = Array.isArray(raw.checkoutQueue) ? raw.checkoutQueue : Array.isArray(rawCheckout.queue) ? rawCheckout.queue : [];
  const checkoutQueue = rawQueue.map((id) => whole(id)).filter((id, index, ids) => validIds.has(id) && ids.indexOf(id) === index);
  const rawTokens = Array.isArray(raw.tokens) ? raw.tokens : Array.isArray(raw.shellTokens) ? raw.shellTokens : [];
  const tokens = rawTokens.flatMap((entry): ShellToken[] => {
    if (!isRecord(entry)) return [];
    return [{
      id: Math.max(1, whole(entry.id, 1)),
      value: whole(entry.value),
      x: finite(entry.x, STATIONS.checkout.x),
      y: finite(entry.y, STATIONS.checkout.y),
      pickupRemainingMs: typeof entry.pickupRemainingMs === 'number'
        ? whole(entry.pickupRemainingMs)
        : Math.max(0, ECONOMY.checkout.tokenPickupDelayMs - whole(entry.ageMs)),
    }];
  });
  const rawTelemetry = isRecord(raw.telemetry) ? raw.telemetry : {};
  const rawEmptyShelf = isRecord(rawTelemetry.emptyShelfMs) ? rawTelemetry.emptyShelfMs : {};
  const rawProgression = isRecord(raw.progression) ? raw.progression : {};
  const rawSales = isRecord(rawProgression.completedSalesByProduct) ? rawProgression.completedSalesByProduct : {};
  const completedOrders = whole(rawTelemetry.completedOrders);
  const completedSalesByProduct = PRODUCT_IDS.reduce<Record<ProductId, number>>((result, product) => {
    result[product] = whole(rawSales[product]);
    return result;
  }, emptyProducts());
  const rawExperience = isRecord(raw.facilityExperience) ? raw.facilityExperience : {};
  const rawAreas = isRecord(raw.areas) ? raw.areas : {};
  const unlockedAreas: AreaId[] = Array.isArray(rawAreas.unlocked)
    ? rawAreas.unlocked.filter((value): value is AreaId => Number.isInteger(value) && value >= 1 && value <= 6)
      .filter((value, index, values) => values.indexOf(value) === index).sort((a, b) => a - b) as AreaId[]
    : [1];
  if (!unlockedAreas.includes(1)) unlockedAreas.unshift(1);
  const activeArea = Number.isInteger(rawAreas.active) && unlockedAreas.includes(rawAreas.active as AreaId)
    ? rawAreas.active as AreaId : unlockedAreas[unlockedAreas.length - 1] ?? 1;
  const rawSystem = isRecord(raw.system) ? raw.system : {};
  const normalizedAds = normalizeAdState(raw.ads ?? rawSystem.ads);

  return {
    ...base,
    currency: whole(raw.currency),
    capacityTier,
    capacity,
    carrying,
    shelves,
    construction: { invested, kelpUnlocked: legacyUnlocked || invested >= ECONOMY.kelpUnlock.investmentCost },
    facilities: {
      shrimpTrap: {
        unlocked: rawShrimp.unlocked === true,
        invested: clamp(whole(rawShrimp.invested), 0, ECONOMY.facilityUnlocks.shrimp.investmentCost),
        buffer: clamp(whole(rawShrimp.buffer), 0, ECONOMY.products.shrimp.bufferCapacity),
        soakRemainingMs: clamp(whole(rawShrimp.soakRemainingMs, shrimpCycle), 0, shrimpCycle),
      },
      crabPot: {
        unlocked: rawCrab.unlocked === true,
        invested: clamp(whole(rawCrab.invested), 0, ECONOMY.facilityUnlocks.crab.investmentCost),
        readyCount: clamp(whole(rawCrab.readyCount), 0, readyCapacity),
        readyCapacity,
        latchRemainingMs: clamp(
          whole(rawCrab.latchRemainingMs, ECONOMY.products.crab.productionCycleMs),
          0,
          ECONOMY.products.crab.productionCycleMs,
        ),
      },
    },
    facilityUpgrades,
    facilityExperience: {
      fishNet: rawExperience.fishNet === true,
      shrimpBatchesCollected: whole(rawExperience.shrimpBatchesCollected),
      crabsSold: whole(rawExperience.crabsSold),
    },
    progression: {
      totalCompletedSales: whole(rawProgression.totalCompletedSales, completedOrders),
      completedSalesByProduct,
    },
    player: isRecord(raw.player)
      ? { x: finite(raw.player.x, base.player.x), y: finite(raw.player.y, base.player.y) }
      : base.player,
    customers,
    employees,
    delivery: { orders: deliveryOrders, nextOrderId: nextDeliveryId, instantRemainingMs: deliveryInstantRemainingMs },
    gull: {
      phase: gullPhase,
      remainingMs: Math.max(0, whole(rawGull.remainingMs)),
      reward: whole(rawGull.reward),
      bonusMultiplier: rawGull.bonusMultiplier === 2 ? 2 : 1,
      bonusRemainingMs: Math.max(0, whole(rawGull.bonusRemainingMs)),
    },
    offline: {
      multiplier: rawOffline.multiplier === 2 ? 2 : 1,
      bonusRemainingMs: Math.max(0, whole(rawOffline.bonusRemainingMs)),
    },
    checkoutQueue,
    tokens,
    timers: {
      harvest: PRODUCT_IDS.reduce<Record<ProductId, number>>((result, product) => {
        const interval = product === 'fish'
          ? (facilityUpgrades.fishNetSpeed ? ECONOMY.facilityUpgrades.fishNetSpeed.pickupIntervalMs : ECONOMY.products.fish.pickupIntervalMs)
          : product === 'kelp' ? ECONOMY.products.kelp.pickupIntervalMs : ECONOMY.sourceCollectionIntervalMs;
        result[product] = Math.min(whole(rawHarvest[product]), interval - 1);
        return result;
      }, emptyProducts()),
      delivery: PRODUCT_IDS.reduce<Record<ProductId, number>>((result, product) => {
        result[product] = Math.min(whole(rawDelivery[product]), ECONOMY.shelves.deliveryIntervalMs - 1);
        return result;
      }, emptyProducts()),
      investment: Math.min(whole(rawTimers.investment), ECONOMY.kelpUnlock.investmentIntervalMsPerCoin - 1),
      facilityInvestment: {
        shrimp: Math.min(whole(rawFacilityInvestment.shrimp), ECONOMY.facilityUnlocks.investmentIntervalMsPerCoin - 1),
        crab: Math.min(whole(rawFacilityInvestment.crab), ECONOMY.facilityUnlocks.investmentIntervalMsPerCoin - 1),
      },
      facilityUpgrade: {
        fishNetSpeed: Math.min(whole(rawFacilityUpgradeTimers.fishNetSpeed), ECONOMY.carrier.purchaseIntervalMs - 1),
        shrimpTrapSpeed: Math.min(whole(rawFacilityUpgradeTimers.shrimpTrapSpeed), ECONOMY.carrier.purchaseIntervalMs - 1),
        crabPotReadyCapacity: Math.min(whole(rawFacilityUpgradeTimers.crabPotReadyCapacity), ECONOMY.carrier.purchaseIntervalMs - 1),
      },
      checkout: Math.min(whole(rawTimers.checkout, finite(rawCheckout.serviceProgressMs)), ECONOMY.checkout.serviceIntervalMs - 1),
      upgrade: Math.min(whole(rawTimers.upgrade), ECONOMY.carrier.purchaseIntervalMs - 1),
      nextCustomerInMs: Math.max(0, finite(rawTimers.nextCustomerInMs, ECONOMY.customers.firstSpawnDelayMs)),
    },
    nextCustomerId: Math.max(whole(raw.nextCustomerId, 1), customers.reduce((max, customer) => Math.max(max, customer.id + 1), 1)),
    nextTokenId: Math.max(whole(raw.nextTokenId, 1), tokens.reduce((max, token) => Math.max(max, token.id + 1), 1)),
    randomSeed: whole(raw.randomSeed, 1) >>> 0,
    simulationTimeMs: whole(raw.simulationTimeMs, whole(raw.elapsedMs)),
    savedAtMs: finite(raw.savedAtMs, nowMs),
    telemetry: {
      first: normalizeFirst(rawTelemetry.first),
      fullCarrierMs: whole(rawTelemetry.fullCarrierMs),
      emptyShelfMs: PRODUCT_IDS.reduce<Record<ProductId, number>>((result, product) => {
        result[product] = whole(rawEmptyShelf[product]);
        return result;
      }, emptyProducts()),
      completedOrders,
      movementDistance: Math.max(0, finite(rawTelemetry.movementDistance)),
      networkRequests: 0,
    },
    areas: { unlocked: unlockedAreas, active: activeArea },
    ads: normalizedAds,
    system: { saveVersion: CURRENT_SAVE_VERSION, ads: structuredClone(normalizedAds) },
  };
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (point: Point, station: Point & { radius: number }) => distance(point, station) <= station.radius;
const carryingCount = (state: GameState) => PRODUCT_IDS.reduce((sum, product) => sum + state.carrying[product], 0);
const shelfStation = (product: ProductId) => STATIONS[`${product}Shelf` as keyof typeof STATIONS];

function stampFirst(state: GameState, key: keyof FirstTelemetry) {
  if (state.telemetry.first[key] === null) state.telemetry.first[key] = state.simulationTimeMs;
}

function nextRandom(state: GameState) {
  state.randomSeed = (Math.imul(state.randomSeed, 1_664_525) + 1_013_904_223) >>> 0;
  return state.randomSeed / 0x1_0000_0000;
}

function chooseCustomerProduct(state: GameState): ProductId {
  if (!state.construction.kelpUnlocked) return 'fish';
  const roll = nextRandom(state);
  if (state.facilities.crabPot.unlocked) {
    const weights = ECONOMY.customers.demandAfterAllUnlock;
    if (roll < weights.fish) return 'fish';
    if (roll < weights.fish + weights.kelp) return 'kelp';
    if (roll < weights.fish + weights.kelp + weights.shrimp) return 'shrimp';
    return 'crab';
  }
  if (state.facilities.shrimpTrap.unlocked) return roll < 0.56 ? 'fish' : roll < 0.83 ? 'kelp' : 'shrimp';
  return roll < ECONOMY.customers.postUnlockFishProbability ? 'fish' : 'kelp';
}

function addCustomer(state: GameState, requested: ProductId, events: GameEvent[]) {
  if (state.customers.length >= ECONOMY.customers.maxActive) return;
  let product = requested;
  if ((product === 'kelp' && !state.construction.kelpUnlocked)
    || (product === 'shrimp' && !state.facilities.shrimpTrap.unlocked)
    || (product === 'crab' && !state.facilities.crabPot.unlocked)) product = 'fish';
  if ((product === 'shrimp' || product === 'crab') && state.customers.some((customer) => customer.product === product)) {
    product = 'fish';
  }
  const customer: Customer = {
    id: state.nextCustomerId++,
    product,
    state: 'shopping',
    browseRemainingMs: ECONOMY.customers.browseDurationMs,
    patienceRemainingMs: product === 'crab' ? ECONOMY.customers.crabStockPatienceMs : ECONOMY.customers.stockPatienceMs,
    substitutionUsed: false,
    order: { [product]: 1 },
    satisfaction: 1,
  };
  state.customers.push(customer);
  events.push({ type: 'customerSpawned', product });
}

export function spawnCustomerNow(state: GameState, product?: ProductId | Partial<Record<ProductId, number>>): StepResult {
  const next = structuredClone(state);
  const events: GameEvent[] = [];
  if (product && typeof product === 'object') {
    const first = PRODUCT_IDS.find((id) => (product[id] ?? 0) > 0) ?? 'fish';
    addCustomer(next, first, events);
    const customer = next.customers[next.customers.length - 1];
    if (customer) customer.order = PRODUCT_IDS.reduce<Partial<Record<ProductId, number>>>((result, id) => {
      const count = whole(product[id]);
      if (count > 0) result[id] = count;
      return result;
    }, {});
  } else addCustomer(next, product ?? chooseCustomerProduct(next), events);
  return { state: next, events };
}

function enqueueCustomer(state: GameState, customer: Customer, events: GameEvent[]) {
  const order = customer.order ?? { [customer.product]: 1 };
  const canFulfill = PRODUCT_IDS.every((product) => (order[product] ?? 0) <= state.shelves[product]);
  if (!canFulfill) {
    if (customer.state !== 'waitingStock') {
      customer.state = 'waitingStock';
      customer.patienceRemainingMs = customer.product === 'crab'
        ? ECONOMY.customers.crabStockPatienceMs
        : ECONOMY.customers.stockPatienceMs;
      const shelf = shelfStation(customer.product);
      events.push({ type: 'customerWaiting', product: customer.product, x: shelf.x, y: shelf.y });
    }
    return;
  }
  PRODUCT_IDS.forEach((product) => { state.shelves[product] -= order[product] ?? 0; });
  const maxPatience = customer.product === 'crab' ? ECONOMY.customers.crabStockPatienceMs : ECONOMY.customers.stockPatienceMs;
  customer.satisfaction = clamp(customer.patienceRemainingMs / maxPatience, 0, 1);
  const shelf = shelfStation(customer.product);
  events.push({ type: 'customerPickedUp', product: customer.product, x: shelf.x, y: shelf.y });
  customer.state = 'checkout';
  state.checkoutQueue.push(customer.id);
  events.push({ type: 'queueAdvanced', product: customer.product, x: STATIONS.checkout.x, y: STATIONS.checkout.y });
}

function processCustomers(state: GameState, elapsedMs: number, events: GameEvent[]) {
  const leaving = new Set<number>();
  for (const customer of state.customers) {
    if (customer.state === 'leaving') {
      customer.browseRemainingMs = Math.max(0, customer.browseRemainingMs - elapsedMs);
      if (customer.browseRemainingMs === 0) leaving.add(customer.id);
      continue;
    }
    if (customer.state === 'shopping') {
      customer.browseRemainingMs = Math.max(0, customer.browseRemainingMs - elapsedMs);
      if (customer.browseRemainingMs === 0) enqueueCustomer(state, customer, events);
      continue;
    }
    if (customer.state !== 'waitingStock') continue;
    if (state.shelves[customer.product] > 0) {
      enqueueCustomer(state, customer, events);
      continue;
    }
    customer.patienceRemainingMs = Math.max(0, customer.patienceRemainingMs - elapsedMs);
    if (customer.product === 'shrimp'
      && !customer.substitutionUsed
      && customer.patienceRemainingMs <= ECONOMY.customers.stockPatienceMs / 2) {
      const fallback = state.shelves.fish > 0 ? 'fish' : state.shelves.kelp > 0 ? 'kelp' : null;
      if (fallback) {
        customer.product = fallback;
        customer.order = { [fallback]: 1 };
        customer.substitutionUsed = true;
        events.push({ type: 'customerSubstituted', product: fallback });
        enqueueCustomer(state, customer, events);
        continue;
      }
    }
    if (customer.patienceRemainingMs === 0) leaving.add(customer.id);
  }
  if (leaving.size > 0) {
    state.customers = state.customers.filter((customer) => !leaving.has(customer.id));
    events.push({ type: 'customerLeft' });
  }
}

function processSpawning(state: GameState, elapsedMs: number, events: GameEvent[]) {
  state.timers.nextCustomerInMs -= elapsedMs;
  while (state.timers.nextCustomerInMs <= 0) {
    addCustomer(state, chooseCustomerProduct(state), events);
    state.timers.nextCustomerInMs += state.construction.kelpUnlocked
      ? ECONOMY.customers.postUnlockSpawnIntervalMs
      : ECONOMY.customers.preUnlockSpawnIntervalMs;
  }
}

function processHarvest(state: GameState, product: 'fish' | 'kelp', elapsedMs: number, events: GameEvent[]) {
  const station = product === 'fish' ? STATIONS.fishSource : STATIONS.kelpSource;
  const enabled = product === 'fish' || state.construction.kelpUnlocked;
  if (!enabled || !near(state.player, station) || carryingCount(state) >= state.capacity) {
    state.timers.harvest[product] = 0;
    return;
  }
  state.timers.harvest[product] += elapsedMs;
  const interval = product === 'fish' && state.facilityUpgrades.fishNetSpeed
    ? ECONOMY.facilityUpgrades.fishNetSpeed.pickupIntervalMs
    : ECONOMY.products[product].pickupIntervalMs;
  while (state.timers.harvest[product] >= interval && carryingCount(state) < state.capacity) {
    state.timers.harvest[product] -= interval;
    state.carrying[product] += 1;
    if (product === 'fish') state.facilityExperience.fishNet = true;
    stampFirst(state, 'pickup');
    events.push({ type: 'pickup', product, x: station.x, y: station.y });
  }
  if (carryingCount(state) >= state.capacity) state.timers.harvest[product] = 0;
}

function processBufferedProduction(state: GameState, elapsedMs: number, events: GameEvent[]) {
  const shrimp = state.facilities.shrimpTrap;
  const shrimpCycle = state.facilityUpgrades.shrimpTrapSpeed
    ? ECONOMY.facilityUpgrades.shrimpTrapSpeed.productionCycleMs
    : ECONOMY.products.shrimp.productionCycleMs;
  if (shrimp.unlocked && shrimp.buffer < ECONOMY.products.shrimp.bufferCapacity) {
    shrimp.soakRemainingMs -= elapsedMs;
    while (shrimp.soakRemainingMs <= 0 && shrimp.buffer < ECONOMY.products.shrimp.bufferCapacity) {
      shrimp.buffer = Math.min(ECONOMY.products.shrimp.bufferCapacity, shrimp.buffer + ECONOMY.products.shrimp.batchYield);
      shrimp.soakRemainingMs += shrimpCycle;
      events.push({ type: 'shrimpBatchReady', product: 'shrimp', x: STATIONS.shrimpTrap.x, y: STATIONS.shrimpTrap.y });
    }
    if (shrimp.buffer >= ECONOMY.products.shrimp.bufferCapacity) shrimp.soakRemainingMs = shrimpCycle;
  }

  const crab = state.facilities.crabPot;
  if (crab.unlocked && crab.readyCount < crab.readyCapacity) {
    crab.latchRemainingMs -= elapsedMs;
    while (crab.latchRemainingMs <= 0 && crab.readyCount < crab.readyCapacity) {
      crab.readyCount += 1;
      crab.latchRemainingMs += ECONOMY.products.crab.productionCycleMs;
      events.push({ type: 'crabReady', product: 'crab', x: STATIONS.crabPot.x, y: STATIONS.crabPot.y });
    }
    if (crab.readyCount >= crab.readyCapacity) crab.latchRemainingMs = ECONOMY.products.crab.productionCycleMs;
  }
}

function processBufferedCollection(state: GameState, product: 'shrimp' | 'crab', elapsedMs: number, events: GameEvent[]) {
  const station = product === 'shrimp' ? STATIONS.shrimpTrap : STATIONS.crabPot;
  const available = () => product === 'shrimp' ? state.facilities.shrimpTrap.buffer : state.facilities.crabPot.readyCount;
  if (!near(state.player, station) || available() <= 0 || carryingCount(state) >= state.capacity) {
    state.timers.harvest[product] = 0;
    return;
  }
  state.timers.harvest[product] += elapsedMs;
  let collected = 0;
  while (state.timers.harvest[product] >= ECONOMY.sourceCollectionIntervalMs
    && available() > 0
    && carryingCount(state) < state.capacity) {
    state.timers.harvest[product] -= ECONOMY.sourceCollectionIntervalMs;
    if (product === 'shrimp') state.facilities.shrimpTrap.buffer -= 1;
    else state.facilities.crabPot.readyCount -= 1;
    state.carrying[product] += 1;
    collected += 1;
    stampFirst(state, 'pickup');
    events.push({ type: 'pickup', product, x: station.x, y: station.y });
  }
  if (product === 'shrimp' && collected > 0) {
    state.facilityExperience.shrimpBatchesCollected += Math.floor(collected / ECONOMY.products.shrimp.batchYield);
  }
  if (available() <= 0 || carryingCount(state) >= state.capacity) state.timers.harvest[product] = 0;
}

function processDelivery(state: GameState, product: ProductId, elapsedMs: number, events: GameEvent[]) {
  const station = shelfStation(product);
  const capacity = ECONOMY.shelves.capacityByProduct[product];
  if (!near(state.player, station) || state.carrying[product] <= 0 || state.shelves[product] >= capacity) {
    state.timers.delivery[product] = 0;
    return;
  }
  state.timers.delivery[product] += elapsedMs;
  while (state.timers.delivery[product] >= ECONOMY.shelves.deliveryIntervalMs
    && state.carrying[product] > 0
    && state.shelves[product] < capacity) {
    state.timers.delivery[product] -= ECONOMY.shelves.deliveryIntervalMs;
    state.carrying[product] -= 1;
    state.shelves[product] += 1;
    stampFirst(state, 'stock');
    events.push({ type: 'stocked', product, x: station.x, y: station.y });
    if (state.shelves[product] >= capacity) {
      state.timers.delivery[product] = 0;
      break;
    }
  }
  if (state.carrying[product] <= 0) state.timers.delivery[product] = 0;
}

function processKelpInvestment(state: GameState, elapsedMs: number, events: GameEvent[]) {
  const eligible = state.telemetry.completedOrders >= 1;
  if (!eligible || state.construction.kelpUnlocked || !near(state.player, STATIONS.kelpSource) || state.currency <= 0) {
    state.timers.investment = 0;
    return;
  }
  state.timers.investment += elapsedMs;
  while (state.timers.investment >= ECONOMY.kelpUnlock.investmentIntervalMsPerCoin
    && state.currency > 0
    && state.construction.invested < ECONOMY.kelpUnlock.investmentCost) {
    state.timers.investment -= ECONOMY.kelpUnlock.investmentIntervalMsPerCoin;
    state.currency -= 1;
    state.construction.invested += 1;
    stampFirst(state, 'buildInvestment');
    events.push({ type: 'investment', value: 1, x: STATIONS.kelpSource.x, y: STATIONS.kelpSource.y });
  }
  if (state.construction.invested >= ECONOMY.kelpUnlock.investmentCost) {
    state.construction.invested = ECONOMY.kelpUnlock.investmentCost;
    state.construction.kelpUnlocked = true;
    state.timers.investment = 0;
    stampFirst(state, 'unlock');
    events.push({ type: 'kelpUnlocked', x: STATIONS.kelpSource.x, y: STATIONS.kelpSource.y });
  }
}

function processFacilityInvestment(state: GameState, product: 'shrimp' | 'crab', elapsedMs: number, events: GameEvent[]) {
  const isShrimp = product === 'shrimp';
  const facility = isShrimp ? state.facilities.shrimpTrap : state.facilities.crabPot;
  const station = isShrimp ? STATIONS.shrimpTrap : STATIONS.crabPot;
  const config = isShrimp ? ECONOMY.facilityUnlocks.shrimp : ECONOMY.facilityUnlocks.crab;
  const eligible = isShrimp
    ? state.construction.kelpUnlocked && state.telemetry.completedOrders >= ECONOMY.facilityUnlocks.shrimp.requiredCompletedSales
    : state.facilities.shrimpTrap.unlocked && state.progression.completedSalesByProduct.shrimp >= ECONOMY.facilityUnlocks.crab.requiredShrimpSales;
  if (!eligible || facility.unlocked || !near(state.player, station) || state.currency <= 0) {
    state.timers.facilityInvestment[product] = 0;
    return;
  }
  state.timers.facilityInvestment[product] += elapsedMs;
  while (state.timers.facilityInvestment[product] >= ECONOMY.facilityUnlocks.investmentIntervalMsPerCoin
    && state.currency > 0
    && facility.invested < config.investmentCost) {
    state.timers.facilityInvestment[product] -= ECONOMY.facilityUnlocks.investmentIntervalMsPerCoin;
    state.currency -= 1;
    facility.invested += 1;
    events.push({ type: 'investment', value: 1, x: station.x, y: station.y });
  }
  if (facility.invested >= config.investmentCost) {
    facility.invested = config.investmentCost;
    facility.unlocked = true;
    state.timers.facilityInvestment[product] = 0;
    events.push({ type: `${product}Unlocked`, product, x: station.x, y: station.y });
  }
}

function createToken(state: GameState, product: ProductId, events: GameEvent[], order: Partial<Record<ProductId, number>> = { [product]: 1 }) {
  const value = PRODUCT_IDS.reduce((sum, id) => sum + (order[id] ?? 0) * ECONOMY.products[id].saleReward, 0);
  state.tokens.push({
    id: state.nextTokenId++, value, x: STATIONS.checkout.x, y: STATIONS.checkout.y + 34,
    pickupRemainingMs: ECONOMY.checkout.tokenPickupDelayMs,
  });
  state.telemetry.completedOrders += 1;
  state.progression.totalCompletedSales += 1;
  PRODUCT_IDS.forEach((id) => { state.progression.completedSalesByProduct[id] += order[id] ?? 0; });
  state.facilityExperience.crabsSold += order.crab ?? 0;
  stampFirst(state, 'sale');
  events.push({ type: 'sale', product, value, x: STATIONS.checkout.x, y: STATIONS.checkout.y });
}

export function hireEmployee(state: GameState, role: EmployeeRole): StepResult {
  const next = structuredClone(state);
  const employee: Employee = { id: next.employees.reduce((max, item) => Math.max(max, item.id), 0) + 1, role, status: 'idle', level: 1, efficiency: 1, fatigue: 0, workProgressMs: 0 };
  next.employees.push(employee);
  return { state: next, events: [{ type: 'employeeHired', reason: role }] };
}

export function setEmployeeWake(state: GameState, id: number): StepResult {
  const next = structuredClone(state);
  const employee = next.employees.find((item) => item.id === id);
  if (!employee) return { state: next, events: [{ type: 'employeeWakeRejected' }] };
  employee.wakeRequested = true;
  if (employee.status === 'rest' || employee.status === 'slacking' || employee.status === 'checkFatigue') { employee.status = 'work'; employee.fatigue = 0; employee.wakeRequested = false; }
  return { state: next, events: [{ type: 'employeeWoken', value: id }] };
}

export function upgradeEmployee(state: GameState, id: number): StepResult {
  const next = structuredClone(state);
  const employee = next.employees.find((item) => item.id === id);
  if (!employee || employee.level >= 3) return { state: next, events: [{ type: 'employeeUpgradeRejected', reason: 'max' }] };
  employee.level += 1;
  employee.efficiency = Math.min(1.2, 1 + (employee.level - 1) * 0.1);
  return { state: next, events: [{ type: 'employeeUpgraded', value: employee.level }] };
}

export function createDeliveryOrder(state: GameState, product: ProductId, quantity = 1): StepResult {
  const next = structuredClone(state);
  const safeQuantity = Math.max(1, Math.floor(Number.isFinite(quantity) ? quantity : 1));
  const order: DeliveryOrder = {
    id: next.delivery.nextOrderId++,
    product,
    quantity: safeQuantity,
    reward: safeQuantity * ECONOMY.products[product].saleReward,
    phase: 'queued',
    progressMs: 0,
  };
  next.delivery.orders.push(order);
  return { state: next, events: [{ type: 'deliveryQueued', product, value: order.reward }] };
}

export function activateGullBonus(state: GameState, durationMs: number): StepResult {
  const next = structuredClone(state);
  next.gull.bonusMultiplier = 2;
  next.gull.bonusRemainingMs = Math.max(0, Math.floor(Number.isFinite(durationMs) ? durationMs : 0));
  return { state: next, events: [{ type: 'gullBonusActivated', value: next.gull.bonusRemainingMs }] };
}

export function activateDeliveryInstant(state: GameState, durationMs: number): StepResult {
  const next = structuredClone(state);
  next.delivery.instantRemainingMs = Math.max(0, Math.floor(Number.isFinite(durationMs) ? durationMs : 0));
  return { state: next, events: [{ type: 'deliveryInstantActivated', value: next.delivery.instantRemainingMs }] };
}

export function activateOfflineBonus(state: GameState, durationMs: number): StepResult {
  const next = structuredClone(state);
  next.offline.multiplier = 2;
  next.offline.bonusRemainingMs = Math.max(0, Math.floor(Number.isFinite(durationMs) ? durationMs : 0));
  return { state: next, events: [{ type: 'offlineBonusActivated', value: next.offline.bonusRemainingMs }] };
}

export function unlockArea(state: GameState, areaId: AreaId): StepResult {
  const next = structuredClone(state);
  if (next.areas.unlocked.includes(areaId)) {
    next.areas.active = areaId;
    return { state: next, events: [{ type: 'areaSelected', value: areaId }] };
  }
  const highest = Math.max(...next.areas.unlocked);
  if (areaId !== highest + 1 || areaId > 6) return { state: next, events: [{ type: 'areaUnlockRejected', value: areaId }] };
  next.areas.unlocked.push(areaId);
  next.areas.active = areaId;
  return { state: next, events: [{ type: 'areaUnlocked', value: areaId }] };
}

export function selectArea(state: GameState, areaId: AreaId): StepResult {
  const next = structuredClone(state);
  if (!next.areas.unlocked.includes(areaId)) {
    return { state: next, events: [{ type: 'areaSelectionRejected', value: areaId }] };
  }
  next.areas.active = areaId;
  return { state: next, events: [{ type: 'areaSelected', value: areaId }] };
}

function processCourier(state: GameState, employee: Employee, elapsedMs: number, events: GameEvent[], offline: boolean) {
  if (state.delivery.instantRemainingMs > 0) {
    state.delivery.instantRemainingMs = Math.max(0, state.delivery.instantRemainingMs - elapsedMs);
  }
  const inTransit = state.delivery.orders.find((order) => order.phase === 'inTransit');
  if (inTransit) {
    inTransit.progressMs += elapsedMs * employee.efficiency;
    if (state.delivery.instantRemainingMs > 0 || inTransit.progressMs >= ECONOMY.checkout.serviceIntervalMs) {
      const reward = inTransit.reward * (offline && state.offline.bonusRemainingMs > 0 ? state.offline.multiplier : 1);
      state.currency += reward;
      events.push({ type: 'deliveryCompleted', product: inTransit.product, value: reward });
      state.delivery.orders = state.delivery.orders.filter((order) => order.id !== inTransit.id);
    }
    return;
  }
  const queued = state.delivery.orders.find((order) => (
    order.phase === 'queued' && state.shelves[order.product] >= order.quantity
  ));
  if (!queued) return;
  state.shelves[queued.product] -= queued.quantity;
  queued.phase = 'inTransit';
  queued.progressMs = 0;
  const shelf = shelfStation(queued.product);
  events.push({ type: 'deliveryPickedUp', product: queued.product, value: queued.quantity, x: shelf.x, y: shelf.y });
  if (state.delivery.instantRemainingMs > 0) {
    const reward = queued.reward * (offline && state.offline.bonusRemainingMs > 0 ? state.offline.multiplier : 1);
    state.currency += reward;
    events.push({ type: 'deliveryCompleted', product: queued.product, value: reward });
    state.delivery.orders = state.delivery.orders.filter((order) => order.id !== queued.id);
  }
}

function processGull(state: GameState, employee: Employee, elapsedMs: number, events: GameEvent[], offline: boolean) {
  const phaseMs = ECONOMY.checkout.serviceIntervalMs;
  if (state.gull.bonusRemainingMs > 0) {
    state.gull.bonusRemainingMs = Math.max(0, state.gull.bonusRemainingMs - elapsedMs);
    if (state.gull.bonusRemainingMs === 0) state.gull.bonusMultiplier = 1;
  }
  if (state.gull.phase === 'idle') {
    state.gull.phase = 'flying';
    state.gull.remainingMs = phaseMs;
    state.gull.reward = employee.level;
    events.push({ type: 'gullDeparted', value: state.gull.reward });
    return;
  }
  state.gull.remainingMs = Math.max(0, state.gull.remainingMs - elapsedMs);
  if (state.gull.remainingMs > 0) return;
  if (state.gull.phase === 'flying') {
    state.gull.phase = 'exploring';
    state.gull.remainingMs = phaseMs;
    events.push({ type: 'gullExploring' });
  } else if (state.gull.phase === 'exploring') {
    state.gull.phase = 'returning';
    state.gull.remainingMs = phaseMs;
  } else {
    const reward = state.gull.reward * state.gull.bonusMultiplier
      * (offline && state.offline.bonusRemainingMs > 0 ? state.offline.multiplier : 1);
    state.currency += reward;
    events.push({ type: 'gullReturned', value: reward });
    state.gull.phase = 'idle';
    state.gull.remainingMs = 0;
    state.gull.reward = 0;
    state.gull.bonusMultiplier = 1;
  }
}

function processEmployees(state: GameState, elapsedMs: number, events: GameEvent[], offline = false) {
  for (const employee of state.employees) {
    if (employee.status === 'idle') employee.status = 'findTask';
    else if (employee.status === 'findTask') employee.status = 'selectTarget';
    else if (employee.status === 'selectTarget') employee.status = 'moveToTarget';
    else if (employee.status === 'moveToTarget' || employee.status === 'return') employee.status = 'work';
    else if (employee.status === 'work') {
      employee.workProgressMs = (employee.workProgressMs ?? 0) + elapsedMs;
      const interval = 600 / employee.efficiency;
      while ((employee.workProgressMs ?? 0) >= interval) {
        employee.workProgressMs = (employee.workProgressMs ?? 0) - interval;
        if (employee.role === 'fisher' && carryingCount(state) < state.capacity) state.carrying.fish += 1;
        if (employee.role === 'porter' && state.carrying.fish > 0 && state.shelves.fish < ECONOMY.shelves.capacityByProduct.fish) { state.carrying.fish -= 1; state.shelves.fish += 1; }
      }
      if (employee.role === 'courier') processCourier(state, employee, elapsedMs, events, offline);
      if (employee.role === 'gull') processGull(state, employee, elapsedMs, events, offline);
      employee.fatigue = clamp(employee.fatigue + elapsedMs / 20_000, 0, 1);
      if (employee.fatigue >= 0.75) employee.status = 'slacking';
    } else if (employee.status === 'slacking') {
      employee.workProgressMs = (employee.workProgressMs ?? 0) + elapsedMs;
      if (employee.wakeRequested || employee.workProgressMs >= 2_000) {
        employee.status = 'checkFatigue';
        employee.workProgressMs = 0;
      }
    } else if (employee.status === 'checkFatigue') employee.status = 'rest';
    else if (employee.status === 'rest' && employee.wakeRequested) { employee.fatigue = 0; employee.status = 'work'; employee.wakeRequested = false; }
    if (employee.status === 'rest') employee.fatigue = Math.max(0, employee.fatigue - elapsedMs / 8_000);
  }
}

function processCheckout(state: GameState, elapsedMs: number, events: GameEvent[]) {
  if (!near(state.player, STATIONS.checkout) || state.checkoutQueue.length === 0) {
    state.timers.checkout = 0;
    return;
  }
  state.timers.checkout += elapsedMs;
  while (state.timers.checkout >= ECONOMY.checkout.serviceIntervalMs && state.checkoutQueue.length > 0) {
    state.timers.checkout -= ECONOMY.checkout.serviceIntervalMs;
    const id = state.checkoutQueue.shift()!;
    const customer = state.customers.find((entry) => entry.id === id);
    if (!customer) continue;
    createToken(state, customer.product, events, customer.order);
    customer.state = 'leaving';
    customer.browseRemainingMs = 1_200;
  }
  if (state.checkoutQueue.length === 0) state.timers.checkout = 0;
}

function processTokens(state: GameState, elapsedMs: number, events: GameEvent[]) {
  for (const token of state.tokens) token.pickupRemainingMs = Math.max(0, token.pickupRemainingMs - elapsedMs);
  if (!near(state.player, STATIONS.checkout)) return;
  const ready = state.tokens.filter((token) => token.pickupRemainingMs === 0);
  if (ready.length === 0) return;
  const value = ready.reduce((sum, token) => sum + token.value, 0);
  state.currency += value;
  const readyIds = new Set(ready.map((token) => token.id));
  state.tokens = state.tokens.filter((token) => !readyIds.has(token.id));
  stampFirst(state, 'cashCollection');
  events.push({ type: 'cashCollected', value });
}

export function purchaseCarrierUpgrade(state: GameState): StepResult {
  const next = structuredClone(state);
  const tier = ECONOMY.carrier.tiers[next.capacityTier];
  if (!tier) return { state: next, events: [{ type: 'upgradeRejected', reason: 'max' }] };
  if (tier.requires === 'kelpUnlocked' && !next.construction.kelpUnlocked) {
    return { state: next, events: [{ type: 'upgradeRejected', reason: 'kelpLocked' }] };
  }
  if (next.currency < tier.cost) return { state: next, events: [{ type: 'upgradeRejected', reason: 'currency' }] };
  next.currency -= tier.cost;
  next.capacityTier += 1;
  next.capacity = tier.capacity;
  stampFirst(next, 'upgrade');
  return { state: next, events: [{ type: 'upgraded', value: next.capacity }] };
}

export function purchaseFacilityUpgrade(state: GameState, id: FacilityUpgradeId): StepResult {
  const next = structuredClone(state);
  if (next.facilityUpgrades[id]) return { state: next, events: [{ type: 'facilityUpgradeRejected', reason: 'max' }] };
  if (id === 'shrimpTrapSpeed' && !next.facilities.shrimpTrap.unlocked) {
    return { state: next, events: [{ type: 'facilityUpgradeRejected', reason: 'locked' }] };
  }
  if (id === 'crabPotReadyCapacity' && !next.facilities.crabPot.unlocked) {
    return { state: next, events: [{ type: 'facilityUpgradeRejected', reason: 'locked' }] };
  }
  const upgrade = ECONOMY.facilityUpgrades[id];
  if (next.currency < upgrade.cost) return { state: next, events: [{ type: 'facilityUpgradeRejected', reason: 'currency' }] };
  next.currency -= upgrade.cost;
  next.facilityUpgrades[id] = true;
  if (id === 'shrimpTrapSpeed') {
    next.facilities.shrimpTrap.soakRemainingMs = Math.min(
      next.facilities.shrimpTrap.soakRemainingMs,
      ECONOMY.facilityUpgrades.shrimpTrapSpeed.productionCycleMs,
    );
  }
  if (id === 'crabPotReadyCapacity') next.facilities.crabPot.readyCapacity = ECONOMY.facilityUpgrades.crabPotReadyCapacity.readyCapacity;
  stampFirst(next, 'upgrade');
  return { state: next, events: [{ type: 'facilityUpgraded', reason: id }] };
}

function processLocalFacilityUpgrades(state: GameState, elapsedMs: number, events: GameEvent[]) {
  const entries: Array<{ id: FacilityUpgradeId; station: Point & { radius: number }; experienced: boolean }> = [
    { id: 'fishNetSpeed', station: STATIONS.fishSource, experienced: state.facilityExperience.fishNet },
    { id: 'shrimpTrapSpeed', station: STATIONS.shrimpTrap, experienced: state.facilityExperience.shrimpBatchesCollected >= 2 },
    { id: 'crabPotReadyCapacity', station: STATIONS.crabPot, experienced: state.facilityExperience.crabsSold >= 1 },
  ];
  for (const { id, station, experienced } of entries) {
    const config = ECONOMY.facilityUpgrades[id];
    if (!experienced || state.facilityUpgrades[id] || state.currency < config.cost || !near(state.player, station)) {
      state.timers.facilityUpgrade[id] = 0;
      continue;
    }
    state.timers.facilityUpgrade[id] += elapsedMs;
    if (state.timers.facilityUpgrade[id] < ECONOMY.carrier.purchaseIntervalMs) continue;
    const result = purchaseFacilityUpgrade(state, id);
    Object.assign(state, result.state);
    state.timers.facilityUpgrade[id] = 0;
    events.push(...result.events);
  }
}

export function completeOrderForTest(state: GameState, product: ProductId): StepResult {
  const next = structuredClone(state);
  const events: GameEvent[] = [];
  createToken(next, product, events);
  return { state: next, events };
}

export function movePlayer(state: GameState, target: Point): StepResult {
  const next = structuredClone(state);
  const moved = distance(next.player, target);
  next.player = { ...target };
  if (moved > 0) {
    next.telemetry.movementDistance += moved;
    stampFirst(next, 'move');
  }
  return { state: next, events: moved > 0 ? [{ type: 'moved', value: moved }] : [] };
}

function advance(state: GameState, rawElapsedMs: number, activeSession: boolean): StepResult {
  const next = structuredClone(state);
  const events: GameEvent[] = [];
  const elapsedMs = Math.max(0, finite(rawElapsedMs));
  if (elapsedMs === 0) return { state: next, events };
  const wasKelpLocked = !next.construction.kelpUnlocked;
  const wasShrimpLocked = !next.facilities.shrimpTrap.unlocked;
  const wasCrabLocked = !next.facilities.crabPot.unlocked;
  next.simulationTimeMs += elapsedMs;

  if (carryingCount(next) >= next.capacity) next.telemetry.fullCarrierMs += elapsedMs;
  for (const product of PRODUCT_IDS) if (next.shelves[product] === 0) next.telemetry.emptyShelfMs[product] += elapsedMs;

  processTokens(next, elapsedMs, events);
  processEmployees(next, elapsedMs, events, !activeSession);
  processCustomers(next, elapsedMs, events);
  processCheckout(next, elapsedMs, events);
  processSpawning(next, elapsedMs, events);
  processKelpInvestment(next, elapsedMs, events);
  processFacilityInvestment(next, 'shrimp', elapsedMs, events);
  processFacilityInvestment(next, 'crab', elapsedMs, events);
  processHarvest(next, 'fish', elapsedMs, events);
  if (!wasKelpLocked) processHarvest(next, 'kelp', elapsedMs, events);
  else next.timers.harvest.kelp = 0;
  if (activeSession && !wasShrimpLocked && !wasCrabLocked) processBufferedProduction(next, elapsedMs, events);
  else if (activeSession && !wasShrimpLocked) {
    const crabUnlocked = next.facilities.crabPot.unlocked;
    next.facilities.crabPot.unlocked = false;
    processBufferedProduction(next, elapsedMs, events);
    next.facilities.crabPot.unlocked = crabUnlocked;
  } else if (activeSession && !wasCrabLocked) {
    const shrimpUnlocked = next.facilities.shrimpTrap.unlocked;
    next.facilities.shrimpTrap.unlocked = false;
    processBufferedProduction(next, elapsedMs, events);
    next.facilities.shrimpTrap.unlocked = shrimpUnlocked;
  }
  processBufferedCollection(next, 'shrimp', elapsedMs, events);
  processBufferedCollection(next, 'crab', elapsedMs, events);
  for (const product of PRODUCT_IDS) processDelivery(next, product, elapsedMs, events);
  processLocalFacilityUpgrades(next, elapsedMs, events);
  if (!activeSession && next.offline.bonusRemainingMs > 0) {
    next.offline.bonusRemainingMs = Math.max(0, next.offline.bonusRemainingMs - elapsedMs);
    if (next.offline.bonusRemainingMs === 0) next.offline.multiplier = 1;
  }
  return { state: next, events };
}

export function advanceGame(state: GameState, rawElapsedMs: number): StepResult {
  return advance(state, rawElapsedMs, true);
}

export function advanceGameForRefresh(state: GameState, rawElapsedMs: number): StepResult {
  return advance(state, rawElapsedMs, false);
}
