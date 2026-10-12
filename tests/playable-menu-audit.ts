import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GrappleState } from '../src/game-core.ts';

const out = resolve('evidence/playable-audit');
await mkdir(out, { recursive: true });
const entry = resolve('dist/index.html');
const sha256 = createHash('sha256').update(await readFile(entry)).digest('hex');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
page.setDefaultTimeout(8000);
const errors: string[] = [];
const layouts: unknown[] = [];
const report: Record<string, unknown> = { sha256, passed: false, layouts, method: 'visible buttons and viewport resize; no game state mutation' };
const state = (): Promise<GrappleState> => page.evaluate(() => (window as unknown as { __PROTOTYPE_TEST__: { getState(): GrappleState } }).__PROTOTYPE_TEST__.getState());
try {
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(pathToFileURL(entry).href);
  await page.locator('[data-action="start-run"]').tap();
  await page.locator('.hub-back-key').tap();
  const menu = page.locator('[data-ui="progression-menu"]');
  await menu.waitFor({ state: 'visible' });
  assert.equal((await state()).paused, true);
  const pausedTick = (await state()).tick;
  for (const viewport of [{ width: 568, height: 320 }, { width: 667, height: 375 }, { width: 844, height: 390 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(150);
    assert.equal(await menu.evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(20, 43, 46)', 'opaque panel must hide underlying settlement text');
    const bounds = await menu.boundingBox();
    assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= viewport.height, 'menu must remain inside viewport');
    for (const tab of ['characters', 'missions', 'records']) {
      const button = menu.locator(`[data-progression-tab="${tab}"]`);
      await button.tap();
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      for (const selector of ['[data-action="close-progression"]', '[data-progression-tab="characters"]', '[data-progression-tab="missions"]', '[data-progression-tab="records"]']) {
        const box = await menu.locator(selector).boundingBox();
        assert.ok(box && box.height >= 44 && box.width >= 44 && box.x >= 0 && box.y >= 0
          && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height,
        `${selector} must retain an on-screen 44px touch target at ${viewport.width}x${viewport.height}`);
      }
      await page.screenshot({ path: `${out}/${viewport.width}x${viewport.height}-menu-${tab}.png` });
    }
    assert.equal((await state()).tick, pausedTick, 'menu inspection must not spend the live run');
    layouts.push({ viewport, bounds, tabs: 3, touchTargetsAtLeast44px: true, opaquePanel: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  assert.equal(await page.locator('#app').getAttribute('data-orientation-blocked'), 'true');
  assert.equal(await menu.isVisible(), false, 'portrait guard must cover the growth menu');
  assert.equal(await page.evaluate(() => Boolean(document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('[data-ui="orientation-block"]'))), true);
  assert.equal((await state()).tick, pausedTick);
  await page.screenshot({ path: `${out}/menu-portrait-guard.png` });
  await page.setViewportSize({ width: 844, height: 390 });
  await menu.waitFor({ state: 'visible' });
  await menu.locator('[data-action="close-progression"]').tap();
  assert.equal(await menu.isVisible(), false);
  assert.equal((await state()).paused, true, 'closing the menu must not silently resume flight');
  assert.equal(await page.locator('[data-ui="pause-overlay"]').isVisible(), true);
  assert.deepEqual(errors, []);
  report.passed = true;
  report.rotationGuard = true;
  report.closeReturnsToPause = true;
} catch (error) { report.failure = String(error); throw error; }
finally {
  report.errors = errors;
  await writeFile(`${out}/menus.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ sha256, passed: true, layouts: layouts.length, evidence: out }));
