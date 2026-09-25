import Phaser from 'phaser';
import config from './generated/game-config.json';
import { GamePersistence } from './game/persistence';
import {
  ECONOMY,
  CUSTOMER_ENTRY,
  PRODUCT_IDS,
  STATIONS,
  advanceGame,
  activateDeliveryInstant,
  activateGullBonus,
  activateOfflineBonus,
  completeOrderForTest,
  hireEmployee as hireEmployeeState,
  setEmployeeWake as setEmployeeWakeState,
  upgradeEmployee as upgradeEmployeeState,
  movePlayer,
  purchaseCarrierUpgrade,
  selectArea,
  spawnCustomerNow,
  type Customer,
  type CustomerState,
  type GameEvent,
  type GameState,
  type Point,
  type ProductId,
  type ShellToken,
  type AreaId,
} from './game/simulation';
import {
  AssetPreloadGate,
  MOTION_TOKENS_MS,
  advanceCharacterMotion,
  animateElement,
  createCharacterMotionState,
  prefersReducedMotion,
  type CharacterMotionState,
} from './ui/motion';
import { createUiView, getFullBadgeModel, getHudExclusions, placeAttachedBadge } from './ui/view-model';
import { areaCameraOrigin, clampCameraToArea, createAreaLayout } from './world/areas';
import {
  customerLaneOffset,
  CUSTOMER_ROUTE_DURATION_MS,
  CUSTOMER_EXIT_DURATION_MS,
  routeTransition,
  routeWaypoints,
  type CustomerRoutePlan,
  type CustomerRouteStage,
} from './ui/customer-routes';
import { runRewardedAdFlow } from './platform/ads-runtime';
import { createPlatformAdapter } from './platform/adapters';
import type { AdPlacement } from './platform/ads';
import './style.css';

const DESIGN_WIDTH = 540;
const DESIGN_HEIGHT = 960;
const PLAYER_SPEED = 178;
const ENTRY_HOLD_MS = MOTION_TOKENS_MS.panelTransition + 80;
const SHOW_CUSTOMER_ROUTES = false;
const CUSTOMER_WAYPOINTS: Point[] = [{ x: CUSTOMER_ENTRY.x, y: 770 }, { x: CUSTOMER_ENTRY.x, y: 650 }];
const persistence = new GamePersistence(localStorage);
let state = persistence.load();
let scene: MarketScene | null = null;
let domSignature = '';
type StationId = keyof typeof STATIONS;
type StationEntryCue = { title: string; detail: string; expiresAtMs: number };
const CONTEXTUAL_CUE_DURATION_MS = 900;
let nearbyStationId: StationId | null = null;
let activeContextualCue: StationEntryCue | null = null;

const byId = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!;

function motionPulse(element: HTMLElement | null, scale = 1.045) {
  if (!element) return;
  animateElement(element, {
    durationMs: MOTION_TOKENS_MS.microFeedback,
    fromOpacity: 0.72,
    toOpacity: 1,
    fromScale: scale,
    toScale: 1,
  });
}

function nearestStation(current: GameState) {
  const nearest = (Object.entries(STATIONS) as Array<[StationId, (typeof STATIONS)[StationId]]>)
    .map(([id, station]) => ({ id, distance: Math.hypot(current.player.x - station.x, current.player.y - station.y) }))
    .sort((a, b) => a.distance - b.distance)[0];
  return nearest && nearest.distance <= 82 ? nearest : null;
}

function stationEntryCue(current: GameState, stationId: StationId) {
  const carrying = Object.values(current.carrying).reduce((sum, count) => sum + count, 0);
  if (stationId === 'fishSource') return { title: '近岸渔网', detail: `自动捕鱼 · ${carrying}/${current.capacity}` };
  if (stationId === 'kelpSource') {
    return current.construction.kelpUnlocked
      ? { title: '潮池海带已解锁', detail: '靠近自动采集海带' }
      : { title: '锁定潮池 · 原地投建', detail: `已投入 ${current.construction.invested}/${ECONOMY.kelpUnlock.investmentCost} · 余额 ${current.currency}` };
  }
  if (stationId === 'shrimpTrap') return { title: '浅滩虾笼', detail: `蓄货 ${current.facilities.shrimpTrap.buffer}/4` };
  if (stationId === 'crabPot') return { title: '礁边蟹笼', detail: `待取 ${current.facilities.crabPot.readyCount}/${current.facilities.crabPot.readyCapacity}` };
  const shelfCapacity = (product: ProductId) => ECONOMY.shelves.capacityByProduct[product];
  if (stationId === 'fishShelf') return { title: '鲜鱼冰盘', detail: `库存 ${current.shelves.fish}/${shelfCapacity('fish')}${current.shelves.fish === shelfCapacity('fish') ? ' · 已满' : ''}` };
  if (stationId === 'kelpShelf') return { title: '海带篮', detail: `库存 ${current.shelves.kelp}/${shelfCapacity('kelp')}${current.shelves.kelp === shelfCapacity('kelp') ? ' · 已满' : ''}` };
  if (stationId === 'shrimpShelf') return { title: '鲜虾木箱', detail: `库存 ${current.shelves.shrimp}/${shelfCapacity('shrimp')}${current.shelves.shrimp === shelfCapacity('shrimp') ? ' · 已满' : ''}` };
  if (stationId === 'crabShelf') return { title: '礁蟹冰盘', detail: `库存 ${current.shelves.crab}/${shelfCapacity('crab')}${current.shelves.crab === shelfCapacity('crab') ? ' · 已满' : ''}` };
  if (stationId === 'checkout') return { title: '贝壳收银台', detail: `队列 ${current.checkoutQueue.length} · 靠近服务并捡币` };
  return { title: '', detail: '' };
}

function resetStationEntryCueTracking() {
  nearbyStationId = nearestStation(state)?.id ?? null;
  activeContextualCue = null;
}

function syncStationEntryCue() {
  const station = nearestStation(state);
  const nextStationId = station?.id ?? null;
  if (nextStationId === nearbyStationId) return;
  nearbyStationId = nextStationId;
  activeContextualCue = station
    ? { ...stationEntryCue(state, station.id), expiresAtMs: state.simulationTimeMs + CONTEXTUAL_CUE_DURATION_MS }
    : null;
}

function renderDom(force = false) {
  const view = createUiView(state);
  const contextualCue = activeContextualCue && activeContextualCue.expiresAtMs > state.simulationTimeMs
    ? activeContextualCue
    : null;
  const signature = JSON.stringify({ hud: view.hud, upgrade: view.upgrade, contextualCue });
  if (!force && signature === domSignature) return;
  const previous = domSignature;
  domSignature = signature;
  byId('title').textContent = config.title;
  byId('coins').textContent = view.hud.currency;
  const upgradeButton = byId<HTMLButtonElement>('upgrade-button');
  const upgradeDot = upgradeButton.querySelector<HTMLElement>('.upgrade-dot');
  upgradeDot?.toggleAttribute('hidden', !view.upgrade.redDot);
  upgradeButton.disabled = view.upgrade.nextPrice === null || view.upgrade.gated;
  byId('upgrade-panel-copy').textContent = view.upgrade.nextPrice === null
    ? '已满级'
    : `${view.upgrade.current} → ${view.upgrade.next} · ${view.upgrade.nextPrice}`;
  byId<HTMLButtonElement>('confirm-upgrade').disabled = upgradeButton.disabled;
  const objectiveChip = byId('objective-chip');
  objectiveChip.hidden = !contextualCue;
  objectiveChip.setAttribute('aria-hidden', String(!contextualCue));
  if (contextualCue) {
    byId('status-title').textContent = contextualCue.title;
    byId('status-detail').textContent = contextualCue.detail;
  }
  document.querySelectorAll<HTMLButtonElement>('#area-nav button[data-area]').forEach((button) => {
    const areaId = Number(button.dataset.area) as AreaId;
    const unlocked = state.areas.unlocked.includes(areaId);
    button.disabled = !unlocked;
    button.setAttribute('aria-current', state.areas.active === areaId ? 'true' : 'false');
    button.textContent = unlocked ? String(areaId) : '·';
    button.title = unlocked ? `切换到区域 ${areaId}` : `区域 ${areaId} 尚未解锁`;
  });
  if (previous) {
    motionPulse(byId('coins'));
    if (contextualCue) motionPulse(objectiveChip, 1.018);
  }
}

function replaceState(next: GameState, critical = false) {
  state = next;
  if (critical) persistence.keyChange(state);
  renderDom();
  scene?.syncVisualState(true);
  return getState();
}

function resetGame() {
  state = persistence.reset();
  resetStationEntryCueTracking();
  renderDom(true);
  scene?.syncVisualState(true);
  return getState();
}

function getState() {
  return structuredClone(state);
}

function spawnCustomer(product: ProductId | Partial<Record<ProductId, number>> = 'fish') {
  return replaceState(spawnCustomerNow(state, product).state, true);
}

function completeOrder(product?: ProductId) {
  const queued = state.checkoutQueue.length > 0
    ? state.customers.find((customer) => customer.id === state.checkoutQueue[0])?.product
    : undefined;
  return replaceState(completeOrderForTest(state, product ?? queued ?? 'fish').state, true);
}

function grantCurrency(amount = 10) {
  const next = structuredClone(state);
  next.currency += Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0));
  return replaceState(next, true);
}

function upgradeStation() {
  return replaceState(purchaseCarrierUpgrade(state).state, true);
}

function setRandomSeed(seed: number) {
  const next = structuredClone(state);
  next.randomSeed = Math.floor(Number.isFinite(seed) ? seed : 1) >>> 0;
  return replaceState(next, true);
}

function hireEmployee(role: 'fisher' | 'porter' | 'courier' | 'gull' = 'porter') {
  return replaceState(hireEmployeeState(state, role).state, true);
}

function wakeEmployee(id: number) {
  return replaceState(setEmployeeWakeState(state, id).state, true);
}

function upgradeEmployee(id: number) {
  return replaceState(upgradeEmployeeState(state, id).state, true);
}

function selectGameArea(areaId: AreaId) {
  return replaceState(selectArea(state, areaId).state, true);
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
      hireEmployee: typeof hireEmployee;
      wakeEmployee: typeof wakeEmployee;
      upgradeEmployee: typeof upgradeEmployee;
      selectArea: typeof selectGameArea;
    };
    __GAME_ADS__: {
      request: (placement: AdPlacement) => Promise<Awaited<ReturnType<typeof runRewardedAdFlow>>>;
    };
  }
}

window.__GAME_TEST__ = { resetGame, getState, spawnCustomer, completeOrder, grantCurrency, upgradeStation, setRandomSeed, hireEmployee, wakeEmployee, upgradeEmployee, selectArea: selectGameArea };
const webLiteAdAdapter = createPlatformAdapter('wechat');
async function requestRewardedAd(placement: AdPlacement) {
  const result = await runRewardedAdFlow(state.ads, placement, state.simulationTimeMs, webLiteAdAdapter);
  if (result.accepted) {
    state.ads = result.state;
    state.system.ads = structuredClone(result.state);
    if (result.reward?.kind === 'gull_multiplier') {
      state = activateGullBonus(state, result.reward.durationMs).state;
      persistence.keyChange(state);
    }
    if (result.reward?.kind === 'delivery_instant') {
      state = activateDeliveryInstant(state, result.reward.durationMs).state;
      persistence.keyChange(state);
    }
    if (result.reward?.kind === 'offline_multiplier') {
      state = activateOfflineBonus(state, result.reward.durationMs).state;
      persistence.keyChange(state);
    }
    persistence.keyChange(state);
    renderDom(true);
  }
  return result;
}
window.__GAME_ADS__ = { request: requestRewardedAd };

type ActionKeys = {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
};

type CustomerRoute = CustomerRoutePlan & { lifecycle: CustomerState; product: ProductId };

class MarketScene extends Phaser.Scene {
  private worldRoot!: Phaser.GameObjects.Container;
  private player!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private carriedSprites: Phaser.GameObjects.Container[] = [];
  private shelfSprites: Record<ProductId, Phaser.GameObjects.Container[]> = { fish: [], kelp: [], shrimp: [], crab: [] };
  private customerViews = new Map<number, Phaser.GameObjects.Container>();
  private customerRoutes = new Map<number, CustomerRoute>();
  private employeeViews = new Map<number, Phaser.GameObjects.Container>();
  private customerRouteGraphics!: Phaser.GameObjects.Graphics;
  private tokenViews = new Map<number, Phaser.GameObjects.Container>();
  private keys!: ActionKeys;
  private touchOrigin: Phaser.Math.Vector2 | null = null;
  private touchVector = new Phaser.Math.Vector2();
  private joystick!: Phaser.GameObjects.Graphics;
  private fullBadge!: Phaser.GameObjects.Container;
  private kelpProgress!: Phaser.GameObjects.Graphics;
  private visualSignature = '';
  private wasFull = false;
  private reducedMotion = false;
  private characterMotion: CharacterMotionState = createCharacterMotionState();
  private areaBanner!: Phaser.GameObjects.Text;

  constructor() {
    super('market');
  }

  private addWorld<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.worldRoot.add(object);
    return object;
  }

  preload() {
    this.load.image('background', config.assets.background);
    this.load.image('character', config.assets.character);
    this.load.spritesheet('otter-walk-front', config.assets.otterWalkFront, { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('otter-walk-back', config.assets.otterWalkBack, { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('otter-walk-side', config.assets.otterWalkSide, { frameWidth: 256, frameHeight: 256 });
    this.load.image('fish', config.assets.fish);
    this.load.image('kelp', config.assets.kelp);
  }

  create() {
    this.reducedMotion = prefersReducedMotion();
    this.worldRoot = this.add.container(0, 0).setDepth(0);
    this.addWorld(this.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, 'background'))
      .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
      .setTint(0xf8fae5)
      .setAlpha(0.92);
    this.drawEnvironment();
    this.areaBanner = this.addWorld(this.add.text(270, 385, '', {
      fontFamily: 'sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#F8FAE5',
      backgroundColor: '#163A4A', padding: { left: 10, right: 10, top: 5, bottom: 5 },
    })).setOrigin(0.5).setDepth(30);
    this.customerRouteGraphics = this.addWorld(this.add.graphics().setDepth(11));
    this.createShelfItems();

    this.shadow = this.addWorld(this.add.ellipse(state.player.x, state.player.y + 34, 62, 24, 0x163a4a, 0.23).setDepth(20));
    this.player = this.addWorld(this.add.sprite(state.player.x, state.player.y, 'otter-walk-front', 0).setDisplaySize(78, 78).setDepth(24));
    const maximumCapacity = ECONOMY.carrier.tiers.at(-1)!.capacity;
    for (let index = 0; index < maximumCapacity; index += 1) {
      this.carriedSprites.push(this.createProductGraphic('fish', 0, 0, 25 + index).setVisible(false));
    }
    const badgeShape = this.add.rectangle(0, 0, 56, 28, 0xf28f6b, 1).setStrokeStyle(2, 0xf8fae5, 0.9);
    const badgeText = this.add.text(0, 0, '满载', {
      fontFamily: 'sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#163A4A',
    }).setOrigin(0.5);
    this.fullBadge = this.add.container(0, 0, [badgeShape, badgeText]).setDepth(40).setVisible(false);

    this.joystick = this.add.graphics().setDepth(60).setScrollFactor(0).setVisible(false);
    this.configureInput();
    resetStationEntryCueTracking();
    this.syncVisualState(true);
    renderDom(true);
    const shell = byId('game-shell');
    shell.dataset.loading = 'false';
    animateElement(byId('loading-card'), { durationMs: MOTION_TOKENS_MS.panelTransition, fromOpacity: 1, toOpacity: 0 });
  }

  update(time: number, delta: number) {
    const frameMs = Math.min(250, Math.max(0, delta));
    const movement = this.readMovement();
    this.characterMotion = advanceCharacterMotion(this.characterMotion, frameMs, movement, this.reducedMotion);
    if (movement.lengthSq() > 0) {
      movement.normalize().scale(PLAYER_SPEED * frameMs / 1_000);
      const target = {
        x: Phaser.Math.Clamp(state.player.x + movement.x, 28, DESIGN_WIDTH - 28),
        y: Phaser.Math.Clamp(state.player.y + movement.y, 130, DESIGN_HEIGHT - 42),
      };
      state = movePlayer(state, target).state;
    }

    const result = advanceGame(state, frameMs);
    state = result.state;
    const critical = result.events.some((event) => ['kelpUnlocked', 'shrimpUnlocked', 'crabUnlocked', 'upgraded', 'facilityUpgraded', 'sale', 'cashCollected', 'deliveryCompleted', 'gullReturned'].includes(event.type));
    if (critical) persistence.keyChange(state);
    else persistence.tick(state);
    syncStationEntryCue();
    this.syncVisualState(false, time);
    this.handleFeedback(result.events);
    renderDom();
  }

  syncVisualState(force = false, time = 0) {
    if (!this.player) return;
    this.player.setTexture(this.characterMotion.textureKey, this.characterMotion.frame);
    this.player.setFlipX(this.characterMotion.flipX);
    const bob = this.reducedMotion || this.characterMotion.moving ? 0 : Math.sin(time / MOTION_TOKENS_MS.ambientLoop * Math.PI * 2) * 1.8;
    this.player.setPosition(state.player.x, state.player.y + bob);
    this.shadow.setPosition(state.player.x, state.player.y + 35).setScale(1 - Math.abs(bob) * 0.008, 1);
    this.renderCarryStack();
    this.renderFullBadge();
    const area = createAreaLayout(state.areas.active);
    this.areaBanner?.setText(`区域 ${area.id} · ${area.title}  ·  ${area.chain[0]} → ${area.chain.at(-1)}`);
    // Every area owns a contiguous world-space slot. The shared scene is
    // translated into the selected slot so web-lite and native adapters use
    // the same camera origin instead of leaving unlocked areas blank.
    const origin = areaCameraOrigin(area.id);
    this.worldRoot.setPosition(origin.x, origin.y);
    const camera = clampCameraToArea(origin, area);
    this.cameras.main.setScroll(camera.x, camera.y);

    const view = createUiView(state);
    const signature = JSON.stringify({
      shelves: state.shelves,
      construction: state.construction,
      customers: state.customers,
      queue: state.checkoutQueue,
      tokens: state.tokens,
      employees: state.employees,
      stations: view.stations,
      areas: state.areas,
    });
    // Customer routes are time-based presentation state. Tick them every
    // frame even when the persisted simulation snapshot is unchanged (for
    // example while a checkout customer walks to the counter).
    this.syncCustomers();
    if (!force && signature === this.visualSignature) return;
    this.visualSignature = signature;
    this.updateKelpProgress();
    for (const product of PRODUCT_IDS) {
      this.shelfSprites[product].forEach((sprite, index) => sprite.setVisible(index < state.shelves[product]));
    }
    this.syncTokens();
    this.syncEmployees();
  }

  private drawEnvironment() {
    const graphics = this.addWorld(this.add.graphics().setDepth(2));
    graphics.fillStyle(0x47b5c4, 0.42).fillRoundedRect(18, 132, 504, 164, 54);
    graphics.lineStyle(3, 0xf8fae5, 0.5);
    graphics.strokeCircle(STATIONS.fishSource.x, STATIONS.fishSource.y, 55);
    for (let line = -2; line <= 2; line += 1) {
      graphics.lineBetween(STATIONS.fishSource.x - 42, STATIONS.fishSource.y + line * 12, STATIONS.fishSource.x + 42, STATIONS.fishSource.y - line * 8);
    }
    graphics.fillStyle(0x2c8997, 0.7).fillCircle(STATIONS.kelpSource.x, STATIONS.kelpSource.y, 56);
    graphics.lineStyle(5, 0xf4d58d, 0.9).strokeCircle(STATIONS.kelpSource.x, STATIONS.kelpSource.y, 61);

    graphics.fillStyle(0xf4d58d, 0.64).fillRoundedRect(50, 340, 440, 220, 48);
    // Shelves are solid 3D fixtures: a raised top plane, dark front face, and
    // a footprint that matches the customer navigation obstacles.
    graphics.fillStyle(0x0f2f3b, 0.94).fillRoundedRect(62, 421, 142, 102, 24);
    graphics.fillStyle(0x2b6672, 0.96).fillRoundedRect(54, 400, 150, 34, 16);
    graphics.fillStyle(0x163a4a, 0.86).fillRoundedRect(62, 408, 142, 102, 24);
    graphics.fillStyle(0x2b7464, 0.94).fillRoundedRect(336, 421, 142, 102, 24);
    graphics.fillStyle(0x65b493, 0.96).fillRoundedRect(328, 400, 150, 34, 16);
    graphics.fillStyle(0x3a8d78, 0.82).fillRoundedRect(336, 408, 142, 102, 24);
    graphics.lineStyle(3, 0xf8fae5, 0.7).strokeRoundedRect(62, 408, 142, 102, 24).strokeRoundedRect(336, 408, 142, 102, 24);

    graphics.fillStyle(0xf4d58d, 0.44).fillRoundedRect(50, 520, 440, 130, 32);
    this.drawFacilitySilhouette(graphics, STATIONS.shrimpTrap.x, STATIONS.shrimpTrap.y, false);
    this.drawFacilitySilhouette(graphics, STATIONS.crabPot.x, STATIONS.crabPot.y, false);
    // The counter has a projecting top and a darker front/side face so its
    // collision footprint reads as a real object instead of a flat plaque.
    graphics.fillStyle(0x6f4938, 0.9).fillRoundedRect(184, 688, 172, 84, 26);
    graphics.fillStyle(0xa87556, 0.98).fillRoundedRect(174, 658, 192, 42, 22);
    graphics.fillStyle(0xf8fae5, 0.26).fillRoundedRect(204, 664, 132, 18, 9);
    graphics.lineStyle(3, 0x4c332a, 0.72).strokeRoundedRect(184, 688, 172, 84, 26);
    // The bottom door is the visible start of every customer route.
    graphics.fillStyle(0x163a4a, 0.72).fillRoundedRect(CUSTOMER_ENTRY.x - 42, CUSTOMER_ENTRY.y - 18, 84, 38, 18);
    graphics.lineStyle(3, 0xf4d58d, 0.92).strokeRoundedRect(CUSTOMER_ENTRY.x - 42, CUSTOMER_ENTRY.y - 18, 84, 38, 18);
    this.kelpProgress = this.addWorld(this.add.graphics().setDepth(6));
  }

  private drawFacilitySilhouette(graphics: Phaser.GameObjects.Graphics, x: number, y: number, active: boolean) {
    graphics.fillStyle(active ? 0xf28f6b : 0x163a4a, active ? 0.86 : 0.3).fillRoundedRect(x - 30, y - 18, 60, 36, 12);
    graphics.lineStyle(3, 0xf8fae5, 0.65).strokeRoundedRect(x - 30, y - 18, 60, 36, 12);
    graphics.lineBetween(x - 16, y, x + 16, y);
    graphics.lineBetween(x, y - 12, x, y + 12);
  }

  private createShelfItems() {
    const placements: Record<ProductId, { x: number; y: number }> = {
      fish: { x: 76, y: 442 }, kelp: { x: 392, y: 442 }, shrimp: { x: 76, y: 570 }, crab: { x: 392, y: 570 },
    };
    for (const product of PRODUCT_IDS) for (let index = 0; index < ECONOMY.shelves.capacityByProduct[product]; index += 1) {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const placement = placements[product];
      this.shelfSprites[product].push(this.createProductGraphic(product, placement.x + column * 27, placement.y + row * 29, 8).setVisible(false));
    }
  }

  private createProductGraphic(product: ProductId, x: number, y: number, depth: number) {
    const graphics = this.add.graphics();
    const colors: Record<ProductId, number> = { fish: 0x47b5c4, kelp: 0x3a8d78, shrimp: 0xf28f6b, crab: 0xc85b4d };
    graphics.fillStyle(colors[product], 1);
    if (product === 'fish') {
      graphics.fillEllipse(0, 0, 28, 18).fillTriangle(10, 0, 23, -11, 23, 11);
    } else if (product === 'kelp') {
      graphics.fillEllipse(-7, 0, 10, 28).fillEllipse(4, 0, 10, 32).fillEllipse(14, 0, 8, 24);
    } else if (product === 'shrimp') {
      graphics.lineStyle(6, colors[product], 1).arc(-2, 0, 18, -Math.PI / 2, Math.PI * 0.9).strokePath();
      graphics.fillCircle(10, -7, 3).fillCircle(13, -10, 2);
    } else {
      graphics.fillCircle(0, 0, 12).fillCircle(-13, -8, 7).fillCircle(13, -8, 7);
      graphics.lineStyle(3, 0xf8fae5, 1).lineBetween(-5, 4, -12, 14).lineBetween(5, 4, 12, 14);
    }
    return this.addWorld(this.add.container(x, y, [graphics]).setDepth(depth));
  }

  private configureInput() {
    const keyboard = this.input.keyboard!;
    const cursors = keyboard.createCursorKeys();
    const letters = keyboard.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
    this.keys = {
      left: cursors.left, right: cursors.right, up: cursors.up, down: cursors.down,
      a: letters.A, d: letters.D, w: letters.W, s: letters.S,
    };
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.touchOrigin = new Phaser.Math.Vector2(pointer.x, pointer.y);
      this.touchVector.set(0, 0);
      this.drawJoystick(pointer.x, pointer.y, pointer.x, pointer.y);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || !this.touchOrigin) return;
      this.touchVector.set(pointer.x - this.touchOrigin.x, pointer.y - this.touchOrigin.y);
      if (this.touchVector.length() > 64) this.touchVector.setLength(64);
      this.drawJoystick(this.touchOrigin.x, this.touchOrigin.y, this.touchOrigin.x + this.touchVector.x, this.touchOrigin.y + this.touchVector.y);
    });
    this.input.on('pointerup', () => {
      this.touchOrigin = null;
      this.touchVector.set(0, 0);
      this.joystick.setVisible(false);
    });
  }

  private readMovement() {
    const movement = new Phaser.Math.Vector2(
      Number(this.keys.right.isDown || this.keys.d.isDown) - Number(this.keys.left.isDown || this.keys.a.isDown),
      Number(this.keys.down.isDown || this.keys.s.isDown) - Number(this.keys.up.isDown || this.keys.w.isDown),
    );
    if (this.touchVector.lengthSq() > 36) movement.add(this.touchVector.clone().scale(1 / 64));
    return movement;
  }

  private drawJoystick(originX: number, originY: number, knobX: number, knobY: number) {
    this.joystick.clear().setVisible(true);
    this.joystick.fillStyle(0x163a4a, 0.25).fillCircle(originX, originY, 44);
    this.joystick.lineStyle(2, 0xf8fae5, 0.6).strokeCircle(originX, originY, 44);
    this.joystick.fillStyle(0xf28f6b, 0.88).fillCircle(knobX, knobY, 18);
  }

  private renderCarryStack() {
    const products: ProductId[] = [
      ...Array.from({ length: state.carrying.fish }, () => 'fish' as const),
      ...Array.from({ length: state.carrying.kelp }, () => 'kelp' as const),
      ...Array.from({ length: state.carrying.shrimp }, () => 'shrimp' as const),
      ...Array.from({ length: state.carrying.crab }, () => 'crab' as const),
    ];
    this.carriedSprites.forEach((sprite, index) => {
      const product = products[index];
      if (!product) {
        sprite.setVisible(false);
        return;
      }
      sprite.setVisible(true).setPosition(
        state.player.x + (index % 2 === 0 ? -7 : 7),
        state.player.y - 48 - index * 11,
      );
    });
  }

  private renderFullBadge() {
    const count = Object.values(state.carrying).reduce((sum, value) => sum + value, 0);
    const badge = getFullBadgeModel(count, state.capacity);
    this.fullBadge.setVisible(badge.visible);
    if (!badge.visible) {
      this.wasFull = false;
      return;
    }
    const placement = placeAttachedBadge(
      { x: state.player.x - 28, y: state.player.y - 34, width: 56, height: 68 },
      count,
      { width: DESIGN_WIDTH, height: DESIGN_HEIGHT },
      getHudExclusions({ width: DESIGN_WIDTH, height: DESIGN_HEIGHT }),
    );
    this.fullBadge.setPosition(placement.rect.x + placement.rect.width / 2, placement.rect.y + placement.rect.height / 2);
    if (!this.wasFull && !this.reducedMotion) {
      this.fullBadge.setScale(0.78);
      this.tweens.add({ targets: this.fullBadge, scale: 1, duration: MOTION_TOKENS_MS.microFeedback, ease: 'Back.Out' });
    }
    this.wasFull = true;
  }

  private updateKelpProgress() {
    this.kelpProgress.clear();
    const facilityState = state.construction.kelpUnlocked
      ? 'active'
      : state.construction.invested > 0 ? 'building' : state.currency >= ECONOMY.kelpUnlock.investmentCost ? 'eligible' : 'locked';
    if (facilityState === 'active') {
      const builtDevice = this.addWorld(this.add.graphics().setDepth(7));
      builtDevice.fillStyle(0x3a8d78, 0.98).fillRoundedRect(STATIONS.kelpSource.x - 28, STATIONS.kelpSource.y - 18, 56, 36, 12);
      builtDevice.lineStyle(3, 0xf4d58d, 0.95).strokeRoundedRect(STATIONS.kelpSource.x - 28, STATIONS.kelpSource.y - 18, 56, 36, 12);
      builtDevice.lineBetween(STATIONS.kelpSource.x - 14, STATIONS.kelpSource.y, STATIONS.kelpSource.x + 14, STATIONS.kelpSource.y);
      this.kelpProgress.lineStyle(5, 0x73d6a4, 0.96).strokeCircle(STATIONS.kelpSource.x, STATIONS.kelpSource.y, 67);
      this.addKelpTufts();
      return;
    }
    const progress = state.construction.invested / ECONOMY.kelpUnlock.investmentCost;
    this.kelpProgress.lineStyle(7, 0xf28f6b, 0.95);
    this.kelpProgress.beginPath();
    this.kelpProgress.arc(STATIONS.kelpSource.x, STATIONS.kelpSource.y, 67, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    this.kelpProgress.strokePath();
  }

  private addKelpTufts() {
    this.kelpProgress.fillStyle(0x3a8d78, 0.95);
    this.kelpProgress.fillEllipse(STATIONS.kelpSource.x - 17, STATIONS.kelpSource.y + 2, 14, 50);
    this.kelpProgress.fillEllipse(STATIONS.kelpSource.x + 4, STATIONS.kelpSource.y - 4, 16, 58);
    this.kelpProgress.fillEllipse(STATIONS.kelpSource.x + 23, STATIONS.kelpSource.y + 4, 13, 46);
  }

  private customerTarget(customer: Customer, order: number): Point {
    if (customer.state === 'leaving') return CUSTOMER_ENTRY;
    if (customer.state === 'checkout') {
      const queueIndex = Math.max(0, state.checkoutQueue.indexOf(customer.id));
      return { x: 224 + queueIndex * 46, y: 620 - queueIndex * 10 };
    }
    const base = STATIONS[`${customer.product}Shelf` as keyof typeof STATIONS] ?? STATIONS.fishShelf;
    // Stop at the front edge of the requested shelf so the product and pickup cause stay readable.
    return { x: base.x + (order % 2 === 0 ? -26 : 26), y: base.y + 42 + Math.floor(order / 2) * 28 };
  }

  private createCustomerView(customer: Customer) {
    const body = this.add.graphics();
    const colors = [0xf28f6b, 0x47b5c4, 0xf4d58d];
    body.fillStyle(colors[customer.id % colors.length]!, 1).fillCircle(0, 7, 22);
    body.fillStyle(0xf8d7b5, 1).fillCircle(0, -15, 16);
    body.fillStyle(0x163a4a, 1).fillCircle(-5, -17, 2).fillCircle(5, -17, 2);
    const icon = this.createProductGraphic(customer.product, 19, -28, 19).setScale(0.7);
    return this.addWorld(this.add.container(CUSTOMER_ENTRY.x, CUSTOMER_ENTRY.y, [body, icon]).setDepth(18));
  }

  private beginCustomerRoute(id: number, stage: CustomerRouteStage, from: Point, target: Point, lifecycle: CustomerState, product: ProductId) {
    const existing = this.customerRoutes.get(id);
    this.customerRoutes.set(id, {
      stage,
      from: { ...from },
      target: { ...target },
      startedAtMs: state.simulationTimeMs,
      laneOffset: existing?.laneOffset ?? customerLaneOffset(id),
      lifecycle,
      product,
    });
  }

  private routeEasing(progress: number): number {
    const clamped = Math.min(1, Math.max(0, progress));
    return 1 - (1 - clamped) ** 3;
  }

  private routePosition(route: CustomerRoute, progress: number): Point {
    const points = routeWaypoints(route, CUSTOMER_WAYPOINTS);
    if (points.length === 1) return points[0]!;
    const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index]!.x, point.y - points[index]!.y));
    const total = Math.max(1, lengths.reduce((sum, length) => sum + length, 0));
    let remaining = Math.min(1, Math.max(0, progress)) * total;
    for (let index = 0; index < lengths.length; index += 1) {
      const length = lengths[index]!;
      if (remaining <= length || index === lengths.length - 1) {
        const from = points[index]!;
        const to = points[index + 1]!;
        const segment = length > 0 ? remaining / length : 1;
        return { x: from.x + (to.x - from.x) * segment, y: from.y + (to.y - from.y) * segment };
      }
      remaining -= length;
    }
    return route.target;
  }

  private drawCustomerRoute(customer: Customer, route: CustomerRoute, order: number) {
    if (!SHOW_CUSTOMER_ROUTES) return;
    const path = routeWaypoints(route, CUSTOMER_WAYPOINTS);
    const routeTarget = path[path.length - 1] ?? route.target;
    const activeRouteAlpha = order === 0 ? 0.9 : 0.2;
    this.customerRouteGraphics.lineStyle(3, route.stage === 'checkout' ? 0xf28f6b : 0x47b5c4, activeRouteAlpha);
    for (let index = 1; index < path.length; index += 1) {
      this.customerRouteGraphics.lineBetween(path[index - 1]!.x, path[index - 1]!.y, path[index]!.x, path[index]!.y);
    }
    this.customerRouteGraphics.fillStyle(route.stage === 'checkout' ? 0xf28f6b : 0x47b5c4, activeRouteAlpha).fillCircle(routeTarget.x, routeTarget.y, 6);
    if (path.length > 1) {
      const from = path[0]!;
      const to = path[1]!;
      const arrowX = from.x + (to.x - from.x) * 0.58;
      const arrowY = from.y + (to.y - from.y) * 0.58;
      this.customerRouteGraphics.fillTriangle(arrowX, arrowY - 6, arrowX - 5, arrowY + 5, arrowX + 5, arrowY + 5);
    }
  }

  private updateCustomerRoute(customer: Customer, order: number, view: Phaser.GameObjects.Container): void {
    let route = this.customerRoutes.get(customer.id);
    if (!route) {
      // Restore customers into the visible route appropriate to their state.
      // A served customer starts at checkout and walks out through the door.
      if (customer.state === 'leaving') {
        const target = this.customerTarget({ ...customer, state: 'checkout' }, order);
        this.beginCustomerRoute(customer.id, 'exit', target, CUSTOMER_ENTRY, 'leaving', customer.product);
      } else {
        this.beginCustomerRoute(customer.id, 'entry', CUSTOMER_ENTRY, CUSTOMER_ENTRY, 'shopping', customer.product);
      }
      route = this.customerRoutes.get(customer.id)!;
    }
    if (route.product !== customer.product) {
      const oldIcon = view.list[1];
      oldIcon?.destroy();
      view.addAt(this.createProductGraphic(customer.product, 19, -28, 19).setScale(0.7), 1);
      route.product = customer.product;
    }
    const now = state.simulationTimeMs;
    const elapsed = now - route.startedAtMs;
    const transition = routeTransition(route, customer.state, elapsed, { entryHoldMs: ENTRY_HOLD_MS, travelMs: route.stage === 'exit' ? CUSTOMER_EXIT_DURATION_MS : CUSTOMER_ROUTE_DURATION_MS });
    if (transition === 'shelf') {
      this.beginCustomerRoute(customer.id, 'shelf', CUSTOMER_ENTRY, this.customerTarget({ ...customer, state: 'shopping' }, order), customer.state, customer.product);
      route = this.customerRoutes.get(customer.id)!;
    } else if (transition === 'checkout') {
      this.beginCustomerRoute(customer.id, 'checkout', { x: view.x, y: view.y }, this.customerTarget(customer, order), 'checkout', customer.product);
      route = this.customerRoutes.get(customer.id)!;
    } else if (transition === 'exit') {
      this.beginCustomerRoute(customer.id, 'exit', { x: view.x, y: view.y }, CUSTOMER_ENTRY, 'leaving', customer.product);
      route = this.customerRoutes.get(customer.id)!;
    }
    route.lifecycle = customer.state;
    route.target = route.stage === 'checkout'
      ? this.customerTarget(customer, order)
      : route.stage === 'exit'
        ? CUSTOMER_ENTRY
        : this.customerTarget({ ...customer, state: 'shopping' }, order);
    const segmentDuration = route.stage === 'entry' ? ENTRY_HOLD_MS : route.stage === 'exit' ? CUSTOMER_EXIT_DURATION_MS : CUSTOMER_ROUTE_DURATION_MS;
    const progress = route.stage === 'entry' ? Math.min(1, (now - route.startedAtMs) / segmentDuration) : Math.min(1, (now - route.startedAtMs) / segmentDuration);
    const eased = this.routeEasing(progress);
    const position = this.routePosition(route, eased);
    view.setPosition(position.x, position.y);
    this.drawCustomerRoute(customer, route, order);
  }

  private syncCustomers() {
    this.customerRouteGraphics.clear();
    const activeIds = new Set(state.customers.map((customer) => customer.id));
    for (const [id, view] of this.customerViews) {
      if (activeIds.has(id)) continue;
      this.tweens.add({
        targets: view,
        alpha: 0,
        scale: 0.85,
        duration: this.reducedMotion ? 0 : MOTION_TOKENS_MS.panelTransition,
        ease: 'Cubic.In',
        onComplete: () => view.destroy(true),
      });
      this.customerViews.delete(id);
      this.customerRoutes.delete(id);
    }
    state.customers.forEach((customer, index) => {
      let view = this.customerViews.get(customer.id);
      if (!view) {
        view = this.createCustomerView(customer);
        this.customerViews.set(customer.id, view);
      }
      this.updateCustomerRoute(customer, index, view);
    });
  }

  private createTokenView(token: ShellToken) {
    const shell = this.add.graphics();
    shell.fillStyle(0xf4d58d, 1).fillEllipse(0, 0, 34, 25);
    shell.lineStyle(3, 0xf28f6b, 1).strokeEllipse(0, 0, 34, 25);
    shell.lineBetween(-8, -8, -4, 8).lineBetween(0, -10, 0, 10).lineBetween(8, -8, 4, 8);
    const value = this.add.text(0, 22, `+${token.value}`, { fontSize: '13px', fontStyle: 'bold', color: '#163A4A' }).setOrigin(0.5);
    return this.addWorld(this.add.container(token.x, token.y, [shell, value]).setDepth(28));
  }

  private syncTokens() {
    const ids = new Set(state.tokens.map((token) => token.id));
    for (const [id, view] of this.tokenViews) {
      if (ids.has(id)) continue;
      this.tweens.add({ targets: view, alpha: 0, y: view.y - 24, duration: this.reducedMotion ? 0 : MOTION_TOKENS_MS.microFeedback, onComplete: () => view.destroy(true) });
      this.tokenViews.delete(id);
    }
    for (const token of state.tokens) {
      if (this.tokenViews.has(token.id)) continue;
      const view = this.createTokenView(token);
      this.tokenViews.set(token.id, view);
      if (!this.reducedMotion) {
        view.setScale(0.7).setAlpha(0.4);
        this.tweens.add({ targets: view, scale: 1, alpha: 1, y: token.y - 8, duration: MOTION_TOKENS_MS.microFeedback, ease: 'Back.Out' });
      }
    }
  }

  private createEmployeeView(employee: GameState['employees'][number], index: number) {
    const body = this.add.graphics().fillStyle(0x47b5c4, 0.96).fillCircle(0, 0, 18);
    body.lineStyle(2, 0xf8fae5, 0.95).strokeCircle(0, 0, 18);
    const role = { fisher: '渔', porter: '搬', courier: '送', gull: '鸥' }[employee.role];
    const roleText = this.add.text(0, 0, role, { fontSize: '13px', fontStyle: 'bold', color: '#163A4A' }).setOrigin(0.5);
    const statusText = this.add.text(0, 29, '', { fontSize: '12px', fontStyle: 'bold', color: '#F8FAE5', backgroundColor: '#163A4A', padding: { left: 4, right: 4, top: 2, bottom: 2 } }).setOrigin(0.5);
    return this.addWorld(this.add.container(112 + index * 76, 335, [body, roleText, statusText]).setDepth(25));
  }

  private syncEmployees() {
    const ids = new Set(state.employees.map((employee) => employee.id));
    for (const [id, view] of this.employeeViews) {
      if (ids.has(id)) continue;
      view.destroy(true);
      this.employeeViews.delete(id);
    }
    state.employees.forEach((employee, index) => {
      let view = this.employeeViews.get(employee.id);
      if (!view) {
        view = this.createEmployeeView(employee, index);
        this.employeeViews.set(employee.id, view);
      }
      const status = { idle: '待命', findTask: '找任务', selectTarget: '选目标', moveToTarget: '前往', work: '工作', slacking: '偷懒', return: '返回', checkFatigue: '疲劳', rest: '休息' }[employee.status];
      const text = view.list[2] as Phaser.GameObjects.Text | undefined;
      text?.setText(`${status} · Lv.${employee.level}`);
      view.setAlpha(employee.status === 'slacking' ? 0.66 : 1);
    });
  }

  private handleFeedback(events: GameEvent[]) {
    for (const event of events) {
      const feedbackKind = event.type === 'pickup' || event.type === 'stocked' || event.type === 'customerPickedUp' || event.type === 'deliveryPickedUp' || event.type === 'gullDeparted' || event.type === 'gullExploring'
        ? 'product'
        : event.type === 'sale' || event.type === 'cashCollected' || event.type === 'queueAdvanced' || event.type === 'deliveryCompleted' || event.type === 'gullReturned'
          ? 'settlement'
          : event.type === 'upgraded' || event.type === 'facilityUpgraded' || event.type === 'kelpUnlocked'
            ? 'upgrade'
            : event.type === 'investment' || event.type === 'customerWaiting' || event.type.endsWith('Rejected')
              ? 'warning'
              : null;
      if (!feedbackKind) continue;
      const x = event.x ?? state.player.x;
      const y = event.y ?? state.player.y - 30;
      const colors = { product: 0x73d6a4, settlement: 0xf4d58d, upgrade: 0x47b5c4, warning: 0xc85b4d } as const;
      const color = colors[feedbackKind];
      const cue = this.addWorld(this.add.graphics().setPosition(x, y).setDepth(48));
      const coinToNode = event.type === 'investment' && event.x !== undefined && event.y !== undefined;
      if (coinToNode) {
        const coin = this.addWorld(this.add.circle(state.player.x, state.player.y - 24, 5, 0xf4d58d, 1).setDepth(49));
        this.tweens.add({ targets: coin, x, y, alpha: 0, duration: MOTION_TOKENS_MS.microFeedback, onComplete: () => coin.destroy() });
      }
      if (feedbackKind === 'product') {
        cue.fillStyle(color, 0.92).fillCircle(0, 0, 8);
        cue.lineStyle(2, 0xf8fae5, 0.9).lineBetween(-4, 0, 0, 4).lineBetween(0, 4, 6, -5);
      } else if (feedbackKind === 'settlement') {
        cue.lineStyle(3, color, 0.96).strokeCircle(0, 0, 11);
        cue.lineStyle(2, 0xf28f6b, 0.9).lineBetween(-5, 0, 5, 0).lineBetween(0, -5, 0, 5);
      } else if (feedbackKind === 'upgrade') {
        cue.fillStyle(color, 0.94).fillTriangle(0, -12, 12, 0, 0, 12).fillTriangle(0, 12, -12, 0, 0, -12);
        cue.lineStyle(2, 0xf8fae5, 0.9).strokeCircle(0, 0, 4);
      } else {
        cue.fillStyle(color, 0.94).fillTriangle(0, -12, 12, 10, -12, 10);
        cue.lineStyle(2, 0xf8fae5, 0.95).lineBetween(0, -5, 0, 3).fillCircle(0, 7, 1.5);
      }
      if (this.reducedMotion) {
        this.time.delayedCall(MOTION_TOKENS_MS.microFeedback, () => cue.destroy());
        continue;
      }
      this.tweens.add({
        targets: cue,
        y: y - 30,
        scale: 1.35,
        alpha: 0,
        duration: MOTION_TOKENS_MS.microFeedback,
        ease: 'Cubic.Out',
        onComplete: () => cue.destroy(),
      });
    }
  }
}

function wireShellControls() {
  const help = byId<HTMLButtonElement>('help-button');
  const panel = byId<HTMLElement>('help-panel');
  const close = byId<HTMLButtonElement>('close-help');
  const openHelp = () => {
    panel.hidden = false;
    panel.style.pointerEvents = 'auto';
    help.setAttribute('aria-expanded', 'true');
    animateElement(panel, { durationMs: MOTION_TOKENS_MS.panelTransition, fromOpacity: 0, toOpacity: 1, fromScale: 0.98, toScale: 1 });
    close.focus();
  };
  const closeHelp = () => {
    panel.style.pointerEvents = 'none';
    help.setAttribute('aria-expanded', 'false');
    animateElement(panel, { durationMs: MOTION_TOKENS_MS.panelTransition, fromOpacity: 1, toOpacity: 0, fromScale: 1, toScale: 0.98 });
    window.setTimeout(() => {
      panel.hidden = true;
      panel.style.removeProperty('pointer-events');
      panel.style.removeProperty('opacity');
      help.focus();
    }, prefersReducedMotion() ? 0 : MOTION_TOKENS_MS.panelTransition);
  };
  help.addEventListener('click', openHelp);
  close.addEventListener('click', closeHelp);
  const upgradeButton = byId<HTMLButtonElement>('upgrade-button');
  const upgradePanel = byId<HTMLElement>('upgrade-panel');
  const closeUpgrade = () => {
    upgradePanel.hidden = true;
    upgradeButton.setAttribute('aria-expanded', 'false');
  };
  upgradeButton.addEventListener('click', () => {
    const view = createUiView(state);
    if (view.upgrade.nextPrice === null || view.upgrade.gated) return;
    upgradePanel.hidden = false;
    upgradeButton.setAttribute('aria-expanded', 'true');
    byId<HTMLButtonElement>('confirm-upgrade').focus();
  });
  byId<HTMLButtonElement>('confirm-upgrade').addEventListener('click', () => {
    upgradeStation();
    closeUpgrade();
  });
  byId<HTMLButtonElement>('reset-button').addEventListener('click', () => {
    resetGame();
    motionPulse(byId('hud'), 1.015);
  });
  document.querySelectorAll<HTMLButtonElement>('#area-nav button[data-area]').forEach((button) => {
    button.addEventListener('click', () => {
      const areaId = Number(button.dataset.area) as AreaId;
      if (state.areas.unlocked.includes(areaId)) selectGameArea(areaId);
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) closeHelp();
    if (event.key === 'Escape' && !upgradePanel.hidden) closeUpgrade();
  });
  byId('shelf-capacity-copy').textContent = String(ECONOMY.shelves.capacityPerProduct);
  byId('kelp-cost-copy').textContent = String(ECONOMY.kelpUnlock.investmentCost);
}

async function preloadImage(source: string) {
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`无法预载资源：${source}`));
    image.src = source;
  });
}

async function bootstrap() {
  wireShellControls();
  renderDom(true);
  const assetGate = new AssetPreloadGate(Object.values(config.assets), preloadImage);
  await assetGate.preload();
  assetGate.requestPlayback();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    transparent: true,
    render: { antialias: true, pixelArt: false, roundPixels: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    scene: [MarketScene],
  });
  scene = game.scene.getScene('market') as MarketScene;
}

window.addEventListener('beforeunload', () => persistence.keyChange(state));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persistence.keyChange(state);
});

bootstrap().catch((error: unknown) => {
  byId('status-title').textContent = '资源加载失败';
  byId('status-detail').textContent = error instanceof Error ? error.message : '请刷新重试';
  byId('loading-card').textContent = '加载失败，请刷新重试';
});
