/* global document, localStorage, structuredClone, window */
import Phaser from 'phaser';
import { joystickMove, keyboardMove, mergeMoveActions } from './input.js';
import {
  STATIONS,
  WORLD,
  advanceGame,
  createInitialState,
  grantCurrency as addCurrency,
  setPlayerPosition as placePlayer,
  setRandomSeed as applyRandomSeed,
  spawnCustomer as addCustomer,
  type GameState,
  type MoveInput,
  type Position,
} from './simulation.js';
import './style.css';

const SAVE_KEY = 'spatial-logistics-core:save-v1';
const SAVE_VERSION = 1;

function loadState(): GameState {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as GameState | null;
    if (saved?.version === SAVE_VERSION && saved.player && saved.shelf && saved.checkout) return saved;
  } catch { return createInitialState(); }
  return createInitialState();
}

let state = loadState();
let nextCustomerSpawnMs = state.elapsedMs + 1_200;
let lastSavedMs = state.elapsedMs;

function saveState(): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch { return; }
}

function publicState(): GameState {
  return structuredClone(state);
}

function resetGame(): GameState {
  state = createInitialState();
  nextCustomerSpawnMs = 1_200;
  lastSavedMs = 0;
  try { localStorage.removeItem(SAVE_KEY); } catch { return publicState(); }
  return publicState();
}

function getState(): GameState { return publicState(); }
function spawnCustomer(): GameState { state = addCustomer(state); saveState(); return publicState(); }
function grantCurrency(amount = 10): GameState { state = addCurrency(state, amount); saveState(); return publicState(); }
function setRandomSeed(seed: number): GameState { state = applyRandomSeed(state, seed); saveState(); return publicState(); }
function setPlayerPosition(position: Position): GameState { state = placePlayer(state, position); return publicState(); }
function advanceTime(durationMs: number): GameState { state = advanceGame(state, durationMs); saveState(); return publicState(); }
function completeOrder(): GameState {
  state = placePlayer(state, STATIONS.checkout);
  state = advanceGame(state, 750);
  saveState();
  return publicState();
}
function upgradeStation(): GameState {
  state = placePlayer(state, STATIONS.upgrade);
  state = advanceGame(state, 550);
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
    };
  }
}

window.__GAME_TEST__ = {
  resetGame,
  getState,
  spawnCustomer,
  completeOrder,
  grantCurrency,
  upgradeStation,
  setRandomSeed,
  setPlayerPosition,
  advanceTime,
};

type KeySet = {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
};

class LogisticsScene extends Phaser.Scene {
  private keys!: { cursors: Phaser.Types.Input.Keyboard.CursorKeys; wasd: KeySet };
  private worldGraphics!: Phaser.GameObjects.Graphics;
  private entityGraphics!: Phaser.GameObjects.Graphics;
  private playerGraphics!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickThumb!: Phaser.GameObjects.Arc;
  private joystickOrigin: Position | null = null;
  private joystickInput: MoveInput = { x: 0, y: 0 };
  private joystickPointerId: number | null = null;

  constructor() { super('logistics'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#182238');
    this.worldGraphics = this.add.graphics();
    this.entityGraphics = this.add.graphics();
    this.playerGraphics = this.add.graphics();
    this.keys = {
      cursors: this.input.keyboard!.createCursorKeys(),
      wasd: this.input.keyboard!.addKeys('W,A,S,D') as KeySet,
    };
    this.joystickBase = this.add.circle(0, 0, 54, 0x67e8f9, 0.16).setStrokeStyle(3, 0x67e8f9, 0.7).setVisible(false).setDepth(20);
    this.joystickThumb = this.add.circle(0, 0, 24, 0xf8fafc, 0.58).setVisible(false).setDepth(21);
    this.input.on('pointerdown', this.startJoystick, this);
    this.input.on('pointermove', this.moveJoystick, this);
    this.input.on('pointerup', this.stopJoystick, this);
    this.input.on('pointerupoutside', this.stopJoystick, this);
    this.drawStaticWorld();
    this.renderState();
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
    this.joystickThumb.setPosition(
      this.joystickOrigin.x + this.joystickInput.x * 42,
      this.joystickOrigin.y + this.joystickInput.y * 42,
    );
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
      left: this.keys.cursors.left.isDown || this.keys.wasd.A.isDown,
      right: this.keys.cursors.right.isDown || this.keys.wasd.D.isDown,
      up: this.keys.cursors.up.isDown || this.keys.wasd.W.isDown,
      down: this.keys.cursors.down.isDown || this.keys.wasd.S.isDown,
    });
    return mergeMoveActions(keyboard, this.joystickInput);
  }

  update(_time: number, delta: number): void {
    state = advanceGame(state, Math.min(delta, 100), this.readMoveAction());
    if (state.elapsedMs >= nextCustomerSpawnMs) {
      state = addCustomer(state);
      nextCustomerSpawnMs += 3_500;
    }
    if (state.elapsedMs - lastSavedMs >= 1_000) {
      saveState();
      lastSavedMs = state.elapsedMs;
    }
    this.renderState();
  }

  private drawStaticWorld(): void {
    this.worldGraphics.clear();
    this.worldGraphics.fillStyle(0x0f172a, 1).fillRoundedRect(18, 18, WORLD.width - 36, WORLD.height - 36, 24);
    this.worldGraphics.lineStyle(2, 0xffffff, 0.08);
    for (let x = 60; x < WORLD.width; x += 60) this.worldGraphics.lineBetween(x, 20, x, WORLD.height - 20);
    for (let y = 60; y < WORLD.height; y += 60) this.worldGraphics.lineBetween(20, y, WORLD.width - 20, y);
    this.drawStation(STATIONS.producer, 0x22c55e, '生产点');
    this.drawStation(STATIONS.shelf, 0xf59e0b, '货架');
    this.drawStation(STATIONS.checkout, 0x38bdf8, '收银');
    this.drawStation(STATIONS.upgrade, 0xa78bfa, '扩容');
  }

  private drawStation(position: Position, color: number, label: string): void {
    this.worldGraphics.fillStyle(color, 0.18).fillCircle(position.x, position.y, WORLD.interactionRadius);
    this.worldGraphics.lineStyle(3, color, 0.8).strokeCircle(position.x, position.y, WORLD.interactionRadius);
    this.labels.push(this.add.text(position.x, position.y - 8, label, {
      fontFamily: 'system-ui', fontSize: '20px', color: '#f8fafc', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3));
  }

  private renderState(): void {
    this.entityGraphics.clear();
    this.playerGraphics.clear();

    for (let index = 0; index < state.producer.ready; index += 1) {
      const column = index % 3;
      const row = Math.floor(index / 3);
      this.entityGraphics.fillStyle(0x4ade80, 1).fillCircle(STATIONS.producer.x - 24 + column * 24, STATIONS.producer.y + 12 + row * 22, 8);
    }
    for (let index = 0; index < state.shelf.stock; index += 1) {
      const column = index % 4;
      const row = Math.floor(index / 4);
      this.entityGraphics.fillStyle(0xfbbf24, 1).fillRoundedRect(STATIONS.shelf.x - 42 + column * 23, STATIONS.shelf.y + 10 + row * 20, 16, 14, 3);
    }
    for (const customer of state.customers) {
      if (customer.phase === 'served') continue;
      this.entityGraphics.fillStyle(customer.phase === 'queued' ? 0x7dd3fc : 0xf472b6, 1).fillCircle(customer.x, customer.y, 15);
      this.entityGraphics.lineStyle(2, 0xffffff, 0.65).strokeCircle(customer.x, customer.y, 15);
    }

    this.playerGraphics.fillStyle(0xf8fafc, 1).fillCircle(state.player.x, state.player.y, WORLD.playerRadius);
    this.playerGraphics.lineStyle(4, 0x67e8f9, 1).strokeCircle(state.player.x, state.player.y, WORLD.playerRadius);
    for (let index = 0; index < state.player.carry; index += 1) {
      this.playerGraphics.fillStyle(0xfbbf24, 1).fillRoundedRect(state.player.x - 11, state.player.y - 34 - index * 14, 22, 11, 3);
    }

    document.querySelector('#money')!.textContent = `货币 ${state.currency}`;
    document.querySelector('#carry')!.textContent = `携带 ${state.player.carry}/${state.player.capacity}`;
    document.querySelector('#shelf')!.textContent = `货架 ${state.shelf.stock}/${state.shelf.capacity}`;
    document.querySelector('#queue')!.textContent = `队列 ${state.checkout.queue}`;
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WORLD.width,
  height: WORLD.height,
  backgroundColor: '#182238',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  scene: [LogisticsScene],
});
