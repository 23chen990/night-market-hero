import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { Driver, observeDom } from '../qa-retest-20261008/qa-lib-attempt8.mjs';
import { visibleCargo } from './visible-cargo.mjs';

const out = fileURLToPath(new URL('./cargo-calibration/', import.meta.url));
const browser = await chromium.launch({ channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const context = await browser.newContext({ viewport: { width: 540, height: 960 } });
const page = await context.newPage();
const d = new Driver(page, out);
const checks = [];
try {
  await page.goto('http://127.0.0.1:4177/');
  await page.waitForSelector('#game canvas');
  await observeDom(page);
  await page.waitForTimeout(500);
  let observed = await visibleCargo(d);
  checks.push({ name: 'fresh-context-empty-stack', passed: observed.total === 0, observed, screenshot: await d.capture('empty') });
  await d.move({ x: 120, y: 180 }, 'net');
  await d.idle(3500, 'carried-fish');
  observed = await visibleCargo(d);
  checks.push({ name: 'four-visible-fresh-fish-bars', passed: observed.counts['fresh-fish'] === 4 && observed.total === 4, observed, screenshot: await d.capture('four-fish') });
  await d.move({ x: 270, y: 420 }, 'shelf');
  await d.idle(1500, 'deposited-fish');
  observed = await visibleCargo(d);
  checks.push({ name: 'deposited-stack-empty', passed: observed.total === 0, observed, screenshot: await d.capture('deposited-empty') });
} finally {
  await context.close();
  await browser.close();
}
await fs.mkdir(out, { recursive: true });
const report = { schemaVersion: 1, artifactType: 'qa-observer-calibration', acceptanceEvidence: false, passed: checks.every(c => c.passed), checks };
await fs.writeFile(out + '/report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
if (!report.passed) process.exitCode = 1;
