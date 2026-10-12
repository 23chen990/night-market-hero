import { ExperienceHud } from './experience-hud.ts';
import { drawRide, drawVehicleOffers, drawConditions } from './ride-renderer.ts';
import { nextCheckpointX } from './experience-director.ts';
import { applyFlightIdentity, flightPresentation } from './flight-presentation';
import Phaser from 'phaser';
import {
  MockAdProvider,
  createTapTapAdProvider,
  type RewardedAdResult,
  type TapTapProviderConfig,
} from './ads';
import {
  createGrappleGame,
  type Anchor,
  type FormalEvent,
  type FormalManifest,
  type GrappleEdge,
  type GrappleState,
} from './game-core';
import {
  InterstitialPolicy,
  NightMarketAdFlow,
  NightMarketMonetization,
  LocalProgressStorage,
  type CompleteRunResult,
  type MetaProgress,
} from './monetization';
import {
  createUiAnimationRuntime,
  type UiAnimationSnapshot,
  type UiMotionDirection,
  type UiMotionName,
} from './ui-animation';
import { createRunSnapshot, LocalRunSnapshotStorage } from './run-snapshot';
import {
  BackgroundLifecyclePolicy,
  PersistentRunIdentity,
  RuntimeSession,
  type RunIdentityStorage,
} from './runtime-session';
import { CHARACTERS } from './progression';
import { speedFeelProfile, settlementCoins } from './endless';
import { createCameraLayout, projectCamera, comfortCameraStep, LOGICAL_VIEWPORT } from './camera-layout';
import { createNightCityRenderer, createNightCityRenderPlan, mapWorldAnchorToArchitecturalSocket, NIGHT_CITY_ASSET_PATHS } from './night-city-renderer';
import './style.css';
import './experience.css';
import grappleAttachedIcon from './assets/approved-ui/grapple-attached-v1.png';
import destinationArrowIcon from './assets/approved-ui/destination-arrow-v1.png';
import safeStateIcon from './assets/approved-ui/safe-state-v1.png';
import copperTokenIcon from './assets/level1/copper-token-v1.png';
import pauseIcon from './assets/level1/pause-v1.png';
import pursuitWarningIcon from './assets/level1/pursuit-warning-v1.png';
import tutorialHoldIcon from './assets/level1/tutorial-hold-v1.png';
import tutorialReleaseIcon from './assets/level1/tutorial-release-v1.png';
import tutorialValidIcon from './assets/level1/tutorial-grapple-valid-v1.png';
import tutorialHighRouteIcon from './assets/level1/tutorial-high-route-v1.png';
import tutorialLowRouteIcon from './assets/level1/tutorial-low-route-v1.png';
import grappleAttachBurst from './assets/level1/grapple-attach-burst-v1.png';
import landingDust from './assets/level1/landing-dust-v1.png';
import nearMissArc from './assets/level1/near-miss-arc-v1.png';
import speedStreaks from './assets/level1/speed-streaks-v1.png';
import impactShards from './assets/level1/impact-shards-v1.png';
import escapeRing from './assets/level1/escape-ring-v1.png';
import backButtonIcon from './assets/approved-ui/back-button-v1.png';
import protagonistSwingAsset from './assets/approved-runtime/identity/protagonist-swing-base-v1.png';
import pursuerRunAsset from './assets/approved-runtime/identity/pursuer-run-base-v1.png';
import stallCanopyAsset from './assets/approved-runtime/environment/stall-canopy-v1.png';
import paifangCrossbeamAsset from './assets/approved-runtime/environment/paifang-crossbeam-v1.png';
import bambooScaffoldAsset from './assets/approved-runtime/environment/bamboo-scaffold-v1.png';
import innerEaveAsset from './assets/approved-runtime/environment/inner-eave-v1.png';
import pushcartAsset from './assets/approved-runtime/environment/pushcart-v1.png';
import blankBannerAsset from './assets/approved-runtime/environment/blank-banner-v1.png';
import coveredAlleyFrameAsset from './assets/approved-runtime/environment/covered-alley-frame-v1.png';
import hubMoneyShell from './assets/approved-runtime/hub/money-shell-transparent.png';
import hubMoneyValue from './assets/approved-runtime/hub/money-value.png';
import hubGateStrip from './assets/approved-runtime/hub/gate-strip-transparent.png';
import hubBackKey from './assets/approved-runtime/hub/back-key.png';
import hubInventoryRing from './assets/approved-runtime/hub/inventory-ring.png';
import hubInventoryTalisman from './assets/approved-runtime/hub/inventory-talisman.png';
import hubInventoryScroll from './assets/approved-runtime/hub/inventory-scroll.png';
import hubInventoryPlay from './assets/approved-runtime/hub/inventory-play.png';
import hubAnchorButton from './assets/approved-runtime/hub/anchor-button.png';

const CHARACTER_BLUE_BLACK = 0x061522;
const VERMILION_SCARF = 0xd83b2d;
const COPPER_WAIST_ACCENT = 0xb9793f;
const VERMILION_HEADBAND = 0xd83b2d;
const LEVEL_ONE_SEGMENTS = ['safe-tutorial', 'first-pursuit', 'route-alternation', 'gate-climax'] as const;
const REFERENCE_STAGE_WIDTH = 1672;
const REFERENCE_STAGE_HEIGHT = 941;
// TODO(art): replace geometry silhouettes with the approved four-frame character animation set.
// TODO(art): add the missing progress track, wordless pause layers, and character backlight.

interface PrototypeTestApi {
  resetGame(seed?: number): GrappleState;
  getState(): GrappleState;
  act(edge: GrappleEdge): boolean;
  step(seconds?: number): GrappleState;
}

interface GameTestApi extends PrototypeTestApi {
  failAtProgress(progress: number): GrappleState;
  completeForTest(): GrappleState;
  collideGateForTest(): GrappleState;
  queueRewarded(status: RewardedAdResult['status']): void;
  claimRevive(): Promise<string>;
  claimDoubleWishfire(): Promise<string>;
  getMetaProgress(): MetaProgress;
  driveChaseForTest(seconds: number, mode: 'stall' | 'surge'): GrappleState;
  setProgressForTest(progress: number): GrappleState;
  getChaseSnapshot(): GrappleState['chase'];
  useTalisman(): boolean;
  useFirecracker(): boolean;
}

interface FormalTestApi {
  contractVersion: 1;
  getManifest(): FormalManifest;
  resetGame(seed?: number): GrappleState;
  getState(): GrappleState;
  act(edge: GrappleEdge): boolean;
  advanceTicks(ticks: number): GrappleState;
  loadScenario(scenarioId: string): GrappleState;
  getEvents(): FormalEvent[];
}

declare global {
  interface Window {
    __PROTOTYPE_TEST__: PrototypeTestApi;
    __GAME_TEST__: GameTestApi;
    __FORMAL_TEST__: FormalTestApi;
    __NIGHT_MARKET_HERO_TAPTAP_AD_CONFIG__?: TapTapProviderConfig;
  }
}

async function bootstrap(): Promise<void> {
const query = new URLSearchParams(window.location.search);
const querySeed = Number(query.get('seed')) || 31;
const freshStart = query.get('fresh') === '1';
const runSnapshotStorage = new LocalRunSnapshotStorage() as unknown as LocalRunSnapshotStorage & {
  getPersistenceIssue?: () => string | null;
  save(snapshot: ReturnType<typeof createRunSnapshot>): boolean;
};
const runIdentityStorage: RunIdentityStorage = {
  read(key: string): string | null {
    try { return window.localStorage?.getItem(key) ?? null; } catch { return null; }
  },
  write(key: string, value: string): boolean {
    try {
      if (!window.localStorage) return false;
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
};
const runIdentity = new PersistentRunIdentity(runIdentityStorage);
const rawSnapshotBeforeLoad = runIdentityStorage.read('night-market-hero.run.v2');
if (freshStart) runSnapshotStorage.clear();
const candidateRun = freshStart ? null : runSnapshotStorage.load();
const snapshotLoadRejected = !freshStart && rawSnapshotBeforeLoad !== null && candidateRun === null;
// Never resume legacy fixed-level runs into the endless product path. A v2
// snapshot may only restore the tutorial or the explicitly unlocked patrol.
const restoredRun = candidateRun && ['lantern-entry', 'night-patrol'].includes(candidateRun.state.levelId)
  ? candidateRun
  : null;
const core = createGrappleGame(restoredRun?.state.seed ?? querySeed, { marketGates: false, terrainMode: 'panorama', guidedExperience: true });
if (restoredRun) core.restoreSnapshot(restoredRun.state);
const runtimeSession = new RuntimeSession(runIdentity, restoredRun?.runId ?? querySeed);
const backgroundPolicy = new BackgroundLifecyclePolicy();
const mockAds = new MockAdProvider();
const ads = window.__NIGHT_MARKET_HERO_TAPTAP_AD_CONFIG__
  ? createTapTapAdProvider(window.__NIGHT_MARKET_HERO_TAPTAP_AD_CONFIG__)
  : mockAds;
const sessionStartedAt = performance.now();
const interstitialPolicy = new InterstitialPolicy(sessionStartedAt);
const adFlow = new NightMarketAdFlow(ads, interstitialPolicy);
const economy = new NightMarketMonetization(ads, new LocalProgressStorage());
if (!restoredRun) core.setCharacter(economy.getProgressV2().selectedCharacter ?? CHARACTERS[0]!.id);
let currentRunId = runtimeSession.runId;
let observedStatus: GrappleState['status'] = 'playing';
let lastRenderedDistance = core.getState().chase.distance;
let lastReliefFeedbackAt = Number.NEGATIVE_INFINITY;
let lastRouteHintVisible = true;
let lastClimaxVisible = false;
let lastAttachedAnchorId: string | null = null;
let lastTerrainBehaviorState: string | null = null;
let lastChaseObstaclePhase: string | null = null;
let lastUiChasePhase: GrappleState['chase']['phase'] = 'safe';
let lastUiSegment: GrappleState['segment'] = 'safe-tutorial';
let terminalNavigationRunId: string | null = null;
let failedSettlementCommitted = false;
let failedSettlementBaseReward = 0;
let failedSettlementResult: CompleteRunResult | null = null;
let terminalSettlementPending = false;
let terminalSettlementRunId: string | null = null;
let terminalCompletionRecorded = false;
let lastRenderedCombo = 0;
let lastRenderedSky = false;
let lastRenderedPickupCount = 0;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing UI element: ${selector}`);
  return element;
}

const resultCard = requiredElement<HTMLElement>('[data-ui="result"]');
const resultScrim = requiredElement<HTMLElement>('[data-ui="result-scrim"]');
const pauseOverlay = requiredElement<HTMLElement>('[data-ui="pause-overlay"]');
const orientationBlock = requiredElement<HTMLElement>('[data-ui="orientation-block"]');
const resultKicker = requiredElement<HTMLElement>('[data-ui="result-kicker"]');
const resultTitle = requiredElement<HTMLElement>('[data-ui="result-title"]');
const resultCopy = requiredElement<HTMLElement>('[data-ui="result-copy"]');
const adNote = requiredElement<HTMLElement>('[data-ui="ad-note"]');
const persistenceNotice = requiredElement<HTMLElement>('[data-ui="persistence-notice"]');
const persistenceCopy = requiredElement<HTMLElement>('[data-ui="persistence-copy"]');
const retrySaveButton = requiredElement<HTMLButtonElement>('[data-action="retry-save"]');
const wishfireText = requiredElement<HTMLElement>('[data-ui="wishfire"]');
const coinsText = requiredElement<HTMLElement>('[data-ui="coins-total"]');
const levelTitle = requiredElement<HTMLElement>('[data-ui="level-title"]');
const destination = requiredElement<HTMLElement>('[data-ui="destination"]');
const gatesTotal = requiredElement<HTMLElement>('[data-ui="gates-total"]');
const gateDistance = requiredElement<HTMLElement>('[data-ui="gate-distance"]');
const progressFill = requiredElement<HTMLElement>('[data-ui="progress"]');
const routeHint = requiredElement<HTMLElement>('[data-ui="route-hint"]');
const routeStateIcon = requiredElement<HTMLImageElement>('[data-ui="route-state-icon"]');
const tutorialRail = requiredElement<HTMLElement>('[data-ui="tutorial-rail"]');
const tutorialStage = requiredElement<HTMLElement>('[data-ui="tutorial-stage"]');
const tutorialIcons = [...tutorialRail.querySelectorAll<HTMLImageElement>('[data-tutorial-step]')];
tutorialIcons[0]!.src = tutorialHoldIcon;
tutorialIcons[1]!.src = tutorialReleaseIcon;
tutorialIcons[2]!.src = tutorialValidIcon;
if (tutorialIcons[3]) tutorialIcons[3].src = landingDust;
requiredElement<HTMLImageElement>('[data-ui="back-icon"]').src = backButtonIcon;
requiredElement<HTMLImageElement>('[data-ui="settings-icon"]').src = NIGHT_CITY_ASSET_PATHS.settingsGear;
const gateCounterFrame = document.querySelector<HTMLImageElement>('[data-ui="gate-counter-frame"]');
if (gateCounterFrame) gateCounterFrame.src = NIGHT_CITY_ASSET_PATHS.gateCounterFrame;
requiredElement<HTMLImageElement>('[data-ui="pause-icon"]').src = pauseIcon;
requiredElement<HTMLImageElement>('[data-ui="pursuit-icon"]').src = pursuitWarningIcon;
requiredElement<HTMLImageElement>('[data-ui="closing-gate-icon"]').src = destinationArrowIcon;
requiredElement<HTMLImageElement>('[data-ui="pause-overlay-icon"]').src = pauseIcon;
requiredElement<HTMLImageElement>('[data-hub="hub-back-key"] img').src = hubBackKey;
requiredElement<HTMLImageElement>('[data-hub="hub-money-shell"]').src = hubMoneyShell;
requiredElement<HTMLImageElement>('[data-hub="hub-money-value"]').src = hubMoneyValue;
requiredElement<HTMLImageElement>('[data-hub="hub-gate-strip"]').src = hubGateStrip;
requiredElement<HTMLImageElement>('[data-hub="hub-inventory-ring-top"]').src = hubInventoryRing;
requiredElement<HTMLImageElement>('[data-hub="hub-inventory-ring-bottom"]').src = hubInventoryRing;
requiredElement<HTMLImageElement>('[data-hub="hub-inventory-talisman"]').src = hubInventoryTalisman;
requiredElement<HTMLImageElement>('[data-hub="hub-inventory-scroll"]').src = hubInventoryScroll;
requiredElement<HTMLImageElement>('[data-hub="hub-inventory-play-top"] img').src = hubInventoryPlay;
requiredElement<HTMLImageElement>('[data-hub="hub-inventory-play-bottom"] img').src = hubInventoryPlay;
const chaseLabel = requiredElement<HTMLElement>('[data-ui="chase-label"]');
const chaseDistance = requiredElement<HTMLElement>('[data-ui="chase-distance"]');
const chaseMeter = requiredElement<HTMLElement>('[data-ui="chase-meter"]');
const pursuerPresence = requiredElement<HTMLElement>('[data-ui="pursuer"]');
const pursuerDistance = requiredElement<HTMLElement>('[data-ui="pursuer-distance"]');
const threatVignette = requiredElement<HTMLElement>('[data-ui="threat-vignette"]');
const feedbackLayer = requiredElement<HTMLImageElement>('[data-ui="feedback-layer"]');
const escapeFeedback = requiredElement<HTMLElement>('[data-ui="escape-feedback"]');
requiredElement<HTMLImageElement>('[data-ui="escape-ring-icon"]').src = escapeRing;
const climaxCallout = requiredElement<HTMLElement>('[data-ui="climax"]');
const climaxCopy = requiredElement<HTMLElement>('[data-ui="climax-copy"]');
const distanceReadout = requiredElement<HTMLElement>('[data-ui="distance"]');
const runCoinsReadout = requiredElement<HTMLElement>('[data-ui="run-coins"]');
const comboReadout = requiredElement<HTMLElement>('[data-ui="combo"]');
const multiplierReadout = requiredElement<HTMLElement>('[data-ui="multiplier"]');
const depthReadout = requiredElement<HTMLElement>('[data-ui="depth"]');
const recordReadout = requiredElement<HTMLElement>('[data-ui="record"]');
const runStateReadout = requiredElement<HTMLElement>('[data-ui="run-state"]');
const settlementDetails = requiredElement<HTMLElement>('[data-ui="settlement-details"]');
const app = requiredElement<HTMLElement>('#app');
const reviveButton = requiredElement<HTMLButtonElement>('[data-action="revive"]');
const doubleButton = requiredElement<HTMLButtonElement>('[data-action="double"]');
const restartButton = requiredElement<HTMLButtonElement>('[data-action="restart"]');
const continueButton = requiredElement<HTMLButtonElement>('[data-action="continue"]');
const pauseButton = requiredElement<HTMLButtonElement>('[data-action="pause"]');
const clearProgressButton = requiredElement<HTMLButtonElement>('[data-action="clear-progress"]');
const talismanButton = requiredElement<HTMLButtonElement>('[data-action="talisman"]');
const firecrackerButton = requiredElement<HTMLButtonElement>('[data-action="firecracker"]');
const talismanAvailability = document.querySelector<HTMLElement>('[data-slot="talisman"] .item-count');
const firecrackerAvailability = document.querySelector<HTMLElement>('[data-slot="firecracker"] .item-count');
const cornerHud = requiredElement<HTMLElement>('.corner-hud');
const resultButtons = [reviveButton, doubleButton, restartButton, continueButton];
const activePointerIds = new Set<number>();
let keyboardGrappleHeld = false;
let orientationBlocked = window.matchMedia('(orientation: portrait)').matches;
let pausedBeforeOrientation = core.getState().paused;
let lastPersistedTick = -1;
let lastPersistedStatus: GrappleState['status'] | null = null;
let lastPersistedPaused: boolean | null = null;
let tutorialStepIndex = 0;
let waitingForFirstInput = core.getState().status === 'playing';
if (waitingForFirstInput) core.setPaused(true);
app.dataset.awaitingStart = String(waitingForFirstInput);
const experience = new ExperienceHud(app, {
  start: () => startFirstInput(),
  resume: () => {
    if (orientationBlocked || core.getState().status !== 'playing') return;
    waitingForFirstInput = false;
    app.dataset.awaitingStart = 'false';
    experience.setAwaiting(false);
    requiredElement<HTMLElement>('[data-ui="progression-menu"]').hidden = true;
    backgroundPolicy.explicitResume();
    core.setPaused(false);
    refreshScene();
  },
  finish: () => {
    if (orientationBlocked) return;
    cancelOwnedGrapple();
    if (core.finishPatrol()) refreshScene();
  },
  claimMissions: () => {
    if (core.getState().status === 'playing' || terminalSettlementPending
      || runtimeSession.isOperationActive('revive') || runtimeSession.isOperationActive('double-wishfire')) return;
    for (let pass = 0; pass < 8; pass++) {
      const mission = economy.getActiveMissions().find(item => item.claimable);
      if (!mission || economy.claimMission(mission.id).status !== 'claimed') break;
    }
    refreshScene();
  },
});
experience.setAwaiting(waitingForFirstInput, Boolean(restoredRun));

function startFirstInput(): void {
  if (!waitingForFirstInput || orientationBlocked || core.getState().status !== 'playing') return;
  waitingForFirstInput = false;
  app.dataset.awaitingStart = 'false';
  experience.setAwaiting(false);
  backgroundPolicy.explicitResume();
  core.setPaused(false);
  refreshScene();
}


const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const uiMotionAssets = [
  grappleAttachedIcon, destinationArrowIcon, safeStateIcon, copperTokenIcon, backButtonIcon, pauseIcon,
  pursuitWarningIcon, destinationArrowIcon, tutorialHoldIcon, tutorialReleaseIcon, tutorialValidIcon,
  tutorialHighRouteIcon, tutorialLowRouteIcon, grappleAttachBurst, landingDust, nearMissArc,
  speedStreaks, impactShards, escapeRing, protagonistSwingAsset, pursuerRunAsset,
  stallCanopyAsset, paifangCrossbeamAsset, bambooScaffoldAsset, innerEaveAsset,
  pushcartAsset, blankBannerAsset, coveredAlleyFrameAsset,
  hubMoneyShell, hubMoneyValue, hubGateStrip, hubBackKey, hubInventoryRing,
  hubInventoryTalisman, hubInventoryScroll, hubInventoryPlay,
  hubAnchorButton,
];
const uiMotion = createUiAnimationRuntime({ reducedMotion, requiredAssets: uiMotionAssets });
await uiMotion.preload(() => undefined);
app.dataset.uiPreload = 'ready';
// Keep the renderer telemetry present from the first DOM frame; FlightScene
// replaces the district/chunk values as soon as its image stream is ready.
app.dataset.cityRenderer = 'image-stream';
app.dataset.cityDistrict = 'market';
app.dataset.cityChunkCount = '0';

function syncReferenceStage(): void {
  const width = Math.max(1, app.clientWidth);
  const height = Math.max(1, app.clientHeight);
  const scale = Math.min(width / REFERENCE_STAGE_WIDTH, height / REFERENCE_STAGE_HEIGHT);
  app.style.setProperty('--reference-stage-scale', scale.toFixed(6));
  app.style.setProperty('--reference-stage-offset-x', `${Math.round((width - REFERENCE_STAGE_WIDTH * scale) / 2)}px`);
  app.style.setProperty('--reference-stage-offset-y', `${Math.round((height - REFERENCE_STAGE_HEIGHT * scale) / 2)}px`);
  app.dataset.referenceStage = `${REFERENCE_STAGE_WIDTH}x${REFERENCE_STAGE_HEIGHT}`;
}

syncReferenceStage();
window.addEventListener('resize', syncReferenceStage);
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(syncReferenceStage).observe(app);

const motionGeneration = new WeakMap<HTMLElement, number>();

function applyUiMotion(element: HTMLElement, snapshot: UiAnimationSnapshot): void {
  element.dataset.motionState = snapshot.phase;
  element.style.setProperty('--ui-motion-opacity', snapshot.opacity.toFixed(4));
  element.style.setProperty('--ui-motion-y', `${snapshot.translateY.toFixed(3)}px`);
  element.style.setProperty('--ui-motion-scale', snapshot.scale.toFixed(4));
}

function playUiElement(
  element: HTMLElement,
  name: UiMotionName,
  direction: UiMotionDirection = 'enter',
  onSettled?: (settledAtMs: number) => void,
): void {
  const generation = (motionGeneration.get(element) ?? 0) + 1;
  motionGeneration.set(element, generation);
  const playback = createUiAnimationRuntime({ reducedMotion, requiredAssets: [] });
  void playback.preload(() => undefined).then(() => {
    if (motionGeneration.get(element) !== generation) return;
    if (direction === 'enter') element.hidden = false;
    applyUiMotion(element, playback.getState());
    requestAnimationFrame((startedAtMs) => {
      if (motionGeneration.get(element) !== generation) return;
      applyUiMotion(element, playback.play(name, startedAtMs, direction));
      const frame = (nowMs: number): void => {
        if (motionGeneration.get(element) !== generation) return;
        const snapshot = playback.sample(nowMs);
        applyUiMotion(element, snapshot);
        if (snapshot.phase === 'playing') {
          requestAnimationFrame(frame);
          return;
        }
        if (direction === 'exit') element.hidden = true;
        onSettled?.(nowMs);
      };
      requestAnimationFrame(frame);
    });
  });
}

function pulseUiElement(element: HTMLElement): void {
  element.dataset.active = 'true';
  playUiElement(element, 'overlay-feedback', 'enter', (enteredAtMs) => {
    const holdUntilMs = enteredAtMs + 240;
    const hold = (nowMs: number): void => {
      if (nowMs < holdUntilMs) {
        requestAnimationFrame(hold);
        return;
      }
      element.dataset.active = 'false';
      playUiElement(element, 'overlay-feedback', 'exit');
    };
    requestAnimationFrame(hold);
  });
}

for (const element of document.querySelectorAll<HTMLElement>('[data-ui-motion="hud-enter"]')) {
  playUiElement(element, 'hud-enter');
}
playUiElement(routeHint.parentElement as HTMLElement, 'overlay-feedback');

function setPersistenceNotice(issue: string | null): void {
  app.dataset.persistenceStatus = issue ? 'unavailable' : 'saved';
  persistenceNotice.hidden = !issue;
  persistenceCopy.textContent = snapshotLoadRejected ? '原存档无法读取，已保留；当前进度未保存' : '进度尚未保存';
  persistenceNotice.title = issue ? '重试会保留原始存档；若存档损坏，请先备份并修复。' : '';
  if (issue && !terminalSettlementPending && !runtimeSession.isOperationActive('revive')
    && !runtimeSession.isOperationActive('double-wishfire')) {
    adNote.textContent = '运行存档未保存，当前进度不会被静默覆盖；请清除坏档或重试。';
  }
}

function renderItemAvailability(meta: MetaProgress): void {
  const statusFor = (item: 'talisman' | 'firecracker'): string => {
    if (meta.itemUnlocked?.[item]) return '可用';
    if (meta.itemFirstUse?.[item]) return '待解锁';
    return '首用可用';
  };
  const talismanStatus = statusFor('talisman');
  const firecrackerStatus = statusFor('firecracker');
  if (talismanAvailability) {
    talismanAvailability.textContent = `护身 · ${talismanStatus}`;
    talismanAvailability.dataset.availability = talismanStatus;
  }
  if (firecrackerAvailability) {
    firecrackerAvailability.textContent = `爆竹 · ${firecrackerStatus}`;
    firecrackerAvailability.dataset.availability = firecrackerStatus;
  }
}

function itemReady(item: 'talisman' | 'firecracker', state: GrappleState): boolean {
  return item === 'talisman'
    ? state.talismanActiveUntilTick <= state.tick
    : state.firecrackerStunUntilTick <= state.tick;
}

function beginNextRun(state: GrappleState): void {
  waitingForFirstInput = false;
  app.dataset.awaitingStart = 'false';
  experience.setAwaiting(false);
  experience.reset();
  lastPersistedTick = -1;
  core.setCharacter(economy.getProgressV2().selectedCharacter ?? CHARACTERS[0]!.id);
  backgroundPolicy.explicitResume();
  requiredElement<HTMLElement>('[data-ui="progression-menu"]').hidden = true;
  currentRunId = runtimeSession.beginNewRun(state.seed);
  failedSettlementCommitted = false;
  failedSettlementBaseReward = 0;
  failedSettlementResult = null;
  terminalSettlementPending = false;
  terminalSettlementRunId = null;
  terminalCompletionRecorded = false;
  lastRenderedCombo = 0;
  lastRenderedSky = false;
  adNote.textContent = '广告奖励由你主动选择';
  restartButton.textContent = '不看广告 · 重新启程';
  doubleButton.textContent = '看完广告 · 再得金币';
  if (state.levelIndex === 0) tutorialStepIndex = 0;
  // A restart/continue owns the transition synchronously; do not leave a
  // stale terminal card visible while its exit animation is settling.
  resultCard.hidden = true;
  resultScrim.hidden = true;
  if (!resultCard.hidden || !resultScrim.hidden) closeResultCard();
}

async function useItem(item: 'talisman' | 'firecracker', button: HTMLButtonElement): Promise<void> {
  const initialState = core.getState();
  if (initialState.status !== 'playing' || initialState.paused || button.disabled || !itemReady(item, initialState)) return;
  const operation = runtimeSession.beginOperation(`item:${item}`);
  if (!operation) return;
  button.disabled = true;
  try {
    const consumed = economy.consumeItem(item);
    if (consumed.status === 'locked') {
      adNote.textContent = '正在请求道具解锁广告…';
      const unlocked = await economy.unlockItemWithAd(item);
      if (!runtimeSession.isCurrent(operation)) return;
      const afterUnlock = core.getState();
      if (unlocked.status !== 'granted' && unlocked.status !== 'already-unlocked') {
        adNote.textContent = unlocked.status === 'in-flight' ? '道具广告正在处理中。' : '广告不可用或未完成，道具未消耗。';
        experience.announce(adNote.textContent);
        return;
      }
      if (afterUnlock.status !== 'playing' || afterUnlock.paused || !itemReady(item, afterUnlock)) {
        adNote.textContent = '道具已准备好，当前状态暂不可使用。';
        experience.announce(adNote.textContent);
        return;
      }
    }
    if (!runtimeSession.isCurrent(operation)) return;
    const latest = core.getState();
    if (latest.status !== 'playing' || latest.paused || !itemReady(item, latest)) return;
    const used = item === 'talisman' ? core.useTalisman() : core.useFirecracker();
    if (used) {
      adNote.textContent = item === 'talisman' ? '护身符生效：3秒内免疫危险' : '爆竹炸响：追兵暂时停滞';
      experience.announce(adNote.textContent);
    }
  } finally {
    runtimeSession.endOperation(operation);
    if (runtimeSession.isCurrentRun(operation.runId)) {
      button.disabled = false;
      renderProductUi(core.getState());
    }
  }
}

function readPersistedRunRaw(): string | null {
  return runIdentityStorage.read('night-market-hero.run.v2');
}

function persistRun(state = core.getState(), force = true): boolean {
  // At most one ordinary snapshot per simulated second. Lifecycle/terminal
  // changes and explicit save retries bypass this throttle.
  if (!force && state.status === lastPersistedStatus && state.paused === lastPersistedPaused
    && state.tick >= lastPersistedTick && state.tick - lastPersistedTick < 120) return true;
  if (state.tick === lastPersistedTick && state.status === lastPersistedStatus && state.paused === lastPersistedPaused) return true;
  if (snapshotLoadRejected) {
    setPersistenceNotice('run-load-rejected');
    return false;
  }
  const saved = runSnapshotStorage.save(createRunSnapshot(currentRunId, state));
  const storageIssue = runSnapshotStorage.getPersistenceIssue?.();
  const persisted = runSnapshotStorage.load();
  const savedRunId = persisted?.runId ?? null;
  const raw = readPersistedRunRaw();
  if (saved === false || storageIssue || savedRunId !== currentRunId || raw === null) {
    setPersistenceNotice(storageIssue ?? 'run-save-failed');
    return false;
  }
  setPersistenceNotice(null);
  lastPersistedTick = state.tick;
  lastPersistedStatus = state.status;
  lastPersistedPaused = state.paused;
  return true;
}

retrySaveButton.addEventListener('click', () => {
  lastPersistedTick = -1;
  persistRun(core.getState());
});

function setResultCardInteractionLocked(locked: boolean): void {
  resultCard.style.pointerEvents = locked ? 'none' : '';
  resultCard.setAttribute('aria-busy', String(locked));
  for (const button of resultButtons) button.disabled = locked;
}

function closeResultCard(): void {
  setResultCardInteractionLocked(true);
  playUiElement(resultCard, 'menu-enter', 'exit', () => {
    if (core.getState().status === 'playing') {
      resultScrim.hidden = true;
      setResultCardInteractionLocked(false);
    }
  });
}

function openResultCard(): void {
  resultScrim.hidden = false;
  setResultCardInteractionLocked(runtimeSession.isOperationActive('revive') || runtimeSession.isOperationActive('double-wishfire'));
  playUiElement(resultCard, 'menu-enter');
}

function isSettlementFailure(result: CompleteRunResult): result is Extract<CompleteRunResult, { status: 'not-committed' | 'rejected' }> {
  return result.status === 'not-committed' || result.status === 'rejected';
}

function settlementFor(state: GrappleState): CompleteRunResult {
  const metrics = {
    distanceMeters: state.distanceMeters,
    pickups: state.pickups,
    combo: state.comboPeak ?? state.combo,
    gatesPassed: state.gatesPassed,
    pickupCoins: state.coins,
    skySegments: state.skySegments,
    tutorialCompleted: state.levelId === 'lantern-entry' && state.status === 'won',
  };
  return economy.completeRun(currentRunId, settlementCoins({
    distanceMeters: state.distanceMeters,
    pickupCoins: state.coins,
    combo: state.comboPeak ?? state.combo,
    gates: state.gatesPassed,
    depthMultiplier: state.depthCoefficient,
    character: state.characterId,
  }), metrics);
}

function showSettlementPending(state: GrappleState, result: CompleteRunResult): void {
  terminalSettlementPending = true;
  terminalSettlementRunId = currentRunId;
  settlementDetails.textContent = `已穿过 ${state.gatesPassed} 个街区 · 结算暂未保存`;
  resultKicker.textContent = '结算待保存';
  resultTitle.textContent = '奖励尚未入账';
  resultCopy.textContent = result.reason === 'invalid-input'
    ? '本次结算数据无效，奖励未发放。'
    : '存档写入失败，奖励未发放。点击“重试保存”后再继续。';
  adNote.textContent = '存档写入失败，奖励未入账；请重试保存。';
  app.dataset.settlementStatus = 'pending';
  reviveButton.hidden = true;
  doubleButton.hidden = true;
  continueButton.hidden = true;
  restartButton.hidden = false;
  restartButton.textContent = '重试保存';
}

function renderProductUi(state: GrappleState): void {
  levelTitle.textContent = state.levelId === 'night-patrol' ? `无限夜巡 · ${state.levelTitle}` : `第${state.levelIndex + 1}关 · ${state.levelTitle}`;
  const endless = state.levelId === 'night-patrol';
  destination.textContent = endless ? state.levelDestination : '夜市渡口';
  const journeyMeter = progressFill.parentElement as HTMLElement | null;
  if (journeyMeter) journeyMeter.hidden = endless;
  if (!endless) progressFill.style.width = `${Math.round(state.progress * 100)}%`;
  wishfireText.textContent = String(economy.getProgress().wishfire);
  coinsText.textContent = String(economy.getProgress().coins ?? economy.getProgress().wishfire);
  distanceReadout.textContent = `${Math.round(state.distanceMeters ?? 0)}m`;
  runCoinsReadout.textContent = String(Math.floor(state.coins ?? 0));
  comboReadout.textContent = String(state.combo ?? 0);
  multiplierReadout.textContent = `${state.gatesPassed ?? 0}`;
  const checkpointX = endless ? nextCheckpointX(state.player.x) : state.finishX;
  const nextGateDistance = Math.max(0, Math.round((checkpointX - state.player.x) / 30));
  app.dataset.marketGates = 'disabled';
  gatesTotal.textContent = String(state.gatesPassed);
  gateDistance.textContent = `${nextGateDistance}m`;
  depthReadout.textContent = `${nextGateDistance}m`;
  recordReadout.textContent = `${economy.getProgressV2().bestGates ?? 0}`;
  runStateReadout.textContent = state.isSky ? '天空段 · 坠落即败' : state.vehicleId ? `${state.vehicleId} · ${state.vehiclePhase === 'holding' ? '按住' : state.vehiclePhase === 'released' ? '滑翔' : '待机'}` : '夜巡';
  app.dataset.distanceMeters = String(state.distanceMeters ?? 0);
  app.dataset.combo = String(state.combo ?? 0);
  app.dataset.comboTier = String(state.comboTier ?? 1);
  app.dataset.mutation = state.mutation ?? 'none';
  app.dataset.vehicle = state.vehicleId ?? 'none';
  app.dataset.skySegment = String(state.isSky ?? false);
  const meta = economy.getProgressV2();
  renderItemAvailability(meta);
  app.dataset.characterRoster = CHARACTERS.map((character) => character.id).join(',');
  app.dataset.activeCharacter = state.characterId;
  app.dataset.selectedCharacter = meta.selectedCharacter ?? CHARACTERS[0]!.id;
  app.dataset.missions = economy.getActiveMissions().map(m => m.id).join(',');
  app.dataset.recordMeters = String(meta.records?.totalMeters ?? 0);
  app.dataset.skyEntry = String(state.isSky);
  if (state.combo !== lastRenderedCombo) {
    comboReadout.dataset.changed = 'true';
    if (state.combo > lastRenderedCombo || lastRenderedCombo > 0) pulseUiElement(comboReadout);
    lastRenderedCombo = state.combo;
  }
  if (state.isSky !== lastRenderedSky) {
    lastRenderedSky = state.isSky;
    if (state.isSky) pulseUiElement(climaxCallout);
  }
  routeHint.textContent = state.attachedAnchorId
    ? '飞索已接 · 松手保留当前动量'
    : state.activeChaseEvent === 'roof-net'
      ? state.chaseObstacle?.phase === 'raise' ? '官兵举网 · 看清横梁落点'
        : state.chaseObstacle?.phase === 'aim' ? '官兵瞄准 · 松手改变弧线'
          : state.chaseObstacle?.phase === 'travel' ? '货网飞来 · 提前松手或走低弧线'
            : state.chaseObstacle?.phase === 'land' || state.chaseObstacle?.phase === 'active' ? '货网落地 · 低线绕行'
              : '官兵抛网 · 提前松手或走低弧线'
      : state.activeChaseEvent === 'barricade'
        ? '摊棚卷帘封住低线 · 按住飞索转上内梁'
        : '按住飞索挂接 · 松手飞行';
  routeStateIcon.src = state.attachedAnchorId ? grappleAttachedIcon
    : state.activeChaseEvent !== null ? pursuitWarningIcon
        : state.segment === 'route-alternation' ? (state.route === 'high' ? tutorialHighRouteIcon : tutorialLowRouteIcon)
          : safeStateIcon;
  if (state.levelIndex === 0 && state.status === 'playing') {
    if (tutorialStepIndex === 0 && state.attachedAnchorId !== null) tutorialStepIndex = 1;
    if (tutorialStepIndex === 1 && state.inputTransitions >= 2 && state.attachedAnchorId === null) tutorialStepIndex = 2;
    if (tutorialStepIndex === 2 && state.pickups > 0) tutorialStepIndex = 3;
    if (tutorialStepIndex === 3 && state.pickups > 0) tutorialStepIndex = 4;
  }
  const tutorialPhase = state.levelIndex === 0 && state.status === 'playing'
    ? (['hook', 'release', 'coin', 'off'] as const)[tutorialStepIndex] ?? 'off'
    : 'off';
  const tutorialCopy: Record<string, string> = {
    hook: '按住飞索 · 靠近檐角挂点',
    release: '松手飞行 · 保留当前动量',
    coin: '拾取金币 · 沿金色引导前进',
    off: '',
  };
  tutorialStage.textContent = tutorialCopy[tutorialPhase] ?? '';
  tutorialStage.dataset.active = String(tutorialPhase !== 'off');
  app.dataset.tutorialPhase = tutorialPhase;
  app.dataset.levelIndex = String(state.levelIndex);
  for (const step of tutorialRail.querySelectorAll<HTMLElement>('[data-tutorial-step]')) {
    step.dataset.active = String(step.dataset.tutorialStep === tutorialPhase);
  }
  const routeHintVisible = state.elapsed < 4 || state.activeChaseEvent !== null || state.attachedAnchorId !== null;
  routeHint.dataset.visible = String(routeHintVisible);
  if (routeHintVisible !== lastRouteHintVisible) {
    playUiElement(routeHint.parentElement as HTMLElement, 'overlay-feedback', routeHintVisible ? 'enter' : 'exit');
    lastRouteHintVisible = routeHintVisible;
  }
  app.dataset.chasePhase = state.chase.phase;
  app.dataset.route = state.route;
  app.dataset.segment = state.segment;
  app.dataset.levelOneSegmentOrder = LEVEL_ONE_SEGMENTS.join('>');
  app.dataset.routePhase = state.routeTraversal.phase;
  app.dataset.routeCommitment = state.routeTraversal.committedRoute ?? 'none';
  app.dataset.obstacleKind = state.chaseObstacle?.kind ?? 'none';
  app.dataset.obstaclePhase = state.chaseObstacle?.phase ?? 'none';
  const feedbackAsset = state.pickups > lastRenderedPickupCount ? landingDust
    : state.attachedAnchorId !== null && lastAttachedAnchorId === null ? grappleAttachBurst
    : state.activeTerrain?.behaviorState !== lastTerrainBehaviorState && state.activeTerrain?.behaviorState === 'broken' ? impactShards
      : state.chaseObstacle?.phase !== lastChaseObstaclePhase && state.chaseObstacle?.phase === 'missed' ? nearMissArc
        : state.chase.phase === 'danger' && lastUiChasePhase !== 'danger' ? speedStreaks
          : null;
  if (feedbackAsset) {
    feedbackLayer.src = feedbackAsset;
    pulseUiElement(feedbackLayer);
  }
  lastAttachedAnchorId = state.attachedAnchorId;
  lastRenderedPickupCount = state.pickups;
  lastTerrainBehaviorState = state.activeTerrain?.behaviorState ?? null;
  lastChaseObstaclePhase = state.chaseObstacle?.phase ?? null;
  chaseMeter.style.width = `${Math.round(state.chase.pressure * 100)}%`;
  chaseDistance.textContent = `${Math.round(state.chase.distance)} 步`;
  pursuerDistance.textContent = `${Math.round(state.pursuer.distance)} 步`;
  const guardOnScreen = app.dataset.guardOnScreen === 'true';
  const chaseVisible = state.levelId === 'night-patrol' || state.chase.phase !== 'safe';
  const edgeVisible = state.pursuer.visible && chaseVisible && !guardOnScreen;
  pursuerPresence.dataset.visible = String(state.pursuer.visible && chaseVisible && !guardOnScreen);
  // `hidden` is the authoritative DOM visibility switch. Keep the data
  // attribute for styling/telemetry, but do not rely on an inline display
  // value being overridden by a later responsive rule.
  pursuerPresence.hidden = !edgeVisible;
  // Keep a single player-readable pursuer expression: the world silhouette
  // owns the presentation whenever it is inside the camera frame.
  pursuerPresence.style.display = '';
  pursuerPresence.style.setProperty('--guard-threat', state.chase.pressure.toFixed(3));
  const climaxVisible = state.isSky && state.status === 'playing';
  climaxCopy.textContent = state.isSky ? '进入天空段 · 追兵暂退 · 坠落即败' : '前往渡口';
  climaxCallout.dataset.active = String(climaxVisible);
  if (climaxVisible !== lastClimaxVisible) {
    playUiElement(climaxCallout, 'overlay-feedback', climaxVisible ? 'enter' : 'exit');
    lastClimaxVisible = climaxVisible;
  }
  threatVignette.style.setProperty('--threat', state.chase.pressure.toFixed(3));
  threatVignette.style.setProperty('--threat-edge-alpha', (state.chase.pressure * 0.3).toFixed(3));
  threatVignette.style.setProperty('--threat-shadow-alpha', (state.chase.pressure * 0.42).toFixed(3));
  threatVignette.style.setProperty('--threat-opacity', (0.16 + state.chase.pressure * 0.84).toFixed(3));
  if (state.chase.phase !== lastUiChasePhase) {
    playUiElement(threatVignette, 'state-change');
    lastUiChasePhase = state.chase.phase;
  }
  if (state.segment !== lastUiSegment) {
    playUiElement(cornerHud, 'state-change');
    lastUiSegment = state.segment;
  }

  if (state.failureReason === 'caught') chaseLabel.textContent = '官兵已追上';
  else if (state.chase.phase === 'climax') chaseLabel.textContent = '官兵加速追来';
  else if (state.chase.phase === 'danger') chaseLabel.textContent = '官兵迫近';
  else if (state.chase.phase === 'alert') chaseLabel.textContent = '官兵紧追在后';
  else chaseLabel.textContent = '官兵尚在后方';
  if (state.isSky) routeHint.textContent = state.vehicleId ? `${state.vehicleId} · ${state.vehiclePhase === 'holding' ? '按住拉升' : '松手滑翔'} · 坠落即败` : '天空段 · 星辰挂点可借力，坠落即败';

  if (state.status === 'playing' && state.chase.distance - lastRenderedDistance > 2
    && performance.now() - lastReliefFeedbackAt > 700) {
    lastReliefFeedbackAt = performance.now();
    pulseUiElement(escapeFeedback);
  }
  lastRenderedDistance = state.chase.distance;
  pauseOverlay.hidden = !state.paused || state.status !== 'playing' || orientationBlocked || waitingForFirstInput || !progressionMenu.hidden;
  persistRun(state, false);

  if (state.status === 'playing') {
    // Endless gate beats are in-run checkpoints, never terminal settlements.
    // Hide any stale card immediately when gameplay resumes (including rapid
    // restart taps before the menu exit animation completes).
    if (!resultCard.hidden || !resultScrim.hidden) {
      resultCard.hidden = true;
      resultScrim.hidden = true;
    }
    if (observedStatus !== 'playing') closeResultCard();
    observedStatus = 'playing';
    return;
  }

  const statusChanged = observedStatus !== state.status;
  if (state.status === 'won' && (statusChanged || terminalSettlementPending)) {
    const settlement = settlementFor(state);
    if (isSettlementFailure(settlement)) {
      observedStatus = state.status;
      showSettlementPending(state, settlement);
      if (statusChanged) openResultCard();
      return;
    }
    terminalSettlementPending = false;
    terminalSettlementRunId = null;
    app.dataset.settlementStatus = 'committed';
    if (!terminalCompletionRecorded) {
      interstitialPolicy.recordCompletion();
      terminalCompletionRecorded = true;
    }
    wishfireText.textContent = String(economy.getProgress().wishfire);
    coinsText.textContent = String(economy.getProgress().coins ?? economy.getProgress().wishfire);
  }
  observedStatus = state.status;

  // Terminal UI must be actionable immediately, even if a previous menu
  // animation is still settling (the test and real users may tap quickly).
  setResultCardInteractionLocked(runtimeSession.isOperationActive('revive') || runtimeSession.isOperationActive('double-wishfire'));

  if (state.status === 'failed') {
    if (!failedSettlementCommitted || terminalSettlementPending) {
      const failedSettlement = settlementFor(state);
      if (isSettlementFailure(failedSettlement)) {
        observedStatus = state.status;
        showSettlementPending(state, failedSettlement);
        if (statusChanged) openResultCard();
        return;
      }
      failedSettlementResult = failedSettlement;
      failedSettlementCommitted = true;
      terminalSettlementPending = false;
      terminalSettlementRunId = null;
      app.dataset.settlementStatus = 'committed';
      failedSettlementBaseReward = failedSettlement.baseReward;
    }
    const failedSettlement = failedSettlementResult;
    if (!failedSettlement || isSettlementFailure(failedSettlement)) return;
    settlementDetails.textContent = `里程 ${Math.floor(state.distanceMeters)}m · 拾取 ${state.pickups} 枚 · 最高 ${state.comboPeak} 连飞 · 入账 +${failedSettlementBaseReward}`;
    const canRevive = core.canRewardedRevive();
    const freeRevive = economy.canDailyFreeRevive(Date.now());
    const wasCaught = state.failureReason === 'caught';
    resultKicker.textContent = canRevive ? '惜败 · 铜符尚在' : '护印突围中断';
    resultTitle.textContent = wasCaught ? '官兵追上了' : '松手太久，坠落了';
    resultCopy.textContent = canRevive
      ? state.levelId === 'night-patrol'
        ? `本次夜巡已行进 ${Math.round(state.distanceMeters)}m。${freeRevive ? '今日首次可免费' : '主动看完一次广告可'}从最近的安全内檐复起。`
        : `已突围 ${Math.round(state.progress * 100)}%。${freeRevive ? '今日首次可免费' : '主动看完一次广告可'}从最近的安全内檐复起。`
      : wasCaught
        ? '碰撞、错过挂点和滞空会让官兵追近；连续漂亮飞越和捷径能拉开距离。'
        : '盟契铜符还在怀里，换一条夜市内线重新突围。';
    resultCopy.textContent += wasCaught ? ' 下次试试青色金币线，可拉开追兵。' : ' 身体向前时松手，下落时及时按住。';
    reviveButton.hidden = !canRevive || (!freeRevive && !window.__NIGHT_MARKET_HERO_TAPTAP_AD_CONFIG__);
    reviveButton.textContent = freeRevive ? '今日免费 · 安全复起' : '看完广告 · 安全复起';
    doubleButton.hidden = true;
    restartButton.hidden = false;
    continueButton.hidden = true;
    if (statusChanged) openResultCard();
    return;
  }

  const settlement = settlementFor(state);
  if (isSettlementFailure(settlement)) {
    observedStatus = state.status;
    showSettlementPending(state, settlement);
    if (statusChanged) openResultCard();
    return;
  }
  terminalSettlementPending = false;
  terminalSettlementRunId = null;
  app.dataset.settlementStatus = 'committed';
  settlementDetails.textContent = `里程 ${Math.floor(state.distanceMeters)}m · ${state.gatesPassed} 个街区 · 最高 ${state.comboPeak} 连飞 · 入账 +${settlement.baseReward}`;
  const campaignComplete = state.levelId === 'night-patrol' || state.levelIndex === state.levelCount - 1;
  resultKicker.textContent = state.levelId === 'night-patrol' ? '夜巡结束' : campaignComplete ? '渡口已达' : `第${state.levelIndex + 1}关通过`;
  resultTitle.textContent = state.levelId === 'night-patrol' ? '本次夜巡记录' : campaignComplete ? '盟契铜符已送达' : `${state.levelTitle} · 突围成功`;
  resultCopy.textContent = state.levelId === 'night-patrol'
    ? `已安全收工。本次记录与 ${settlement.baseReward} 金币已保存，挑战下一次更远的旅程。`
    : campaignComplete
    ? `顺利抵达渡口。本次夜巡已记录，获得金币：+${settlement.baseReward}。`
    : `铜符仍在手中，准备开始夜巡。结算金币：+${settlement.baseReward}。`;
  reviveButton.hidden = true;
  doubleButton.hidden = !settlement.canDouble || !window.__NIGHT_MARKET_HERO_TAPTAP_AD_CONFIG__;
  doubleButton.textContent = `看完广告 · 再得 ${settlement.baseReward} 金币`;
  restartButton.hidden = true;
  continueButton.hidden = false;
  continueButton.textContent = state.levelId === 'night-patrol' ? '再跑一次' : '进入夜巡';
  if (statusChanged) openResultCard();
}

class FlightScene extends Phaser.Scene {
  private drawing!: Phaser.GameObjects.Graphics;
  private moduleLayer!: Phaser.GameObjects.Container;
  private protagonistSprite!: Phaser.GameObjects.Image;
  private protagonistRim!: Phaser.GameObjects.Image;
  private pursuerSprite!: Phaser.GameObjects.Image;
  private anchorSprites = new Map<string, Phaser.GameObjects.Image>();
  private cameraScrollX = 0;
  private cameraHasInitialized = false;
  private lastRenderedTick = 0;
  private lastRenderedPlayerX = 0;
  private reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  private readonly nightCityRenderer = createNightCityRenderer({ prefetchChunks: 1, maxRetainedChunks: 8 });
  private cameraLayout = createCameraLayout({ width: REFERENCE_STAGE_WIDTH, height: REFERENCE_STAGE_HEIGHT, lookAhead: 0.32 });

  constructor() {
    super('flight');
  }

  preload(): void {
    this.load.image('protagonist-swing', protagonistSwingAsset);
    this.load.image('pursuer-run', pursuerRunAsset);
    this.load.image('module-stall-canopy', stallCanopyAsset);
    this.load.image('module-paifang-crossbeam', paifangCrossbeamAsset);
    this.load.image('module-bamboo-scaffold', bambooScaffoldAsset);
    this.load.image('module-inner-eave', innerEaveAsset);
    this.load.image('module-pushcart', pushcartAsset);
    this.load.image('module-blank-banner', blankBannerAsset);
    this.load.image('module-covered-alley-frame', coveredAlleyFrameAsset);
    this.load.image('anchor-button', hubAnchorButton);
    // The approved district panoramas are loaded before the first scene
    // visibility.  The renderer keeps images hidden until Phaser reports the
    // corresponding texture as ready.
    this.nightCityRenderer.preload(this);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this.cameras.main.setOrigin(0, 0);
    this.moduleLayer = this.add.container(0, 0).setDepth(-5);
    this.protagonistRim = this.add.image(0, 0, 'protagonist-swing').setOrigin(0.5, 0.72).setTintFill(0x8dc8d8).setDepth(3.9);
    this.protagonistSprite = this.add.image(0, 0, 'protagonist-swing').setOrigin(0.5, 0.72).setDisplaySize(150, 150).setAlpha(1).setDepth(4);
    this.pursuerSprite = this.add.image(0, 0, 'pursuer-run').setOrigin(0.5, 0.72).setDisplaySize(126, 130).setAlpha(1).setDepth(4);
    // The old fixed decoration pool is intentionally not mounted on the
    // default journey: it stretched a canopy over the HUD and left floating
    // fragments at the top of the playfield.  NightCityRenderer owns the
    // streamed scenery; the function below remains compatibility-only for
    // archived snapshots and is never called here.
    this.drawing = this.add.graphics();
    this.renderState(core.getState());
  }

  update(_time: number, delta: number): void {
    this.renderState(backgroundPolicy.shouldAdvance ? core.step(delta / 1000) : core.getState());
  }

  refresh(): void {
    this.renderState(core.getState());
  }

  private renderState(state: GrappleState): void {
    const viewportWidth = Math.max(1, this.scale.width || app.clientWidth || REFERENCE_STAGE_WIDTH);
    const viewportHeight = Math.max(1, this.scale.height || app.clientHeight || REFERENCE_STAGE_HEIGHT);
    this.cameraLayout = createCameraLayout({ width: viewportWidth, height: viewportHeight, lookAhead: 0.32 });
    const geometryRight = state.environmentGeometry.worldBounds.x + state.environmentGeometry.worldBounds.width;
    // Endless mode intentionally has no finite finishX; keep the presentation
    // camera and streamed city ahead of the player without changing physics.
    const worldRight = Math.max(geometryRight, state.player.x + LOGICAL_VIEWPORT.width * 4, Number.isFinite(state.finishX) ? state.finishX : 0);
    const projection = projectCamera(this.cameraLayout, state.player, {
      left: state.environmentGeometry.worldBounds.x,
      right: worldRight,
      top: state.environmentGeometry.worldBounds.y,
      bottom: Math.max(state.environmentGeometry.worldBounds.y + state.environmentGeometry.worldBounds.height, LOGICAL_VIEWPORT.height),
    });
    const worldViewportWidth = projection.worldViewportWidth;
    const worldViewportHeight = projection.worldViewportHeight;
    this.cameras.main.setZoom(projection.zoom);
    const cameraTargetX = projection.scrollX;
    const elapsedCameraSeconds = Math.max(0, (state.tick - this.lastRenderedTick) / 120);
    const genuineRestart = state.tick < this.lastRenderedTick
      || Math.abs(state.player.x - this.lastRenderedPlayerX) > worldViewportWidth * 1.25;
    if (!this.cameraHasInitialized || genuineRestart) {
      this.cameraScrollX = cameraTargetX;
      this.cameraHasInitialized = true;
    } else if (elapsedCameraSeconds > 0) {
      this.cameraScrollX = comfortCameraStep(this.cameraScrollX, cameraTargetX, elapsedCameraSeconds);
    }
    this.lastRenderedTick = state.tick;
    this.lastRenderedPlayerX = state.player.x;
    // Ease backward during a real backswing; never rewind physical state.
    const maxScrollX = Math.max(0, worldRight - worldViewportWidth);
    this.cameraScrollX = Math.min(this.cameraScrollX, maxScrollX);
    this.cameras.main.scrollX = this.cameraScrollX;
    this.cameras.main.scrollY = projection.scrollY; /* side-view vertical origin stays fixed */
    const cityStats = this.nightCityRenderer.render(this, state.seed,
      this.cameras.main.scrollX, this.cameras.main.scrollX + worldViewportWidth);
    app.dataset.cityDistrict = cityStats.district ?? 'market';
    app.dataset.cityChunkCount = String(cityStats.chunkCount);
    app.dataset.cityRenderer = cityStats.renderer;
    // Read-only visual QA telemetry; never drives world state.
    app.dataset.cameraX = String(this.cameraScrollX);
    app.dataset.worldViewportWidth = String(worldViewportWidth);
    app.dataset.sceneOwner = 'night-city-image-stream';
    app.dataset.sceneLayerCount = '1';
    app.dataset.sceneOverlay = 'none';
    app.dataset.componentRenderer = 'disabled';
    app.dataset.componentVisibleCount = '0';
    app.dataset.componentRetainedCount = '0';
    app.dataset.missingAssetCount = '0';
    app.dataset.longmapChunkId = 'none';
    app.dataset.longmapChainIndex = '-1';
    app.dataset.longmapChunkKind = 'none';
    app.dataset.longmapSceneFamily = 'none';
    applyFlightIdentity(this.protagonistSprite, this.protagonistRim, state.player, projection.zoom);
    this.pursuerSprite.setPosition(state.pursuer.x, state.pursuer.y).setRotation(0).setVisible(state.pursuer.visible);
    app.dataset.guardOnScreen = String(state.pursuer.x >= this.cameras.main.scrollX
      && state.pursuer.x <= this.cameras.main.scrollX + worldViewportWidth);
    renderProductUi(state);
    experience.update(state, {
      claimableReward: terminalSettlementPending ? 0 : economy.getActiveMissions().filter(m => m.claimable).reduce((sum, m) => sum + m.reward, 0),
      bestDistance: economy.getRecordLedger().bestDistanceMeters,
    });

    const graphics = this.drawing;
    if (!graphics) return;
    graphics.clear();
    // Dynamic feedback owns its own alpha.  A scene-wide multiplier made the
    // rope, anchors, pickup cues, and chase telegraphs look like a second
    // translucent map when the player held jump.
    graphics.setAlpha(1);
    drawConditions(graphics, state, this.cameras.main.scrollX, worldViewportWidth, reducedMotion);
    this.drawSpeedFeel(graphics, state, this.cameras.main.scrollX, worldViewportWidth, worldViewportHeight);
    // Static route/terrain blockout is intentionally not painted here.  The
    // approved image stream is the only scene owner; this pass is reserved for
    // live gameplay feedback that must remain visible while jumping.
    this.drawStrictReferencePursuer(graphics, state);
    if (state.levelId === 'night-patrol' && state.chase.pressure >= 0.55) {
      // Officers throw a visible roof-reaching net rather than magically
      // catching a high-line player from an invisible ground collision.
      const guardX = state.pursuer.x;
      const guardY = state.pursuer.y - 26;
      const warnX = guardX + Math.min(190, Math.max(50, state.chase.distance * 0.65));
      const warnY = Math.max(220, state.player.y - 45);
      graphics.lineStyle(5, 0xe89a78, state.chase.pressure * 0.22).lineBetween(guardX, guardY, warnX, warnY);
      graphics.lineStyle(2, 0xffd2a3, 0.70).lineBetween(guardX, guardY, warnX, warnY);
      graphics.lineStyle(3, 0xefaa79, 0.7).strokeEllipse(warnX, warnY, 76, 76);
    }
    this.drawChaseObstacle(graphics, state);
    this.drawActivePickups(graphics, state, this.cameras.main.scrollX, worldViewportWidth);
    this.drawTutorialAffordance(graphics, state);

    const eligible = this.findEligible(state);
    this.syncAnchorSprites(state, eligible?.id ?? null);
    const anchorMapPlan = createNightCityRenderPlan(state.seed,
      this.cameras.main.scrollX, this.cameras.main.scrollX + worldViewportWidth);
    for (const anchor of state.anchors) {
      const selected = anchor.id === eligible?.id || anchor.id === state.attachedAnchorId;
      const socket = mapWorldAnchorToArchitecturalSocket(anchorMapPlan, anchor);
      if (socket) {
        // A quiet fixed mount ties the gameplay ring to an authored beam or
        // cable pixel. It follows the same crop and camera as the city plate.
        graphics.lineStyle((selected ? 1.25 : 0.75) / projection.zoom, 0xc2a177, selected ? 0.44 : 0.16)
          .lineBetween(socket.x, socket.y, anchor.x, anchor.y);
        graphics.fillStyle(0xd7b784, selected ? 0.68 : 0.28)
          .fillCircle(socket.x, socket.y, 2 / projection.zoom);
      }
      this.drawMarketAnchor(graphics, anchor, anchor.id === eligible?.id, anchor.id === state.attachedAnchorId, state.levelIndex, state.tick);
    }

    if (state.attachedAnchorId !== null) {
      const anchor = state.anchors.find((item) => item.id === state.attachedAnchorId);
      if (anchor) {
        const ropeColor = state.comboTier >= 4 ? 0x7de0c3 : state.comboTier >= 3 ? 0x78e1cf : state.comboTier >= 2 ? 0xffd166 : 0xffedbf;
        graphics.lineStyle(7, ropeColor, 0.12).lineBetween(anchor.x, anchor.y, state.player.x, state.player.y);
        graphics.lineStyle(state.comboTier >= 3 ? 3 : 2, ropeColor, 0.94).lineBetween(anchor.x, anchor.y, state.player.x, state.player.y);
      }
    }
    drawVehicleOffers(graphics, state);
    drawRide(graphics, state);
    this.drawStrictReferenceProtagonist(graphics, state.player.x, state.player.y, Math.atan2(state.player.vy, state.player.vx));
    graphics.lineStyle(2, 0xd76572, 0.18).lineBetween(this.cameras.main.scrollX, state.failY, this.cameras.main.scrollX + worldViewportWidth, state.failY);
  }

  private drawSpeedFeel(graphics: Phaser.GameObjects.Graphics, state: GrappleState, cameraX: number, width: number, height: number): void {
    const feel = speedFeelProfile(state.playerMotion.speed, this.reducedMotion);
    if (feel.trailAlpha <= 0 && feel.speedLineAlpha <= 0) return;
    const player = state.player;
    const speed = Math.max(1, Math.hypot(player.vx, player.vy));
    const nx = player.vx / speed;
    const ny = player.vy / speed;
    for (let i = 1; i <= 3; i += 1) {
      const distance = 18 + i * (16 + speed * 0.035);
      graphics.lineStyle(Math.max(2, 7 - i), 0xffd38a, feel.trailAlpha * (1 - i * 0.22));
      graphics.lineBetween(player.x - nx * distance, player.y - ny * distance, player.x - nx * (distance + 22), player.y - ny * (distance + 22));
    }
    if (feel.speedLineAlpha > 0) {
      const pulse = 0.65 + 0.35 * Math.sin(state.tick * 0.22);
      graphics.lineStyle(2, 0x9ce6e0, feel.speedLineAlpha * pulse);
      graphics.lineBetween(cameraX + width * 0.06, height * 0.27, cameraX + width * 0.18, height * 0.27);
      graphics.lineBetween(cameraX + width * 0.78, height * 0.62, cameraX + width * 0.93, height * 0.62);
    }
  }

  /**
   * @deprecated Compatibility-only renderer for archived snapshots.  The
   * default FlightScene deliberately does not call this fixed decoration pool;
   * use NightCityRenderer for streamed image scenery instead.
   */
  private addEnvironmentModules(state: GrappleState): void {
    const addModule = (key: string, x: number, y: number, width: number, height: number, alpha = 0.78): void => {
      const image = this.add.image(x, y, key).setOrigin(0, 0).setDisplaySize(width, height).setAlpha(alpha);
      this.moduleLayer.add(image);
    };
    const geometry = state.environmentGeometry;
    for (const canopy of geometry.continuousCanopies.slice(0, 1)) addModule('module-stall-canopy', canopy.x, canopy.y, canopy.width, Math.min(190, canopy.height + 20), 0.86);
    for (const beam of geometry.overheadCrossbeams.slice(0, 3)) addModule('module-paifang-crossbeam', beam.x, Math.max(72, beam.y - 68), beam.width, 94, 0.86);
    for (const column of geometry.interiorColumns.slice(0, 4)) addModule('module-inner-eave', column.x - 48, column.y - 8, 124, 168, 0.78);
    for (const scaffold of state.sceneObjects.filter((item) => item.kind === '竹架').slice(0, 2)) {
      addModule('module-bamboo-scaffold', scaffold.bounds.x, scaffold.bounds.y, scaffold.bounds.width, scaffold.bounds.height, 0.86);
    }
    addModule('module-pushcart', 380, 566, 176, 120, 0.86);
    addModule('module-pushcart', 1220, 566, 176, 120, 0.82);
    addModule('module-blank-banner', 648, 208, 86, 148, 0.82);
    addModule('module-covered-alley-frame', 1410, 248, 180, 214, 0.82);
  }

  private drawActivePickups(graphics: Phaser.GameObjects.Graphics, state: GrappleState, cameraX: number, width: number): void {
    const left = cameraX - 100;
    const right = cameraX + width + 100;
    for (const pickup of state.activePickups) {
      if (pickup.collected || pickup.x < left || pickup.x > right) continue;
      const pulse = 1 + Math.sin(state.tick * 0.12 + pickup.segment) * 0.08;
      const color = pickup.kind === 'high-route' || pickup.kind === 'swing-apex' ? 0xffd166 : 0x7de0c3;
      graphics.fillStyle(color, 0.18).fillCircle(pickup.x, pickup.y, 24 * pulse);
      graphics.fillStyle(color, 0.96).fillCircle(pickup.x, pickup.y, 12 * pulse);
      graphics.fillStyle(0x4b2633, 1).fillRect(pickup.x - 4, pickup.y - 4, 8, 8);
      graphics.lineStyle(2, 0xfff0b0, 0.9).strokeCircle(pickup.x, pickup.y, 12 * pulse);
    }
  }

  private drawTutorialAffordance(graphics: Phaser.GameObjects.Graphics, state: GrappleState): void {
    if (state.levelIndex !== 0 || state.status !== 'playing') return;
    const pulse = 1 + Math.sin(state.tick * 0.16) * 0.12;
    if (state.attachedAnchorId !== null) {
      graphics.lineStyle(3, 0xffd166, 0.85).strokeCircle(state.player.x, state.player.y, 22 * pulse);
      graphics.lineBetween(state.player.x - 12, state.player.y, state.player.x + 12, state.player.y);
      return;
    }
    const eligibleId = core.getEligibleAnchorId();
    const anchor = eligibleId ? state.anchors.find((item) => item.id === eligibleId) : undefined;
    if (anchor && state.inputTransitions < 1) {
      graphics.lineStyle(3, 0xffd166, 0.9).strokeCircle(anchor.x, anchor.y, 30 * pulse);
      graphics.lineStyle(2, 0xfff0b0, 0.75).strokeCircle(anchor.x, anchor.y, 16 * pulse);
      return;
    }
    const pickup = state.activePickups.find((item) => !item.collected);
    if (pickup && state.pickups === 0) {
      graphics.lineStyle(3, 0xffd166, 0.8).strokeCircle(pickup.x, pickup.y, 26 * pulse);
      return;
    }
  }

  private syncAnchorSprites(state: GrappleState, eligibleId: string | null): void {
    const presentation = flightPresentation(this.cameraLayout.zoom);
    const active = new Set(state.anchors.map((anchor) => anchor.id));
    for (const [id, sprite] of this.anchorSprites) {
      if (!active.has(id)) { sprite.destroy(); this.anchorSprites.delete(id); }
    }
    for (const anchor of state.anchors) {
      let sprite = this.anchorSprites.get(anchor.id);
      if (!sprite) {
        sprite = this.add.image(anchor.x, anchor.y, 'anchor-button').setOrigin(0.5).setDepth(3);
        this.anchorSprites.set(anchor.id, sprite);
      }
      const emphasized = anchor.id === eligibleId || anchor.id === state.attachedAnchorId;
      const size = anchor.id === state.attachedAnchorId ? presentation.attachedAnchorSize : emphasized ? presentation.eligibleAnchorSize : presentation.idleAnchorSize;
      sprite.setPosition(anchor.x, anchor.y).setDisplaySize(size, size)
        .setAlpha(emphasized ? presentation.eligibleAnchorAlpha : presentation.idleAnchorAlpha).setVisible(true);
    }
  }

  private drawMarketAnchor(graphics: Phaser.GameObjects.Graphics, anchor: Anchor, eligible: boolean, attached: boolean, levelIndex: number, tick: number): void {
    const palette = 0xffbc62;
    const glow = attached ? 0xffe59d : eligible ? palette : 0xa85a5e;
    graphics.fillStyle(glow, attached ? 0.18 : eligible ? 0.12 : 0.015).fillCircle(anchor.x, anchor.y, attached ? 39 : eligible ? 34 : 18);
    if (eligible && levelIndex === 0) {
      graphics.lineStyle(2, palette, 0.38).strokeCircle(anchor.x, anchor.y, 24 + Math.sin(tick * 0.12) * 3);
    }
    graphics.lineStyle(attached ? 3 : 2, glow, attached || eligible ? 0.72 : 0.18);
    graphics.strokeCircle(anchor.x, anchor.y, attached ? 30 : eligible ? 25 : 16);
  }

  /** @deprecated Compatibility-only blockout route decoration; not mounted by
   * the default journey because it obscures the approved city plates. */
  private drawAuthoredRoute(graphics: Phaser.GameObjects.Graphics, state: GrappleState): void {
    const graph = state.routeGraph;
    const high = graph.branches.high.corridor;
    const low = graph.branches.low.corridor;
    const highActive = state.routeTraversal.committedRoute === 'high';
    const lowActive = state.routeTraversal.committedRoute === 'low';

    graphics.fillStyle(0x25334a, highActive ? 0.92 : 0.58).fillRect(high.x, high.y + high.height - 22, high.width, 22);
    graphics.lineStyle(highActive ? 5 : 3, 0x78e1cf, highActive ? 0.9 : 0.45)
      .lineBetween(high.x, high.y + high.height, high.x + high.width, high.y + high.height);
    graphics.fillStyle(0x30253b, lowActive ? 0.95 : 0.62).fillRect(low.x, low.y + low.height - 28, low.width, 28);
    graphics.lineStyle(lowActive ? 5 : 3, 0xf1b958, lowActive ? 0.88 : 0.42)
      .lineBetween(low.x, low.y + low.height, low.x + low.width, low.y + low.height);

    const splitX = graph.split.x + graph.split.width / 2;
    graphics.fillStyle(0x29243f, 1).fillRect(splitX - 5, graph.split.y + 28, 10, graph.split.height - 56);
    graphics.fillStyle(0x78e1cf, 0.95).fillTriangle(splitX, high.y + 28, splitX + 38, high.y + 50, splitX, high.y + 72);
    graphics.fillStyle(0xf1b958, 0.95).fillTriangle(splitX, low.y + 38, splitX + 38, low.y + 60, splitX, low.y + 82);
    graphics.lineStyle(3, 0x8a819d, 0.7).lineBetween(graph.approach.x, graph.approach.y + graph.approach.height / 2, splitX, graph.approach.y + graph.approach.height / 2);

    graphics.fillStyle(0x473451, 0.9).fillRect(graph.rejoin.x, graph.rejoin.y + 30, 12, graph.rejoin.height - 60);
    graphics.fillRect(graph.rejoin.x + graph.rejoin.width - 12, graph.rejoin.y + 30, 12, graph.rejoin.height - 60);
    graphics.fillStyle(0xb94f50, 0.9).fillRect(graph.rejoin.x - 10, graph.rejoin.y + graph.rejoin.height / 2 - 8, graph.rejoin.width + 20, 16);

    for (const route of ['high', 'low'] as const) {
      const branch = graph.branches[route];
      const corridorY = branch.corridor.y + branch.corridor.height / 2;
      for (const id of branch.anchorIds) {
        const anchor = state.anchors.find((item) => item.id === id);
        if (!anchor) continue;
        graphics.lineStyle(2, route === 'high' ? 0x78e1cf : 0xf1b958, 0.48)
          .lineBetween(anchor.x, anchor.y, anchor.x, corridorY);
      }
    }

    const lowBase = low.y + low.height;
    graphics.fillStyle(0x684254, 0.95).fillRect(low.x + 64, lowBase - 62, 118, 48);
    graphics.fillStyle(0xc48257, 0.75).fillRect(low.x + 54, lowBase - 72, 138, 12);
    graphics.fillStyle(0x8f6c4a, 0.95).fillRect(low.x + 250, lowBase - 134, 18, 120);
    graphics.fillRect(low.x + 218, lowBase - 134, 82, 14);
    graphics.fillStyle(0x473451, 0.94).fillRect(low.x + 382, lowBase - 150, 22, 136);
    graphics.fillStyle(0x984858, 0.88).fillRect(low.x + 440, lowBase - 134, 40, 92);
    graphics.fillStyle(0xb86a55, 0.82).fillRect(low.x + 492, lowBase - 122, 36, 80);
  }

  private drawActiveTerrain(graphics: Phaser.GameObjects.Graphics, state: GrappleState): void {
    const terrain = state.activeTerrain;
    if (!terrain) return;
    // 布棚弹跳已延期；保留数据供后续改版，但当前版本不渲染该素材。
    if (terrain.kind === '布棚') return;
    const bounds = terrain.bounds;
    if (terrain.visual.silhouette === 'sagging-fabric-canopy') {
      const approachDistance = bounds.x - state.player.x;
      if (approachDistance > 0 && approachDistance < 260) {
        const telegraphAlpha = Math.max(0.12, 0.28 - approachDistance / 1200);
        graphics.lineStyle(3, 0xf1b958, telegraphAlpha)
          .lineBetween(bounds.x, bounds.y + 8, bounds.x + bounds.width - 20, bounds.y + 8);
        graphics.fillStyle(0xf1b958, telegraphAlpha * 0.7)
          .fillTriangle(bounds.x - 18, bounds.y + 8, bounds.x - 2, bounds.y - 2, bounds.x - 2, bounds.y + 18);
      }
      const slide = terrain.behaviorState === 'sliding' ? 18 : 0;
      const teachingPulse = state.levelIndex === 0 && terrain.lesson === 'safe-teaching' && terrain.behaviorState === 'ready';
      const sag = terrain.behaviorState === 'sliding' ? 30 : teachingPulse ? 18 + Math.sin(state.tick * 0.1) * 5 : 18;
      const broken = terrain.behaviorState === 'broken';
      graphics.fillStyle(0xa84455, 0.92).fillRect(bounds.x + slide, bounds.y + 18, bounds.width - 20, 30);
      graphics.fillStyle(0x6c3d4b, 0.95).fillRect(bounds.x + 18 + slide, bounds.y + 48, 12, bounds.height - 48);
      graphics.fillRect(bounds.x + bounds.width - 42 + slide, bounds.y + 48, 12, bounds.height - 48);
      graphics.lineStyle(4, 0xf1b958, 0.78).lineBetween(bounds.x + slide, bounds.y + 48, bounds.x + bounds.width - 20 + slide, bounds.y + 48);
      graphics.lineStyle(3, 0x78e1cf, terrain.behaviorState === 'sliding' ? 0.95 : teachingPulse ? 0.58 : 0.35)
        .lineBetween(bounds.x + 10 + slide, bounds.y + 48, bounds.x + bounds.width / 2 + slide, bounds.y + 48 + sag)
        .lineBetween(bounds.x + bounds.width / 2 + slide, bounds.y + 48 + sag, bounds.x + bounds.width - 28 + slide, bounds.y + 48);
      if (broken) {
        graphics.lineStyle(5, 0x4b3442, 0.95)
          .lineBetween(bounds.x + 24, bounds.y + 56, bounds.x + 92, bounds.y + bounds.height)
          .lineBetween(bounds.x + bounds.width - 36, bounds.y + 54, bounds.x + bounds.width - 108, bounds.y + bounds.height);
        graphics.fillStyle(0xa84455, 0.82).fillTriangle(bounds.x + 64, bounds.y + 56, bounds.x + 144, bounds.y + 56, bounds.x + 118, bounds.y + 88);
      }
    } else if (terrain.visual.silhouette === 'lashed-bamboo-scaffold') {
      const strained = terrain.behaviorState === 'strained';
      const broken = terrain.behaviorState === 'broken';
      const bend = broken ? 18 : strained ? 7 : 0;
      graphics.lineStyle(10, 0x8f7044, 1);
      if (broken) {
        graphics.lineBetween(bounds.x + 28, bounds.y, bounds.x + 45, bounds.y + bounds.height * 0.48);
        graphics.lineBetween(bounds.x + 45, bounds.y + bounds.height * 0.58, bounds.x + 72, bounds.y + bounds.height);
        graphics.lineBetween(bounds.x + bounds.width - 28, bounds.y, bounds.x + bounds.width - 44, bounds.y + bounds.height * 0.42);
        graphics.lineBetween(bounds.x + bounds.width - 58, bounds.y + bounds.height * 0.53, bounds.x + bounds.width - 82, bounds.y + bounds.height);
      } else {
        graphics.lineBetween(bounds.x + 28, bounds.y, bounds.x + 28 + bend, bounds.y + bounds.height);
        graphics.lineBetween(bounds.x + bounds.width - 28, bounds.y, bounds.x + bounds.width - 28 - bend, bounds.y + bounds.height);
      }
      graphics.lineStyle(8, 0xaa8751, 1)
        .lineBetween(bounds.x + 18, bounds.y + 24, bounds.x + bounds.width - 18, bounds.y + 24 + bend)
        .lineBetween(bounds.x + 16, bounds.y + bounds.height * 0.52, bounds.x + bounds.width - 16, bounds.y + bounds.height * 0.52 + bend);
      graphics.lineStyle(5, 0x6e5138, 0.95)
        .lineBetween(bounds.x + 34, bounds.y + 30, bounds.x + bounds.width - 36, bounds.y + bounds.height - 20)
        .lineBetween(bounds.x + bounds.width - 34, bounds.y + 30, bounds.x + 36, bounds.y + bounds.height - 20);
      graphics.fillStyle(0xd0554f, 0.95);
      for (const x of [bounds.x + 28, bounds.x + bounds.width - 28]) {
        graphics.fillRect(x - 7, bounds.y + 17, 14, 6);
        graphics.fillRect(x - 7, bounds.y + bounds.height * 0.49, 14, 6);
      }
      if (strained || broken) {
        graphics.lineStyle(3, 0xf1b958, 0.8)
          .lineBetween(bounds.x + bounds.width / 2 - 12, bounds.y + 5, bounds.x + bounds.width / 2 + bend, bounds.y + 34);
      }
      if (terrain.debrisBounds) {
        const debris = terrain.debrisBounds;
        graphics.lineStyle(7, 0x594535, 0.95)
          .lineBetween(debris.x, debris.y, debris.x + debris.width * 0.45, debris.y + debris.height)
          .lineBetween(debris.x + debris.width * 0.38, debris.y + debris.height, debris.x + debris.width, debris.y + debris.height * 0.35);
        graphics.lineStyle(3, 0xd0554f, 0.8).lineBetween(debris.x + 18, debris.y + 6, debris.x + debris.width - 14, debris.y + 10);
      }
    } else {
      const wallWidth = Math.min(42, bounds.width * 0.25);
      graphics.fillStyle(0x171526, 0.98).fillRect(bounds.x, bounds.y, wallWidth, bounds.height);
      graphics.fillRect(bounds.x + bounds.width - wallWidth, bounds.y, wallWidth, bounds.height);
      graphics.fillStyle(0x2e2940, 0.9).fillTriangle(bounds.x + wallWidth, bounds.y, bounds.x + bounds.width - wallWidth, bounds.y, bounds.x + bounds.width / 2, bounds.y + 74);
      graphics.fillStyle(0x090713, terrain.behaviorState === 'concealed' ? 0.58 : 0.26)
        .fillRect(bounds.x + wallWidth, bounds.y + 76, bounds.width - wallWidth * 2, bounds.height - 76);
      graphics.lineStyle(3, 0x78e1cf, 0.5)
        .lineBetween(bounds.x + wallWidth + 18, bounds.y + bounds.height - 34, bounds.x + bounds.width - wallWidth - 18, bounds.y + bounds.height - 34);
    }
  }

  private drawChaseObstacle(graphics: Phaser.GameObjects.Graphics, state: GrappleState): void {
    const obstacle = state.chaseObstacle;
    if (!obstacle) return;
    const bounds = obstacle.bounds;
    if (obstacle.kind === 'barricade') {
      const occupied = obstacle.occupiedBounds;
      const frame = obstacle.anchorBounds;
      graphics.fillStyle(0xe55b54, 0.18 + 0.18 * Math.sin(obstacle.animationProgress * Math.PI * 6))
        .fillRect(bounds.x - 20, bounds.y, bounds.width + 40, bounds.height);
      graphics.fillStyle(0x33283a, 1).fillRect(frame.x, frame.y, 12, frame.height);
      graphics.fillRect(frame.x + frame.width - 12, frame.y, 12, frame.height);
      graphics.fillStyle(0xb0775b, 1).fillRect(frame.x, frame.y, frame.width, 18);
      graphics.fillStyle(0x5b3140, 1).fillRect(occupied.x, occupied.y, occupied.width, occupied.height);
      graphics.lineStyle(5, 0xe0a15b, 0.82);
      for (let row = 0; row < 4; row += 1) {
        const y = bounds.y + 22 + row * 44;
        if (y <= occupied.y + occupied.height) graphics.lineBetween(occupied.x, y, occupied.x + occupied.width, y);
      }
      graphics.fillStyle(0xf1b958, 0.95).fillTriangle(bounds.x - 28, bounds.y + bounds.height, bounds.x - 2, bounds.y + bounds.height, bounds.x - 15, bounds.y + bounds.height - 38);
    } else {
      this.drawRoofNet(graphics, state, obstacle);
    }
  }

  private drawRoofNet(
    graphics: Phaser.GameObjects.Graphics,
    state: GrappleState,
    obstacle: NonNullable<GrappleState['chaseObstacle']>,
  ): void {
    // This is the官兵抛网, not a gate: it is a short danger action with a
    // telegraph, a directional throw, an impact, and a quick clear-out.
    if (obstacle.phase === 'missed' || obstacle.phase === 'passed') return;

    const source = obstacle.source;
    const target = obstacle.predictedTarget;
    const flightX = target.x - source.x;
    const flightY = target.y - source.y;
    const flightDistance = Math.max(1, Math.hypot(flightX, flightY));
    const angle = Math.atan2(target.y - source.y, target.x - source.x);
    const phase = obstacle.phase;
    const progress = obstacle.animationProgress;
    if (phase === 'raise' || phase === 'aim' || phase === 'release' || (phase === 'travel' && progress < 0.55)) {
      this.drawNetThrower(graphics, source.x, source.y, phase, progress);
    }

    if (phase === 'raise' || phase === 'aim') {
      const aimAlpha = phase === 'aim' ? 0.92 : 0.55;
      const targetRadius = phase === 'aim' ? 26 : 17;
      graphics.lineStyle(2, 0xd76572, aimAlpha * 0.7).lineBetween(source.x, source.y, target.x, target.y);
      graphics.lineStyle(2, 0xf1b958, aimAlpha)
        .strokeCircle(target.x, target.y, targetRadius)
        .lineBetween(target.x - targetRadius - 5, target.y, target.x + targetRadius + 5, target.y)
        .lineBetween(target.x, target.y - targetRadius - 5, target.x, target.y + targetRadius + 5);
      graphics.fillStyle(0xd76572, aimAlpha * 0.24).fillCircle(target.x, target.y, targetRadius * 0.62);
      return;
    }

    // Use the same unfolding fraction as occupiedBounds, so visible ropes
    // never imply a safe gap where the simulation can catch the player.
    const flightProgress = Math.min(1, Math.max(0, (progress - 0.3) / 0.58));
    const currentX = source.x + flightX * flightProgress;
    const currentY = source.y + flightY * flightProgress;
    const releaseAlpha = phase === 'release' ? 0.82 : 0.62;
    if (phase === 'release' || phase === 'travel') {
      const bundleLength = Math.min(flightDistance * 0.28, 75);
      const tailX = currentX - (flightX / flightDistance) * bundleLength;
      const tailY = currentY - (flightY / flightDistance) * bundleLength;
      const normalX = -flightY / flightDistance;
      const normalY = flightX / flightDistance;
      graphics.lineStyle(3, 0xe0a15b, releaseAlpha);
      for (let strand = -2; strand <= 2; strand += 1) {
        const offset = strand * 7 + Math.sin(state.tick * 0.34 + strand) * 2;
        graphics.lineBetween(
          tailX + normalX * offset * 0.35,
          tailY + normalY * offset * 0.35,
          currentX + normalX * offset,
          currentY + normalY * offset,
        );
      }
    }

    const occupied = obstacle.occupiedBounds;
    const meshCenter = { x: occupied.x + occupied.width / 2, y: occupied.y + occupied.height / 2 };
    const meshWidth = Math.max(12, occupied.width);
    const meshHeight = Math.max(10, occupied.height);
    this.drawRoofNetMesh(graphics, meshCenter, meshWidth, meshHeight, angle, state.tick, phase === 'caught' ? 0.96 : 0.78);

    if (phase === 'land' || phase === 'active' || phase === 'caught') {
      const impactAlpha = phase === 'caught' ? 0.92 : Math.max(0, 1 - (progress - 0.72) / 0.28) * 0.64;
      graphics.lineStyle(3, 0xd76572, impactAlpha)
        .strokeCircle(meshCenter.x, meshCenter.y, 24 + 16 * Math.sin(state.tick * 0.28) ** 2);
      graphics.lineStyle(2, 0xf1b958, impactAlpha * 0.8)
        .lineBetween(meshCenter.x - 32, meshCenter.y - 24, meshCenter.x + 28, meshCenter.y + 20)
        .lineBetween(meshCenter.x + 24, meshCenter.y - 26, meshCenter.x - 28, meshCenter.y + 24);
    }
  }

  private drawNetThrower(
    graphics: Phaser.GameObjects.Graphics, x: number, y: number, phase: string, progress: number,
  ): void {
    const preparing = phase === 'raise' || phase === 'aim';
    const armX = preparing ? x - 16 : x + 22;
    const armY = preparing ? y - 19 : y + 6;
    graphics.fillStyle(CHARACTER_BLUE_BLACK, 0.98)
      .fillCircle(x - 3, y - 24, 7)
      .fillTriangle(x - 14, y - 28, x + 8, y - 28, x - 3, y - 38)
      .fillTriangle(x - 13, y - 15, x + 8, y - 12, x + 2, y + 14);
    graphics.lineStyle(6, CHARACTER_BLUE_BLACK, 0.98)
      .lineBetween(x - 5, y + 7, x - 15, y + 28)
      .lineBetween(x, y + 8, x + 13, y + 25)
      .lineBetween(x + 2, y - 10, armX, armY)
      .lineBetween(x - 8, y - 8, x - 19, y + 4);
    graphics.lineStyle(2, VERMILION_HEADBAND, 0.9)
      .lineBetween(x - 11, y - 26, x + 4, y - 26)
      .lineBetween(x - 11, y - 26, x - 20, y - 20);
    if (preparing) {
      graphics.lineStyle(3, 0xb0775b, 0.9)
        .lineBetween(armX - 5, armY - 7, armX + 5, armY + 8)
        .lineBetween(armX + 4, armY - 7, armX - 4, armY + 8);
      graphics.lineStyle(2, 0xd76572, 0.55 + progress * 0.3).strokeCircle(armX, armY, 13);
    }
  }

  private drawRoofNetMesh(
    graphics: Phaser.GameObjects.Graphics,
    center: { x: number; y: number },
    width: number,
    height: number,
    angle: number,
    tick: number,
    alpha: number,
  ): void {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const wave = Math.sin(tick * 0.23 + angle) * Math.min(5, halfHeight * 0.12);
    const point = (u: number, v: number) => ({
      x: center.x + halfWidth * u * (0.91 + 0.09 * (1 - v * v)),
      y: center.y + halfHeight * v + wave * (1 - u * u) * (1 - v * v),
    });
    const rope = (u1: number, v1: number, u2: number, v2: number) => {
      const start = point(u1, v1);
      const middle = point((u1 + u2) / 2, (v1 + v2) / 2);
      const end = point(u2, v2);
      graphics.lineStyle(4, 0x0b1c2a, alpha * 0.85)
        .lineBetween(start.x, start.y, middle.x, middle.y).lineBetween(middle.x, middle.y, end.x, end.y);
      graphics.lineStyle(1.7, 0xb0775b, alpha * 0.9)
        .lineBetween(start.x, start.y, middle.x, middle.y).lineBetween(middle.x, middle.y, end.x, end.y);
    };
    // Weighted, slack ropes follow the state-owned occupied rectangle. There
    // is no opaque panel or rigid rectangular frame over the night-market art.
    for (const slope of [-1, 1]) {
      for (let offset = -1.5; offset <= 1.5; offset += 0.5) {
        const startU = Math.max(-1, slope === 1 ? -1 - offset : offset - 1);
        const endU = Math.min(1, slope === 1 ? 1 - offset : offset + 1);
        rope(startU, slope * startU + offset, endU, slope * endU + offset);
      }
    }
    rope(-1, -1, 0, -1); rope(0, -1, 1, -1);
    rope(-1, 1, 0, 1); rope(0, 1, 1, 1);
    rope(-1, -1, -1, 1); rope(1, -1, 1, 1);
    for (const u of [-1, 1]) {
      for (const v of [-1, 1]) {
        const knot = point(u, v);
        graphics.fillStyle(0xb0775b, alpha).fillCircle(knot.x, knot.y, 3.3);
      }
    }
  }

  private drawStrictReferencePursuer(graphics: Phaser.GameObjects.Graphics, state: GrappleState): void {
    if (this.pursuerSprite) {
      this.pursuerSprite.setTexture('pursuer-run').setPosition(state.pursuer.x, state.pursuer.y).setVisible(state.pursuer.visible);
      return;
    }
    const patrolX = state.pursuer.x;
    const patrolY = state.pursuer.y;
    const intensity = 0.45 + state.chase.pressure * 0.55;
    graphics.fillStyle(0x7d183d, 0.08 + state.chase.pressure * 0.18).fillCircle(patrolX, patrolY, 64 + state.chase.pressure * 35);
    for (let index = 0; index < 3; index += 1) {
      const x = patrolX - index * 38;
      const y = patrolY + (index % 2) * 8;
      graphics.fillStyle(CHARACTER_BLUE_BLACK, intensity).fillCircle(x - 2, y - 15, 8);
      graphics.fillStyle(CHARACTER_BLUE_BLACK, intensity).fillTriangle(x - 13, y - 7, x + 14, y - 2, x - 4, y + 13);
      graphics.lineStyle(6, CHARACTER_BLUE_BLACK, intensity)
        .lineBetween(x - 3, y + 8, x - 18, y + 18)
        .lineBetween(x + 2, y + 7, x + 18, y + 14)
        .lineBetween(x + 6, y - 3, x + 15, y + 4);
      graphics.lineStyle(3, VERMILION_HEADBAND, 0.95)
        .lineBetween(x - 10, y - 17, x + 7, y - 14)
        .lineBetween(x - 9, y - 16, x - 16, y - 12);
      this.drawShortLowHeldWeapon(graphics, x + 13, y + 3, intensity);
    }
  }

  private drawShortLowHeldWeapon(graphics: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): void {
    graphics.lineStyle(3, CHARACTER_BLUE_BLACK, alpha).lineBetween(x, y, x + 20, y - 7);
    graphics.lineStyle(2, 0x8b623f, alpha).lineBetween(x + 15, y - 5, x + 21, y - 8);
  }

  private drawStrictReferenceProtagonist(graphics: Phaser.GameObjects.Graphics, x: number, y: number, angle: number): void {
    if (this.protagonistSprite) {
      this.protagonistSprite.setTexture('protagonist-swing').setPosition(x, y).setRotation(angle).setVisible(true);
      return;
    }
    graphics.save();
    graphics.translateCanvas(x, y);
    graphics.rotateCanvas(angle);
    graphics.fillStyle(VERMILION_SCARF, 1).fillTriangle(-7, -7, -24, -4, -10, 1);
    graphics.fillStyle(CHARACTER_BLUE_BLACK, 1).fillCircle(-1, -8, 7);
    graphics.fillStyle(CHARACTER_BLUE_BLACK, 1).fillRoundedRect(-7, -3, 20, 11, 4);
    graphics.lineStyle(5, CHARACTER_BLUE_BLACK, 1)
      .lineBetween(4, 5, -8, 16)
      .lineBetween(8, 5, 19, 12)
      .lineBetween(8, 0, 20, -8);
    graphics.fillStyle(COPPER_WAIST_ACCENT, 1).fillRoundedRect(4, 3, 5, 4, 1);
    graphics.restore();
  }

  private findEligible(state: GrappleState): Anchor | undefined {
    const id = core.getEligibleAnchorId();
    return id ? state.anchors.find((item) => item.id === id) : undefined;
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  transparent: true,
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  render: { antialias: true, roundPixels: false, transparent: true },
  scene: [FlightScene],
});

function refreshScene(): void {
  const scene = game.scene.getScene('flight') as FlightScene | null;
  scene?.refresh();
}

function resetJourney(seed?: number): GrappleState {
  const state = core.resetGame(seed);
  beginNextRun(state);
  refreshScene();
  return state;
}

function dispatchGrapple(edge: GrappleEdge): boolean {
  const before = core.getState();
  const accepted = core.act(edge);
  const after = core.getState();
  if (before.status !== 'playing' && after.status === 'playing') beginNextRun(after);
  refreshScene();
  return accepted;
}

async function claimRevive(): Promise<'granted' | 'not-granted' | 'not-eligible'> {
  const state = core.getState();
  if (state.status !== 'failed' || state.paused || !core.canRewardedRevive() || !failedSettlementCommitted) return 'not-eligible';
  const operation = runtimeSession.beginOperation('revive');
  if (!operation) return 'not-granted';
  setResultCardInteractionLocked(true);
  reviveButton.disabled = true;
  const free = economy.canDailyFreeRevive(Date.now());
  adNote.textContent = free ? '正在保存今日免费复起…' : '正在请求安全复起广告…';
  try {
    if (!free) {
      let result: RewardedAdResult;
      try { result = await ads.showRewarded('revive'); }
      catch { result = { status: 'failed' }; }
      if (!runtimeSession.isCurrent(operation)) return 'not-granted';
      if (result.status === 'completed' || result.status === 'dismissed') interstitialPolicy.recordRewarded(performance.now());
      if (result.status !== 'completed') {
        adNote.textContent = '未看完或广告暂不可用，你仍可直接重新启程。';
        return 'not-granted';
      }
    }
    const latest = core.getState();
    if (!runtimeSession.isCurrent(operation) || latest.status !== 'failed' || latest.paused || !core.canRewardedRevive()) return 'not-eligible';
    const continuation = free ? economy.claimDailyFreeRevive(operation.runId, Date.now()) : economy.resumeRun(operation.runId);
    if (continuation.status !== 'granted' && continuation.status !== 'resumed') {
      adNote.textContent = '复起尚未保存，本次奖励与免费资格均保留；请重试。';
      return 'not-granted';
    }
    if (!core.reviveFromSafeState()) return 'not-eligible';
    failedSettlementCommitted = false;
    failedSettlementResult = null;
    terminalSettlementPending = false;
    adNote.textContent = '安全复起成功，本程已使用复活。';
    persistRun(core.getState());
    return 'granted';
  } catch {
    if (runtimeSession.isCurrent(operation)) adNote.textContent = '广告请求失败，你仍可直接重新启程。';
    return 'not-granted';
  } finally {
    runtimeSession.endOperation(operation);
    if (runtimeSession.isCurrentRun(operation.runId)) {
      reviveButton.disabled = false;
      setResultCardInteractionLocked(false);
      refreshScene();
    }
  }
}

async function claimDoubleWishfire(): Promise<'granted' | 'not-granted' | 'already-claimed'> {
  const state = core.getState();
  if (state.status !== 'won' || state.paused) return 'already-claimed';
  const operation = runtimeSession.beginOperation('double-wishfire');
  if (!operation) return 'already-claimed';
  setResultCardInteractionLocked(true);
  doubleButton.disabled = true;
  adNote.textContent = '正在请求金币奖励广告…';
  try {
    const result = await economy.doubleWishfire(operation.runId);
    if (!runtimeSession.isCurrent(operation)) return 'not-granted';
    if (result.adStatus === 'completed' || result.adStatus === 'dismissed') interstitialPolicy.recordRewarded(performance.now());
    adNote.textContent = result.status === 'granted'
      ? `奖励已发放，当前共 ${economy.getProgress().coins ?? economy.getProgress().wishfire} 金币。`
      : result.status === 'already-claimed'
        ? '本程的双倍金币已领取。'
        : '未看完或广告暂不可用，基础奖励已保留。';
    return result.status;
  } catch {
    if (runtimeSession.isCurrent(operation)) adNote.textContent = '广告请求失败，基础奖励已保留。';
    return 'not-granted';
  } finally {
    runtimeSession.endOperation(operation);
    if (runtimeSession.isCurrentRun(operation.runId)) {
      doubleButton.disabled = false;
      setResultCardInteractionLocked(false);
      refreshScene();
    }
  }
}

async function navigateFromTerminal(showInterstitial: boolean): Promise<void> {
  const terminalState = core.getState();
  if (terminalState.status === 'playing' || terminalNavigationRunId === currentRunId
    || runtimeSession.isOperationActive('revive') || runtimeSession.isOperationActive('double-wishfire')) return;
  if (terminalSettlementPending && terminalSettlementRunId === currentRunId) {
    renderProductUi(terminalState);
    if (terminalSettlementPending) return;
  }
  const departingRunId = currentRunId;
  terminalNavigationRunId = departingRunId;
  setResultCardInteractionLocked(true);
  try {
    // Commit the next run synchronously so rapid taps cannot observe the old
    // terminal state while an optional interstitial is resolving.
    if (currentRunId === departingRunId && core.getState().status !== 'playing') {
      let next = terminalState.status === 'won'
        ? core.continueCampaign()
        : core.resetGame(terminalState.seed + 1);
      if (terminalState.levelId === 'night-patrol' && terminalState.status === 'failed') {
        next = core.restartEndless(terminalState.seed + 1);
      }
      beginNextRun(next);
      refreshScene();
    }
    if (showInterstitial) {
      adNote.textContent = '正在前往下一段夜市路线…';
      const enteringRunId = currentRunId;
      await adFlow.showNaturalTransitionInterstitial(performance.now());
      if (currentRunId === enteringRunId) adNote.textContent = '';
    }
  } finally {
    if (terminalNavigationRunId === departingRunId) terminalNavigationRunId = null;
    if (core.getState().status !== 'playing') setResultCardInteractionLocked(false);
  }
}

async function continueJourney(): Promise<void> {
  await navigateFromTerminal(true);
}

function suspendForBackground(): void {
  backgroundPolicy.hidden();
  cancelOwnedGrapple();
  if (core.getState().status === 'playing' && !core.getState().paused) core.setPaused(true);
  app.dataset.backgroundState = 'suspended';
  adNote.textContent = '页面已暂停，返回后点击暂停键继续；不会补算离线时间。';
  persistRun(core.getState());
  refreshScene();
}

function observeBackgroundVisible(): void {
  backgroundPolicy.visible();
  app.dataset.backgroundState = backgroundPolicy.resumeRequired ? 'resume-required' : 'visible';
  if (backgroundPolicy.resumeRequired && core.getState().status === 'playing') {
    adNote.textContent = '页面已恢复，点击暂停键继续；不会自动补算离线时间。';
  }
}

const progressionMenu = requiredElement<HTMLElement>('[data-ui="progression-menu"]');
const progressionContent = requiredElement<HTMLElement>('[data-ui="progression-content"]');
const progressionNote = requiredElement<HTMLElement>('[data-ui="progression-note"]');
let progressionTab = 'characters';

function renderProgressionMenu(): void {
  const meta = economy.getProgressV2();
  progressionContent.replaceChildren();
  for (const button of progressionMenu.querySelectorAll<HTMLButtonElement>('[data-progression-tab]')) {
    button.setAttribute('aria-pressed', String(button.dataset.progressionTab === progressionTab));
  }
  if (progressionTab === 'characters') {
    for (const character of CHARACTERS) {
      const owned = meta.characters?.includes(character.id);
      const selected = meta.selectedCharacter === character.id || (!meta.selectedCharacter && character.id === CHARACTERS[0]!.id);
      const button = document.createElement('button');
      button.className = 'plain-button';
      button.dataset.characterId = character.id;
      button.dataset.action = owned ? 'select-character' : 'unlock-character';
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = selected || (!owned && meta.coins < character.price);
      button.textContent = `${selected ? '✓ ' : owned ? '○ ' : '🔒 '}${character.id} · ${selected ? '已选择' : owned ? '选择' : character.price + ' 金币'} · 速度 ${character.stats.speed} / 重力 ${character.stats.gravity} / 挂接 ${character.stats.attachRadius}`;
      button.addEventListener('click', () => {
        const result = owned ? economy.selectCharacter(character.id) : economy.unlockCharacter(character.id);
        progressionNote.textContent = result.status === 'selected' ? '已保存，下一程使用所选角色。'
          : result.status === 'unlocked' ? '角色已解锁，可点击选择。' : '操作未保存，金币与选择保持原状。';
        renderProgressionMenu();
      });
      progressionContent.append(button);
    }
  } else if (progressionTab === 'missions') {
    const missions = economy.getActiveMissions();
    for (let index = 0; index < 3; index++) {
      const row = document.createElement('div');
      row.dataset.missionSlot = String(index);
      const mission = missions[index];
      if (!mission) { row.textContent = '✓ 当前可用任务已领取'; progressionContent.append(row); continue; }
      const progress = document.createElement('progress');
      progress.max = mission.target;
      progress.value = Math.min(mission.current, mission.target);
      progress.setAttribute('aria-label', mission.title);
      const button = document.createElement('button');
      button.className = mission.claimable ? 'reward-button' : 'plain-button';
      button.dataset.action = 'claim-mission';
      button.dataset.missionId = mission.id;
      button.disabled = !mission.claimable;
      button.textContent = `${mission.claimable ? '✓ 领取' : '○ '}${mission.title} · ${Math.min(mission.current, mission.target)}/${mission.target} · +${mission.reward} 金币`;
      button.addEventListener('click', () => {
        const result = economy.claimMission(mission.id);
        progressionNote.textContent = result.status === 'claimed' ? `已保存，获得 ${mission.reward} 金币。` : '奖励未入账，请重试。';
        renderProgressionMenu();
        refreshScene();
      });
      row.append(progress, button);
      progressionContent.append(row);
    }
  } else {
    const record = economy.getRecordLedger();
    const list = document.createElement('dl');
    const labels = { runs: '夜巡次数', bestDistanceMeters: '最远里程', lifetimeDistanceMeters: '累计里程', coinsCollected: '拾取金币', highestCombo: '最高连击', skySegments: '天空段' };
    for (const key of Object.keys(labels) as Array<keyof typeof labels>) {
      const term = document.createElement('dt'); term.textContent = labels[key];
      const value = document.createElement('dd'); value.dataset.record = key; value.textContent = String(record[key]);
      list.append(term, value);
    }
    progressionContent.append(list);
  }
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-action="progression"]')) button.addEventListener('click', () => {
  if (orientationBlocked || runtimeSession.isOperationActive('revive') || runtimeSession.isOperationActive('double-wishfire')) return;
  cancelOwnedGrapple();
  core.setPaused(true);
  progressionTab = 'characters';
  progressionNote.textContent = '角色选择在下一程生效；任务由已保存记录结算。';
  renderProgressionMenu();
  progressionMenu.hidden = false;
  refreshScene();
});
for (const button of progressionMenu.querySelectorAll<HTMLButtonElement>('[data-progression-tab]')) button.addEventListener('click', () => {
  progressionTab = button.dataset.progressionTab!;
  renderProgressionMenu();
});
requiredElement<HTMLButtonElement>('[data-action="close-progression"]').addEventListener('click', () => {
  progressionMenu.hidden = true;
  if (core.getState().status !== 'playing') core.setPaused(false);
  refreshScene();
});

requiredElement<HTMLButtonElement>('[data-ui="back"]').addEventListener('click', () => {
  requiredElement<HTMLButtonElement>('[data-action="progression"]').click();
});
for (const item of [talismanButton, firecrackerButton]) {
  item.setAttribute('role', 'button'); item.tabIndex = 0;
  item.addEventListener('keydown', event => {
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); item.click(); }
  });
}
const inputSurface = requiredElement<HTMLButtonElement>('[data-action="grapple"]');
function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('button, a, input, select, textarea, [role="button"], [role="dialog"]'));
}

function gameplayInputBlocked(): boolean {
  const state = core.getState();
  return orientationBlocked || state.paused || state.status !== 'playing';
}

function releaseOwnedGrapple(): void {
  if (activePointerIds.size > 0 || keyboardGrappleHeld) return;
  if (core.getState().inputHeld) dispatchGrapple('release');
}

function cancelOwnedGrapple(): void {
  activePointerIds.clear();
  keyboardGrappleHeld = false;
  if (core.getState().status === 'playing' && !core.getState().paused && core.getState().inputHeld) dispatchGrapple('release');
}

function syncOrientationBlock(): void {
  const nextBlocked = window.matchMedia('(orientation: portrait)').matches;
  if (nextBlocked === orientationBlocked) {
    orientationBlock.hidden = !orientationBlocked;
    return;
  }
  orientationBlocked = nextBlocked;
  app.dataset.orientationBlocked = String(orientationBlocked);
  orientationBlock.hidden = !orientationBlocked;
  if (orientationBlocked) {
    pausedBeforeOrientation = core.getState().paused;
    cancelOwnedGrapple();
    core.setPaused(true);
  } else {
    core.setPaused(backgroundPolicy.resumeRequired ? true : pausedBeforeOrientation);
  }
  refreshScene();
}

inputSurface.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  startFirstInput();
  if (gameplayInputBlocked()) return;
  const wasHeld = activePointerIds.size > 0 || keyboardGrappleHeld;
  activePointerIds.add(event.pointerId);
  inputSurface.setPointerCapture?.(event.pointerId);
  if (!wasHeld) dispatchGrapple('press');
});
inputSurface.addEventListener('pointerup', (event) => {
  event.preventDefault();
  activePointerIds.delete(event.pointerId);
  releaseOwnedGrapple();
});
inputSurface.addEventListener('lostpointercapture', (event) => {
  activePointerIds.delete(event.pointerId);
  releaseOwnedGrapple();
});
inputSurface.addEventListener('pointercancel', (event) => {
  activePointerIds.delete(event.pointerId);
  releaseOwnedGrapple();
});
pauseButton.addEventListener('click', () => {
  if (orientationBlocked || core.getState().status !== 'playing') return;
  const paused = !core.getState().paused;
  if (!paused) progressionMenu.hidden = true;
  cancelOwnedGrapple();
  if (!paused) backgroundPolicy.explicitResume();
  core.setPaused(paused);
  // Keep the generated pause icon node intact; state is conveyed by icon + aria-label.
  pauseButton.setAttribute('aria-label', paused ? '继续' : '暂停');
  playUiElement(pauseButton, 'icon-press');
  refreshScene();
});
window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat || (isInteractiveTarget(event.target) && event.target !== inputSurface)) return;
  startFirstInput();
  if (gameplayInputBlocked()) return;
  event.preventDefault();
  const wasHeld = activePointerIds.size > 0 || keyboardGrappleHeld;
  keyboardGrappleHeld = true;
  if (!wasHeld) dispatchGrapple('press');
});
window.addEventListener('keyup', (event) => {
  if (event.code !== 'Space') return;
  if (!keyboardGrappleHeld) return;
  event.preventDefault();
  keyboardGrappleHeld = false;
  releaseOwnedGrapple();
});
window.addEventListener('blur', suspendForBackground);
window.addEventListener('focus', () => {
  if (document.visibilityState === 'visible') {
    backgroundPolicy.focused();
    app.dataset.backgroundState = backgroundPolicy.resumeRequired ? 'resume-required' : 'visible';
    if (backgroundPolicy.resumeRequired && core.getState().status === 'playing') {
      adNote.textContent = '页面已恢复，点击暂停键继续；不会自动补算离线时间。';
    }
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') suspendForBackground();
  else observeBackgroundVisible();
});
window.addEventListener('pagehide', suspendForBackground);
window.addEventListener('pageshow', observeBackgroundVisible);
window.addEventListener('resize', syncOrientationBlock);
resultScrim.addEventListener('pointerdown', (event) => event.stopPropagation());
resultScrim.addEventListener('pointerup', (event) => event.stopPropagation());

for (const button of resultButtons) {
  button.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    playUiElement(button, 'icon-press');
  });
  button.addEventListener('pointerup', (event) => event.stopPropagation());
}
reviveButton.addEventListener('click', () => void claimRevive());
doubleButton.addEventListener('click', () => void claimDoubleWishfire());
talismanButton.addEventListener('click', () => void useItem('talisman', talismanButton));
firecrackerButton.addEventListener('click', () => void useItem('firecracker', firecrackerButton));
restartButton.addEventListener('click', () => void navigateFromTerminal(false));
continueButton.addEventListener('click', () => void continueJourney());
clearProgressButton.addEventListener('click', () => {
  if (!window.confirm('清除金币、解锁和当前运行进度，回到教学关卡？')) return;
  new LocalProgressStorage().clear();
  runSnapshotStorage.clear();
  window.location.href = `${window.location.pathname}?seed=${querySeed}&fresh=1`;
});

app.dataset.orientationBlocked = String(orientationBlocked);
orientationBlock.hidden = !orientationBlocked;
if (orientationBlocked) {
  pausedBeforeOrientation = core.getState().paused;
  core.setPaused(true);
}
if (document.visibilityState === 'hidden') suspendForBackground();

const prototypeTestApi: PrototypeTestApi = {
  resetGame: resetJourney,
  getState: () => core.getState(),
  act: dispatchGrapple,
  step(seconds = 1 / 120): GrappleState {
    const state = core.step(seconds);
    refreshScene();
    return state;
  },
};

window.__PROTOTYPE_TEST__ = prototypeTestApi;
window.__GAME_TEST__ = {
  ...prototypeTestApi,
  failAtProgress(progress: number): GrappleState {
    const state = core.getState();
    core.setPlayerForTest({ x: state.finishX * Math.max(0, Math.min(1, progress)), y: state.failY + 2 });
    const failed = core.step(1 / 60);
    refreshScene();
    return failed;
  },
  completeForTest(): GrappleState {
    const state = core.loadScenario('event-closing-gate-beat-3');
    core.setPlayerForTest({ x: state.gate.x - 42, y: state.gate.centerY, vx: 720, vy: 0 });
    const completed = core.advanceTicks(24);
    refreshScene();
    return completed;
  },
  collideGateForTest(): GrappleState {
    const state = core.loadScenario('event-closing-gate-beat-3');
    core.setPlayerForTest({
      x: state.gate.x - 50,
      y: state.gate.bottomLeafBounds.y - 8,
      vx: 360,
      vy: 0,
    });
    const collided = core.advanceTicks(1);
    refreshScene();
    return collided;
  },
  queueRewarded(status: RewardedAdResult['status']): void {
    mockAds.queueRewarded({ status });
  },
  claimRevive,
  claimDoubleWishfire,
  getMetaProgress: () => economy.getProgress(),
  driveChaseForTest(seconds: number, mode: 'stall' | 'surge'): GrappleState {
    const stepCount = Math.max(0, Math.ceil(seconds / 0.1));
    for (let index = 0; index < stepCount && core.getState().status === 'playing'; index += 1) {
      const state = core.getState();
      core.setPlayerForTest({
        x: mode === 'stall' ? 520 : state.player.x,
        y: 470,
        vx: mode === 'stall' ? 0 : 620,
        vy: mode === 'stall' ? 0 : -80,
      });
      core.step(0.1);
    }
    if (mode === 'stall' && core.getState().status === 'playing') {
      const current = core.getState();
      // Finish the deterministic stall fixture with a full fixed step inside
      // the real contact envelope; a render-sized step could miss the sweep.
      core.setPlayerForTest({ x: Math.max(72, current.pursuer.x + 1), y: 470, vx: 0, vy: 0 });
      core.step(0.1);
    }
    const driven = core.getState();
    refreshScene();
    return driven;
  },
  setProgressForTest(progress: number): GrappleState {
    const state = core.getState();
    core.setPlayerForTest({
      x: state.finishX * Math.max(0, Math.min(0.95, progress)),
      y: 470,
      vx: 0,
      vy: 0,
    });
    const progressed = core.step(1 / 120);
    refreshScene();
    return progressed;
  },
  getChaseSnapshot: () => ({ ...core.getState().chase }),
  useTalisman: () => core.useTalisman(),
  useFirecracker: () => core.useFirecracker(),
};

window.__FORMAL_TEST__ = {
  contractVersion: 1,
  getManifest: () => core.getManifest(),
  resetGame: resetJourney,
  getState: () => core.getState(),
  act: dispatchGrapple,
  advanceTicks(ticks: number): GrappleState {
    const state = core.advanceTicks(ticks);
    refreshScene();
    return state;
  },
  loadScenario(scenarioId: string): GrappleState {
    const state = core.loadScenario(scenarioId);
    refreshScene();
    return state;
  },
  getEvents: () => core.getEvents(),
};
}

void bootstrap().catch((error: unknown) => {
  const app = document.querySelector<HTMLElement>('#app');
  if (app) app.dataset.uiPreload = 'failed';
  console.error('Night-market bootstrap failed', error);
});
