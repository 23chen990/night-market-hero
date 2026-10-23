import assert from 'node:assert/strict';
import { chromium, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GrappleState } from '../src/game-core.ts';
import type { RewardedAdResult } from '../src/ads.ts';

// SDK fault injection, not a real ad-platform certification. All gameplay
// uses visible buttons, keyboard and natural inactivity; no state setters.
type TestWindow = Window & {
  __PROTOTYPE_TEST__: { getState(): GrappleState };
  __AD_REQUESTS__: string[];
  __RESOLVE_AD__?: (result: RewardedAdResult) => void;
  __NIGHT_MARKET_HERO_TAPTAP_AD_CONFIG__?: {
    tap: object;
    createBridge(): { showRewarded(placement: string): Promise<RewardedAdResult>; showInterstitial(): Promise<{ status: 'unavailable' }> } | null;
  };
};
const allScenarios = ['item-completed', 'item-dismissed', 'revive-lifecycle', 'unavailable-copy', 'missing-bridge-copy',
  'revive-rotate-return', 'revive-rotate-pending', 'revive-rotate-dismissed-retry'] as const;
const selected = (process.env.QA_SCENARIO ?? '').split(',').filter(Boolean);
assert.ok(selected.every(name => (allScenarios as readonly string[]).includes(name)), 'QA_SCENARIO must name known scenarios');
const scenarios = allScenarios.filter(name => selected.length === 0 || selected.includes(name));
const entry = resolve(process.env.QA_ENTRY ?? 'dist/index.html');
const out = resolve(process.env.QA_OUT ?? 'evidence/optimization-20261024/ad-lifecycle');
await mkdir(out, { recursive: true });
const sha256 = createHash('sha256').update(await readFile(entry)).digest('hex');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const report: { sha256: string; browserVersion: string; method: string; passed: boolean; cases: Record<string, unknown>[] } = {
  sha256, browserVersion: browser.version(), method: 'Real buttons, viewport rotation and natural losses; delayed ad SDK plus synthetic blur/focus explicitly injected. No game state writes or real ads.',
  passed: false, cases: [],
};
const state = (page: Page) => page.evaluate(() => {
  const s = (window as unknown as TestWindow).__PROTOTYPE_TEST__.getState();
  return { tick: s.tick, status: s.status, paused: s.paused, reviveUsed: s.reviveUsed, held: s.inputHeld,
    itemUsage: s.itemUsage, background: document.querySelector<HTMLElement>('#app')!.dataset.backgroundState,
    orientationBlocked: document.querySelector<HTMLElement>('#app')!.dataset.orientationBlocked,
    adWaiting: !document.querySelector<HTMLElement>('[data-ui="ad-wait"]')!.hidden,
    pauseVisible: !document.querySelector<HTMLElement>('[data-ui="pause-overlay"]')!.hidden,
    copy: document.querySelector<HTMLElement>('[data-ui="result-copy"]')!.textContent ?? '' };
});
const waitStatus = (page: Page, status: string) => page.waitForFunction(expected => (
  window as unknown as TestWindow).__PROTOTYPE_TEST__.getState().status === expected, status, { timeout: 15000 });
const waitAdSettled = (page: Page) => page.waitForFunction(() =>
  document.querySelector<HTMLElement>('[data-ui="ad-wait"]')!.hidden
  && document.querySelector<HTMLElement>('[data-ui="result"]')!.getAttribute('aria-busy') !== 'true');
const rotate = async (page: Page, portrait: boolean): Promise<void> => {
  await page.setViewportSize(portrait ? { width: 390, height: 844 } : { width: 844, height: 390 });
  await page.waitForFunction(blocked => document.querySelector<HTMLElement>('#app')!.dataset.orientationBlocked === String(blocked), portrait);
};
try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
    const page = await context.newPage(); page.setDefaultTimeout(8000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    const result: Record<string, unknown> = { scenario, errors };
    try {
      if (scenario !== 'unavailable-copy') await page.addInitScript(({ missing }) => {
        const w = window as unknown as TestWindow;
        w.__AD_REQUESTS__ = [];
        w.__NIGHT_MARKET_HERO_TAPTAP_AD_CONFIG__ = { tap: {}, createBridge() {
          if (missing) return null;
          return {
            showRewarded(placement) {
              w.__AD_REQUESTS__.push(placement);
              return new Promise<RewardedAdResult>(resolve => { w.__RESOLVE_AD__ = resolve; });
            },
            async showInterstitial() { return { status: 'unavailable' as const }; },
          };
        } };
      }, { missing: scenario === 'missing-bridge-copy' });
      await page.goto(`${pathToFileURL(entry).href}?fresh=1`);
      await page.waitForFunction(() => !!(window as unknown as { __PROTOTYPE_TEST__?: unknown }).__PROTOTYPE_TEST__);
      await page.locator('[data-action="start-run"]').tap();
      if (scenario.startsWith('item-')) {
        result.stage = 'first-item';
        await page.locator('[data-action="grapple"]').focus();
        await page.keyboard.down('Space');
        await page.locator('[data-action="talisman"]').click();
        result.firstUse = await state(page);
        assert.equal((await state(page)).itemUsage.talisman, 1, 'the first visible item use succeeds before the ad path');
        result.stage = 'wait-effect-end';
        await page.waitForFunction(() => {
          const s = (window as unknown as TestWindow).__PROTOTYPE_TEST__.getState();
          return s.tick >= s.talismanActiveUntilTick;
        });
        result.stage = 'request-ad';
        await page.locator('[data-action="talisman"]').click();
        await page.waitForFunction(() => (window as unknown as TestWindow).__AD_REQUESTS__.length > 0);
        const during = await state(page);
        await page.waitForTimeout(300);
        const waiting = await state(page);
        result.during = during; result.waiting = waiting;
        assert.equal(during.paused, true, 'a visible ad request pauses actual game physics');
        assert.equal(during.held, false, 'the old hold cannot survive into the ad');
        assert.equal(waiting.tick, during.tick, 'a delayed overlay callback cannot kill the rider underneath it');
        // A real keypress during the pending SDK request must remain blocked.
        await page.keyboard.up('Space');
        await page.locator('[data-action="grapple"]').focus();
        await page.keyboard.down('Space');
        assert.equal((await state(page)).held, false);
        await page.keyboard.up('Space');
        const completed = scenario === 'item-completed';
        result.stage = 'resolve-ad';
        await page.evaluate(watched => (window as unknown as TestWindow).__RESOLVE_AD__!({ status: watched ? 'completed' : 'dismissed' }), completed);
        await page.waitForFunction(() => !(window as unknown as TestWindow).__PROTOTYPE_TEST__.getState().paused);
        const after = await state(page);
        // The public legacy getMetaProgress() reader omits v2 item fields.
        // Read the durable record without changing storage or gameplay state.
        const unlocked = await page.evaluate(() => {
          const stored = JSON.parse(localStorage.getItem('night-market-hero.meta.v1') ?? '{}') as { itemUnlocked?: { talisman?: boolean } };
          return stored.itemUnlocked?.talisman ?? false;
        });
        result.after = after; result.unlocked = unlocked;
        assert.equal(unlocked, completed, 'only a completed ad durably unlocks the item');
        assert.equal(after.itemUsage.talisman, completed ? 2 : 1, 'dismissed ads cannot grant a second item effect');
        result.stage = 'complete';
      } else {
        // Spend the daily free revive naturally, then start a distinct run.
        await waitStatus(page, 'failed');
        await page.locator('[data-action="revive"]').tap();
        await waitStatus(page, 'playing');
        await waitStatus(page, 'failed');
        await page.locator('[data-action="restart"]').tap();
        await waitStatus(page, 'playing');
        await waitStatus(page, 'failed');
        if (scenario.endsWith('copy')) {
          const failed = await state(page);
          assert.equal(await page.locator('[data-action="revive"]').isVisible(), false);
          assert.doesNotMatch(failed.copy, /看完.*广告.*复起/, 'the result cannot promise an unavailable revive');
          result.failureScreen = failed;
        } else if (scenario === 'revive-lifecycle') {
          await page.locator('[data-action="revive"]').tap();
          await page.waitForFunction(() => (window as unknown as TestWindow).__AD_REQUESTS__.includes('revive'));
          await page.evaluate(() => {
            window.dispatchEvent(new Event('blur'));
            window.dispatchEvent(new Event('focus'));
            (window as unknown as TestWindow).__RESOLVE_AD__!({ status: 'completed' });
          });
          await waitStatus(page, 'playing');
          const after = await state(page);
          await page.waitForTimeout(200);
          const frozen = await state(page);
          assert.equal(after.reviveUsed, true);
          assert.equal(after.paused, true, 'a background interruption leaves an explicit safe pause');
          assert.equal(after.pauseVisible, true, 'the resumed rider needs a visible Continue action');
          assert.equal(frozen.tick, after.tick);
          await page.locator('[data-action="resume-run"]').click();
          const resumed = await state(page);
          await page.waitForTimeout(150);
          assert.ok((await state(page)).tick > resumed.tick, 'explicit Continue restarts the actual simulation');
          result.after = after; result.frozen = frozen; result.resumed = resumed;
        } else {
          result.stage = 'request-revive';
          assert.equal((await state(page)).reviveUsed, false);
          await page.locator('[data-action="revive"]').tap();
          await page.waitForFunction(() => (window as unknown as TestWindow).__AD_REQUESTS__.filter(item => item === 'revive').length === 1);
          await rotate(page, true);
          result.portraitPending = await state(page);
          if (scenario !== 'revive-rotate-pending') await rotate(page, false);
          if (scenario === 'revive-rotate-dismissed-retry') {
            result.stage = 'dismiss-after-rotation';
            await page.evaluate(() => (window as unknown as TestWindow).__RESOLVE_AD__!({ status: 'dismissed' }));
            await waitAdSettled(page);
            const dismissed = await state(page);
            result.dismissed = dismissed;
            assert.equal(dismissed.status, 'failed', 'dismissing an ad cannot revive the rider');
            assert.equal(dismissed.reviveUsed, false, 'a dismissed ad cannot spend this run\'s revive');
            assert.equal(dismissed.paused, false, 'returning from portrait cannot lock the failed run behind paused=true');
            result.stage = 'retry-visible-revive';
            await page.locator('[data-action="revive"]').tap();
            await page.waitForFunction(() => (window as unknown as TestWindow).__AD_REQUESTS__.filter(item => item === 'revive').length === 2);
            assert.equal((await state(page)).reviveUsed, false, 'the retry must wait for actual completion');
          }
          result.stage = 'complete-after-rotation';
          await page.evaluate(() => (window as unknown as TestWindow).__RESOLVE_AD__!({ status: 'completed' }));
          await waitAdSettled(page);
          const completed = await state(page);
          result.completed = completed;
          assert.equal(completed.status, 'playing', 'completed revive entitlement survives viewport changes during the ad');
          assert.equal(completed.reviveUsed, true, 'the completed callback revives the current run once');
          if (scenario === 'revive-rotate-pending') {
            assert.equal(completed.paused, true, 'a revived rider waits safely while still in portrait');
            await page.waitForTimeout(200);
            const frozen = await state(page);
            result.frozen = frozen;
            assert.equal(frozen.tick, completed.tick);
            await page.screenshot({ path: `${out}/${scenario}-portrait.png` });
            await rotate(page, false);
          }
          const returned = await state(page);
          result.returned = returned;
          if (returned.paused) {
            assert.equal(returned.pauseVisible, true, 'any remaining pause has a visible way to continue');
            await page.locator('[data-action="resume-run"]').tap();
          }
          const resumed = await state(page);
          result.resumed = resumed;
          assert.equal(resumed.status, 'playing');
          assert.equal(resumed.paused, false);
          await page.waitForTimeout(150);
          assert.ok((await state(page)).tick > resumed.tick, 'the revived simulation advances after returning to landscape');
          assert.equal(await page.evaluate(() => (window as unknown as TestWindow).__AD_REQUESTS__.filter(item => item === 'revive').length),
            scenario === 'revive-rotate-dismissed-retry' ? 2 : 1);
          result.stage = 'complete';
        }
      }
      assert.deepEqual(errors, []);
      result.passed = true;
      await page.screenshot({ path: `${out}/${scenario}.png` });
    } catch (error) {
      result.failure = String(error);
      result.failureState = await state(page).catch(() => null);
      await page.screenshot({ path: `${out}/${scenario}-failure.png` }).catch(() => undefined);
    } finally {
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
