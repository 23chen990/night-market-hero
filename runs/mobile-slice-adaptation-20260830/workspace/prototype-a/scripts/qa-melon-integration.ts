import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { z } from 'zod';

const out = resolve('../../melon-integration-20261001/qa');
const ReportSchema = z.object({ schemaVersion: z.literal(1), passed: z.boolean(), buildSha256: z.string(),
  entrypoints: z.array(z.string()), results: z.array(z.object({ viewport: z.string(), firstCut: z.boolean(),
    fragments: z.number(), inverted: z.number(), volume: z.number(), maximumShapeError: z.number(),
    settledEnergy: z.number(), terminal: z.string(), replay: z.boolean(), screenshots: z.array(z.string()),
    textureGrowthAfterReplay: z.number(), errors: z.array(z.string()), notes: z.array(z.string()) }).strict()),
  claimBoundary: z.string() }).strict();

async function freePort() { const server = createServer(); await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address(); const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise<void>((r) => server.close(() => r())); return port; }
async function state(page: Page) { return page.evaluate(() => window.__GAME_TEST__.getState()); }
async function render(page: Page) { return page.evaluate(() => window.__GAME_TEST__.getRenderState()); }
async function tap(page: Page) { const size = page.viewportSize()!;
  if (page.context().browser() && size.width !== 1180) await page.touchscreen.tap(size.width * 0.5, size.height * 0.55);
  else await page.mouse.click(size.width * 0.5, size.height * 0.55); }

await mkdir(out, { recursive: true });
const port = await freePort(); const url = `http://127.0.0.1:${port}/`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', 'dist'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] });
const results: z.infer<typeof ReportSchema>['results'] = [];
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) break; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 50)); }
  for (const [name, width, height] of [['desktop', 1180, 720], ['portrait', 390, 844], ['landscape', 844, 390]] as const) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: name !== 'desktop', hasTouch: name !== 'desktop' });
    const page = await context.newPage(); const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.__GAME_TEST__));
    const shots: string[] = [];
    const shot = async (stage: string) => { const path = resolve(out, `${name}-${stage}.png`); await page.screenshot({ path, fullPage: true }); shots.push(path); };
    await shot('intact');
    const initial = await render(page); assert.equal(initial.melons.length, 3);
    assert.equal(initial.cutVisuals.some((item) => item.id === 'rune-1'), false, 'default target must use softbody renderer');
    await tap(page);
    await page.waitForFunction(() => window.__GAME_TEST__.getRenderState().melons.some((item) => item.id === 'rune-1' && item.cutAccepted), { timeout: 5000 });
    await shot('cut');
    let maximumShapeError = 0; let inverted = 0;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(120);
      const melon = (await render(page)).melons.find((item) => item.id === 'rune-1')!;
      maximumShapeError = Math.max(maximumShapeError, melon.shapeError); inverted = Math.max(inverted, melon.inverted);
      if (i === 1) await shot('impact');
    }
    await shot('settled');
    const settled = (await render(page)).melons.find((item) => item.id === 'rune-1')!;
    const notes: string[] = [];
    let lastTap = -10; let terminal = 'timeout';
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      const current = await state(page);
      if (current.status === 'failed' || current.status === 'won') { terminal = current.status; break; }
      const projectedY = current.player.y + Math.max(0, current.player.vy) * 0.2;
      if ((current.status === 'ready' || current.status === 'anchored' || projectedY > 550 && current.player.vy > -125)
          && current.worldTime - lastTap >= 0.14) { await tap(page); lastTap = current.worldTime; }
      await page.waitForTimeout(25);
    }
    await shot('terminal');
    const beforeReplay = await render(page);
    await page.locator('#replay-button').click();
    await page.waitForFunction(() => window.__GAME_TEST__.getState().status === 'ready');
    const replayState = await render(page);
    const replay = replayState.melons.length === 3 && replayState.melons.every((item) => item.pieces === 1 && !item.cutAccepted);
    await shot('replay');
    await tap(page);
    await page.waitForFunction(() => window.__GAME_TEST__.getRenderState().melons.some((item) => item.id === 'rune-1' && item.cutAccepted), { timeout: 5000 });
    const texturesAfter = (await render(page)).resourceCounts.textures;
    const growth = texturesAfter - beforeReplay.resourceCounts.textures;
    if (terminal === 'failed') notes.push('A normal-input failure and replay were observed; win requires the game timing policy.');
    results.push({ viewport: `${width}x${height}`, firstCut: settled.cutAccepted, fragments: settled.pieces,
      inverted, volume: settled.volRatio, maximumShapeError, settledEnergy: settled.ke, terminal, replay,
      screenshots: shots, textureGrowthAfterReplay: growth, errors, notes });
    await context.close();
  }
  const report = ReportSchema.parse({ schemaVersion: 1,
    passed: results.every((item) => item.firstCut && item.fragments === 2 && item.inverted === 0
      && Math.abs(item.volume - 1) < 0.08 && item.maximumShapeError > 0.001 && item.terminal !== 'timeout'
      && item.replay && item.textureGrowthAfterReplay <= 1 && item.errors.length === 0),
    buildSha256: createHash('sha256').update(await readFile('dist/index.html')).digest('hex'),
    entrypoints: ['src/main.ts', 'src/three-world-renderer.ts', 'src/melon-visuals.ts', 'src/melon-softbody.js', 'src/melon-material.ts'],
    results, claimBoundary: 'Fresh contexts and real pointer/touch input only; read-only instrumentation. Browser development evidence; independent pixel review required. Mini-game packages are not validated by this run.' });
  await writeFile(resolve(out, 'natural-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  assert.ok(report.passed, 'natural input integration QA failed; preserve evidence');
} finally { await browser.close(); server.kill('SIGTERM'); }
