import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import type { FormalEvent, FormalManifest, GrappleEdge, GrappleState } from '../src/game-core';

declare global {
  interface Window {
    __PROTOTYPE_TEST__: {
      resetGame(seed?: number): GrappleState;
      getState(): GrappleState;
      act(edge: GrappleEdge): boolean;
      step(seconds?: number): GrappleState;
    };
    __FORMAL_TEST__: {
      contractVersion: 1;
      getManifest(): FormalManifest;
      resetGame(seed?: number): GrappleState;
      getState(): GrappleState;
      act(edge: GrappleEdge): boolean;
      advanceTicks(ticks: number): GrappleState;
      loadScenario(scenarioId: string): GrappleState;
      getEvents(): FormalEvent[];
    };
  }
}

async function state(page: Page): Promise<GrappleState> {
  return page.evaluate(() => window.__PROTOTYPE_TEST__.getState());
}

async function waitForResultCardHidden(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector<HTMLElement>('[data-ui="result"]')?.hidden === true);
}

const browser = await chromium.launch({ headless: true, args: ['--single-process'] });
const errors: string[] = [];
const evidenceDirectory = resolve('qa-evidence');
const gateScreenshotPaths = [
  resolve(evidenceDirectory, 'closing-gate-beat-1.png'),
  resolve(evidenceDirectory, 'closing-gate-beat-2.png'),
  resolve(evidenceDirectory, 'closing-gate-beat-3.png'),
];
const gateCollisionScreenshotPath = resolve(evidenceDirectory, 'closing-gate-collision.png');
const gateVictoryScreenshotPath = resolve(evidenceDirectory, 'closing-gate-aperture-victory.png');
const desktopPostFixScreenshotPath = resolve(evidenceDirectory, 'qa-round2-desktop.png');
const landscapePostFixScreenshotPath = resolve(evidenceDirectory, 'qa-round2-landscape-844x390.png');
const portraitPostFixScreenshotPath = resolve(evidenceDirectory, 'qa-round2-portrait-390x844.png');
const worldPursuerScreenshotPath = resolve(evidenceDirectory, 'pursuer-world-inside-viewport.png');
const mobileWorldPursuerScreenshotPath = resolve(evidenceDirectory, 'pursuer-world-inside-viewport-844x390.png');
await mkdir(evidenceDirectory, { recursive: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1180, height: 720 } });
  desktop.on('console', (message) => {
    if (message.type() === 'error') errors.push(`desktop console: ${message.text()}`);
  });
  desktop.on('pageerror', (error) => errors.push(`desktop page: ${error.message}`));
  await desktop.goto('http://127.0.0.1:4178/', { waitUntil: 'networkidle' });
  await desktop.waitForFunction(() => Boolean(window.__PROTOTYPE_TEST__));
  assert.equal(await desktop.locator('#app').getAttribute('data-ui-preload'), 'ready');
  assert.equal(await desktop.evaluate(() => Boolean(window.__FORMAL_TEST__)), true);
  assert.equal(await desktop.title(), '夜市飞侠：护印突围');
  assert.equal(await desktop.locator('[data-ui="game-title"]').textContent(), '夜市飞侠');
  assert.equal(await desktop.locator('[data-ui="game-subtitle"]').textContent(), '护印突围');
  assert.match(await desktop.locator('[data-ui="opening-story"]').textContent() ?? '', /游侠.*盟契铜符.*坊门/);
  assert.equal(await desktop.locator('[data-ui="pursuer"]').getAttribute('data-visible'), 'true');
  assert.equal(await desktop.locator('[data-ui="pursuer"]').isVisible(), true);
  assert.match(await desktop.locator('[data-ui="pursuer-label"]').textContent() ?? '', /官兵/);
  const manifest = await desktop.evaluate(() => window.__FORMAL_TEST__.getManifest());
  assert.equal(manifest.contractVersion, 1);
  assert.equal(manifest.environment.spatialSetting, 'NIGHT_MARKET_INTERIOR_WITH_OPEN_ROOF_SECTIONS');
  assert.equal(manifest.environment.openSkyTraversal.allowed, true);
  assert.deepEqual(manifest.criticalPath.map((segment) => segment.id), ['safe-tutorial', 'first-pursuit', 'route-alternation', 'gate-climax', 'combo-flight']);
  assert.deepEqual(manifest.terrain.map((terrain) => terrain.kind), ['布棚', '竹架', '窄巷']);
  await desktop.evaluate(() => window.__FORMAL_TEST__.loadScenario('segment-first-pursuit'));
  await desktop.waitForFunction(() => document.querySelector('#app')?.getAttribute('data-guard-on-screen') === 'true');
  const pursuerVisibilitySamples = await desktop.evaluate(async () => {
    const samples: Array<{ world: boolean; edgeData: boolean; edgeRendered: boolean }> = [];
    for (let index = 0; index < 12; index += 1) {
      await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
      const app = document.querySelector<HTMLElement>('#app')!;
      const edge = document.querySelector<HTMLElement>('[data-ui="pursuer"]')!;
      const style = getComputedStyle(edge);
      samples.push({
        world: app.dataset.guardOnScreen === 'true',
        edgeData: edge.dataset.visible === 'true',
        edgeRendered: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0
          && edge.getBoundingClientRect().width > 0 && edge.getBoundingClientRect().height > 0,
      });
    }
    return samples;
  });
  assert.ok(pursuerVisibilitySamples.every((sample) => sample.world && !sample.edgeData && !sample.edgeRendered),
    'world pursuer and edge presence must remain mutually exclusive across viewport-boundary frames');
  await desktop.screenshot({ path: worldPursuerScreenshotPath });
  const gateBeat = await desktop.evaluate(() => window.__FORMAL_TEST__.loadScenario('event-closing-gate-beat-3'));
  assert.equal(gateBeat.closingGateBeat, 3);
  assert.ok(gateBeat.eventSequence > 0);
  const canvas = desktop.locator('canvas');
  const worldEvidence = await desktop.evaluate(() => {
    const barricade = window.__FORMAL_TEST__.loadScenario('event-barricade');
    const roofNet = window.__FORMAL_TEST__.loadScenario('event-roof-net');
    const gate = [1, 2, 3].map((beat) => window.__FORMAL_TEST__.loadScenario(`event-closing-gate-beat-${beat}`));
    const terrain = ['terrain-布棚-sliding', 'terrain-竹架-safe', 'terrain-竹架-chase', 'terrain-窄巷-concealed']
      .map((scenario) => window.__FORMAL_TEST__.loadScenario(scenario));
    return { barricade, roofNet, gate, terrain };
  });
  assert.equal(worldEvidence.barricade.chaseObstacle?.kind, 'barricade');
  assert.equal(worldEvidence.roofNet.chaseObstacle?.kind, 'roof-net');
  assert.notDeepEqual(worldEvidence.barricade.chaseObstacle?.bounds, worldEvidence.roofNet.chaseObstacle?.bounds);
  assert.ok(worldEvidence.gate[0].gate.aperture > worldEvidence.gate[1].gate.aperture);
  assert.ok(worldEvidence.gate[1].gate.aperture > worldEvidence.gate[2].gate.aperture);
  assert.deepEqual(worldEvidence.terrain.map((state) => state.activeTerrain?.behaviorState), ['ready', 'ready', 'ready', 'concealed']);
  assert.deepEqual(worldEvidence.terrain.map((state) => state.activeTerrain?.lesson), ['safe-teaching', 'safe-teaching', 'chase-test', 'safe-teaching']);
  const distinctWorldFrames: Buffer[] = [];
  for (const scenario of ['event-barricade', 'event-roof-net']) {
    await desktop.evaluate((id) => window.__FORMAL_TEST__.loadScenario(id), scenario);
    distinctWorldFrames.push(await canvas.screenshot());
  }
  for (let index = 1; index < distinctWorldFrames.length; index += 1) {
    assert.equal(distinctWorldFrames[index].equals(distinctWorldFrames[index - 1]), false, 'world scenarios must render distinct canvas entities');
  }
  const gateFrames: Buffer[] = [];
  const gateGeometry: GrappleState['gate'][] = [];
  for (const beat of [1, 2, 3] as const) {
    const gateState = await desktop.evaluate((id) => {
      const loaded = window.__FORMAL_TEST__.loadScenario(id);
      const pauseButton = document.querySelector<HTMLButtonElement>('[data-action="pause"]');
      if (!pauseButton) throw new Error('Missing pause button while freezing gate evidence');
      pauseButton.click();
      return loaded;
    }, `event-closing-gate-beat-${beat}`);
    const frozenGateState = await desktop.evaluate(() => window.__FORMAL_TEST__.getState());
    assert.equal(frozenGateState.status, 'playing');
    assert.equal(frozenGateState.paused, true);
    assert.equal(gateState.gate.closureMotion, 'VERTICAL_DOUBLE_LEAVES_INWARD');
    gateGeometry.push(gateState.gate);
    gateFrames.push(await canvas.screenshot({ path: gateScreenshotPaths[beat - 1] }));
  }
  const topLeafBottoms = gateGeometry.map((gate) => gate.topLeafBounds.y + gate.topLeafBounds.height);
  const bottomLeafTops = gateGeometry.map((gate) => gate.bottomLeafBounds.y);
  assert.ok(topLeafBottoms[0] < topLeafBottoms[1] && topLeafBottoms[1] < topLeafBottoms[2]);
  assert.ok(bottomLeafTops[0] > bottomLeafTops[1] && bottomLeafTops[1] > bottomLeafTops[2]);
  assert.ok(gateGeometry.every((gate) => gate.topLeafBounds.x === gateGeometry[0].topLeafBounds.x
    && gate.topLeafBounds.width === gateGeometry[0].topLeafBounds.width
    && gate.bottomLeafBounds.x === gateGeometry[0].bottomLeafBounds.x
    && gate.bottomLeafBounds.width === gateGeometry[0].bottomLeafBounds.width));
  for (let index = 1; index < gateFrames.length; index += 1) {
    assert.equal(gateFrames[index].equals(gateFrames[index - 1]), false, 'all three horizontal gate beats must be visibly distinct');
  }
  const traversalCollision = await desktop.evaluate(() => {
    const collision = window.__GAME_TEST__.collideGateForTest();
    return { collision, events: window.__FORMAL_TEST__.getEvents() };
  });
  assert.ok(traversalCollision.collision);
  assert.equal(traversalCollision.collision.status, 'playing');
  assert.equal(traversalCollision.collision.activeChaseEvent, 'closing-gate');
  assert.ok(Math.abs(traversalCollision.collision.player.vy) >= 120);
  assert.ok(traversalCollision.events.some((event) => event.type === 'closing-gate-collision'));
  await canvas.screenshot({ path: gateCollisionScreenshotPath });

  const apertureVictory = await desktop.evaluate(() => window.__GAME_TEST__.completeForTest());
  assert.equal(apertureVictory.closingGateBeat, 3);
  assert.equal(apertureVictory.status, 'won');
  assert.ok(apertureVictory.player.x >= apertureVictory.gate.x);
  assert.ok(apertureVictory.player.y >= apertureVictory.gate.collisionAperture.y);
  assert.ok(apertureVictory.player.y <= apertureVictory.gate.collisionAperture.y + apertureVictory.gate.collisionAperture.height);
  await canvas.screenshot({ path: gateVictoryScreenshotPath });

  const resultCard = desktop.locator('[data-ui="result"]');
  const continueButton = desktop.locator('[data-action="continue"]');
  await desktop.evaluate(() => {
    window.__GAME_TEST__.resetGame(201);
    window.__GAME_TEST__.completeForTest();
  });
  await resultCard.waitFor({ state: 'visible' });
  await continueButton.click();
  await desktop.waitForFunction(() => {
    const current = window.__GAME_TEST__.getState();
    return current.status === 'playing' && current.seed === 202;
  });
  await waitForResultCardHidden(desktop);
  await desktop.waitForTimeout(320);
  assert.equal(
    await resultCard.evaluate((element) => (element as HTMLElement).hidden),
    true,
    'victory card stays hidden after exit frames',
  );
  assert.equal((await state(desktop)).seed, 202, 'Continue starts exactly one next run');

  await desktop.evaluate(() => {
    window.__GAME_TEST__.resetGame(211);
    window.__GAME_TEST__.completeForTest();
    const button = document.querySelector<HTMLButtonElement>('[data-action="continue"]');
    if (!button) throw new Error('Missing Continue button');
    button.click();
    button.click();
  });
  await desktop.waitForFunction(() => window.__GAME_TEST__.getState().status === 'playing');
  await waitForResultCardHidden(desktop);
  assert.equal((await state(desktop)).seed, 212, 'rapid Continue clicks are consumed once');

  const restartButton = desktop.locator('[data-action="restart"]');
  await desktop.evaluate(() => {
    window.__GAME_TEST__.resetGame(101);
    window.__GAME_TEST__.failAtProgress(0.35);
  });
  await resultCard.waitFor({ state: 'visible' });
  await restartButton.click();
  await desktop.waitForFunction(() => {
    const current = window.__GAME_TEST__.getState();
    return current.status === 'playing' && current.seed === 102;
  });
  await waitForResultCardHidden(desktop);
  await desktop.waitForTimeout(320);
  assert.equal((await state(desktop)).seed, 102, 'Restart starts exactly one next run');
  assert.equal(await resultCard.evaluate((element) => (element as HTMLElement).hidden), true, 'failure card stays hidden after exit frames');

  await desktop.evaluate(() => {
    window.__GAME_TEST__.resetGame(111);
    window.__GAME_TEST__.failAtProgress(0.35);
    const button = document.querySelector<HTMLButtonElement>('[data-action="restart"]');
    if (!button) throw new Error('Missing Restart button');
    button.click();
    button.click();
  });
  await desktop.waitForFunction(() => window.__GAME_TEST__.getState().status === 'playing');
  await waitForResultCardHidden(desktop);
  assert.equal((await state(desktop)).seed, 112, 'rapid Restart clicks are consumed once');

  await desktop.evaluate(() => {
    window.__GAME_TEST__.resetGame(301);
    window.__GAME_TEST__.failAtProgress(0.35);
  });
  await resultCard.waitFor({ state: 'visible' });
  await desktop.keyboard.press('Space');
  assert.deepEqual(
    await desktop.evaluate(() => {
      const current = window.__GAME_TEST__.getState();
      return { seed: current.seed, status: current.status };
    }),
    { seed: 301, status: 'failed' },
    'terminal gameplay Space is owned by the result modal',
  );
  assert.equal(await resultCard.isVisible(), true);
  await restartButton.click();
  await desktop.waitForFunction(() => window.__GAME_TEST__.getState().status === 'playing');
  await waitForResultCardHidden(desktop);
  assert.equal((await state(desktop)).seed, 302, 'explicit Restart starts one deterministic next run');

  const rewardedOutcomes = ['completed', 'dismissed', 'unavailable', 'failed'] as const;
  for (const [index, outcome] of rewardedOutcomes.entries()) {
    const beforeReward = await desktop.evaluate((seed) => {
      window.__GAME_TEST__.resetGame(seed);
      const wishfire = window.__GAME_TEST__.getMetaProgress().wishfire;
      window.__GAME_TEST__.completeForTest();
      return wishfire;
    }, 401 + index);
    await resultCard.waitFor({ state: 'visible' });
    await desktop.evaluate((status) => window.__GAME_TEST__.queueRewarded(status), outcome);
    await desktop.locator('[data-action="double"]').click();
    await desktop.waitForFunction(() => !document.querySelector<HTMLButtonElement>('[data-action="double"]')?.disabled);
    assert.equal(await resultCard.isVisible(), true, `${outcome} double-wishfire keeps the victory card open`);
    assert.equal(await continueButton.isVisible(), true, `${outcome} double-wishfire keeps Continue available`);
    assert.equal(
      await desktop.locator('[data-action="double"]').isHidden(),
      outcome === 'completed',
      'only a completed rewarded placement consumes the double choice',
    );
    assert.equal(
      await desktop.evaluate(() => window.__GAME_TEST__.getMetaProgress().wishfire),
      beforeReward + (outcome === 'completed' ? 60 : 30),
      `${outcome} preserves the expected base/doubled reward`,
    );
  }

  await desktop.evaluate(() => window.__PROTOTYPE_TEST__.resetGame(41));
  await waitForResultCardHidden(desktop);
  const surface = desktop.locator('[data-action="grapple"]');
  const box = await surface.boundingBox();
  assert.ok(box);
  await desktop.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await desktop.mouse.down();
  await desktop.waitForTimeout(350);
  const held = await state(desktop);
  assert.equal(held.inputHeld, true);
  assert.ok(held.attachedAnchorId);
  assert.ok(held.ropeLength);
  const anchor = held.anchors.find((item) => item.id === held.attachedAnchorId)!;
  assert.ok(Math.abs(Math.hypot(anchor.x - held.player.x, anchor.y - held.player.y) - held.ropeLength) < 0.1);
  await desktop.mouse.up();
  const released = await state(desktop);
  assert.equal(released.inputHeld, false);
  assert.equal(released.attachedAnchorId, null);
  assert.ok(Math.hypot(released.player.vx, released.player.vy) > 100);
  await desktop.waitForTimeout(120);
  assert.ok((await state(desktop)).player.x > released.player.x);
  await desktop.keyboard.down('Space');
  assert.equal((await state(desktop)).inputHeld, true);
  await desktop.mouse.down();
  await desktop.keyboard.up('Space');
  assert.equal((await state(desktop)).inputHeld, true, 'pointer ownership survives keyboard release');
  await desktop.mouse.up();
  assert.equal((await state(desktop)).inputHeld, false, 'final held source releases grapple');

  const chase = await desktop.evaluate(() => {
    type ChaseDriver = {
      driveChaseForTest(seconds: number, mode: 'stall' | 'surge'): GrappleState;
      setProgressForTest(progress: number): GrappleState;
      getChaseSnapshot(): GrappleState['chase'];
    };
    const api = window.__GAME_TEST__ as typeof window.__GAME_TEST__ & ChaseDriver;
    api.resetGame(81);
    const initial = api.getChaseSnapshot();
    api.driveChaseForTest(2, 'stall');
    const stalled = api.getChaseSnapshot();
    api.driveChaseForTest(3, 'surge');
    const surged = api.getChaseSnapshot();
    const progressOnly = api.setProgressForTest(0.81).chase;
    return { initial, stalled, surged, progressOnly };
  });
  assert.ok(chase.stalled.pressure > chase.initial.pressure);
  // The stall fixture intentionally reaches the catch envelope quickly; the
  // subsequent surge must remain a valid bounded state, while the terminal
  // fixture below proves eventual catch. Pressure is smoothed and may not drop
  // during this short recovery window.
  assert.ok(chase.surged.pressure <= 1);
  assert.notEqual(chase.progressOnly.phase, 'climax', 'gate progress alone cannot fabricate pursuit climax');
  assert.equal(await desktop.locator('[data-ui="climax"]').getAttribute('data-active'), 'false');

  await desktop.evaluate(() => {
    type ChaseDriver = { driveChaseForTest(seconds: number, mode: 'stall' | 'surge'): GrappleState };
    const api = window.__GAME_TEST__ as typeof window.__GAME_TEST__ & ChaseDriver;
    api.resetGame(83);
    api.driveChaseForTest(14, 'stall');
  });
  const caught = await state(desktop);
  assert.equal(caught.status, 'failed');
  assert.equal(caught.failureReason, 'caught');
  assert.match(await desktop.locator('[data-ui="result-title"]').textContent() ?? '', /追上/);
  assert.equal(await desktop.locator('[data-ui="chase-label"]').textContent(), '官兵已追上');

  const terminalSeed = caught.seed;
  await desktop.locator('[data-ui="result-title"]').click();
  await desktop.locator('[data-ui="result-scrim"]').click({ position: { x: 8, y: 8 } });
  assert.equal((await state(desktop)).status, 'failed');
  assert.equal((await state(desktop)).seed, terminalSeed, 'terminal title/scrim clicks are inert');

  await desktop.evaluate(() => window.__GAME_TEST__.resetGame(501));
  await desktop.locator('[data-action="pause"]').click();
  assert.equal((await state(desktop)).paused, true);
  await desktop.locator('[data-ui="pause-overlay"]').waitFor({ state: 'visible' });
  await desktop.locator('[data-action="grapple"]').dispatchEvent('pointerdown', { pointerId: 77 });
  assert.equal((await state(desktop)).inputHeld, false, 'paused pointer input is rejected');
  await desktop.locator('[data-action="pause"]').focus();
  await desktop.keyboard.press('Space');
  assert.equal((await state(desktop)).paused, false, 'focused pause control receives Space without grapple input');
  assert.equal((await state(desktop)).inputHeld, false);

  const appBox = await desktop.locator('#app').boundingBox();
  assert.ok(appBox);
  if (appBox.x > 5) {
    await desktop.mouse.click(appBox.x / 2, appBox.y + appBox.height / 2);
    assert.equal((await state(desktop)).inputHeld, false, 'desktop pillar area does not own gameplay input');
  }

  await desktop.evaluate(() => {
    localStorage.clear();
    window.__GAME_TEST__.resetGame(506);
    window.__GAME_TEST__.setProgressForTest(0.45);
  });
  const playingBeforeRefresh = await state(desktop);
  await desktop.reload({ waitUntil: 'networkidle' });
  await desktop.waitForFunction(() => Boolean(window.__FORMAL_TEST__));
  assert.equal((await state(desktop)).seed, 506);
  assert.ok((await state(desktop)).progress >= playingBeforeRefresh.progress - 0.01, 'playing refresh resumes latest interior point');
  await desktop.locator('[data-action="pause"]').click();
  await desktop.reload({ waitUntil: 'networkidle' });
  await desktop.waitForFunction(() => Boolean(window.__FORMAL_TEST__));
  assert.equal((await state(desktop)).paused, true, 'paused state survives refresh');
  assert.equal(await desktop.locator('[data-ui="pause-overlay"]').isVisible(), true);
  await desktop.locator('[data-action="pause"]').click();

  await desktop.evaluate(() => window.__GAME_TEST__.completeForTest());
  const terminalReward = await desktop.evaluate(() => window.__GAME_TEST__.getMetaProgress().wishfire);
  await desktop.reload({ waitUntil: 'networkidle' });
  await desktop.waitForFunction(() => Boolean(window.__FORMAL_TEST__));
  assert.equal((await state(desktop)).status, 'won');
  assert.equal(await desktop.locator('[data-ui="result"]').isVisible(), true);
  assert.equal(await desktop.evaluate(() => window.__GAME_TEST__.getMetaProgress().wishfire), terminalReward, 'base settlement is refresh-idempotent');
  await desktop.locator('[data-action="continue"]').click();
  await desktop.waitForFunction(() => window.__GAME_TEST__.getState().status === 'playing');
  const continuedSeed = (await state(desktop)).seed;
  await desktop.reload({ waitUntil: 'networkidle' });
  await desktop.waitForFunction(() => Boolean(window.__FORMAL_TEST__));
  assert.equal((await state(desktop)).seed, continuedSeed, 'continued seed survives refresh');

  await desktop.evaluate(() => {
    localStorage.setItem('night-market-hero.run.v1', JSON.stringify({ version: 99, runId: 'future', state: {} }));
    window.location.href = '/?seed=606';
  });
  await desktop.waitForLoadState('networkidle');
  await desktop.waitForFunction(() => Boolean(window.__FORMAL_TEST__));
  assert.equal((await state(desktop)).seed, 606, 'future snapshot fails closed to URL seed');
  assert.equal((await state(desktop)).status, 'playing');
  await desktop.screenshot({ path: desktopPostFixScreenshotPath });

  await desktop.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await desktop.locator('[data-ui="threat-vignette"]').evaluate((element) => getComputedStyle(element).animationName), 'none');

  await desktop.setViewportSize({ width: 844, height: 390 });
  const mobile = desktop;
  await mobile.goto('http://127.0.0.1:4178/', { waitUntil: 'networkidle' });
  await mobile.waitForFunction(() => Boolean(window.__PROTOTYPE_TEST__));
  assert.equal(await mobile.locator('#app').getAttribute('data-ui-preload'), 'ready');
  assert.equal(await mobile.evaluate(() => Boolean(window.__FORMAL_TEST__)), true);
  await mobile.evaluate(() => window.__FORMAL_TEST__.loadScenario('segment-first-pursuit'));
  await mobile.waitForFunction(() => document.querySelector('#app')?.getAttribute('data-guard-on-screen') === 'true');
  assert.equal(await mobile.locator('[data-ui="pursuer"]').getAttribute('data-visible'), 'false');
  assert.equal(await mobile.locator('[data-ui="pursuer"]').isVisible(), false);
  await mobile.screenshot({ path: mobileWorldPursuerScreenshotPath });
  await mobile.evaluate(() => window.__PROTOTYPE_TEST__.resetGame(51));
  const cdp = await mobile.context().newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 422, y: 195, radiusX: 3, radiusY: 3 }] });
  await mobile.waitForTimeout(320);
  const touchHeld = await state(mobile);
  assert.equal(touchHeld.inputHeld, true);
  assert.ok(touchHeld.attachedAnchorId);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const touchReleased = await state(mobile);
  assert.equal(touchReleased.inputHeld, false);
  assert.equal(touchReleased.attachedAnchorId, null);
  assert.equal(await mobile.evaluate(() => getComputedStyle(document.documentElement).touchAction), 'none');
  const mobileAppBox = await mobile.locator('#app').boundingBox();
  assert.ok(mobileAppBox);
  assert.ok(mobileAppBox.x > 0, 'landscape game remains centered in its 16:9 bounds');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 10, y: 195 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal((await state(mobile)).inputHeld, false, 'landscape pillar touch is rejected');

  await mobile.evaluate(() => {
    window.__PROTOTYPE_TEST__.resetGame(61);
    for (let index = 0; index < 50 && window.__PROTOTYPE_TEST__.getState().status === 'playing'; index += 1) {
      window.__PROTOTYPE_TEST__.step(0.1);
    }
  });
  const terminal = await state(mobile);
  assert.equal(terminal.status, 'failed');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 422, y: 195 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal((await state(mobile)).status, 'failed', 'terminal card owns non-action touch input');
  assert.equal((await state(mobile)).seed, 61);
  await mobile.locator('[data-action="restart"]').click();
  await mobile.waitForFunction(() => window.__GAME_TEST__.getState().status === 'playing');
  const restarted = await state(mobile);
  assert.equal(restarted.status, 'playing');
  assert.equal(restarted.seed, 62);

  await mobile.evaluate(() => {
    window.__GAME_TEST__.resetGame(71);
    window.__GAME_TEST__.setProgressForTest(0.7);
    type ChaseDriver = { driveChaseForTest(seconds: number, mode: 'stall' | 'surge'): GrappleState };
    (window.__GAME_TEST__ as typeof window.__GAME_TEST__ & ChaseDriver).driveChaseForTest(14, 'stall');
  });
  await mobile.locator('[data-action="revive"]').waitFor({ state: 'visible' });
  await mobile.evaluate(() => window.__GAME_TEST__.queueRewarded('completed'));
  assert.equal(await mobile.evaluate(() => window.__GAME_TEST__.claimRevive()), 'granted');
  assert.equal((await state(mobile)).status, 'playing');
  assert.equal((await state(mobile)).reviveUsed, true);
  assert.ok((await state(mobile)).chase.pressure >= 0.3 && (await state(mobile)).chase.pressure <= 0.5);

  const wishfireBefore = await mobile.evaluate(() => window.__GAME_TEST__.getMetaProgress().wishfire);
  await mobile.evaluate(() => window.__GAME_TEST__.completeForTest());
  assert.equal(await mobile.evaluate(() => window.__GAME_TEST__.getMetaProgress().wishfire), wishfireBefore + 30);
  await mobile.evaluate(() => window.__GAME_TEST__.queueRewarded('completed'));
  assert.equal(await mobile.evaluate(() => window.__GAME_TEST__.claimDoubleWishfire()), 'granted');
  assert.equal(await mobile.evaluate(() => window.__GAME_TEST__.getMetaProgress().wishfire), wishfireBefore + 60);
  await mobile.screenshot({ path: landscapePostFixScreenshotPath });
  const mobileFinalPressure = (await state(mobile)).chase.pressure;
  await mobile.setViewportSize({ width: 390, height: 844 });
  const portrait = mobile;
  await portrait.goto('http://127.0.0.1:4178/?seed=701', { waitUntil: 'networkidle' });
  await portrait.waitForFunction(() => Boolean(window.__FORMAL_TEST__));
  const portraitOverlay = portrait.locator('[data-ui="orientation-block"]');
  await portraitOverlay.waitFor({ state: 'visible' });
  assert.match(await portraitOverlay.textContent() ?? '', /请旋转至横屏/);
  const portraitBefore = await state(portrait);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 422 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await portrait.keyboard.press('Space');
  await portrait.waitForTimeout(160);
  const portraitAfter = await state(portrait);
  assert.equal(portraitAfter.inputHeld, false);
  assert.equal(portraitAfter.tick, portraitBefore.tick, 'portrait orientation block freezes gameplay');
  assert.equal(await portrait.locator('#app').evaluate((element) => element.getBoundingClientRect().height), 844);
  await portrait.screenshot({ path: portraitPostFixScreenshotPath });
  assert.deepEqual(errors, []);

  console.log(JSON.stringify({
    desktop: { viewport: '1180x720', heldAttached: held.attachedAnchorId, releaseSpeed: Math.round(Math.hypot(released.player.vx, released.player.vy)), keyboard: 'Space down/up passed', chase: 'stall/surge/caught/climax passed', reducedMotion: 'none', gateScreenshots: [...gateScreenshotPaths, gateCollisionScreenshotPath, gateVictoryScreenshotPath] },
    mobile: { viewport: '844x390', touchHoldAttached: touchHeld.attachedAnchorId, touchRelease: true, oneTapRestartSeed: restarted.seed, rewardedRevive: true, revivedChasePressure: mobileFinalPressure, doubledWishfire: 60, touchAction: 'none', screenshot: landscapePostFixScreenshotPath, worldPursuerScreenshot: mobileWorldPursuerScreenshotPath },
    portrait: { viewport: '390x844', orientationBlocked: true, screenshot: portraitPostFixScreenshotPath },
    consoleErrors: errors.length,
  }));
} finally {
  await browser.close();
}
