import { chromium, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { z } from 'zod';
import { NaturalFlowEvidenceSchema } from '../../../src/schemas/natural-flow';
const root = resolve('runs/mobile-slice-adaptation-20260830');
const workspace = resolve(root, 'workspace', process.env.APPLE_CAPTURE_WORKSPACE ?? 'apple-review-attempt18');
const canonical = resolve(root, 'workspace/prototype-a');
const out = resolve(root, 'apple-resume-20261009/qa', process.env.APPLE_CAPTURE_NAME ?? 'capture1');
const base = process.env.APPLE_CAPTURE_URL ?? 'http://127.0.0.1:8944';
const views = [{ label: 'desktop', width: 1180, height: 720 }, { label: 'portrait', width: 390, height: 844 }, { label: 'landscape', width: 844, height: 390 }];
const targetId = 'level1-reward-token';
const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const bind = async (path: string) => ({ path, sha256: hash(await readFile(path)) });
const browser = await chromium.launch({ headless: true });
const results: any[] = [];
async function sample(page: Page) {
  return page.evaluate(() => {
    const bridge = (window as any).__GAME_TEST__, state = bridge.getState(), render = bridge.getRenderState();
    return { epochMs: performance.timeOrigin + performance.now(), time: performance.now(), status: state.status, seed: state.seed, worldTime: state.worldTime, player: state.player,
      target: render.cutVisuals.find((item: any) => item.id === 'level1-reward-token'), knife: render.knifeProjection };
  });
}
try {
  for (const viewport of views.filter(v => !process.env.APPLE_CAPTURE_VIEW || v.label === process.env.APPLE_CAPTURE_VIEW)) {
    const dir = resolve(out, viewport.label); await mkdir(dir, { recursive: true });
    const context = await browser.newContext({ viewport, hasTouch: viewport.label !== 'desktop', isMobile: viewport.label !== 'desktop' });
    await context.tracing.start({ screenshots: true, snapshots: false });
    const page = await context.newPage(); const errors: string[] = [], actions: string[] = [], blockers: string[] = [];
    const screenshots: Record<string, any> = {}, frames: { epochMs: number; data: Buffer; metadata: any }[] = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const buildPath = resolve(workspace, 'dist/index.html'), buildHash = hash(await readFile(buildPath));
    const cdp = await context.newCDPSession(page);
    cdp.on('Page.screencastFrame', event => {
      frames.push({ epochMs: (event.metadata.timestamp ?? 0) * 1000, data: Buffer.from(event.data, 'base64'), metadata: event.metadata });
      void cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
    });
    let terminal = 'none', replay = false, observations: any[] = [];
    try {
      const response = await page.goto(`${base}/dist/index.html`, { waitUntil: 'networkidle' });
      if (!response || hash(await response.body()) !== buildHash) throw new Error('Served build hash differs from snapshot');
      await page.waitForFunction(() => Boolean((window as any).__GAME_TEST__));
      const initial = await sample(page);
      if (initial.seed !== 31 || initial.status !== 'ready') throw new Error('Expected fresh default level1 seed31');
      const startup = resolve(dir, 'startup.png'); await page.screenshot({ path: startup }); screenshots.startup = await bind(startup);
      await cdp.send('Page.startScreencast', { format: 'png', maxWidth: viewport.width, maxHeight: viewport.height, everyNthFrame: 1 });
      await page.evaluate(() => {
        (window as any).__APPLE_READ_ONLY_SAMPLES__ = [];
        (window as any).__APPLE_READ_ONLY_TIMER__ = setInterval(() => {
          const bridge = (window as any).__GAME_TEST__, state = bridge.getState(), render = bridge.getRenderState();
          const target = render.cutVisuals.find((item: any) => item.id === 'level1-reward-token');
          const overlay = [...document.querySelectorAll('.feedback-pop,.reward-fly,#tutorial-cue')].map(node => { const r = node.getBoundingClientRect(); return { className: node.className, id: node.id, text: node.textContent, x: r.x, y: r.y, width: r.width, height: r.height, opacity: getComputedStyle(node).opacity }; });
          (window as any).__APPLE_READ_ONLY_SAMPLES__.push({ epochMs: performance.timeOrigin + performance.now(), time: performance.now(), worldTime: state.worldTime, status: state.status, seed: state.seed, player: state.player, target, knife: render.knifeProjection, overlay });
        }, 30);
      });
      const tap = async (reason: string) => {
        const before = await sample(page);
        if (viewport.label === 'desktop' || process.env.APPLE_CAPTURE_MOUSE === '1') await page.mouse.click(viewport.width * .5, viewport.height * .52);
        else await page.touchscreen.tap(viewport.width * .5, viewport.height * .52);
        const after = await sample(page);
        actions.push(`Normal ${viewport.label === 'desktop' || process.env.APPLE_CAPTURE_MOUSE === '1' ? 'mouse' : 'touch'} input at worldTime ${after.worldTime}; ${reason}; deliveryMs ${after.epochMs - before.epochMs}`);
        return after;
      };
      let current = await tap('startup'), lastTap = current.worldTime, targetTaps = 0;
      const scriptedSchedule = (process.env.APPLE_CAPTURE_SCHEDULE ?? '').split(',').filter(Boolean).map(Number);
      const scriptedStart = current.worldTime;
      let scriptedIndex = 0;
      const deadline = Date.now() + 80000;
      while (Date.now() < deadline) {
        const decisionHandle = await page.waitForFunction(({ lastTap, targetTaps, variant, scriptedStart, scriptedIndex, scriptedSchedule }) => {
          const s = (window as any).__GAME_TEST__.getState(), p = s.player;
          if (s.status === 'won' || s.status === 'failed') return { terminal: true, worldTime: s.worldTime };
          if (scriptedSchedule.length) {
            if (scriptedIndex < scriptedSchedule.length && s.worldTime >= scriptedStart + scriptedSchedule[scriptedIndex])
              return { terminal: false, reason: `scripted-${scriptedIndex}`, targetZone: false, scripted: true };
            return false;
          }
          if (s.worldTime - lastTap < .15) return false;
          const cut = s.sigils.find((i: any) => i.id === 'level1-reward-token')?.cut;
          if (!cut && p.x >= 1700 && p.x < 2097) {
            if (s.status === 'anchored') return { terminal: false, reason: 'target-anchor', targetZone: true };
            const horizon = Math.max(.05, p.vx > 0 ? (2061 - p.x) / p.vx : .05), predictedY = p.y + p.vy * horizon + 300 * horizon * horizon;
            const minX = targetTaps === 0 ? 1700 : targetTaps === 1 ? 1850 : 1900;
            const cosineAllowed = variant === 'unrestricted-angle' || targetTaps === 0 || Math.cos(p.angle) >= .7 || Math.cos(p.angle) <= 0;
            if (s.status === 'airborne' && targetTaps < 3 && p.x >= minX && p.x <= 2040 && p.vy >= -360 && p.vy <= 760 && predictedY >= (variant === 'lower' ? 170 : 180) && cosineAllowed)
              return { terminal: false, reason: `target-predicted>${predictedY}`, targetZone: true };
            return false;
          }
          const projectedY = p.y + Math.max(p.vy, 0) * .15;
          if (s.status === 'ready' || s.status === 'anchored' || s.status === 'airborne' && projectedY > 320 && p.vy > -135)
            return { terminal: false, reason: `baseline-projected>${projectedY}`, targetZone: false };
          return false;
        }, { lastTap, targetTaps, variant: process.env.APPLE_CAPTURE_POLICY ?? 'normal', scriptedStart, scriptedIndex, scriptedSchedule }, { timeout: 20000, polling: 30 });
        const decision = await decisionHandle.jsonValue() as any; await decisionHandle.dispose();
        if (decision.terminal) break;
        await page.waitForTimeout(Number(process.env.APPLE_CAPTURE_DELAY ?? 50));
        current = await tap(decision.reason); lastTap = current.worldTime;
        if (decision.targetZone) targetTaps++;
        if (decision.scripted) scriptedIndex++;
      }
      await page.waitForTimeout(800);
      current = await sample(page); terminal = current.status;
      const terminalPath = resolve(dir, 'terminal.png'); await page.screenshot({ path: terminalPath }); screenshots.terminal = await bind(terminalPath);
      observations = await page.evaluate(() => { clearInterval((window as any).__APPLE_READ_ONLY_TIMER__); return (window as any).__APPLE_READ_ONLY_SAMPLES__; });
      await cdp.send('Page.stopScreencast');
      if (terminal === 'won' || terminal === 'failed') {
        await page.locator('#replay-button').click(); actions.push('Click visible replay button');
        const state = await sample(page); replay = state.status === 'ready' && state.target?.phase === 'intact' && state.target.apple.elapsed === 0;
        const replayPath = resolve(dir, 'replay.png'); await page.screenshot({ path: replayPath }); screenshots.replay = await bind(replayPath);
        screenshots.replay.observation = state;
      }
      const isVisible = (s: any) => {
        const p = s?.target?.targetProjection;
        if (!p) return false;
        const visibleWidth = Math.max(0, Math.min(viewport.width, p.x + p.width) - Math.max(0, p.x));
        const visibleHeight = Math.max(0, Math.min(viewport.height, p.y + p.height) - Math.max(0, p.y));
        return visibleWidth >= p.width * .8 && visibleHeight >= p.height * .8;
      };
      const branch = (s: any, name: string) => isVisible(s) && (name === 'intact' ? s.target.phase === 'intact' : name === 'opening' ? s.target.apple?.centerCrossed && s.target.apple.stage === 'opening' && s.target.apple.opening > .05 && s.target.apple.opening < .98 : s.target.apple?.stage === 'settled');
      for (const name of ['intact', 'opening', 'settled']) {
        const candidates = frames.map(frame => {
          const before = observations.findLast(s => s.epochMs <= frame.epochMs), after = observations.find(s => s.epochMs >= frame.epochMs);
          const nearest = before && after ? frame.epochMs - before.epochMs < after.epochMs - frame.epochMs ? before : after : before ?? after;
          const distance = nearest ? Math.abs(nearest.epochMs - frame.epochMs) : Infinity;
          const bounded = Boolean(nearest && branch(nearest, name) && (!before || !after || after.epochMs - before.epochMs <= 140));
          return { frame, before, after, nearest, distance, bounded };
        }).filter(c => c.bounded && c.distance <= 70).sort((a, b) => name === 'opening' ? Math.abs(a.nearest.target.apple.opening - .45) - Math.abs(b.nearest.target.apple.opening - .45) : a.frame.epochMs - b.frame.epochMs);
        const best = candidates[0];
        if (!best) { blockers.push(`No time-bound player-visible exact ${targetId} ${name} frame`); continue; }
        const imagePath = resolve(dir, `apple-${name}.png`); await writeFile(imagePath, best.frame.data);
        screenshots[name] = { ...(await bind(imagePath)), frameEpochMs: best.frame.epochMs, metadata: best.frame.metadata, observationBefore: best.before, observationAfter: best.after, bounded: true };
      }
      const settled = observations.find(s => s.target?.apple?.stage === 'settled');
      if (!settled || settled.target.apple.halfBounds.some((b: any, i: number) => Math.abs(b.min[1] - settled.target.apple.contactY[i]) > settled.target.apple.diameter * .02)) blockers.push('Exact settled apple floor contact not verified');
      if (settled && settled.target.apple.motionMode !== 'cap-reveal') blockers.push('Default uses the wrong approved presentation branch');
      const recovery = resolve(dir, 'continuous-frames'); await mkdir(recovery, { recursive: true });
      const openingWindow = observations.filter(s => isVisible(s) && s.target?.apple?.centerCrossed && s.target.apple.elapsed < .48);
      const frameRefs = [];
      if (openingWindow.length) {
        const start = openingWindow[0].epochMs - 120, finish = openingWindow.at(-1).epochMs + 700;
        for (const [i, f] of frames.filter(f => f.epochMs >= start && f.epochMs <= finish).entries()) {
          const path = resolve(recovery, `frame-${i}.png`); await writeFile(path, f.data); frameRefs.push({ ...(await bind(path)), epochMs: f.epochMs, metadata: f.metadata });
        }
      }
      await writeFile(resolve(dir, 'continuous-frames.json'), JSON.stringify(frameRefs, null, 2) + '\n');
      if (hash(await readFile(buildPath)) !== buildHash) blockers.push('Frozen build changed during capture');
    } catch (e) { blockers.push(String(e)); try { observations = await page.evaluate(() => { clearInterval((window as any).__APPLE_READ_ONLY_TIMER__); return (window as any).__APPLE_READ_ONLY_SAMPLES__ ?? []; }); } catch {} }
    if (!['won', 'failed'].includes(terminal)) blockers.push('Default journey did not reach terminal');
    if (!replay) blockers.push('Natural replay not verified'); blockers.push(...errors.map(e => `Browser error: ${e}`));
    await writeFile(resolve(dir, 'samples.json'), JSON.stringify(observations) + '\n'); await writeFile(resolve(dir, 'console.json'), JSON.stringify(errors, null, 2) + '\n');
    const tracePath = resolve(dir, 'trace.zip'); await context.tracing.stop({ path: tracePath }); await context.close();
    const flow = NaturalFlowEvidenceSchema.parse({ schemaVersion: 1, startedFromReset: true, actions, transitions: Object.keys(screenshots).map(name => ({ name: `apple-default-${name}`, changed: true, evidence: screenshots[name].path })), completion: ['won', 'failed'].includes(terminal) ? 'terminal' : 'none', replayObserved: replay, forbiddenOperations: [], screenshots: Object.values(screenshots).map(s => s.path), passed: blockers.length === 0, blockers, runner: 'Playwright normal input with CDP epoch-bound original pixels', buildHash, runtime: 'web-lite', device: viewport, seed: 31, observedAt: new Date().toISOString() });
    await writeFile(resolve(dir, 'natural-flow.json'), JSON.stringify(flow, null, 2) + '\n');
    results.push({ viewport, targetId, passed: flow.passed, buildHash, screenshots, trace: await bind(tracePath), samples: await bind(resolve(dir, 'samples.json')), flow });
    console.log(JSON.stringify({ viewport: viewport.label, targetId, passed: flow.passed, terminal, blockers, frames: frames.length, observationTimeRange: observations.length ? [observations[0].epochMs, observations.at(-1).epochMs] : [], frameTimeRange: frames.length ? [frames[0].epochMs, frames.at(-1).epochMs] : [] }));
  }
} finally { await browser.close(); }
const report = z.object({ schemaVersion: z.literal(1), targetGame: z.literal('mobile-slice-adaptation-20260830'), workspace: z.string(), reviewWorkspace: z.string(), passed: z.boolean(), results: z.array(z.object({ viewport: z.object({ label: z.string(), width: z.number(), height: z.number() }), targetId: z.literal('level1-reward-token'), passed: z.boolean(), buildHash: z.string().regex(/^[a-f0-9]{64}$/) }).passthrough()), checkedAt: z.string().datetime() }).strict().parse({ schemaVersion: 1, targetGame: 'mobile-slice-adaptation-20260830', workspace: canonical, reviewWorkspace: workspace, passed: results.length > 0 && results.every(r => r.passed), results, checkedAt: new Date().toISOString() });
await mkdir(out, { recursive: true }); await writeFile(resolve(out, 'qa-natural-journey-report.json'), JSON.stringify(report, null, 2) + '\n');
if (!report.passed) process.exitCode = 1;
