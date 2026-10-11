/* global document, localStorage, structuredClone, window */
import Phaser from 'phaser';
import generatedConfig from './generated/game-config.json';
import { joystickMove, keyboardMove, mergeMoveActions, rotateDisplayMoveForWorld } from './input.js';
import {
  advanceGame,
  continueRound,
  createInitialState,
  getCustomerSpawnInterval,
  getStationPosition,
  grantCurrency as addCurrency,
  restartRound,
  selectMarket,
  setPlayerPosition as placePlayer,
  setRandomSeed as applyRandomSeed,
  spawnCustomer as addCustomer,
  type GameState,
  type FeedbackEvent,
  type MoveInput,
  type Position,
  type SpatialShopConfig,
  type StationDefinition,
} from './simulation.js';
import { migrateSavedState, SAVE_SCHEMA_VERSION, serializeGameState } from './save.js';
import { getMarketDefinition } from './revision.js';
import { getResponsiveGameSize } from './responsive.js';
import { resetRoundPresentation } from './presentation.js';
import { getActiveOrderPresentation } from './order-presentation.js';
import './style.css';

type GeneratedConfig = {
  title: string;
  theme: string;
  content: { productName: string; customerName: string; currencyName: string };
  palette: string[];
  spatialShop: SpatialShopConfig;
};

const config = generatedConfig as GeneratedConfig;
const shop = config.spatialShop;
const SAVE_VERSION = SAVE_SCHEMA_VERSION;
const SAVE_KEY = `ai-game-factory:spatial-shop:${config.title}`;

function loadState(): GameState {
  try {
    const value = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as unknown;
    return migrateSavedState(shop, value);
  } catch { return createInitialState(shop); }
}

let state = loadState();
let nextCustomerSpawnMs = state.elapsedMs + getCustomerSpawnInterval(shop, state);
let lastSavedMs = state.elapsedMs;

const immediateKeys = { left: false, right: false, up: false, down: false };
const keyDirection = new Map<string, keyof typeof immediateKeys>([
  ['arrowleft', 'left'], ['a', 'left'],
  ['arrowright', 'right'], ['d', 'right'],
  ['arrowup', 'up'], ['w', 'up'],
  ['arrowdown', 'down'], ['s', 'down'],
]);

window.addEventListener('keydown', (event) => {
  const direction = keyDirection.get(event.key.toLowerCase());
  if (!direction) return;
  immediateKeys[direction] = true;
  event.preventDefault();
});
window.addEventListener('keyup', (event) => {
  const direction = keyDirection.get(event.key.toLowerCase());
  if (!direction) return;
  immediateKeys[direction] = false;
  event.preventDefault();
});
window.addEventListener('blur', () => {
  for (const direction of Object.keys(immediateKeys) as Array<keyof typeof immediateKeys>) immediateKeys[direction] = false;
});
window.addEventListener('pointercancel', () => {
  for (const direction of Object.keys(immediateKeys) as Array<keyof typeof immediateKeys>) immediateKeys[direction] = false;
});

let responsiveSignature = '';
function fitGameFrame(): void {
  const game = document.querySelector<HTMLElement>('#game');
  const shell = document.querySelector<HTMLElement>('#game-shell');
  if (!game || !shell) return;
  const hud = document.querySelector<HTMLElement>('#hud');
  const settlement = document.querySelector<HTMLElement>('#settlement');
  const toast = document.querySelector<HTMLElement>('#toast');
  const instructions = document.querySelector<HTMLElement>('#instructions');
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const chrome = {
    top: (hud?.getBoundingClientRect().height ?? 76) + 12,
    bottom: (settlement?.hidden ? 0 : settlement?.getBoundingClientRect().height ?? 0)
      + (toast?.getBoundingClientRect().height ?? 20)
      + (instructions?.getBoundingClientRect().height ?? 32)
      + 28,
  };
  const frame = getResponsiveGameSize(viewport, chrome);
  const signature = `${frame.orientation}:${frame.width}:${frame.height}:${frame.panelWidth}`;
  document.body.classList.toggle('is-landscape', frame.orientation === 'landscape');
  if (signature === responsiveSignature) return;
  responsiveSignature = signature;
  game.style.width = `${frame.width}px`;
  game.style.height = `${frame.height}px`;
  shell.style.setProperty('--game-width', `${frame.width}px`);
  shell.style.setProperty('--game-height', `${frame.height}px`);
}

window.addEventListener('resize', fitGameFrame);
window.visualViewport?.addEventListener('resize', fitGameFrame);
fitGameFrame();

function saveState(): void {
  try { localStorage.setItem(SAVE_KEY, serializeGameState(state)); } catch { return; }
}

function publicState(): GameState { return structuredClone(state); }
function resetGame(): GameState {
  state = createInitialState(shop);
  nextCustomerSpawnMs = getCustomerSpawnInterval(shop, state);
  lastSavedMs = 0;
  try { localStorage.removeItem(SAVE_KEY); } catch { return publicState(); }
  return publicState();
}
function continueGame(nextMarketId = 'coral-cove-market'): GameState {
  state = continueRound(state, nextMarketId);
  saveState();
  return publicState();
}
function selectMarketGame(marketId: string): GameState {
  state = selectMarket(state, marketId);
  saveState();
  return publicState();
}
function restartGame(): GameState {
  state = restartRound(shop, state);
  nextCustomerSpawnMs = getCustomerSpawnInterval(shop, state);
  lastSavedMs = state.elapsedMs;
  saveState();
  return publicState();
}
function getState(): GameState { return publicState(); }
function spawnCustomer(): GameState { state = addCustomer(shop, state); saveState(); return publicState(); }
function grantCurrency(amount = 10): GameState { state = addCurrency(state, amount); saveState(); return publicState(); }
function setRandomSeed(seed: number): GameState { state = applyRandomSeed(state, seed); saveState(); return publicState(); }
function setPlayerPosition(position: Position): GameState { state = placePlayer(state, position); return publicState(); }
function advanceTime(durationMs: number): GameState { state = advanceGame(shop, state, durationMs); saveState(); return publicState(); }

function completeOrder(): GameState {
  if (!state.customers.some((customer) => customer.phase === 'queued')) {
    state = addCustomer(shop, state);
    const customer = state.customers.at(-1);
    if (customer) {
      const shelf = state.stations[customer.targetShelfId];
      if (shelf) shelf.stock[customer.productId] = (shelf.stock[customer.productId] ?? 0) + 1;
      state = advanceGame(shop, state, 10_000);
    }
  }
  const checkout = shop.stations.find((station) => station.kind === 'checkout');
  if (checkout) {
    state = placePlayer(state, checkout.position);
    state = advanceGame(shop, state, checkout.serviceMs + 100);
    state = placePlayer(state, { x: 0, y: 0 });
    state = advanceGame(shop, state, 50);
    state = placePlayer(state, checkout.position);
    state = advanceGame(shop, state, 50);
  }
  saveState();
  return publicState();
}

function upgradeStation(): GameState {
  const upgrade = shop.stations.find((station) => station.kind === 'upgrade');
  if (upgrade) {
    state = placePlayer(state, upgrade.position);
    state = advanceGame(shop, state, upgrade.purchaseIntervalMs + 50);
  }
  saveState();
  return publicState();
}

declare global {
  interface Window {
    __GAME_TEST__: {
      resetGame: typeof resetGame;
      getState: typeof getState;
      spawnCustomer: typeof spawnCustomer;
      completeOrder: typeof completeOrder;
      grantCurrency: typeof grantCurrency;
      upgradeStation: typeof upgradeStation;
      setRandomSeed: typeof setRandomSeed;
      setPlayerPosition: typeof setPlayerPosition;
      advanceTime: typeof advanceTime;
      continueGame: typeof continueGame;
      selectMarket: typeof selectMarketGame;
      restartGame: typeof restartGame;
    };
  }
}

window.__GAME_TEST__ = { resetGame, getState, spawnCustomer, completeOrder, grantCurrency, upgradeStation, setRandomSeed, setPlayerPosition, advanceTime, continueGame, selectMarket: selectMarketGame, restartGame };

type KeySet = { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

function colorAt(index: number, fallback: string): number {
  const value = config.palette[index] ?? fallback;
  return Number.parseInt(value.slice(1), 16);
}

class SpatialShopScene extends Phaser.Scene {
  private keys!: { cursors: Phaser.Types.Input.Keyboard.CursorKeys; wasd: KeySet };
  private worldGraphics!: Phaser.GameObjects.Graphics;
  private entityGraphics!: Phaser.GameObjects.Graphics;
  private playerGraphics!: Phaser.GameObjects.Graphics;
  private feedbackGraphics!: Phaser.GameObjects.Graphics;
  private stationLabels = new Map<string, Phaser.GameObjects.Text>();
  private stationValueLabels = new Map<string, Phaser.GameObjects.Text>();
  private feedbackTexts = new Map<number, Phaser.GameObjects.Text>();
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickThumb!: Phaser.GameObjects.Arc;
  private joystickOrigin: Position | null = null;
  private joystickInput: MoveInput = { x: 0, y: 0 };
  private joystickPointerId: number | null = null;

  constructor() { super('spatial-shop'); }

  create(): void {
    this.cameras.main.setBackgroundColor(config.palette[0] ?? '#16324F');
    this.worldGraphics = this.add.graphics();
    this.entityGraphics = this.add.graphics();
    this.playerGraphics = this.add.graphics();
    this.feedbackGraphics = this.add.graphics().setDepth(12);
    this.keys = {
      cursors: this.input.keyboard!.createCursorKeys(),
      wasd: this.input.keyboard!.addKeys('W,A,S,D') as KeySet,
    };
    this.joystickBase = this.add.circle(0, 0, 54, colorAt(1, '#62B6CB'), 0.16).setStrokeStyle(3, colorAt(1, '#62B6CB'), 0.7).setVisible(false).setDepth(20);
    this.joystickThumb = this.add.circle(0, 0, 24, 0xffffff, 0.58).setVisible(false).setDepth(21);
    this.input.on('pointerdown', this.startJoystick, this);
    this.input.on('pointermove', this.moveJoystick, this);
    this.input.on('pointerup', this.stopJoystick, this);
    this.input.on('pointerupoutside', this.stopJoystick, this);
    for (const station of shop.stations) this.createStationLabel(station);
    this.renderState();
  }

  private createStationLabel(station: StationDefinition): void {
    const label = this.add.text(station.position.x, station.position.y + 48, station.label, {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#fffdf2', stroke: '#19333a', strokeThickness: 5, align: 'center',
    }).setOrigin(0.5).setDepth(5);
    this.stationLabels.set(station.id, label);
    const detail = this.add.text(station.position.x, station.position.y + 68, '', {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#d8f4e8', stroke: '#19333a', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5).setDepth(5);
    this.stationValueLabels.set(station.id, detail);
  }

  private startJoystick(pointer: Phaser.Input.Pointer): void {
    if (this.joystickPointerId !== null) return;
    this.joystickPointerId = pointer.id;
    this.joystickOrigin = { x: pointer.x, y: pointer.y };
    this.joystickInput = { x: 0, y: 0 };
    this.joystickBase.setPosition(pointer.x, pointer.y).setVisible(true);
    this.joystickThumb.setPosition(pointer.x, pointer.y).setVisible(true);
  }

  private moveJoystick(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joystickPointerId || !this.joystickOrigin) return;
    this.joystickInput = joystickMove(this.joystickOrigin, pointer, 10, 54);
    this.joystickThumb.setPosition(this.joystickOrigin.x + this.joystickInput.x * 42, this.joystickOrigin.y + this.joystickInput.y * 42);
  }

  private stopJoystick(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joystickPointerId) return;
    this.joystickPointerId = null;
    this.joystickOrigin = null;
    this.joystickInput = { x: 0, y: 0 };
    this.joystickBase.setVisible(false);
    this.joystickThumb.setVisible(false);
  }

  private readMoveAction(): MoveInput {
    const keyboard = keyboardMove({
      left: immediateKeys.left || this.keys.cursors.left.isDown || this.keys.wasd.A.isDown,
      right: immediateKeys.right || this.keys.cursors.right.isDown || this.keys.wasd.D.isDown,
      up: immediateKeys.up || this.keys.cursors.up.isDown || this.keys.wasd.W.isDown,
      down: immediateKeys.down || this.keys.cursors.down.isDown || this.keys.wasd.S.isDown,
    });
    const orientation = document.body.classList.contains('is-landscape') ? 'landscape' : 'portrait';
    return mergeMoveActions(rotateDisplayMoveForWorld(keyboard, orientation), rotateDisplayMoveForWorld(this.joystickInput, orientation));
  }

  update(_time: number, delta: number): void {
    const before = state;
    state = advanceGame(shop, state, Math.min(delta, 100), this.readMoveAction());
    if (state.stage === 'operating' && state.elapsedMs >= nextCustomerSpawnMs) {
      state = addCustomer(shop, state);
      nextCustomerSpawnMs = state.elapsedMs + getCustomerSpawnInterval(shop, state);
    }
    if (state.elapsedMs - lastSavedMs >= 1_000) {
      saveState();
      lastSavedMs = state.elapsedMs;
    }
    this.renderState(before);
  }

  private renderState(previous?: GameState): void {
    const labelRotation = document.body.classList.contains('is-landscape') ? -Math.PI / 2 : 0;
    for (const label of this.stationLabels.values()) label.setRotation(labelRotation);
    for (const label of this.stationValueLabels.values()) label.setRotation(labelRotation);
    this.worldGraphics.clear();
    this.drawBeachWorld();
    for (const station of shop.stations) this.drawStation(station);

    this.entityGraphics.clear();
    for (const customer of state.customers) {
      if (customer.phase === 'left') continue;
      const bodyColor = customer.phase === 'packing' ? 0x8b78c7 : customer.phase === 'leaving' ? 0x9a7c5d : 0xe9a84e;
      this.entityGraphics.fillStyle(0x372b3b, 0.28).fillEllipse(customer.x, customer.y + 17, 34, 10);
      this.entityGraphics.fillStyle(bodyColor, 1).fillRoundedRect(customer.x - 13, customer.y - 2, 26, 26, 9);
      this.entityGraphics.fillStyle(0xffe6b3, 1).fillCircle(customer.x, customer.y - 14, 12);
      this.entityGraphics.fillStyle(0x243741, 1).fillRoundedRect(customer.x - 13, customer.y - 25, 26, 7, 4);
      this.entityGraphics.fillStyle(0x243741, 0.9).fillCircle(customer.x - 4, customer.y - 15, 2).fillCircle(customer.x + 4, customer.y - 15, 2);
      if (customer.phase === 'waiting-shelf') {
        this.entityGraphics.lineStyle(3, 0xed6a5a, 0.95).strokeCircle(customer.x, customer.y - 3, 27);
      }
      if (customer.phase === 'packing') {
        this.entityGraphics.lineStyle(3, 0xa78bfa, 0.95).strokeCircle(customer.x, customer.y - 3, 27);
      }
      if ((customer.phase === 'to-checkout' || customer.phase === 'queued') && customer.queuePosition) {
        this.entityGraphics.lineStyle(2, 0x3fa7c8, customer.phase === 'queued' ? 0.8 : 0.45).strokeRoundedRect(customer.queuePosition.x - 22, customer.queuePosition.y - 18, 44, 36, 10);
      }
      if (customer.basketValue > 0) {
        this.entityGraphics.fillStyle(0xc27b42, 1).fillRoundedRect(customer.x - 10, customer.y - 2, 20, 11, 3);
        this.entityGraphics.lineStyle(2, 0xffd98b, 0.9).arc(customer.x, customer.y - 2, 9, Math.PI, Math.PI * 2, false);
      }
      if (customer.phase === 'packing') {
        this.entityGraphics.fillStyle(0xf2c572, 1).fillRoundedRect(customer.x - 13, customer.y - 47, 26, 8, 3);
      }
      const orderLines = customer.shoppingList ?? [{ productId: customer.productId, quantity: 1, collected: customer.basketValue > 0 ? 1 : 0, shelfId: customer.targetShelfId }];
      orderLines.forEach((line, lineIndex) => {
        const product = shop.products.find((candidate) => candidate.id === line.productId);
        const bubbleX = customer.x + 26 + lineIndex * 20;
        const bubbleY = customer.y - 40;
        this.entityGraphics.fillStyle(0x173b40, 0.9).fillCircle(bubbleX, bubbleY, 11);
        this.entityGraphics.fillStyle(Number.parseInt((product?.color ?? '#ffffff').slice(1), 16), 0.95).fillCircle(bubbleX, bubbleY, 7);
        if (line.collected >= line.quantity) {
          this.entityGraphics.lineStyle(2, 0xd8f4e8, 0.95).lineBetween(bubbleX - 5, bubbleY, bubbleX - 1, bubbleY + 4).lineBetween(bubbleX - 1, bubbleY + 4, bubbleX + 6, bubbleY - 5);
        } else {
          this.entityGraphics.fillStyle(0xfff3c4, 1).fillCircle(bubbleX + 6, bubbleY - 7, 4);
          this.entityGraphics.fillStyle(0x173b40, 1).fillCircle(bubbleX + 6, bubbleY - 7, 1);
        }
      });
    }

    const runner = state.employees.runner;
    if (runner?.funded) {
      this.entityGraphics.fillStyle(0x15363d, 0.32).fillEllipse(runner.position.x, runner.position.y + 16, 32, 9);
      this.entityGraphics.fillStyle(0x60a5fa, 1).fillRoundedRect(runner.position.x - 11, runner.position.y - 7, 22, 24, 7);
      this.entityGraphics.fillStyle(0xffe6b3, 1).fillCircle(runner.position.x, runner.position.y - 16, 9);
      this.entityGraphics.fillStyle(0x173b40, 1).fillRoundedRect(runner.position.x - 10, runner.position.y - 25, 20, 5, 3);
      this.entityGraphics.fillStyle(0xfef08a, 1).fillRoundedRect(runner.position.x + 12, runner.position.y - 3, 10, 10, 3);
    }
    const seagull = state.pressure.seagull;
    if (seagull.active) {
      this.entityGraphics.fillStyle(0x173b40, 0.24).fillEllipse(seagull.x, seagull.y + 11, 34, 8);
      this.entityGraphics.fillStyle(0xf8fafc, 0.98).fillEllipse(seagull.x, seagull.y, 34, 16);
      this.entityGraphics.fillStyle(0x64748b, 0.95).fillEllipse(seagull.x - 11, seagull.y + 1, 18, 8).fillEllipse(seagull.x + 11, seagull.y + 1, 18, 8);
      this.entityGraphics.fillStyle(0xf59e0b, 1).fillTriangle(seagull.x + 15, seagull.y - 2, seagull.x + 26, seagull.y + 2, seagull.x + 15, seagull.y + 5);
      const target = seagull.targetShelfId ? shop.stations.find((station) => station.id === seagull.targetShelfId) : undefined;
      if (target) {
        const targetPosition = getStationPosition(state, target);
        this.entityGraphics.lineStyle(4, 0xf97316, 0.7).strokeCircle(targetPosition.x, targetPosition.y, 46);
        this.entityGraphics.fillStyle(0xfff3c4, 0.96).fillTriangle(targetPosition.x + 34, targetPosition.y - 52, targetPosition.x + 46, targetPosition.y - 32, targetPosition.x + 22, targetPosition.y - 32);
      }
    }

    for (const customer of state.customers.filter((candidate) => candidate.phase === 'queued' && candidate.queuePosition)) {
      this.entityGraphics.fillStyle(0x38bdf8, 0.45).fillCircle(customer.queuePosition!.x, customer.queuePosition!.y, 7);
    }

    this.playerGraphics.clear();
    this.playerGraphics.fillStyle(0x372b3b, 0.3).fillEllipse(state.player.x, state.player.y + 22, 44, 12);
    this.playerGraphics.fillStyle(0x2c9b9b, 1).fillRoundedRect(state.player.x - 16, state.player.y - 4, 32, 31, 10);
    this.playerGraphics.fillStyle(0xffebbe, 1).fillCircle(state.player.x, state.player.y - 22, 14);
    this.playerGraphics.fillStyle(0x1e4e5b, 1).fillRoundedRect(state.player.x - 17, state.player.y - 35, 34, 8, 4);
    this.playerGraphics.fillStyle(0xf2c572, 1).fillRoundedRect(state.player.x - 10, state.player.y + 23, 8, 7, 3).fillRoundedRect(state.player.x + 2, state.player.y + 23, 8, 7, 3);
    let stackIndex = 0;
    for (const product of shop.products) {
      const count = state.player.inventory[product.id] ?? 0;
      for (let index = 0; index < count; index += 1) {
        const color = Number.parseInt(product.color.slice(1), 16);
        this.playerGraphics.fillStyle(color, 1).fillRoundedRect(state.player.x - 13, state.player.y - 48 - stackIndex * 11, 26, 9, 4);
        this.playerGraphics.lineStyle(1, 0xffffff, 0.55).lineBetween(state.player.x - 8, state.player.y - 44 - stackIndex * 11, state.player.x + 7, state.player.y - 44 - stackIndex * 11);
        stackIndex += 1;
      }
    }
    this.renderFeedback();
    this.renderHud(previous);
  }

  private drawBeachWorld(): void {
    const market = getMarketDefinition(state.marketId);
    const sea = state.marketId === 'moon-tide-market' ? 0x28386d : state.marketId === 'coral-cove-market' ? 0x286c78 : 0x215e6d;
    const seaDeep = state.marketId === 'moon-tide-market' ? 0x171f4a : state.marketId === 'coral-cove-market' ? 0x1f5262 : 0x194b5b;
    const sand = state.marketId === 'moon-tide-market' ? 0x817b9f : state.marketId === 'coral-cove-market' ? 0xd69a72 : 0xd0ad65;
    const path = 0x35494b;
    const foam = 0x9ce0d0;
    this.worldGraphics.fillStyle(seaDeep, 1).fillRoundedRect(8, 8, shop.world.width - 16, shop.world.height - 16, 28);
    this.worldGraphics.fillStyle(sea, 1).fillRoundedRect(12, 12, shop.world.width - 24, 320, 24);
    this.worldGraphics.fillStyle(foam, 0.18).fillEllipse(140, 130, 260, 92).fillEllipse(420, 220, 230, 76);
    this.worldGraphics.lineStyle(2, foam, 0.42);
    for (let y = 58; y <= 270; y += 54) {
      for (let x = 34; x < shop.world.width - 26; x += 92) {
        this.worldGraphics.arc(x, y, 18, Math.PI * 0.1, Math.PI * 0.9, false);
      }
    }
    this.worldGraphics.fillStyle(0xfff0b5, 0.72).fillCircle(52, 255, 4).fillCircle(70, 262, 3).fillCircle(484, 274, 4);
    this.worldGraphics.fillStyle(Number.parseInt(market.accent.slice(1), 16), 0.82).fillTriangle(72, 88, 98, 88, 85, 73).fillTriangle(448, 106, 474, 106, 461, 90);
    this.worldGraphics.fillStyle(sand, 0.96).fillRect(12, 310, shop.world.width - 24, shop.world.height - 322);
    this.worldGraphics.fillStyle(0xf0d58f, 0.65).fillRect(12, 310, shop.world.width - 24, 18);
    this.worldGraphics.fillStyle(path, 0.92).fillRoundedRect(36, 356, shop.world.width - 72, 408, 34);
    this.worldGraphics.fillStyle(0x435956, 0.34).fillRoundedRect(52, 372, shop.world.width - 104, 376, 28);
    const positionFor = (id: string): Position | undefined => {
      const station = shop.stations.find((candidate) => candidate.id === id);
      return station ? getStationPosition(state, station) : undefined;
    };
    const checkoutPosition = positionFor('checkout');
    const upgradePosition = positionFor('capacity-upgrade');
    const buildPosition = positionFor('kelp-build');
    if (checkoutPosition) this.drawMarketAwning(checkoutPosition.x, checkoutPosition.y - 293, Number.parseInt(market.accent.slice(1), 16));
    if (upgradePosition) this.drawMarketAwning(upgradePosition.x, upgradePosition.y - 30, 0xa78bfa);
    if (buildPosition) this.drawMarketAwning(buildPosition.x, buildPosition.y - 30, 0xed6a5a);
    this.worldGraphics.lineStyle(2, 0xffffff, 0.14);
    for (let y = 342; y < shop.world.height - 30; y += 58) this.worldGraphics.lineBetween(24, y, shop.world.width - 24, y);
    const routePairs: Array<[Position, Position]> = [];
    const stationAt = (id: string) => positionFor(id);
    const addRoute = (fromId: string, toId: string): void => {
      const from = stationAt(fromId);
      const to = stationAt(toId);
      if (from && to) routePairs.push([from, to]);
    };
    addRoute('net', 'fish-shelf');
    addRoute('fish-shelf', 'checkout');
    addRoute('checkout', 'kelp-build');
    addRoute('kelp-build', 'kelp-pool');
    addRoute('fish-shelf', 'smokehouse');
    addRoute('smokehouse', 'smoked-shelf');
    addRoute('checkout', 'market-entry');
    for (const [from, to] of routePairs) {
      this.worldGraphics.lineStyle(5, foam, 0.3);
      this.worldGraphics.lineBetween(from.x, from.y, to.x, to.y);
      this.worldGraphics.fillStyle(foam, 0.7).fillCircle(to.x, to.y, 4);
    }
    const marker = stationAt('market-entry');
    if (marker && state.marketMarker.enabled) {
      const accent = Number.parseInt(market.accent.slice(1), 16);
      this.worldGraphics.lineStyle(4, accent, 0.84).strokeCircle(marker.x, marker.y, 34);
      this.worldGraphics.lineStyle(2, 0xffffff, 0.72).lineBetween(marker.x - 17, marker.y, marker.x + 17, marker.y);
      this.worldGraphics.lineBetween(marker.x, marker.y - 17, marker.x, marker.y + 17);
    }
    for (let x = 32; x < shop.world.width - 24; x += 76) {
      this.worldGraphics.fillStyle(0xf8e5ac, 0.46).fillCircle(x, 286 + ((x / 76) % 2) * 9, 3);
    }
  }

  private drawMarketAwning(x: number, y: number, color: number): void {
    this.worldGraphics.fillStyle(0x173b40, 0.35).fillRoundedRect(x - 52, y + 2, 104, 12, 5);
    this.worldGraphics.fillStyle(color, 0.82).fillRoundedRect(x - 48, y - 7, 96, 12, 4);
    this.worldGraphics.fillStyle(0xfff3c4, 0.55);
    for (let index = -3; index <= 3; index += 2) this.worldGraphics.fillRect(x + index * 12 - 4, y - 7, 8, 12);
  }

  private renderFeedback(): void {
    this.feedbackGraphics.clear();
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const visibleIds = new Set<number>();
    for (const event of state.feedback) {
      const age = state.elapsedMs - event.atMs;
      if (age < 0 || age > 850) continue;
      visibleIds.add(event.id);
      const progress = reducedMotion ? 1 : Math.min(1, age / 650);
      const x = event.source.x + (event.target.x - event.source.x) * progress;
      const y = event.source.y + (event.target.y - event.source.y) * progress;
      const alpha = reducedMotion ? 0.7 : Math.max(0, 1 - age / 850);
      const color = event.kind === 'cash-collect' || event.kind === 'invest' || event.kind === 'upgrade' || event.kind === 'checkout-pack'
        ? 0xf2c572
        : event.kind === 'checkout-packing' ? 0xa78bfa : 0x9be7d7;
      this.feedbackGraphics.lineStyle(3, color, alpha * 0.6).lineBetween(event.source.x, event.source.y, x, y);
      this.feedbackGraphics.fillStyle(color, alpha).fillCircle(x, y, event.kind === 'customer-pickup' ? 9 : 7);
      let label = this.feedbackTexts.get(event.id);
      if (!label) {
        label = this.add.text(x, y - 20, feedbackShortLabel(event), {
          fontFamily: 'sans-serif', fontSize: '13px', color: '#fffdf2', stroke: '#19333a', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(18);
        this.feedbackTexts.set(event.id, label);
      }
      label.setText(feedbackShortLabel(event)).setPosition(x, y - 22).setAlpha(alpha).setRotation(document.body.classList.contains('is-landscape') ? -Math.PI / 2 : 0);
    }
    for (const [id, label] of this.feedbackTexts) {
      if (visibleIds.has(id)) continue;
      label.destroy();
      this.feedbackTexts.delete(id);
    }
  }

  private drawStation(station: StationDefinition): void {
    const unlocked = state.unlockedStationIds.includes(station.id);
    const position = getStationPosition(state, station);
    const kindColors: Record<StationDefinition['kind'], number> = {
      producer: 0x34d399,
      shelf: 0xfbbf24,
      checkout: 0x38bdf8,
      construction: 0xfb7185,
      processor: 0xf59e0b,
      employee: 0x60a5fa,
      'market-marker': 0xf472b6,
      upgrade: 0xa78bfa,
    };
    const color = unlocked ? kindColors[station.kind] : 0x64748b;
    const width = station.kind === 'checkout' ? 118 : station.kind === 'market-marker' ? 112 : 104;
    const height = station.kind === 'construction' ? 72 : 64;
    const left = position.x - width / 2;
    const top = position.y - height / 2;
    this.worldGraphics.fillStyle(0x2e303a, 0.3).fillRoundedRect(left + 5, top + 8, width, height, 18);
    this.worldGraphics.fillStyle(color, unlocked ? 0.22 : 0.09).fillRoundedRect(left, top, width, height, 18);
    this.worldGraphics.lineStyle(3, color, unlocked ? 0.95 : 0.35).strokeRoundedRect(left, top, width, height, 18);
    this.drawStationIcon(station, color, unlocked, position);
    this.stationLabels.get(station.id)?.setAlpha(unlocked ? 1 : 0.48).setText(unlocked ? station.label : `🔒 ${station.label}`).setPosition(position.x, position.y + height / 2 + 16);
    const runtime = state.stations[station.id];
    const detail = this.stationValueLabels.get(station.id);
    if (!runtime || !unlocked) {
      detail?.setText('尚未开放').setPosition(position.x, position.y + height / 2 + 35).setAlpha(0.5);
      return;
    }
    const ratio = station.kind === 'producer'
      ? runtime.ready / station.capacity
      : station.kind === 'shelf'
        ? Object.values(runtime.stock).reduce((sum, count) => sum + count, 0) / station.capacity
        : station.kind === 'processor'
          ? (() => { const processor = state.processors[station.id] ?? state.processors.smokehouse; return processor ? processor.ready / processor.capacity : 0; })()
        : station.kind === 'construction'
          ? runtime.contributed / station.cost
          : station.kind === 'employee'
            ? (state.hireStations[station.role]?.paid ?? 0) / station.hireCost
            : station.kind === 'market-marker'
              ? (state.marketMarker.enabled ? 1 : 0)
          : station.kind === 'upgrade'
            ? runtime.purchases / station.maxPurchases
            : 0;
    this.worldGraphics.fillStyle(0x173b40, 0.8).fillRoundedRect(position.x - 38, position.y + height / 2 - 12, 76, 6, 3);
    this.worldGraphics.fillStyle(0xffffff, 0.8).fillRoundedRect(position.x - 38, position.y + height / 2 - 12, 76 * Math.max(0, Math.min(1, ratio)), 6, 3);
    if (station.kind === 'checkout' && state.cashPile > 0) {
      for (let index = 0; index < Math.min(10, state.cashPile); index += 1) {
        const coinX = position.x - 22 + (index % 5) * 11;
        const coinY = position.y - 8 - Math.floor(index / 5) * 10;
        this.worldGraphics.fillStyle(0xf2c572, 0.98).fillCircle(coinX, coinY, 6);
        this.worldGraphics.lineStyle(1, 0x9a6d31, 0.9).strokeCircle(coinX, coinY, 6);
      }
    }
    const detailText = station.kind === 'producer'
      ? `现货 ${runtime.ready}/${station.capacity}`
      : station.kind === 'shelf'
        ? `货架 ${Object.values(runtime.stock).reduce((sum, count) => sum + count, 0)}/${station.capacity}`
        : station.kind === 'processor'
          ? (() => { const processor = state.processors[station.id] ?? state.processors.smokehouse; return processor?.blockedReason === 'input' ? '缺鲜鱼 · 等待补货' : processor?.blockedReason === 'capacity' ? `成品待取 ${processor.ready}/${processor.capacity}` : `烟熏进度 ${Math.floor((processor?.progressMs ?? 0) / (processor?.cycleMs ?? 1) * 100)}%`; })()
        : station.kind === 'checkout'
          ? state.cashPile > 0 ? `现金堆 ${state.cashPile} · 离开再收` : `队列 ${state.checkout.queue}`
          : station.kind === 'construction'
            ? `建设 ${runtime.contributed}/${station.cost}`
            : station.kind === 'employee'
              ? state.employees[station.role]?.funded ? `${station.role === 'runner' ? '跑腿已上岗' : '帮手服务中'}` : `招募 ${state.hireStations[station.role]?.paid ?? 0}/${station.hireCost}`
              : station.kind === 'market-marker'
                ? state.marketMarker.enabled ? '靠近并停下选市场' : '航线锁定'
            : `已升级 ${runtime.purchases}/${station.maxPurchases}`;
    detail?.setText(detailText).setPosition(position.x, position.y + height / 2 + 35).setAlpha(0.92);
  }

  private drawStationIcon(station: StationDefinition, color: number, unlocked: boolean, position: Position): void {
    const { x, y } = position;
    if (!unlocked) {
      this.worldGraphics.fillStyle(0xe6c769, 0.9).fillRoundedRect(x - 6, y - 4, 12, 12, 3);
      this.worldGraphics.lineStyle(3, 0xe6c769, 0.9).arc(x, y - 5, 6, Math.PI, Math.PI * 2, false);
      return;
    }
    this.worldGraphics.fillStyle(0xfff3c4, 0.95);
    if (station.kind === 'producer') {
      this.worldGraphics.fillEllipse(x, y, 30, 18).fillTriangle(x + 16, y, x + 29, y - 9, x + 29, y + 9);
      this.worldGraphics.fillStyle(color, 1).fillCircle(x - 7, y - 2, 2);
      this.worldGraphics.lineStyle(2, color, 0.8).lineBetween(x - 10, y + 5, x + 9, y + 5);
    } else if (station.kind === 'shelf') {
      this.worldGraphics.fillRoundedRect(x - 24, y - 9, 48, 18, 5);
      this.worldGraphics.lineStyle(3, color, 1).lineBetween(x - 17, y - 2, x + 17, y - 2);
      this.worldGraphics.fillStyle(color, 1).fillCircle(x - 11, y + 5, 4).fillCircle(x, y + 5, 4).fillCircle(x + 11, y + 5, 4);
    } else if (station.kind === 'checkout') {
      this.worldGraphics.fillRoundedRect(x - 28, y - 6, 56, 14, 4);
      this.worldGraphics.fillStyle(color, 1).fillRoundedRect(x - 15, y - 19, 30, 12, 4);
      this.worldGraphics.fillStyle(0x173b40, 1).fillCircle(x, y - 13, 3);
    } else if (station.kind === 'construction') {
      this.worldGraphics.fillRoundedRect(x - 20, y - 5, 40, 12, 4);
      this.worldGraphics.lineStyle(6, 0xfff3c4, 1).lineBetween(x - 12, y - 18, x + 15, y + 8);
      this.worldGraphics.lineStyle(5, color, 1).lineBetween(x - 15, y - 18, x - 4, y - 29);
    } else if (station.kind === 'processor') {
      this.worldGraphics.fillRoundedRect(x - 22, y - 18, 44, 36, 7);
      this.worldGraphics.lineStyle(3, color, 1).strokeCircle(x, y, 12);
      this.worldGraphics.fillStyle(color, 1).fillCircle(x, y, 5);
    } else if (station.kind === 'employee') {
      this.worldGraphics.fillRoundedRect(x - 22, y - 18, 44, 36, 7);
      this.worldGraphics.fillStyle(color, 1).fillCircle(x, y - 4, 8);
      this.worldGraphics.lineStyle(3, color, 1).arc(x, y + 10, 13, Math.PI, Math.PI * 2, false);
    } else if (station.kind === 'market-marker') {
      this.worldGraphics.lineStyle(4, color, 1).strokeCircle(x, y, 24);
      this.worldGraphics.lineBetween(x - 11, y, x + 11, y);
      this.worldGraphics.lineBetween(x, y - 11, x, y + 11);
    } else {
      this.worldGraphics.fillCircle(x, y, 22);
      this.worldGraphics.fillStyle(color, 1).fillCircle(x, y, 11);
      this.worldGraphics.fillStyle(0xfff3c4, 1).fillRect(x - 3, y - 9, 6, 18).fillRect(x - 9, y - 3, 18, 6);
    }
  }

  private renderHud(previous?: GameState): void {
    const market = getMarketDefinition(state.marketId);
    const activeEvent = shop.flowEvents.find((event) => state.elapsedMs >= event.startsAtMs && (state.elapsedMs - event.startsAtMs) % event.repeatEveryMs < event.durationMs);
    document.querySelector('#title')!.textContent = `${config.title} · ${market.name}`;
    document.querySelector('#coins')!.textContent = `${config.content.currencyName} ${state.currency}`;
    document.querySelector('#level')!.textContent = `等级 ${state.level}`;
    const progress = state.perMarketProgress[state.marketId];
    const status = state.stage === 'settlement'
      ? `${market.goalLabel}：结算完成，可继续当地或重开`
      : state.stage === 'market-selection'
        ? '航标已停靠：选择一处真正不同的市场'
      : state.cashPile > 0
        ? `柜台有 ${state.cashPile} 贝壳币，靠近收取`
        : activeEvent
          ? `当前节奏：${activeEvent.label}`
          : `${market.atmosphere} · ${market.goalLabel}${progress && state.marketId !== 'beach-stall' ? ` ${progress.goalProgress}/${progress.constructionTarget}` : ''}`;
    document.querySelector('#status')!.textContent = status;
    const order = getActiveOrderPresentation(shop, state);
    const orderCard = document.querySelector<HTMLElement>('#order-card');
    const orderProduct = document.querySelector<HTMLElement>('#order-product');
    const orderRoute = document.querySelector<HTMLElement>('#order-route');
    const orderStatus = document.querySelector<HTMLElement>('#order-status');
    const orderStock = document.querySelector<HTMLElement>('#order-stock');
    const orderLines = document.querySelector<HTMLElement>('#order-lines');
    if (orderCard) orderCard.style.setProperty('--order-color', order.productColor);
    if (orderProduct) orderProduct.textContent = order.productName;
    if (orderRoute) orderRoute.textContent = `路线 · ${order.routeLabel} · ${order.gatheredLabel}`;
    if (orderStatus) orderStatus.textContent = order.statusLabel;
    if (orderStock) orderStock.textContent = order.customerId === null ? '暂无顾客' : `货架 ${order.shelfStock} · 货篮 ${order.basketValue}`;
    if (orderLines) orderLines.textContent = order.lines.length === 0
      ? '—'
      : order.lines.map((line) => `${line.completed ? '✓' : '○'} ${line.productName} ${line.collected}/${line.quantity}`).join('  ');
    const mission = document.querySelector<HTMLElement>('#mission');
    if (mission) {
      const carried = Object.values(state.player.inventory).reduce((sum, count) => sum + count, 0);
      mission.textContent = state.stage === 'settlement'
        ? '阶段完成：点继续当地，再走到航标停下选市场'
        : state.stage === 'market-selection'
          ? '选择珊瑚湾或月潮码头，路线会改变站点与目标'
        : state.marketMarker.enabled
          ? '下一步：沿着航线走到下一市场航标并停下'
        : state.marketId !== 'beach-stall' && progress
          ? `市场目标：${market.id === 'coral-cove-market' ? `烟熏订单 ${progress.smokedOrders}/${progress.constructionTarget}` : `双货架订单 ${progress.dualShelfOrders}/${progress.constructionTarget}`}`
        : state.cashPile > 0
          ? '下一步：离开柜台再回来收取现金'
          : state.checkout.queue > 0
            ? `下一步：在收银桌服务队首（${state.checkout.queue}）`
            : carried > 0
              ? '下一步：靠近鲜鱼冰盘补货'
              : '首要动作：去近岸渔网采集鲜货';
    }
    const settlement = document.querySelector<HTMLElement>('#settlement');
    if (settlement) settlement.hidden = state.stage !== 'settlement' && state.stage !== 'market-selection';
    const settlementTitle = settlement?.querySelector('strong');
    if (settlementTitle) settlementTitle.textContent = state.stage === 'market-selection' ? '航标选市场' : '扩建结算';
    const settlementCopy = settlement?.querySelector('p');
    if (settlementCopy) settlementCopy.textContent = state.stage === 'market-selection'
      ? '停在航标内才会出现路线选择；两处市场拥有不同站位、气候与订单目标。'
      : '潮池扩建完成。继续当地会保留已完成的解锁，再走到航标开启路线选择。';
    settlement?.querySelectorAll<HTMLButtonElement>('[data-market-id]').forEach((button) => {
      const marketOption = getMarketDefinition(button.dataset.marketId ?? 'coral-cove-market');
      const title = button.querySelector('span');
      const detail = button.querySelector('small');
      if (state.stage === 'market-selection') {
        if (title) title.textContent = marketOption.name;
        if (detail) detail.textContent = `${marketOption.atmosphere} · ${marketOption.goalLabel}`;
      } else {
        if (title) title.textContent = '继续当地';
        if (detail) detail.textContent = '保留解锁，前往下一市场航标';
      }
    });
    const cashPile = document.querySelector<HTMLElement>('#cash-pile');
    if (cashPile) cashPile.textContent = state.cashPile > 0 ? `柜台现金 ${state.cashPile}` : '柜台现金 0';
    if (previous && state.feedback.at(-1)?.id !== previous.feedback.at(-1)?.id) {
      const latest = state.feedback.at(-1);
      if (latest) {
        const toast = document.querySelector<HTMLElement>('#toast');
        if (toast) toast.textContent = feedbackLabel(latest);
      }
    }
    fitGameFrame();
  }
}

function feedbackLabel(event: FeedbackEvent): string {
  switch (event.kind) {
    case 'pickup': return '采集：鲜货到手';
    case 'deposit': return '补货：货物进入货架';
    case 'customer-pickup': return '顾客取货：前往收银';
    case 'customer-queued': return '顾客入队：队首服务';
    case 'checkout-packing': return '打包中：正在封装货品';
    case 'checkout-pack': return `打包完成：${event.amount ?? 0} 贝壳币落入柜台`;
    case 'cash-collect': return `收钱：+${event.amount ?? 0} 贝壳币`;
    case 'invest': return `投资：已投入 ${event.amount ?? 0}`;
    case 'construction-complete': return '建设完成：潮池已解锁';
    case 'upgrade': return '升级完成：携带容量提升';
    case 'customer-arrival': return '新顾客到店';
    case 'production-ready': return '生产完成：可采集';
    case 'processor-ready': return '烟熏完成：取出成品';
    case 'employee-hired': return '招募完成：员工上岗';
    case 'runner-pickup': return '跑腿取货：前往货架';
    case 'runner-deposit': return '跑腿补货：货架库存增加';
    case 'cashier-service': return '收银帮手：队首打包中';
    case 'seagull-alert': return '海鸥来袭：靠近驱赶';
    case 'seagull-loss': return '海鸥叼走一件货';
    case 'seagull-scared': return '海鸥被驱赶：损失停止';
    case 'customer-shortage': return '顾客离开：缺货等待超时';
    case 'market-marker': return '航标停靠：路线选择已开启';
    case 'market-selected': return '已抵达新市场：目标与站位更新';
    case 'market-goal': return `市场目标进度 ${event.amount ?? 0}`;
    default: return '动作完成';
  }
}

function feedbackShortLabel(event: FeedbackEvent): string {
  switch (event.kind) {
    case 'pickup': return '采集 +1';
    case 'deposit': return '补货';
    case 'customer-pickup': return '顾客取货';
    case 'customer-queued': return '入队';
    case 'checkout-packing': return '打包中';
    case 'checkout-pack': return '现金入柜';
    case 'cash-collect': return '收钱';
    case 'invest': return '投建';
    case 'construction-complete': return '建设完成';
    case 'upgrade': return '升级';
    case 'customer-arrival': return '新顾客';
    case 'production-ready': return '可采集';
    case 'processor-ready': return '烟熏完成';
    case 'employee-hired': return '上岗';
    case 'runner-pickup': return '跑腿取货';
    case 'runner-deposit': return '跑腿补货';
    case 'cashier-service': return '帮手打包';
    case 'seagull-alert': return '海鸥警报';
    case 'seagull-loss': return '损失 -1';
    case 'seagull-scared': return '已驱赶';
    case 'customer-shortage': return '缺货离店';
    case 'market-marker': return '航标';
    case 'market-selected': return '新市场';
    case 'market-goal': return '目标进度';
    default: return '动作完成';
  }
}

function clearRoundPresentation(): void {
  const toast = document.querySelector<HTMLElement>('#toast');
  const settlement = document.querySelector<HTMLElement>('#settlement');
  resetRoundPresentation(toast, settlement);
  fitGameFrame();
}

document.querySelectorAll<HTMLElement>('[data-market-id]').forEach((button) => {
  button.addEventListener('click', () => {
    if (state.stage === 'settlement') {
      continueGame();
    } else if (state.stage === 'market-selection') {
      selectMarketGame(button.dataset.marketId ?? 'coral-cove-market');
    }
    renderOutsideState();
  });
});

document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((button) => {
  const direction = button.dataset.move as keyof typeof immediateKeys;
  const release = (): void => { immediateKeys[direction] = false; };
  button.addEventListener('pointerdown', (event) => { event.preventDefault(); immediateKeys[direction] = true; });
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
});
document.querySelector('#restart-round')?.addEventListener('click', () => {
  restartGame();
  clearRoundPresentation();
  renderOutsideState();
});

function renderOutsideState(): void {
  const settlement = document.querySelector<HTMLElement>('#settlement');
  if (settlement) settlement.hidden = state.stage !== 'settlement' && state.stage !== 'market-selection';
  fitGameFrame();
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: shop.world.width,
  height: shop.world.height,
  backgroundColor: config.palette[0] ?? '#16324F',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [SpatialShopScene],
});
