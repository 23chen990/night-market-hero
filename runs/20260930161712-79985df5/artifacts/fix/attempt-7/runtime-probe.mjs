import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { decode, components, sha } from '../../qa-retest-20261008/attempt-6-recovery/qa-lib.mjs';

const stage = process.env.FIX_PROBE_STAGE ?? 'red';
const base = process.env.FIX_PROBE_URL ?? 'http://127.0.0.1:4176';
const dir = path.dirname(fileURLToPath(import.meta.url));
const evidenceDir = path.join(dir, `${stage}-runtime`);
await fs.mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const entries = [];
try {
  for (const [width, height] of [[540, 960], [844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(base);
    await page.waitForSelector('#game canvas');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const api = window.__GAME_TEST__;
      api.grantCurrency(30);
      api.setPlayerPosition({ x: 420, y: 720 });
      api.advanceTime(3200);
    });
    await page.waitForTimeout(150);
    const settlement = await page.locator('#settlement').evaluate((node) => ({
      hidden: node.hidden,
      choices: [...node.querySelectorAll('[data-market-id]')].map((button) => ({
        id: button.id, hidden: button.hidden, display: getComputedStyle(button).display,
        rect: button.getBoundingClientRect().toJSON(), text: button.textContent,
      })),
      columns: getComputedStyle(node.querySelector('.market-options')).gridTemplateColumns,
    }));
    const settlementPath = path.join(evidenceDir, `${width}x${height}-settlement.png`);
    await page.screenshot({ path: settlementPath });
    await page.locator('#continue-round').click();
    await page.waitForTimeout(150);
    for (const position of [{ x: 174, y: 786 }, { x: 120, y: 786 }, { x: 120, y: 806 }, { x: 120, y: 880 }]) {
      await page.evaluate((position) => window.__GAME_TEST__.setPlayerPosition(position), position);
      await page.waitForTimeout(180);
      const state = await page.evaluate(() => window.__GAME_TEST__.getState());
      const geometry = await page.locator('#game canvas').evaluate((node) => ({
        rect: node.getBoundingClientRect().toJSON(), landscape: document.body.classList.contains('is-landscape'),
      }));
      const png = await page.screenshot({ clip: geometry.rect, scale: 'css' });
      const pixels = decode(png);
      const bodies = components(pixels, [44, 155, 155], 8, 12);
      const heads = components(pixels, [255, 235, 190], 4, 12);
      const file = path.join(evidenceDir, `${width}x${height}-avatar-${position.x}-${position.y}.png`);
      await page.screenshot({ path: file });
      entries.push({ viewport: { width, height }, position, stage: state.stage, feedback: state.feedback,
        geometry, bodies, heads, screenshot: { path: file, sha256: sha(await fs.readFile(file)) } });
    }
    entries.push({ viewport: { width, height }, settlement,
      screenshot: { path: settlementPath, sha256: sha(await fs.readFile(settlementPath)) } });
    await context.close();
  }
} finally { await browser.close(); }
const schema = z.object({ schemaVersion: z.literal(1), artifactType: z.literal('fixer-runtime-diagnosis'),
  targetGame: z.literal('海滩渔货铺'), attempt: z.literal(7), stage: z.enum(['red', 'green']),
  sourceUrl: z.string().url(), evidenceBasis: z.literal('fixture-diagnosis-only'), entries: z.array(z.record(z.string(), z.unknown())),
  createdAt: z.string().datetime() }).strict();
const report = schema.parse({ schemaVersion: 1, artifactType: 'fixer-runtime-diagnosis', targetGame: '海滩渔货铺',
  attempt: 7, stage, sourceUrl: base, evidenceBasis: 'fixture-diagnosis-only', entries, createdAt: new Date().toISOString() });
const file = path.join(dir, `${stage}-runtime.json`);
await fs.writeFile(file, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ validated: true, file, entries: entries.map(({ viewport, position, bodies, heads, settlement }) => ({ viewport, position, bodies, heads, settlement })) }));
