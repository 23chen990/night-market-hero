import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium, type Page } from '@playwright/test';
import { z } from 'zod';

const outputDirectory = resolve(process.env.SLICE_FOOD_QA_ARTIFACT_DIR ?? '../../all-food-melon-20261002-reopen/qa-default');
const ResultSchema = z.object({
  viewport: z.string(),
  firstCut: z.boolean(),
  firstCutRenderer: z.string(),
  firstCutMaterialMode: z.string(),
  fragments: z.number(),
  inverted: z.number(),
  volume: z.number(),
  maximumShapeError: z.number(),
  settledEnergy: z.number(),
  nonMelonStyles: z.array(z.string()),
  terminal: z.enum(['won', 'failed', 'timeout']),
  replay: z.boolean(),
  screenshots: z.array(z.string()),
  errors: z.array(z.string()),
}).strict();
const ReportSchema = z.object({
  schemaVersion: z.literal(1),
  artifactType: z.literal('all-food-melon-natural-qa'),
  targetGame: z.literal('mobile-slice-adaptation-20260830'),
  workspace: z.string(),
  passed: z.boolean(),
  results: z.array(ResultSchema).length(3),
  buildSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  runtimeEntrypoints: z.array(z.string()).min(1),
  claimBoundary: z.string(),
}).strict();

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to reserve a local QA port');
  await new Promise<void>((resolvePromise, reject) => server.close((error) => error ? reject(error) : resolvePromise()));
  return address.port;
}

async function state(page: Page) {
  return page.evaluate(() => window.__GAME_TEST__.getState());
}

async function render(page: Page) {
  return page.evaluate(() => window.__GAME_TEST__.getRenderState());
}

async function makeTapper(page: Page): Promise<() => Promise<void>> {
  const viewport = page.viewportSize();
  assert.ok(viewport);
  if (viewport.width > 500) return async () => page.mouse.click(viewport.width / 2, viewport.height / 2);
  const cdp = await page.context().newCDPSession(page);
  return async () => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: viewport.width / 2, y: viewport.height * 0.52, radiusX: 4, radiusY: 4 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
}

async function runViewport(page: Page, url: string, label: string, tap: () => Promise<void>): Promise<z.infer<typeof ResultSchema>> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  const screenshots: string[] = [];
  const shot = async (name: string) => {
    const path = resolve(outputDirectory, `${label}-${name}.png`);
    await page.screenshot({ path, fullPage: true });
    screenshots.push(path);
  };

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__GAME_TEST__));
  const initial = await render(page);
  assert.ok(initial.melons.some((item) => item.id === 'rune-1' && item.pieces === 1 && item.materialMode === 'watermelon-rich'), `${label}: intact watermelon identity must be preserved`);
  assert.ok(initial.cutVisuals.some((item) => item.foodStyle !== 'melon-jelly' && item.phase === 'intact'));
  await shot('intact');

  await tap();
  await page.waitForFunction(() => window.__GAME_TEST__.getRenderState().melons.some((item) => item.id === 'rune-1' && item.cutAccepted), { timeout: 5_000 });
  await shot('first-cut');
  const firstCut = (await render(page)).melons.find((item) => item.id === 'rune-1')!;
  assert.equal(firstCut.renderer, 'melon-softbody');
  assert.equal(firstCut.materialMode, 'watermelon-rich');
  assert.equal(firstCut.pieces, 2);

  let maximumShapeError = 0;
  let inverted = 0;
  let terminal: 'won' | 'failed' | 'timeout' = 'timeout';
  let lastTap = -10;
  const nonMelonStyles = new Set<string>();
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const current = await state(page);
    const facts = await render(page);
    for (const item of facts.melons) {
      if (!item.cutAccepted) continue;
      maximumShapeError = Math.max(maximumShapeError, item.shapeError);
      inverted = Math.max(inverted, item.inverted);
      assert.equal(item.foodStyle, 'melon-jelly', 'only watermelon uses a watermelon specimen');
    }
    for (const item of facts.cutVisuals.filter((candidate) => candidate.phase === 'cut')) {
      nonMelonStyles.add(item.foodStyle);
      assert.equal(item.renderer, 'authored-softbody'); assert.equal(item.materialMode, 'food-original');
      assert.equal(item.softbody?.kernel, 'watermelon-xpbd'); assert.equal(item.softbody.componentCount, 2);
      if (item.softbody.inverted !== 0 || Math.abs(item.softbody.volRatio - 1) >= 0.08) {
        await writeFile(resolve(outputDirectory, `${label}-body-safety-failure.json`), JSON.stringify({ state: current, offending: item, render: facts }, null, 2));
        await shot('body-safety-failure');
      }
      assert.equal(item.softbody.inverted, 0); assert.ok(Math.abs(item.softbody.volRatio - 1) < 0.08, `${label}: ${item.id}/${item.foodStyle} volume ${item.softbody.volRatio}`);
    }
    if (current.status === 'won' || current.status === 'failed') {
      terminal = current.status;
      break;
    }
    const projectedY = current.player.y + Math.max(0, current.player.vy) * 0.2;
    const shouldTap = current.status === 'ready'
      || current.status === 'anchored'
      || (current.status === 'airborne' && projectedY > 550 && current.player.vy > -125);
    if (shouldTap && current.worldTime - lastTap >= 0.14) {
      await tap();
      lastTap = current.worldTime;
    }
    await page.waitForTimeout(24);
  }
  await shot('terminal');
  const settled = (await render(page)).melons.find((item) => item.id === 'rune-1')!;
  await page.locator('#replay-button').click();
  await page.waitForFunction(() => window.__GAME_TEST__.getState().status === 'ready', { timeout: 5_000 });
  const replayFacts = await render(page);
  const replay = replayFacts.melons.every((item) => item.pieces === 1) && replayFacts.cutVisuals.every((item) => item.phase === 'intact' && !item.softbody);
  assert.equal(replay, true, `${label}: replay did not clear softbody cut entities`);
  await shot('replay');
  return {
    viewport: label,
    firstCut: firstCut.cutAccepted,
    firstCutRenderer: firstCut.renderer,
    firstCutMaterialMode: firstCut.materialMode,
    fragments: settled.pieces,
    inverted,
    volume: settled.volRatio,
    maximumShapeError,
    settledEnergy: settled.ke,
    nonMelonStyles: [...nonMelonStyles].sort(),
    terminal,
    replay,
    screenshots,
    errors,
  };
}

await mkdir(outputDirectory, { recursive: true });
const port = await freePort();
const url = `http://127.0.0.1:${port}/`;
const preview = spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'ignore',
});
const browser = await chromium.launch({ headless: true });
const results: z.infer<typeof ResultSchema>[] = [];
try {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      if ((await fetch(url)).ok) break;
    } catch { /* preview is still starting */ }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 75));
  }
  for (const config of [
    { label: 'desktop-1180x720', width: 1180, height: 720, mobile: false },
    { label: 'portrait-390x844', width: 390, height: 844, mobile: true },
    { label: 'landscape-844x390', width: 844, height: 390, mobile: true },
  ]) {
    const context = await browser.newContext({ viewport: { width: config.width, height: config.height }, isMobile: config.mobile, hasTouch: config.mobile });
    const page = await context.newPage();
    const tap = await makeTapper(page);
    results.push(await runViewport(page, url, config.label, tap));
    await context.close();
  }
} finally {
  await browser.close();
  preview.kill('SIGTERM');
}

const buildSha256 = createHash('sha256').update(await readFile('dist/index.html')).digest('hex');
const report = ReportSchema.parse({
  schemaVersion: 1,
  artifactType: 'all-food-melon-natural-qa',
  targetGame: 'mobile-slice-adaptation-20260830',
  workspace: resolve('.'),
  passed: results.every((result) => result.firstCut
    && result.firstCutRenderer === 'melon-softbody'
    && result.firstCutMaterialMode === 'watermelon-rich'
    && result.fragments === 2
    && result.inverted === 0
    && Math.abs(result.volume - 1) < 0.08
    && result.settledEnergy < 0.01
    && result.maximumShapeError > 0.001
    && result.nonMelonStyles.length > 0
    && result.terminal !== 'timeout'
    && result.replay
    && result.errors.length === 0),
  results,
  buildSha256,
  runtimeEntrypoints: ['src/main.ts', 'src/three-world-renderer.ts', 'src/three-cut-visuals.ts', 'src/melon-visuals.ts', 'src/melon-softbody.js', 'src/melon-material.ts'],
  claimBoundary: 'Fresh desktop, portrait-touch and landscape-touch contexts with normal input; web-lite evidence only. WeChat, Douyin and TapTap package compatibility still needs platform QA.',
});
await writeFile(resolve(outputDirectory, 'natural-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report));
assert.equal(report.passed, true, 'all-food natural QA failed; preserve the report and screenshots');
