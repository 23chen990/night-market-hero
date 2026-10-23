import assert from 'node:assert/strict';
import { chromium, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GrappleState } from '../src/game-core.ts';

// Real browser input only. The one synthetic blur is a lifecycle fault
// injection, explicitly recorded separately from actual viewport rotation.
const entry = resolve(process.env.QA_ENTRY ?? 'dist/index.html');
const out = resolve(process.env.QA_OUT ?? 'evidence/optimization-20261024/input-lifecycle');
await mkdir(out, { recursive: true });
const sha256 = createHash('sha256').update(await readFile(entry)).digest('hex');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const report: { sha256: string; browserVersion: string; method: string; passed: boolean; cases: Record<string, unknown>[] } = {
  sha256, browserVersion: browser.version(), method: 'Visible buttons, real keyboard/touch, CDP native touchCancel and viewport rotation; synthetic blur is labelled. Game state is read-only.',
  passed: false, cases: [],
};
const read = (page: Page): Promise<GrappleState> => page.evaluate(() => (
  window as unknown as { __PROTOTYPE_TEST__: { getState(): GrappleState } }
).__PROTOTYPE_TEST__.getState());
const sample = (s: GrappleState) => ({
  tick: s.tick, paused: s.paused, status: s.status, held: s.inputHeld,
  anchor: s.attachedAnchorId, releaseTick: s.lastGrappleReleaseTick,
  transitions: s.inputTransitions, combo: s.combo, player: s.player,
  graceUntil: s.regrappleGraceUntilTick,
});
const scenarios = ['launch-settings', 'pause-keyboard', 'growth-keyboard', 'rotate-touch', 'cancel-touch', 'blur-event', 'multi-touch-release'] as const;
try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    const result: Record<string, unknown> = { scenario, errors };
    try {
      await page.goto(`${pathToFileURL(entry).href}?fresh=1`);
      await page.waitForFunction(() => !!(window as unknown as { __PROTOTYPE_TEST__?: unknown }).__PROTOTYPE_TEST__);
      await page.evaluate(() => {
        const events: Array<{ type: string; pointerId: number | null; detail: number | null; isTrusted: boolean; action: string | null }> = [];
        (window as unknown as { __INPUT_REVIEW_EVENTS__: typeof events }).__INPUT_REVIEW_EVENTS__ = events;
        for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'click']) document.addEventListener(type, event => {
          if (events.length >= 80) return;
          events.push({ type, pointerId: event instanceof PointerEvent ? event.pointerId : null,
            detail: event instanceof UIEvent ? event.detail : null, isTrusted: event.isTrusted,
            action: event.target instanceof Element ? event.target.closest('[data-action]')?.getAttribute('data-action') ?? null : null });
        }, true);
      });
      if (scenario === 'launch-settings') {
        const before = await read(page);
        await page.locator('[data-action="pause"]').first().tap();
        await page.waitForTimeout(300);
        const after = await read(page);
        assert.equal(after.tick, before.tick, 'settings cannot start physics behind the launch card');
        assert.equal(after.paused, true);
        assert.equal(await page.locator('[data-experience="launch"]').isVisible(), true);
        result.before = sample(before); result.after = sample(after);
      } else {
        await page.locator('[data-action="start-run"]').tap();
        const session = await context.newCDPSession(page);
        const primary = { x: 430, y: 210, id: 1 };
        const keyboard = scenario.endsWith('keyboard');
        if (keyboard) {
          await page.locator('[data-action="grapple"]').focus();
          await page.keyboard.down('Space');
        } else {
          await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [primary] });
        }
        await page.waitForFunction(() => {
          const s = (window as unknown as { __PROTOTYPE_TEST__: { getState(): GrappleState } }).__PROTOTYPE_TEST__.getState();
          return s.attachedAnchorId && s.inputHeld && s.tick > 8;
        });
        const before = await read(page);
        result.before = sample(before);
        if (scenario === 'multi-touch-release') {
          const second = { x: 390, y: 220, id: 2 };
          await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [primary, second] });
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [second] });
          const oneRemaining = await read(page);
          assert.equal(oneRemaining.inputHeld, true, 'one remaining finger still owns the hold');
          assert.equal(oneRemaining.lastGrappleReleaseTick, before.lastGrappleReleaseTick);
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          const released = await read(page);
          assert.equal(released.inputHeld, false);
          assert.equal(released.paused, false, 'normal pointerup/lostcapture cannot open a pause');
          assert.equal(released.inputTransitions, before.inputTransitions + 1, 'the final real finger release counts exactly once');
          result.remaining = sample(oneRemaining); result.released = sample(released);
        } else {
          if (scenario === 'pause-keyboard') await page.locator('[data-action="pause"]').first().click();
          else if (scenario === 'growth-keyboard') await page.locator('[data-ui="back"]').click();
          else if (scenario === 'rotate-touch') await page.setViewportSize({ width: 390, height: 844 });
          else if (scenario === 'cancel-touch') await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
          else await page.evaluate(() => window.dispatchEvent(new Event('blur')));
          await page.waitForFunction(() => (window as unknown as { __PROTOTYPE_TEST__: { getState(): GrappleState } }).__PROTOTYPE_TEST__.getState().paused);
          const paused = await read(page);
          assert.equal(paused.inputHeld, false);
          assert.equal(paused.lastGrappleReleaseTick, before.lastGrappleReleaseTick, 'cancellation is not a scored player release');
          assert.equal(paused.inputTransitions, before.inputTransitions, 'pause cannot fabricate an input edge');
          assert.equal(paused.combo, before.combo, 'pause cannot earn or lose a combo');
          assert.equal(paused.regrappleGraceUntilTick, paused.tick + 72, 'actual held rope retains the finite resume window');
          await page.waitForTimeout(200);
          const frozen = await read(page);
          assert.equal(frozen.tick, paused.tick);
          assert.deepEqual(frozen.player, paused.player, 'no background movement during pause');
          result.paused = sample(paused); result.frozen = sample(frozen);
          await page.screenshot({ path: `${out}/${scenario}-paused.png` });

          if (keyboard) await page.keyboard.up('Space');
          else if (scenario !== 'cancel-touch') await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          if (scenario === 'blur-event' || scenario === 'rotate-touch') {
            assert.equal(await page.locator('[data-ui="progression-menu"]').isVisible(), false,
              'lifting an interrupted gameplay finger cannot click a newly appeared pause-menu button');
          }
          if (scenario === 'rotate-touch') {
            await page.setViewportSize({ width: 844, height: 390 });
            // setViewportSize resolves before the game's resize listener;
            // observe that listener before deciding whether Continue exists.
            await page.waitForFunction(() => document.querySelector<HTMLElement>('#app')!.dataset.orientationBlocked === 'false');
          }
          if (scenario === 'growth-keyboard') await page.locator('[data-action="close-progression"]').click();
          if (scenario === 'blur-event') await page.evaluate(() => window.dispatchEvent(new Event('focus')));
          if ((await read(page)).paused) {
            if (keyboard) await page.locator('[data-action="resume-run"]').click();
            else await page.locator('[data-action="resume-run"]').tap();
          }
          if (keyboard) {
            await page.locator('[data-action="grapple"]').focus();
            await page.keyboard.down('Space');
          } else {
            await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...primary, id: 3 }] });
          }
          const resumed = await read(page);
          assert.equal(resumed.status, 'playing');
          assert.equal(resumed.paused, false);
          assert.equal(resumed.inputHeld, true, 'new physical input after resume is not stuck behind stale ownership');
          result.resumed = sample(resumed);
          if (keyboard) await page.keyboard.up('Space');
          else await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        }
      }
      assert.deepEqual(errors, []);
      result.passed = true;
      await page.screenshot({ path: `${out}/${scenario}.png` });
    } catch (error) {
      result.failure = String(error);
      await page.screenshot({ path: `${out}/${scenario}-failure.png` }).catch(() => undefined);
    } finally {
      result.inputEvents = await page.evaluate(() => (window as unknown as { __INPUT_REVIEW_EVENTS__?: unknown }).__INPUT_REVIEW_EVENTS__).catch(() => null);
      report.cases.push(result);
      await context.close();
    }
  }
  report.passed = report.cases.every(result => result.passed === true);
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ sha256, passed: report.passed, cases: report.cases.map(c => ({ scenario: c.scenario, passed: c.passed, failure: c.failure })), evidence: out }));
if (!report.passed) process.exitCode = 1;
