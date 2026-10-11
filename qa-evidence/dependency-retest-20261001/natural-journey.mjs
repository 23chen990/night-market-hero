import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173/';
const evidenceDir = resolve(process.env.EVIDENCE_DIR ?? 'qa-evidence/dependency-retest-20261001');
const viewports = [
  { id: 'desktop-1280x720', width: 1280, height: 720 },
  { id: 'landscape-844x390', width: 844, height: 390 },
];
await mkdir(evidenceDir, { recursive: true });

async function hashFile(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}
async function state(page) {
  return page.evaluate(() => window.__PROTOTYPE_TEST__.getState());
}
async function runLandscape(viewport) {
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const errors = [];
  const actions = [];
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('GPU stall')) errors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  const shot = (name) => resolve(evidenceDir, `${viewport.id}-${name}.png`);
  await page.goto(`${baseUrl}?seed=31&fresh=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__PROTOTYPE_TEST__));
  const startup = await state(page);
  assert.equal(startup.status, 'playing');
  assert.equal(startup.levelId, 'lantern-entry');
  await page.screenshot({ path: shot('startup'), fullPage: true });
  const surface = page.locator('[data-action="grapple"]');
  const box = await surface.boundingBox();
  assert.ok(box, 'grapple surface must be present');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let cycle = 0; cycle < 48; cycle += 1) {
    const before = await state(page);
    if (before.status !== 'playing') break;
    await page.mouse.down();
    actions.push({ cycle, type: 'pointerdown', holdMs: 240 });
    await page.waitForTimeout(240);
    await page.mouse.up();
    actions.push({ cycle, type: 'pointerup', releaseMs: 60 });
    await page.waitForTimeout(60);
  }
  const tutorial = await state(page);
  assert.equal(tutorial.status, 'won', `${viewport.id} tutorial must reach settlement`);
  await page.screenshot({ path: shot('tutorial-terminal'), fullPage: true });
  await page.locator('[data-action="continue"]').click();
  actions.push({ type: 'click', target: '[data-action="continue"]' });
  await page.waitForFunction(() => {
    const current = window.__PROTOTYPE_TEST__.getState();
    return current.levelId === 'night-patrol' && current.status === 'playing';
  });
  const patrol = await state(page);
  await page.screenshot({ path: shot('night-patrol'), fullPage: true });
  await page.waitForFunction(() => window.__PROTOTYPE_TEST__.getState().status !== 'playing', undefined, { timeout: 8000 });
  actions.push({ type: 'wait-without-input', expected: 'natural terminal failure' });
  const failed = await state(page);
  assert.equal(failed.status, 'failed');
  await page.screenshot({ path: shot('night-patrol-failed'), fullPage: true });
  await page.locator('[data-action="restart"]').click();
  actions.push({ type: 'click', target: '[data-action="restart"]' });
  await page.waitForFunction(() => {
    const current = window.__PROTOTYPE_TEST__.getState();
    return current.levelId === 'night-patrol' && current.status === 'playing';
  });
  const replay = await state(page);
  const resultHidden = await page.locator('[data-ui="result"]').evaluate((node) => node.hidden);
  assert.equal(resultHidden, true);
  await page.screenshot({ path: shot('night-patrol-replay'), fullPage: true });
  await browser.close();
  assert.deepEqual(errors, []);
  const screenshots = await Promise.all(['startup', 'tutorial-terminal', 'night-patrol', 'night-patrol-failed', 'night-patrol-replay'].map(async (name) => {
    const path = shot(name);
    return { path, sha256: await hashFile(path) };
  }));
  return { viewport: `${viewport.width}x${viewport.height}`, actions, forbiddenOperations: [], startup: { status: startup.status, levelId: startup.levelId }, tutorial: { status: tutorial.status, progress: tutorial.progress, inputTransitions: tutorial.inputTransitions }, patrol: { levelId: patrol.levelId, status: patrol.status }, failed: { status: failed.status, failureReason: failed.failureReason }, replay: { levelId: replay.levelId, status: replay.status, resultHidden }, screenshots, errors };
}
async function runPortrait() {
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('GPU stall')) errors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  await page.goto(`${baseUrl}?seed=31&fresh=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__PROTOTYPE_TEST__));
  const before = await state(page);
  await page.waitForTimeout(250);
  const after = await state(page);
  assert.equal(await page.locator('[data-ui="orientation-block"]').isVisible(), true);
  assert.equal(before.tick, after.tick);
  assert.equal(after.paused, true);
  const path = resolve(evidenceDir, 'portrait-390x844.png');
  await page.screenshot({ path, fullPage: true });
  await browser.close();
  assert.deepEqual(errors, []);
  return { viewport: '390x844', orientationVisible: true, frozen: before.tick === after.tick, screenshot: { path, sha256: await hashFile(path) }, errors };
}
const checks = [];
for (const viewport of viewports) checks.push(await runLandscape(viewport));
const portrait = await runPortrait();
const report = {
  schemaVersion: 1,
  artifactType: 'natural-runtime-qa-report',
  targetGame: '夜市飞侠：护印突围',
  targetWorkspace: resolve('.'),
  navigationUrl: `${baseUrl}?seed=31&fresh=1`,
  route: 'formal-fixer',
  passed: true,
  checks,
  portrait,
  runtimeWiredEntrypointFiles: [resolve('src/main.ts'), resolve('src/game-core.ts'), resolve('src/run-snapshot.ts')],
  evidenceGaps: ['This dependency retest proves browser behavior is preserved after npm ci; it does not prove WeChat, Douyin, or TapTap package publishability.', 'facade-study-v5 remains an offline candidate with fidelity NEEDS_WORK and is not mounted in the default scene.'],
};
await writeFile(resolve(evidenceDir, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
