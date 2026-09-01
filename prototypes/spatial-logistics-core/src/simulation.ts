/* global structuredClone */
export type Position = { x: number; y: number };
export type MoveInput = { x: number; y: number };
export type CustomerPhase = 'toShelf' | 'waitingShelf' | 'toCheckout' | 'queued' | 'served';

export type CustomerState = Position & {
  id: number;
  phase: CustomerPhase;
};

export type GameState = {
  version: 1;
  elapsedMs: number;
  randomSeed: number;
  currency: number;
  level: number;
  player: Position & { carry: number; capacity: number; actionProgressMs: number };
  producer: { ready: number; capacity: number; growthProgressMs: number };
  shelf: { stock: number; capacity: number };
  checkout: { queue: number; serviceProgressMs: number };
  upgrade: { purchased: boolean; progressMs: number; cost: number };
  customers: CustomerState[];
  nextCustomerId: number;
  feedbackEvents: number;
};

export const WORLD = {
  width: 960,
  height: 540,
  playerRadius: 20,
  playerSpeed: 220,
  interactionRadius: 64,
} as const;

export const STATIONS = {
  producer: { x: 150, y: 170 },
  shelf: { x: 480, y: 170 },
  checkout: { x: 480, y: 410 },
  upgrade: { x: 790, y: 410 },
  entrance: { x: 40, y: 170 },
} as const satisfies Record<string, Position>;

const HARVEST_INTERVAL_MS = 140;
const DEPOSIT_INTERVAL_MS = 120;
const GROWTH_INTERVAL_MS = 900;
const CHECKOUT_INTERVAL_MS = 700;
const UPGRADE_INTERVAL_MS = 500;
const CUSTOMER_SPEED = 220;
const ORDER_REWARD = 2;

export function createInitialState(): GameState {
  return {
    version: 1,
    elapsedMs: 0,
    randomSeed: 1,
    currency: 0,
    level: 1,
    player: { x: 300, y: 300, carry: 0, capacity: 4, actionProgressMs: 0 },
    producer: { ready: 6, capacity: 6, growthProgressMs: 0 },
    shelf: { stock: 0, capacity: 8 },
    checkout: { queue: 0, serviceProgressMs: 0 },
    upgrade: { purchased: false, progressMs: 0, cost: 4 },
    customers: [],
    nextCustomerId: 1,
    feedbackEvents: 0,
  };
}

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function distance(left: Position, right: Position): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function isNear(left: Position, right: Position): boolean {
  return distance(left, right) <= WORLD.interactionRadius;
}

function moveToward(entity: Position, target: Position, speed: number, deltaMs: number): boolean {
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const remaining = Math.hypot(dx, dy);
  const travel = speed * deltaMs / 1_000;
  if (remaining <= travel || remaining === 0) {
    entity.x = target.x;
    entity.y = target.y;
    return true;
  }
  entity.x += dx / remaining * travel;
  entity.y += dy / remaining * travel;
  return false;
}

function updatePlayerMovement(state: GameState, input: MoveInput, deltaMs: number): void {
  const magnitude = Math.hypot(input.x, input.y);
  if (magnitude > 0) {
    const travel = WORLD.playerSpeed * deltaMs / 1_000;
    state.player.x += input.x / magnitude * travel;
    state.player.y += input.y / magnitude * travel;
  }
  state.player.x = Math.min(WORLD.width - WORLD.playerRadius, Math.max(WORLD.playerRadius, state.player.x));
  state.player.y = Math.min(WORLD.height - WORLD.playerRadius, Math.max(WORLD.playerRadius, state.player.y));
}

function updateProducer(state: GameState, deltaMs: number): void {
  state.producer.growthProgressMs += deltaMs;
  while (state.producer.growthProgressMs >= GROWTH_INTERVAL_MS) {
    state.producer.growthProgressMs -= GROWTH_INTERVAL_MS;
    if (state.producer.ready < state.producer.capacity) {
      state.producer.ready += 1;
      state.feedbackEvents += 1;
    }
  }
}

function updatePlayerInteraction(state: GameState, deltaMs: number): void {
  const canHarvest = isNear(state.player, STATIONS.producer)
    && state.producer.ready > 0
    && state.player.carry < state.player.capacity;
  const canDeposit = isNear(state.player, STATIONS.shelf)
    && state.player.carry > 0
    && state.shelf.stock < state.shelf.capacity;

  if (!canHarvest && !canDeposit) {
    state.player.actionProgressMs = 0;
    return;
  }

  state.player.actionProgressMs += deltaMs;
  const interval = canDeposit ? DEPOSIT_INTERVAL_MS : HARVEST_INTERVAL_MS;
  while (state.player.actionProgressMs >= interval) {
    state.player.actionProgressMs -= interval;
    if (canDeposit && state.player.carry > 0 && state.shelf.stock < state.shelf.capacity) {
      state.player.carry -= 1;
      state.shelf.stock += 1;
      state.feedbackEvents += 1;
      continue;
    }
    if (canHarvest && state.producer.ready > 0 && state.player.carry < state.player.capacity) {
      state.producer.ready -= 1;
      state.player.carry += 1;
      state.feedbackEvents += 1;
      continue;
    }
    state.player.actionProgressMs = 0;
    break;
  }
}

function updateCustomers(state: GameState, deltaMs: number): void {
  for (const customer of state.customers) {
    if (customer.phase === 'toShelf' && moveToward(customer, STATIONS.shelf, CUSTOMER_SPEED, deltaMs)) {
      customer.phase = 'waitingShelf';
    }
    if (customer.phase === 'waitingShelf' && state.shelf.stock > 0) {
      state.shelf.stock -= 1;
      customer.phase = 'toCheckout';
      state.feedbackEvents += 1;
    }
    if (customer.phase === 'toCheckout' && moveToward(customer, STATIONS.checkout, CUSTOMER_SPEED, deltaMs)) {
      customer.phase = 'queued';
      state.checkout.queue += 1;
      state.feedbackEvents += 1;
    }
  }
}

function updateCheckout(state: GameState, deltaMs: number): void {
  if (!isNear(state.player, STATIONS.checkout) || state.checkout.queue === 0) {
    state.checkout.serviceProgressMs = 0;
    return;
  }
  state.checkout.serviceProgressMs += deltaMs;
  while (state.checkout.serviceProgressMs >= CHECKOUT_INTERVAL_MS && state.checkout.queue > 0) {
    state.checkout.serviceProgressMs -= CHECKOUT_INTERVAL_MS;
    const customer = state.customers.find((candidate) => candidate.phase === 'queued');
    if (customer) customer.phase = 'served';
    state.checkout.queue -= 1;
    state.currency += ORDER_REWARD;
    state.feedbackEvents += 1;
  }
}

function updateUpgrade(state: GameState, deltaMs: number): void {
  if (state.upgrade.purchased || state.currency < state.upgrade.cost || !isNear(state.player, STATIONS.upgrade)) {
    state.upgrade.progressMs = 0;
    return;
  }
  state.upgrade.progressMs += deltaMs;
  if (state.upgrade.progressMs < UPGRADE_INTERVAL_MS) return;
  state.currency -= state.upgrade.cost;
  state.player.capacity += 2;
  state.level += 1;
  state.upgrade.purchased = true;
  state.upgrade.progressMs = UPGRADE_INTERVAL_MS;
  state.feedbackEvents += 1;
}

export function stepGame(stateValue: GameState, input: MoveInput, deltaMs: number): GameState {
  const state = cloneState(stateValue);
  const safeDeltaMs = Math.max(0, Math.min(deltaMs, 1_000));
  state.elapsedMs += safeDeltaMs;
  updatePlayerMovement(state, input, safeDeltaMs);
  updateProducer(state, safeDeltaMs);
  updatePlayerInteraction(state, safeDeltaMs);
  updateCustomers(state, safeDeltaMs);
  updateCheckout(state, safeDeltaMs);
  updateUpgrade(state, safeDeltaMs);
  return state;
}

export function advanceGame(stateValue: GameState, durationMs: number, input: MoveInput = { x: 0, y: 0 }): GameState {
  let state = cloneState(stateValue);
  let remaining = Math.max(0, durationMs);
  while (remaining > 0) {
    const step = Math.min(50, remaining);
    state = stepGame(state, input, step);
    remaining -= step;
  }
  return state;
}

export function setPlayerPosition(stateValue: GameState, position: Position): GameState {
  const state = cloneState(stateValue);
  state.player.x = position.x;
  state.player.y = position.y;
  state.player.actionProgressMs = 0;
  return state;
}

export function spawnCustomer(stateValue: GameState): GameState {
  const state = cloneState(stateValue);
  state.customers.push({ id: state.nextCustomerId, phase: 'toShelf', ...STATIONS.entrance });
  state.nextCustomerId += 1;
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
