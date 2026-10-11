import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { QaReportSchema } from '../../../../../src/schemas/index.ts';

const workspace = path.resolve(import.meta.dirname, '..');
const base = process.env.BASE_URL ?? 'http://127.0.0.1:4185/';
const out = path.join(workspace, 'artifacts/gate-removal-20261008', process.env.QA_LABEL ?? 'exploratory');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const runs = [];
const errors = [];
const buildHash = createHash('sha256').update(await readFile(path.join(workspace, 'dist/index.html'))).digest('hex');
const screenshots = [];
const hash = async (file) => createHash('sha256').update(await readFile(file)).digest('hex');
const state = (page) => page.evaluate(() => window.__PROTOTYPE_TEST__.getState());
try {
  for (const viewport of [{ label: 'desktop', width: 1280, height: 720 }, { label: 'mobile-landscape', width: 844, height: 390 }].filter(v => !process.env.QA_VIEWPORT || v.label === process.env.QA_VIEWPORT)) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, recordVideo: { dir: out, size: { width: viewport.width, height: viewport.height } } });
    const recordingStartedAt = Date.now();
    const page = await context.newPage();
    const videoPath = await page.video().path();
    const requestedBuildHash = buildHash;
    const servedBuild = await context.request.get(base);
    assert.equal(createHash('sha256').update(await servedBuild.body()).digest('hex'), buildHash, 'preview must serve the recorded immutable build');
    let latest = null;
    page.on('console', message => { if (message.text().startsWith('NATURAL_QA_STATE:')) latest = JSON.parse(message.text().slice(17)); });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    const trace = [];
    const captures = [];
    const capture = async (branch) => {
      const file = path.join(out, `${viewport.label}-${branch}.png`);
      await page.screenshot({ path: file });
      const binding = { path: file, sha256: await hash(file) };
      captures.push({ branch, ...binding });
      screenshots.push(file);
    };
    const observe = async () => {
      const value = await state(page);
      assert.notEqual(value.activeChaseEvent, 'closing-gate', 'default journey must never enable a gate');
      assert.equal(value.closingGateBeat, null);
      trace.push({ wallTimeMs: Date.now(), tick: value.tick, x: value.player.x, y: value.player.y, status: value.status, levelId: value.levelId, segmentIndex: value.segmentIndex, activeChaseEvent: value.activeChaseEvent, phase: value.chaseObstacle?.kind === 'roof-net' ? value.chaseObstacle.phase : null, inputTransitions: value.inputTransitions, gatesPassed: value.gatesPassed });
      return value;
    };
    try {
      await page.goto(`${base}?seed=31&fresh=1`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => Boolean(window.__PROTOTYPE_TEST__));
      await page.evaluate(() => {
        window.__NATURAL_QA_TRACE__ = [];
        window.__NATURAL_QA_INPUT__ = [];
        for (const type of ['pointerdown', 'pointerup', 'keydown', 'keyup']) window.addEventListener(type, (event) => {
          const value = window.__PROTOTYPE_TEST__.getState();
          window.__NATURAL_QA_INPUT__.push({ type, wallTimeMs: Date.now(), tick: value.tick, levelId: value.levelId, target: event.target?.getAttribute?.('data-action') ?? null });
        }, true);
        let lastSignal = '';
        const collect = () => {
          const v = window.__PROTOTYPE_TEST__.getState();
          window.__NATURAL_QA_TRACE__.push({ wallTimeMs: Date.now(), tick: v.tick, x: v.player.x, y: v.player.y, status: v.status, levelId: v.levelId, segmentIndex: v.segmentIndex, activeChaseEvent: v.activeChaseEvent, closingGateBeat: v.closingGateBeat, phase: v.chaseObstacle?.kind === 'roof-net' ? v.chaseObstacle.phase : null, inputTransitions: v.inputTransitions, gatesPassed: v.gatesPassed });
          const signal = `${v.levelId}:${v.status}:${Math.floor(v.tick / 12)}`;
          if (signal !== lastSignal) { console.debug('NATURAL_QA_STATE:' + JSON.stringify({ status: v.status, levelId: v.levelId, tick: v.tick, x: v.player.x, segmentIndex: v.segmentIndex, gatesPassed: v.gatesPassed })); lastSignal = signal; }
          requestAnimationFrame(collect);
        };
        requestAnimationFrame(collect);
      });
      assert.equal(await page.locator('[data-ui="destination"]').innerText(), '夜市渡口');
      // Startup pixels are extracted from video after play; screenshots must not delay the first input.
      const box = await page.locator('[data-action="grapple"]').boundingBox();
      assert.ok(box);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      const phases = new Set();
      let cleared = false;
      let terminal;
      console.log(`${viewport.label}: startup captured; normal hold/release beginning`);
      for (let cycle = 0; cycle < 65; cycle += 1) {
        if (latest && latest.status !== 'playing') break;
        await page.mouse.down();
        await new Promise(resolve => setTimeout(resolve, Number(process.env.QA_HOLD_MS ?? 400)));
        await page.mouse.up();
        await page.waitForTimeout(Number(process.env.QA_RELEASE_MS ?? 70));
        if (latest && latest.status !== 'playing') break;
      }
      await page.mouse.up();
      terminal = await observe();
      console.log(`${viewport.label}: tutorial=${terminal.status}, tick=${terminal.tick}, x=${Math.round(terminal.player.x)}`);
      await capture('tutorial-terminal');
      if (terminal.status === 'won') assert.doesNotMatch(await page.locator('[data-ui="result-copy"]').innerText(), /城门|内门|过门钱|关门|开口/, 'settlement guidance must describe the open patrol journey');
      assert.equal(terminal.status, 'won', `${viewport.label} natural tutorial must settle`);
      await page.locator('[data-action="continue"]').click();
      await page.waitForFunction(() => window.__PROTOTYPE_TEST__.getState().levelId === 'night-patrol');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      // Reach a former gate district by ordinary hold/release input, then
      // release completely to exercise visible failure and normal replay.
      const patrolDeadline = Date.now() + 30000;
      let patrolCheckpoint = false;
      while (Date.now() < patrolDeadline) {
        const current = latest;
        if (current && current.status !== 'playing') break;
        if (current && current.segmentIndex >= 2 && current.x >= 4300 && current.gatesPassed >= 1) { patrolCheckpoint = true; break; }
        await page.mouse.down();
        await new Promise(resolve => setTimeout(resolve, Number(process.env.QA_HOLD_MS ?? 400)));
        await page.mouse.up();
        await page.waitForTimeout(Number(process.env.QA_RELEASE_MS ?? 70));
      }
      await page.mouse.up();
      await page.waitForFunction(() => window.__PROTOTYPE_TEST__.getState().status !== 'playing', undefined, { timeout: 12000 });
      const failure = await observe();
      await capture('patrol-failure');
      await page.locator('[data-action="restart"]').click();
      await page.waitForFunction(() => window.__PROTOTYPE_TEST__.getState().levelId === 'night-patrol' && window.__PROTOTYPE_TEST__.getState().status === 'playing');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(200);
      await capture('replay');
      await page.mouse.up();
      const replay = await observe();
      assert.equal(replay.status, 'playing');
      assert.ok(replay.inputTransitions >= 2, 'replay accepts a normal grapple press and release');
      assert.equal(await page.locator('[data-ui="result"]').evaluate((element) => element.hidden), true);
      const renderedSamples = await page.evaluate(() => window.__NATURAL_QA_TRACE__ ?? []);
      for (const value of renderedSamples) {
        assert.notEqual(value.activeChaseEvent, 'closing-gate');
        assert.equal(value.closingGateBeat, null);
        if (value.phase) phases.add(value.phase);
      }
      cleared = phases.has('missed') || phases.has('caught');
      assert.ok(patrolCheckpoint, 'naturally reach the former patrol checkpoint');
      for (const group of [['raise', 'aim'], ['release', 'travel'], ['active', 'missed', 'caught']]) assert.ok(group.some((phase) => phases.has(phase)), `missing natural roof-net branch: ${group}`);
      const tracePath = path.join(out, `${viewport.label}-trace.json`);
      await writeFile(tracePath, `${JSON.stringify({ viewport, input: 'normal pointer hold/release, Continue and Restart only', forbiddenOperations: [], buildHash: requestedBuildHash, recordingStartedAt, videoPath, samples: renderedSamples, inputObservations: trace, domInputEvents: await page.evaluate(() => window.__NATURAL_QA_INPUT__ ?? []) }, null, 2)}\n`);
      runs.push({ viewport, status: 'PASS', video: { path: videoPath, recordingStartedAt }, roofNetPhases: [...phases], cleared, patrolCheckpoint, terminal: { status: terminal.status, inputTransitions: terminal.inputTransitions }, failure: { status: failure.status, failureReason: failure.failureReason }, replay: { levelId: replay.levelId, status: replay.status }, trace: { path: tracePath, sha256: await hash(tracePath) }, screenshots: captures });
    } catch (error) {
      await capture('blocked');
      const tracePath = path.join(out, `${viewport.label}-trace.json`);
      await writeFile(tracePath, `${JSON.stringify({ viewport, buildHash: requestedBuildHash, recordingStartedAt, videoPath, samples: await page.evaluate(() => window.__NATURAL_QA_TRACE__ ?? []), inputObservations: trace, domInputEvents: await page.evaluate(() => window.__NATURAL_QA_INPUT__ ?? []) }, null, 2)}\n`);
      runs.push({ viewport, status: 'BLOCKED', video: { path: videoPath, recordingStartedAt }, error: error.stack ?? String(error), screenshots: captures, trace: { path: tracePath, sha256: await hash(tracePath) } });
    } finally { await context.close(); }
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${base}?seed=31&fresh=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__PROTOTYPE_TEST__));
  const before = await state(page);
  await page.waitForTimeout(250);
  const after = await state(page);
  const portraitPass = before.tick === after.tick && after.paused && await page.locator('[data-ui="orientation-block"]').isVisible();
  const portraitPath = path.join(out, 'portrait.png');
  await page.screenshot({ path: portraitPath });
  screenshots.push(portraitPath);
  runs.push({ viewport: { label: 'mobile-portrait', width: 390, height: 844 }, status: portraitPass ? 'PASS' : 'BLOCKED', paused: after.paused, beforeTick: before.tick, afterTick: after.tick, screenshots: [{ branch: 'orientation-pause', path: portraitPath, sha256: await hash(portraitPath) }] });
  await page.close();
} finally { await browser.close(); }
assert.equal(await hash(path.join(workspace, 'dist/index.html')), buildHash, 'build must remain unchanged for the entire run');
const checks = runs.map((run) => ({ name: run.viewport.label, passed: run.status === 'PASS', evidence: JSON.stringify(run) }));
checks.push({ name: 'no-browser-errors', passed: errors.length === 0, evidence: JSON.stringify(errors) });
const passed = checks.every((check) => check.passed);
const report = QaReportSchema.parse({ schemaVersion: 1, passed, checks, issues: checks.filter((check) => !check.passed).map((check) => ({ id: check.name, severity: 'error', message: 'Natural runtime check blocked', evidence: check.evidence })), screenshots, consoleLog: JSON.stringify(errors), testedAt: new Date().toISOString() });
await writeFile(path.join(out, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(out, 'natural-details.json'), `${JSON.stringify({ schemaVersion: 1, targetGame: '夜市飞侠：护印突围', workspace, base, buildHash, passed, runs, errors }, null, 2)}\n`);
console.log(JSON.stringify({ passed, runs: runs.map((run) => ({ viewport: run.viewport.label, status: run.status, error: run.error, roofNetPhases: run.roofNetPhases, cleared: run.cleared, patrolCheckpoint: run.patrolCheckpoint })), errors }));
process.exitCode = passed ? 0 : 1;
