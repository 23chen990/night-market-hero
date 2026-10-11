import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import { z } from 'zod';
import type { CleaveState } from '../src/watermelon-cleave';

type Facts = CleaveState & { speed: number; bladeEdgeWorld: number[]; drawCalls: number };
interface Capture { facts: Facts; png: string; wallMilliseconds: number }
declare global {
  interface Window { __CLEAVE_CAPTURE__: { frames: Capture[]; trace: { facts: Facts; wallMilliseconds: number }[] } }
}
async function observeCleave(page: Page, expectedCycles: number): Promise<void> {
  await page.evaluate(({ expectedCycles }) => {
    window.__CLEAVE_CAPTURE__ = { frames: [], trace: [] };
    const goals = [0.015, 0.095, 0.175, 0.21, 0.23, 0.28, 0.35, 0.45, 0.65, 0.85, 1.05];
    let goal = 0, startWall = 0;
    const capture = (now: number) => {
      const facts = window.__WATERMELON_DEMO__.getState();
      if (facts.cycles === expectedCycles) {
        if (!startWall) startWall = now;
        const wallMilliseconds = now - startWall;
        window.__CLEAVE_CAPTURE__.trace.push({ facts, wallMilliseconds });
        if (facts.elapsed >= goals[goal]) {
          const frame: Capture = { facts, wallMilliseconds, png: '' };
          window.__CLEAVE_CAPTURE__.frames.push(frame);
          document.querySelector('canvas')!.toBlob(blob => {
            if (!blob) return;
            const reader = new FileReader();
            reader.onload = () => { frame.png = String(reader.result); };
            reader.readAsDataURL(blob);
          }, 'image/png');
          while (goal < goals.length && facts.elapsed >= goals[goal]) goal++;
        }
      }
      if (facts.cycles !== expectedCycles || facts.status !== 'settled') requestAnimationFrame(capture);
    };
    requestAnimationFrame(capture);
  }, { expectedCycles });
}
const targetGame = 'mobile-slice-adaptation-20260830';
const workspace = process.cwd();
const url = process.env.WATERMELON_QA_URL ?? 'http://127.0.0.1:41942/';
const out = resolve(workspace, '../../watermelon-cleave-preview-20261002', process.env.WATERMELON_QA_DIRECTORY ?? 'qa');
const manifestPath = resolve(workspace, 'experiments/watermelon-cleave/dist/build-manifest.json');
const built = await readFile(manifestPath, 'utf8').catch(() => null);
const buildSha256 = built ? JSON.parse(built).sha256 : 'development-preview';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const viewportReports: unknown[] = [];
const schemas = z.object({
  targetGame: z.literal('mobile-slice-adaptation-20260830'), workspace: z.string(), buildSha256: z.string(), url: z.string(),
  scope: z.literal('independent-effect-preview-only'), defaultGameIssueClosed: z.literal(false),
  passed: z.boolean(), viewports: z.array(z.object({ label: z.string(), width: z.number(), height: z.number(),
    input: z.enum(['mouse', 'touch']), fixtureOrStateInjection: z.literal(false),
    startup: z.boolean(), centerOrder: z.boolean(), continuousStroke: z.boolean(), normalComplete: z.boolean(), replay: z.boolean(), reset: z.boolean(), slowComplete: z.boolean(),
    firstOpenAt: z.number(), normalDurationMs: z.number(), instrumentedDurationMs: z.number(), slowDurationMs: z.number(), frameFiles: z.array(z.string()), replayFrameFiles: z.array(z.string()).min(3), traceFile: z.string(), videoFile: z.string(), consoleErrors: z.array(z.string()),
  }).strict()),
}).strict();

try {
  for (const viewport of [{ label: 'desktop', width: 1180, height: 720 }, { label: 'portrait', width: 390, height: 844 }, { label: 'landscape', width: 844, height: 390 }]) {
    const dir = resolve(out, viewport.label);
    await mkdir(dir, { recursive: true });
    const touch = viewport.label !== 'desktop';
    const context = await browser.newContext({ viewport, hasTouch: touch, deviceScaleFactor: 1, recordVideo: { dir, size: viewport } });
    const page = await context.newPage();
    // tsx preserves names inside evaluated callbacks using this compiler helper.
    await page.addInitScript('globalThis.__name = (fn) => fn;');
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => Boolean(window.__WATERMELON_DEMO__));
      assert.equal(await page.evaluate(() => window.__WATERMELON_DEMO__.getState().status), 'ready');
      await page.screenshot({ path: resolve(dir, 'ready.png') });
      for (const selector of ['#cut', '#reset', '#slow']) {
        const bounds = await page.locator(selector).boundingBox();
        assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height, `${selector} is outside ${viewport.label}`);
      }
      // Compare normal/slow timing without PNG readback changing only one run's cadence.
      const baselineStart = performance.now();
      if (touch) await page.locator('#cut').tap(); else await page.locator('#cut').click();
      await page.waitForFunction(() => window.__WATERMELON_DEMO__.getState().status === 'settled');
      const normalDurationMs = performance.now() - baselineStart;
      if (touch) await page.locator('#reset').tap(); else await page.locator('#reset').click();
      await observeCleave(page, 2);
      const started = performance.now();
      if (touch) await page.locator('#cut').tap(); else await page.locator('#cut').click();
      await page.waitForFunction(() => window.__WATERMELON_DEMO__.getState().status === 'settled');
      const instrumentedDurationMs = performance.now() - started;
      await page.waitForFunction(() => window.__CLEAVE_CAPTURE__.frames.every(frame => frame.png.length > 0));
      await page.screenshot({ path: resolve(dir, 'settled.png') });
      const captured = await page.evaluate(() => window.__CLEAVE_CAPTURE__);
      await writeFile(resolve(dir, 'capture-before-assertions.json'), JSON.stringify({
        trace: captured.trace, frames: captured.frames.map(frame => ({ observedSeconds: frame.facts.elapsed, wallMilliseconds: frame.wallMilliseconds })),
      }, null, 2) + '\n');
      const active = captured.trace.filter(item => item.facts.elapsed > 0 && item.facts.elapsed < 1.05);
      assert.ok(active.length >= 8, 'the normal cut must have multiple observed rendered frames');
      assert.ok(active.some(item => item.facts.elapsed > 0.1 && item.facts.elapsed < 0.22 && item.facts.frame.halves[1].position[0] === 0), 'pre-centre rendered branch missing');
      const opening = active.filter(item => item.facts.frame.halves[1].position[0] > 0);
      assert.ok(opening.length > 2);
      for (const item of opening) {
        assert.ok(item.facts.bladeEdgeWorld[1] < 1.3, 'the actual rendered cutting edge must pass the centre before opening');
        assert.ok(Math.abs(item.facts.frame.halves[0].position[0] + item.facts.frame.halves[1].position[0]) < 1e-6);
      }
      const stroke = active.filter(item => item.facts.elapsed <= 0.32);
      for (let i = 1; i < stroke.length; i++) assert.ok(stroke[i].facts.bladeEdgeWorld[1] < stroke[i - 1].facts.bladeEdgeWorld[1], 'rendered stroke paused or reversed');
      const frameFiles: string[] = [];
      for (const [i, frame] of captured.frames.entries()) {
        const name = `frame-${String(i).padStart(2, '0')}-${Math.round(frame.facts.elapsed * 1000)}ms.png`;
        await writeFile(resolve(dir, name), Buffer.from(frame.png.split(',')[1], 'base64'));
        frameFiles.push(resolve(dir, name));
      }
      const traceFile = resolve(dir, 'natural-trace.json');
      await writeFile(traceFile, JSON.stringify({ input: touch ? 'native-touch' : 'real-mouse', fixtureOrStateInjection: false, trace: captured.trace,
        frames: captured.frames.map((frame, index) => ({ observedSeconds: frame.facts.elapsed, wallMilliseconds: frame.wallMilliseconds,
          path: frameFiles[index], sha256: createHash('sha256').update(Buffer.from(frame.png.split(',')[1], 'base64')).digest('hex') })) }, null, 2) + '\n');
      await observeCleave(page, 3);
      if (touch) await page.locator('#cut').tap(); else await page.locator('#cut').click();
      await page.waitForFunction(() => { const state = window.__WATERMELON_DEMO__.getState(); return state.cycles === 3 && state.status === 'settled'; });
      await page.waitForFunction(() => window.__CLEAVE_CAPTURE__.frames.every(frame => frame.png.length > 0));
      const replayFrames = await page.evaluate(() => window.__CLEAVE_CAPTURE__.frames);
      const replayFrameFiles: string[] = [];
      for (const stage of ['entering', 'opening', 'settled']) {
        const frame = replayFrames.find(frame => frame.facts.frame.stage === stage);
        assert.ok(frame, `replay is missing the ${stage} visible branch`);
        const path = resolve(dir, `replay-${stage}.png`);
        await writeFile(path, Buffer.from(frame.png.split(',')[1], 'base64')); replayFrameFiles.push(path);
      }
      if (touch) await page.locator('#reset').tap(); else await page.locator('#reset').click();
      assert.equal(await page.evaluate(() => window.__WATERMELON_DEMO__.getState().status), 'ready');
      if (touch) await page.locator('#slow').tap(); else await page.locator('#slow').check();
      const slowStart = performance.now();
      if (touch) await page.locator('#cut').tap(); else await page.locator('#cut').click();
      await page.waitForFunction(() => window.__WATERMELON_DEMO__.getState().status === 'settled');
      const slowDurationMs = performance.now() - slowStart;
      await writeFile(resolve(dir, 'timing.json'), JSON.stringify({ normalDurationMs, instrumentedDurationMs, slowDurationMs, measurement: 'normal and slow both run without PNG readback' }, null, 2) + '\n');
      assert.ok(slowDurationMs > normalDurationMs * 1.65, 'slow motion must produce a visibly longer stroke');
      assert.deepEqual(errors, []);
      const videoFile = await page.video()!.path();
      viewportReports.push({ ...viewport, input: touch ? 'touch' : 'mouse', fixtureOrStateInjection: false,
        startup: true, centerOrder: true, continuousStroke: true, normalComplete: true, replay: true, reset: true, slowComplete: true,
        firstOpenAt: opening[0].facts.elapsed, normalDurationMs, instrumentedDurationMs, slowDurationMs, frameFiles, replayFrameFiles, traceFile, videoFile, consoleErrors: errors });
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
const report = schemas.parse({ targetGame, workspace, buildSha256, url, scope: 'independent-effect-preview-only', defaultGameIssueClosed: false, passed: true, viewports: viewportReports });
await writeFile(resolve(out, 'natural-qa-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, scope: report.scope, viewports: report.viewports.map(v => ({ label: v.label, firstOpenAt: v.firstOpenAt, frames: v.frameFiles.length, consoleErrors: v.consoleErrors.length })), report: resolve(out, 'natural-qa-report.json') }));
