import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, type Page } from '@playwright/test';
import { resolve } from 'node:path';

const url = process.env.DEFAULT_CLEAVE_QA_URL;
assert.ok(url, 'DEFAULT_CLEAVE_QA_URL is required');
const out = resolve(process.env.DEFAULT_CLEAVE_QA_OUT ?? '../../watermelon-game-integration-20261003/qa-default');
await mkdir(out, { recursive: true });
async function state(page: Page) { return page.evaluate(() => window.__GAME_TEST__.getState()); }
async function facts(page: Page) { return page.evaluate(() => window.__GAME_TEST__.getRenderState()); }
async function tap(page: Page): Promise<void> {
  const viewport = page.viewportSize()!;
  if (viewport.width > 500) { await page.mouse.click(viewport.width / 2, viewport.height / 2); return; }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: viewport.width / 2, y: viewport.height * 0.52, radiusX: 4, radiusY: 4 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function naturalViewport(label: string, width: number, height: number, mobile: boolean) {
  const errors: string[] = [];
  const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(url!, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__GAME_TEST__) && window.__GAME_TEST__ === window.__PROTOTYPE_TEST__);
  await page.screenshot({ path: resolve(out, `${label}-ready.png`), fullPage: true });
  let lastTap = -1;
  let firstCut = false;
  let terminal: string | null = null;
  const deadline = Date.now() + 38_000;
  while (Date.now() < deadline) {
    const current = await state(page);
    if (!firstCut) {
      const render = await facts(page);
      const watermelon = render.watermelons.find(item => item.id === 'rune-1');
      if (watermelon?.pieces === 2) {
        firstCut = true;
        await page.waitForTimeout(180);
        const opening = await facts(page);
        const visibleOpening = opening.watermelons.find(item => item.id === 'rune-1')!;
        assert.ok(visibleOpening.opening > 0, `${label}: center-gated halves did not begin their visible opening`);
        await page.screenshot({ path: resolve(out, `${label}-watermelon-opening.png`), fullPage: true });
        assert.equal(visibleOpening.renderer, 'watermelon-cleave');
        assert.deepEqual(visibleOpening.cutPlaneNormal, [0, 0, 1]);
      }
    }
    if (current.status === 'won' || current.status === 'failed') { terminal = current.status; break; }
    const projected = current.player.y + Math.max(0, current.player.vy) * 0.22;
    const shouldTap = current.status === 'ready' || current.status === 'anchored'
      || (current.status === 'airborne' && projected > 345 && current.player.vy > -135);
    if (shouldTap && current.worldTime - lastTap >= 0.15) { await tap(page); lastTap = current.worldTime; }
    await page.waitForTimeout(20);
  }
  assert.equal(firstCut, true, `${label}: default watermelon did not cleave through the center`);
  assert.ok(terminal, `${label}: natural journey did not settle`);
  await page.screenshot({ path: resolve(out, `${label}-terminal.png`), fullPage: true });
  await page.locator('#replay-button').click();
  await page.waitForFunction(() => window.__GAME_TEST__.getState().status === 'ready');
  const replay = await facts(page);
  assert.ok(replay.watermelons.every(item => item.pieces === 1 && item.phase === 'intact'), `${label}: replay kept cleaved melon`);
  await page.screenshot({ path: resolve(out, `${label}-replay.png`), fullPage: true });
  await context.close();
  return { label, firstCut, terminal, replay: true, errors };
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  results.push(await naturalViewport('desktop-1180x720', 1180, 720, false));
  results.push(await naturalViewport('portrait-390x844', 390, 844, true));
  results.push(await naturalViewport('landscape-844x390', 844, 390, true));
} finally { await browser.close(); }
const report = { schemaVersion: 1, artifactType: 'default-watermelon-cleave-natural-qa', targetGame: 'mobile-slice-adaptation-20260830', workspace: resolve('.'), passed: results.every(result => result.firstCut && result.terminal && result.replay && result.errors.length === 0), results, claimBoundary: 'Fresh natural mouse/touch web-lite browser contexts only; native mini-game adapters remain separately unverified.' };
await writeFile(resolve(out, 'natural-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
assert.equal(report.passed, true);
