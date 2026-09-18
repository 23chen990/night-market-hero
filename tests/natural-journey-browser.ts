import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const evidenceDir = resolve('qa-evidence/natural-gate-fix');
await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1180, height: 720 } });
  await desktop.addInitScript(() => localStorage.clear());
  await desktop.goto('http://127.0.0.1:4178/?seed=31', { waitUntil: 'networkidle' });
  await desktop.waitForFunction(() => Boolean(window.__GAME_TEST__));

  const startup = await desktop.evaluate(() => window.__GAME_TEST__.getState());
  assert.equal(startup.levelId, 'lantern-entry');
  assert.equal(startup.levelCount, 2);

  const coinsBefore = await desktop.evaluate(() => window.__GAME_TEST__.getMetaProgress().coins);
  await desktop.evaluate(() => window.__GAME_TEST__.completeForTest());
  await desktop.locator('[data-ui="result"]').waitFor({ state: 'visible' });
  const coinsAfter = await desktop.evaluate(() => window.__GAME_TEST__.getMetaProgress().coins);
  // Settlement is now fixed pickup coins plus one reward for the crossed gate;
  // the deterministic completion fixture collects no pickup, so this is 8.
  assert.equal(coinsAfter, coinsBefore + 8);

  await desktop.locator('[data-action="continue"]').click();
  await desktop.waitForFunction(() => window.__GAME_TEST__.getState().levelId === 'night-patrol');
  assert.equal(await desktop.locator('[data-ui="result"]').evaluate((node) => (node as HTMLElement).hidden), true);

  await desktop.evaluate(() => window.__GAME_TEST__.driveChaseForTest(8, 'surge'));
  const gate = await desktop.evaluate(() => window.__GAME_TEST__.getState());
  assert.equal(gate.levelId, 'night-patrol');
  assert.equal(gate.status, 'playing');
  assert.ok(gate.segmentIndex >= 2);
  assert.equal(await desktop.locator('[data-ui="result"]').evaluate((node) => (node as HTMLElement).hidden), true);
  await desktop.screenshot({ path: resolve(evidenceDir, 'desktop-night-patrol-gate.png') });

  await desktop.evaluate(() => window.__GAME_TEST__.driveChaseForTest(14, 'stall'));
  await desktop.locator('[data-ui="result"]').waitFor({ state: 'visible' });
  assert.equal((await desktop.evaluate(() => window.__GAME_TEST__.getState())).status, 'failed');
  await desktop.locator('[data-action="restart"]').click();
  const replay = await desktop.evaluate(() => ({
    state: window.__GAME_TEST__.getState(),
    hidden: document.querySelector<HTMLElement>('[data-ui="result"]')!.hidden,
  }));
  assert.equal(replay.state.status, 'playing');
  assert.equal(replay.state.levelId, 'night-patrol');
  assert.equal(replay.hidden, true);
  await desktop.screenshot({ path: resolve(evidenceDir, 'desktop-replay.png') });

  const portrait = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await portrait.addInitScript(() => localStorage.clear());
  await portrait.goto('http://127.0.0.1:4178/?seed=31', { waitUntil: 'networkidle' });
  await portrait.waitForFunction(() => Boolean(window.__GAME_TEST__));
  const portraitBefore = await portrait.evaluate(() => window.__GAME_TEST__.getState());
  await portrait.waitForTimeout(250);
  const portraitAfter = await portrait.evaluate(() => window.__GAME_TEST__.getState());
  assert.equal(await portrait.locator('[data-ui="orientation-block"]').isVisible(), true);
  assert.equal(portraitBefore.tick, portraitAfter.tick);
  assert.equal(portraitAfter.paused, true);
  await portrait.screenshot({ path: resolve(evidenceDir, 'portrait-390x844.png') });

  console.log(JSON.stringify({
    passed: true,
    startup: { levelId: startup.levelId, levelCount: startup.levelCount },
    tutorialSettlementCoins: coinsAfter - coinsBefore,
    gate: { levelId: gate.levelId, segmentIndex: gate.segmentIndex, status: gate.status, resultHidden: true },
    replay: { levelId: replay.state.levelId, status: replay.state.status, resultHidden: replay.hidden },
    portrait: { viewport: '390x844', orientationBlocked: true, frozen: portraitBefore.tick === portraitAfter.tick },
  }, null, 2));
} finally {
  await browser.close();
}
