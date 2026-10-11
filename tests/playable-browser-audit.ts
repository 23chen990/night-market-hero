import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GrappleState } from '../src/game-core.ts';

// Only state READS are allowed here. Gameplay advances at browser frame time;
// all actions use genuine pointer/keyboard input, never scenario/teleport APIs.
const out = resolve('evidence/playable-audit');
await mkdir(out, { recursive: true });
const entry = resolve('dist/index.html');
const sha256 = createHash('sha256').update(await readFile(entry)).digest('hex');
const browser = await chromium.launch({ headless: true });
const reports: unknown[] = [];
try {
  for (const viewport of [{ width: 844, height: 390 }, { width: 1280, height: 720 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors: string[] = [];
    const input: unknown[] = [];
    const samples: unknown[] = [];
    const seen = new Set<string>();
    page.on('pageerror', error => errors.push(String(error)));
    const label = `${viewport.width}x${viewport.height}`;
    await page.goto(pathToFileURL(entry).href);
    await page.waitForFunction(() => Boolean((window as unknown as { __PROTOTYPE_TEST__?: unknown }).__PROTOTYPE_TEST__));
    const readState = (): Promise<GrappleState> => page.evaluate(() => (window as unknown as { __PROTOTYPE_TEST__: { getState(): GrappleState } }).__PROTOTYPE_TEST__.getState());
    await page.screenshot({ path: `${out}/${label}-startup.png` });
    let held = false;
    let lastRelease = -999;
    let lastShot = '';
    let retry = 0;
    const started = Date.now();
    for (let sample = 0; Date.now() - started < 45_000; sample++) {
      const state = await readState();
      if (sample % 6 === 0) samples.push({ ms: Date.now() - started, tick: state.tick, level: state.levelId,
        player: state.player, segment: state.segmentIndex, status: state.status, coins: state.coins,
        pickups: state.pickups, combo: state.combo, vehicle: state.vehicleId, sky: state.isSky });
      const shot = `${state.levelId}-${state.segmentIndex}-${state.vehicleId ?? 'swing'}`;
      if (shot !== lastShot && seen.size < 16) {
        lastShot = shot;
        if (!seen.has(shot)) {
          seen.add(shot);
          await page.screenshot({ path: `${out}/${label}-beat-${String(seen.size).padStart(2, '0')}.png` });
        }
      }
      if (state.status !== 'playing') {
        if (held) { await page.mouse.up(); held = false; }
        const action = state.status === 'won' ? 'continue' : 'restart';
        const button = page.locator(`[data-action="${action}"]`);
        if (state.status === 'failed' && retry++ >= 1) break;
        await button.click();
        lastRelease = -999;
        await page.waitForTimeout(80);
        continue;
      }
      const start = page.locator('[data-action="start-run"]');
      if (await start.isVisible()) { await start.click(); lastRelease = -999; }
      const anchor = state.anchors.find(item => item.id === state.attachedAnchorId);
      const wantHold = state.vehicleId
        ? state.vehicleId === '货运滑索' ? state.vehicleTicksRemaining > 100 : state.player.y > 380
        : anchor ? !(state.player.x > anchor.x + 30 && state.player.vx > 0 && state.player.vy < 30)
          : state.tick - lastRelease > 20 && (state.player.vy > 0 || state.player.y > 540 || state.inputTransitions === 0);
      if (wantHold !== held) {
        await page.mouse.move(viewport.width * 0.43, viewport.height * 0.72);
        if (wantHold) await page.mouse.down(); else { await page.mouse.up(); lastRelease = state.tick; }
        held = wantHold;
        input.push({ tick: state.tick, edge: held ? 'press' : 'release', level: state.levelId });
      }
      await page.waitForTimeout(80);
    }
    if (held) await page.mouse.up();
    await page.screenshot({ path: `${out}/${label}-final.png` });
    reports.push({ viewport, sha256, errors, input, samples, seen: [...seen], final: await readState() });
    await writeFile(`${out}/journeys.json`, JSON.stringify({ sha256, method: 'read-only state observation + actual pointer input; real browser time', reports }, null, 2));
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ sha256, journeys: reports.length, evidence: out }));
