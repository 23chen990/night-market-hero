import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:4179/';
const root = path.dirname(fileURLToPath(import.meta.url));
const evidenceDir = path.join(root, 'natural-gate-roof-net-20261003');
await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const runs = [];
for (const viewport of [{ label: 'desktop-1180x720', width: 1180, height: 720 }, { label: 'mobile-844x390', width: 844, height: 390 }]) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page:${error.message}`));
  await page.goto(`${base}?seed=31&fresh=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__PROTOTYPE_TEST__ && window.__FORMAL_TEST__));
  const surface = page.locator('[data-action="grapple"]');
  const box = await surface.boundingBox();
  if (!box) throw new Error('grapple surface missing');
  await page.screenshot({ path: path.join(evidenceDir, `${viewport.label}-startup.png`) });
  const phases = new Set();
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(center.x, center.y);
  for (let cycle = 0; cycle < 45; cycle += 1) {
    await page.mouse.down();
    for (let sample = 0; sample < 12; sample += 1) {
      await page.waitForTimeout(20);
      const state = await page.evaluate(() => window.__PROTOTYPE_TEST__.getState());
      if (state.chaseObstacle?.phase) phases.add(state.chaseObstacle.phase);
      if (state.status !== 'playing') break;
    }
    await page.mouse.up();
    const state = await page.evaluate(() => window.__PROTOTYPE_TEST__.getState());
    if (state.chaseObstacle?.phase) phases.add(state.chaseObstacle.phase);
    if (state.status !== 'playing') break;
    await page.waitForTimeout(60);
  }
  await page.mouse.up();
  const terminal = await page.evaluate(() => window.__PROTOTYPE_TEST__.getState());
  if (terminal.status !== 'won') throw new Error(`${viewport.label} natural run did not reach settlement: ${terminal.status}`);
  await page.locator('[data-ui="result"]').waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(evidenceDir, `${viewport.label}-settlement.png`) });
  // A successful tutorial settlement exposes Continue rather than Restart;
  // clicking it is the normal-input handoff into the replayable patrol loop.
  await page.locator('[data-action="continue"]').click();
  await page.waitForFunction(() => window.__PROTOTYPE_TEST__.getState().status === 'playing');
  const replay = await page.evaluate(() => ({ state: window.__PROTOTYPE_TEST__.getState(), resultHidden: document.querySelector('[data-ui="result"]')?.hidden ?? false }));
  if (!replay.resultHidden) throw new Error(`${viewport.label} result remained visible after replay`);
  await page.screenshot({ path: path.join(evidenceDir, `${viewport.label}-replay.png`) });
  if (errors.length) throw new Error(`${viewport.label} console/page errors: ${errors.join(' | ')}`);
  runs.push({ viewport: viewport.label, terminal: { status: terminal.status, levelId: terminal.levelId, tick: terminal.tick }, replay: { action: 'continue', status: replay.state.status, levelId: replay.state.levelId, resultHidden: replay.resultHidden }, roofNetPhases: [...phases], sceneOwner: await page.locator('#app').getAttribute('data-scene-owner'), errors });
  await page.close();
}
await browser.close();
const report = { schemaVersion: 1, artifactType: 'roof-net-natural-gate', targetGame: '夜市飞侠：护印突围', workspace: path.dirname(root), base, runs };
await writeFile(path.join(root, 'natural-gate-results.json'), JSON.stringify(report, null, 2) + '\\n');
console.log(JSON.stringify(report, null, 2));
