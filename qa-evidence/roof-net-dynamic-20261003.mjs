import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.ROOF_NET_BASE ?? 'http://127.0.0.1:4179';
const root = path.dirname(fileURLToPath(import.meta.url));
const evidenceDir = path.join(root, 'roof-net-dynamic-20261003');
await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const outputs = [];
for (const viewport of [
  { label: 'desktop-1672x941', width: 1672, height: 941 },
  { label: 'mobile-844x390', width: 844, height: 390 },
]) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page:${error.message}`));
  await page.goto(`${base}/?seed=31&fresh=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__FORMAL_TEST__));
  for (const capture of [
    { label: 'raise', ticks: 1 },
    { label: 'aim', ticks: 8 },
    { label: 'travel', ticks: 20 },
    { label: 'land', ticks: 29 },
    { label: 'active', ticks: 34 },
  ]) {
    await page.evaluate((ticks) => {
      window.__FORMAL_TEST__.loadScenario('event-roof-net');
      document.querySelector('.hub-settings')?.click();
      window.__FORMAL_TEST__.advanceTicks(ticks);
    }, capture.ticks);
    await page.evaluate(() => {
      for (const selector of ['[data-ui="pause-overlay"]', '[data-ui="orientation-block"]']) {
        const element = document.querySelector(selector);
        if (element instanceof HTMLElement) { element.hidden = true; element.style.display = 'none'; }
      }
    });
    await page.waitForTimeout(60);
    const telemetry = await page.evaluate(() => {
      const state = window.__FORMAL_TEST__.getState();
      const canvas = document.querySelector('canvas');
      return {
        phase: state.chaseObstacle?.phase ?? null,
        animationProgress: state.chaseObstacle?.animationProgress ?? null,
        collisionActive: state.chaseObstacle?.collisionActive ?? null,
        source: state.chaseObstacle?.source ?? null,
        predictedTarget: state.chaseObstacle?.predictedTarget ?? null,
        occupiedBounds: state.chaseObstacle?.occupiedBounds ?? null,
        player: state.player,
        canvas: canvas ? { width: canvas.width, height: canvas.height, rect: canvas.getBoundingClientRect().toJSON() } : null,
        sceneOwner: document.querySelector('#app')?.dataset.sceneOwner ?? null,
      };
    });
    const filename = `${viewport.label}-${capture.label}.png`;
    await page.screenshot({ path: path.join(evidenceDir, filename) });
    outputs.push({ viewport: viewport.label, capture: capture.label, ...telemetry, screenshot: `qa-evidence/roof-net-dynamic-20261003/${filename}` });
  }
  await page.close();
}
await browser.close();
const report = { schemaVersion: 1, artifactType: 'roof-net-runtime-evidence', targetGame: '夜市飞侠：护印突围', workspace: path.dirname(root), base, captures: outputs, errors: [] };
report.errors = outputs.length ? [] : ['no captures'];
await writeFile(path.join(root, 'roof-net-runtime-results.json'), JSON.stringify(report, null, 2) + '\\n');
console.log(JSON.stringify(report, null, 2));
