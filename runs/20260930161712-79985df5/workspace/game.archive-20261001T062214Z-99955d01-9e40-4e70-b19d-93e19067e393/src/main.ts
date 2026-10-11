/* global document, localStorage, structuredClone, window */
import Phaser from 'phaser';
import generatedConfig from './generated/game-config.json';
import { joystickMove, keyboardMove, mergeMoveActions } from './input.js';
import { MotionPlayer, preloadBeforePlayback, resolveMotionDuration } from './uiMotion.js';
import {
  advanceGame, continueRound, createInitialState, grantCurrency as addCurrency, restartRound, restoreState,
  setPlayerPosition as placePlayer, setRandomSeed as applyRandomSeed, spawnCustomer as addCustomer,
  type GameState, type MoveInput, type Position, type SpatialShopConfig, type StationDefinition,
} from './simulation.js';
import './style.css';

type GeneratedConfig = { title: string; theme: string; content: { productName: string; customerName: string; currencyName: string }; palette: string[]; spatialShop: SpatialShopConfig };
const config = generatedConfig as GeneratedConfig;
const shop = config.spatialShop;
const SAVE_KEY = `ai-game-factory:beach-logistics:${config.title}`;
const SAVE_VERSION = 1;

function loadState(): GameState {
  return restoreState(shop, localStorage.getItem(SAVE_KEY));
}

let state = loadState();
let lastSavedMs = state.elapsedMs;
let lastSavedFeedback = state.feedbackEvents;
let nextCustomerSpawnMs = state.nextCustomerSpawnMs;

function publicState(): GameState { return structuredClone(state); }
function persistNow(): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); lastSavedMs = state.elapsedMs; lastSavedFeedback = state.feedbackEvents; } catch { /* storage is optional */ }
}
function persistIfDue(force = false): void {
  if (force || state.elapsedMs - lastSavedMs >= 1_000 || state.feedbackEvents !== lastSavedFeedback || state.stage === 'settlement') persistNow();
}
function resetGame(): GameState { state = createInitialState(shop); nextCustomerSpawnMs = state.nextCustomerSpawnMs; try { localStorage.removeItem(SAVE_KEY); } catch { /* optional */ } return publicState(); }
function getState(): GameState { return publicState(); }
function spawnCustomer(): GameState { state = addCustomer(shop, state); persistNow(); return publicState(); }
function grantCurrency(amount = 10): GameState { state = addCurrency(state, amount); persistNow(); return publicState(); }
function setRandomSeed(seed: number): GameState { state = applyRandomSeed(state, seed); persistNow(); return publicState(); }
function setPlayerPosition(position: Position): GameState { state = placePlayer(state, position); return publicState(); }
function advanceTime(durationMs: number): GameState { state = advanceGame(shop, state, durationMs); nextCustomerSpawnMs = state.nextCustomerSpawnMs; persistIfDue(true); return publicState(); }
function completeOrder(): GameState {
  if (!state.customers.some((customer) => customer.phase === 'queued')) {
    const shelf = state.stations['fish-shelf']; if (shelf) shelf.stock['fresh-fish'] = Math.max(1, shelf.stock['fresh-fish'] ?? 0);
    state = addCustomer(shop, state, 'fresh-fish');
    state = advanceGame(shop, state, 10_000);
  }
  state = placePlayer(state, shop.stations.find((station) => station.kind === 'checkout')?.position ?? shop.player.start);
  state = advanceGame(shop, state, 1_000); persistNow(); return publicState();
}
function upgradeStation(): GameState {
  const station = shop.stations.find((item) => item.kind === 'upgrade');
  if (station) { state = placePlayer(state, station.position); state = advanceGame(shop, state, station.purchaseIntervalMs + 100); persistNow(); }
  return publicState();
}

declare global { interface Window { __GAME_TEST__: { resetGame: typeof resetGame; getState: typeof getState; spawnCustomer: typeof spawnCustomer; completeOrder: typeof completeOrder; grantCurrency: typeof grantCurrency; upgradeStation: typeof upgradeStation; setRandomSeed: typeof setRandomSeed; setPlayerPosition: typeof setPlayerPosition; advanceTime: typeof advanceTime } } }
window.__GAME_TEST__ = { resetGame, getState, spawnCustomer, completeOrder, grantCurrency, upgradeStation, setRandomSeed, setPlayerPosition, advanceTime };

type KeySet = { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
const hex = (value: string, fallback: string): number => Number.parseInt((value || fallback).replace('#', ''), 16);
const stationColor: Record<StationDefinition['kind'], string> = { producer: '#5ec9b0', shelf: '#f2c572', checkout: '#68aee8', construction: '#f07c72', upgrade: '#a38be8' };

class SpatialShopScene extends Phaser.Scene {
  private keys!: { cursors: Phaser.Types.Input.Keyboard.CursorKeys; wasd: KeySet };
  private worldGraphics!: Phaser.GameObjects.Graphics;
  private textLayer!: Phaser.GameObjects.Container;
  private joystickOrigin: Position | null = null;
  private joystickInput: MoveInput = { x: 0, y: 0 };
  private motion!: MotionPlayer;
  private reducedMotion = false;
  private assetsReady = false;
  private preloadGate = preloadBeforePlayback(['placeholder:customer', 'placeholder:product', 'placeholder:station']);

  create(): void {
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.motion = new MotionPlayer(resolveMotionDuration('microFeedback', this.reducedMotion), 'ease-out');
    this.worldGraphics = this.add.graphics();
    this.textLayer = this.add.container(0, 0);
    this.keys = { cursors: this.input.keyboard!.createCursorKeys(), wasd: { W: this.input.keyboard!.addKey('W'), A: this.input.keyboard!.addKey('A'), S: this.input.keyboard!.addKey('S'), D: this.input.keyboard!.addKey('D') } };
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => { this.joystickOrigin = { x: pointer.x, y: pointer.y }; });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => { if (this.joystickOrigin) this.joystickInput = joystickMove(this.joystickOrigin, { x: pointer.x, y: pointer.y }, 10, 90); });
    this.input.on('pointerup', () => { this.joystickOrigin = null; this.joystickInput = { x: 0, y: 0 }; });
    this.preloadGate.readyPromise.then(() => { this.assetsReady = true; });
    renderHud();
  }

  update(time: number, delta: number): void {
    if (!this.assetsReady) return;
    const primary = keyboardMove({ left: this.keys.cursors.left.isDown || this.keys.wasd.A.isDown, right: this.keys.cursors.right.isDown || this.keys.wasd.D.isDown, up: this.keys.cursors.up.isDown || this.keys.wasd.W.isDown, down: this.keys.cursors.down.isDown || this.keys.wasd.S.isDown });
    const input = mergeMoveActions(primary, this.joystickInput);
    const before = state.feedbackEvents;
    state = advanceGame(shop, state, Math.min(100, delta), input);
    nextCustomerSpawnMs = state.nextCustomerSpawnMs;
    if (state.feedbackEvents !== before) this.motion.start(time);
    this.motion.update(time);
    persistIfDue(); renderHud(); this.drawWorld();
  }

  private drawWorld(): void {
    this.worldGraphics.clear();
    this.worldGraphics.fillStyle(hex(config.palette[0] ?? '#18212b', '#18212b'), 1).fillRect(0, 0, shop.world.width, shop.world.height);
    this.worldGraphics.fillStyle(0x214b58, 1).fillRect(0, 0, shop.world.width, 360);
    this.worldGraphics.fillStyle(0x295f59, 0.72).fillEllipse(110, 180, 240, 120);
    this.worldGraphics.fillStyle(0x17333e, 0.65).fillRect(0, 360, shop.world.width, 600);
    this.worldGraphics.lineStyle(2, 0xffffff, 0.09); this.worldGraphics.strokeLineShape(new Phaser.Geom.Line(40, 530, 500, 530));
    this.textLayer.removeAll(true);
    for (const station of shop.stations) this.drawStation(station);
    for (const customer of state.customers.filter((item) => item.phase !== 'left')) {
      const color = customer.phase === 'waiting-shelf' ? 0xf07c72 : 0xf2c572;
      this.worldGraphics.fillStyle(color, 1).fillCircle(customer.x, customer.y, 15);
      this.worldGraphics.fillStyle(0x18212b, 0.8).fillCircle(customer.x, customer.y - 3, 4);
      if (customer.phase === 'waiting-shelf') { this.worldGraphics.lineStyle(2, 0xf07c72, 0.9).strokeCircle(customer.x, customer.y, 23); }
    }
    const pulse = 1 + this.motion.value * 0.12;
    this.worldGraphics.fillStyle(hex(config.palette[1] ?? '#f2c572', '#f2c572'), 1).fillRoundedRect(state.player.x - 14 * pulse, state.player.y - 18 * pulse, 28 * pulse, 36 * pulse, 10);
    this.worldGraphics.fillStyle(0x18212b, 1).fillCircle(state.player.x, state.player.y - 6 * pulse, 5);
    let stack = 0; for (const product of shop.products) for (let i = 0; i < (state.player.inventory[product.id] ?? 0); i += 1) { this.worldGraphics.fillStyle(hex(product.color, '#4ba3c7'), 1).fillRoundedRect(state.player.x - 10, state.player.y - 34 - stack * 10, 20, 8, 3); stack += 1; }
  }

  private drawStation(station: StationDefinition): void {
    const unlocked = state.unlockedStationIds.includes(station.id); const color = hex(stationColor[station.kind], '#64748b');
    this.worldGraphics.fillStyle(color, unlocked ? 0.18 : 0.06).fillRoundedRect(station.position.x - 52, station.position.y - 34, 104, 68, 14);
    this.worldGraphics.lineStyle(2, color, unlocked ? 0.92 : 0.32).strokeRoundedRect(station.position.x - 52, station.position.y - 34, 104, 68, 14);
    const label = unlocked ? station.label : `🔒 ${station.label}`; const text = this.add.text(station.position.x, station.position.y - 7, label, { fontFamily: 'Inter, sans-serif', fontSize: '14px', color: unlocked ? '#f8fafc' : '#8ca0ad', align: 'center', wordWrap: { width: 92 } }).setOrigin(0.5); this.textLayer.add(text);
    const runtime = state.stations[station.id];
    if (!runtime) return;
    if (station.kind === 'producer' && unlocked) this.worldGraphics.fillStyle(0xffffff, 0.3).fillRect(station.position.x - 38, station.position.y + 20, 76 * (runtime.ready / station.capacity), 4);
    if (station.kind === 'shelf' && unlocked) this.worldGraphics.fillStyle(0xffffff, 0.3).fillRect(station.position.x - 38, station.position.y + 20, 76 * (Object.values(runtime.stock).reduce((a, b) => a + b, 0) / station.capacity), 4);
    if (station.kind === 'construction') { this.worldGraphics.fillStyle(0xffffff, 0.35).fillRect(station.position.x - 38, station.position.y + 20, 76 * (runtime.contributed / station.cost), 4); }
  }
}

function renderHud(): void {
  document.querySelector('#title')!.textContent = config.title;
  document.querySelector('#coins')!.textContent = `${config.content.currencyName} ${state.currency}`;
  document.querySelector('#level')!.textContent = `经营等级 ${state.level}`;
  const activeEvent = shop.flowEvents.find((event) => state.elapsedMs >= event.startsAtMs && (state.elapsedMs - event.startsAtMs) % event.repeatEveryMs < event.durationMs);
  const active = state.player.interactionStationId ? shop.stations.find((station) => station.id === state.player.interactionStationId)?.label : null;
  document.querySelector('#status')!.textContent = state.stage === 'settlement' ? '阶段完成：选择继续经营或重开本轮' : activeEvent ? `🌊 ${activeEvent.label}：近岸渔网加速` : active ? `自动处理中：${active}` : '移动到站点，自动执行下一步';
  const event = state.lastEvent; document.querySelector('#toast')!.textContent = event && state.elapsedMs - event.atMs < 1_200 ? event.message : '';
  const settlement = document.querySelector('#settlement') as HTMLElement; settlement.hidden = state.stage !== 'settlement';
}

document.querySelector('#continue-round')?.addEventListener('click', () => { state = continueRound(state); persistNow(); renderHud(); });
document.querySelector('#restart-round')?.addEventListener('click', () => { state = restartRound(shop, state); persistNow(); renderHud(); });

new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: shop.world.width, height: shop.world.height, backgroundColor: config.palette[0] ?? '#18212B', scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [SpatialShopScene] });
