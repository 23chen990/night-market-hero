import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

const url = process.env.FOOD_CLEAVE_QA_URL; assert.ok(url);
const out = resolve(process.env.FOOD_CLEAVE_QA_OUT ?? '../../watermelon-game-integration-20261003/qa-gallery'); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true }); const errors: string[] = [];
const context = await browser.newContext({ viewport: { width: 1180, height: 720 } }); const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto(url!, { waitUntil: 'networkidle' }); await page.waitForFunction(() => Boolean(window.__FOOD_CLEAVE_DEMO__));
await page.screenshot({ path: resolve(out, 'gallery-ready.png'), fullPage: true });
const labels = ['苹果', '蛋糕', '黄瓜', '翡翠包'];
for (const label of labels) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.screenshot({ path: resolve(out, `${label}-intact.png`), fullPage: true });
  await page.locator('#cut').click();
  await page.waitForFunction(() => window.__FOOD_CLEAVE_DEMO__.getState().status === 'cutting');
  // Capture after the outward roll has made both sealed cut faces readable;
  // the natural QA still waits for the later settled frame separately.
  await page.waitForTimeout(800);
  const opening = await page.evaluate(() => window.__FOOD_CLEAVE_DEMO__.getState());
  assert.equal(opening.pieces, 2); assert.ok(opening.opening > 0); assert.ok(opening.minY >= 0.25 - 1e-4);
  await page.screenshot({ path: resolve(out, `${label}-opening.png`), fullPage: true });
  await page.waitForFunction(() => window.__FOOD_CLEAVE_DEMO__.getState().status === 'settled');
  await page.screenshot({ path: resolve(out, `${label}-settled.png`), fullPage: true });
}
const report = { schemaVersion: 1, artifactType: 'original-food-cleave-gallery-natural-qa', targetGame: 'mobile-slice-adaptation-20260830', workspace: resolve('.'), passed: errors.length === 0, samples: labels, errors };
await writeFile(resolve(out, 'natural-report.json'), `${JSON.stringify(report, null, 2)}\n`); await context.close(); await browser.close(); console.log(JSON.stringify(report)); assert.equal(report.passed, true);
