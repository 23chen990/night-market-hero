/** Real Chromium geometry QA for the single-finger coach.
 * This is a visible layout check, NOT a human playtest or visual-art approval.
 */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const entry = resolve('dist/index.html');
const evidence = resolve('evidence/playable-audit');
const htmlSha256 = createHash('sha256').update(await readFile(entry)).digest('hex');
await mkdir(evidence, { recursive: true });
const viewports = [
  { width: 568, height: 320 },
  { width: 667, height: 375 },
  { width: 844, height: 390 },
  { width: 1280, height: 720 },
];
const outcomes: Array<{ viewport: string; left: number; right: number;
  top: number; bottom: number; heading: string }> = [];
const errors: string[] = [];
const browser = await chromium.launch({ headless: true });
let failure: string | null = null;
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport, hasTouch: viewport.width < 900, deviceScaleFactor: 1,
    });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(10_000);
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(pathToFileURL(entry).href);
      const start = page.locator('[data-action="start-run"]');
      if (viewport.width < 900) await start.tap();
      else await start.click();
      await page.waitForFunction(() => {
        const coach = document.querySelector<HTMLElement>('[data-experience="cue"]');
        return coach && !coach.hidden && (coach.querySelector('strong')?.textContent?.length ?? 0) > 0;
      });
      const bounds = await page.evaluate(() => {
        const coach = document.querySelector<HTMLElement>('[data-experience="cue"]')!;
        const rect = coach.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
          heading: coach.querySelector('strong')?.textContent ?? '' };
      });
      // After the first world scroll the hero is intentionally framed near
      // 32% of viewport width. This should stay an unobstructed play lane.
      // Leave 50px clear for right-side power-up controls.
      const label = `${viewport.width}x${viewport.height}`;
      assert.ok(bounds.left >= viewport.width * 0.32 + 24,
        `${label}: coach overlaps the hero's projected flight lane: ${JSON.stringify(bounds)}`);
      assert.ok(bounds.right <= viewport.width - 50,
        `${label}: coach obscures the right-side item rail: ${JSON.stringify(bounds)}`);
      assert.ok(bounds.top >= 0 && bounds.bottom <= viewport.height,
        `${label}: coach escapes the usable landscape viewport`);
      await page.screenshot({ path: `${evidence}/${label}-coach-safe-area.png` });
      outcomes.push({ viewport: label, ...bounds });
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(errors, [], 'no browser runtime error is allowed');
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  await browser.close();
  await writeFile(`${evidence}/coach-viewport-layout.json`, JSON.stringify({
    htmlSha256, method: 'real Chromium visible DOM geometry at four landscape viewports',
    passed: failure === null && errors.length === 0 && outcomes.length === viewports.length,
    failure, errors, outcomes, humanApproval: false,
  }, null, 2));
}
console.log(JSON.stringify({ htmlSha256, viewports: outcomes.length, passed: true }));
