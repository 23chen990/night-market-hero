import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const evidence = resolve('qa-evidence');
await mkdir(evidence, { recursive: true });
const cases = [
  { name: '1180x720', viewport: { width: 1180, height: 720 }, reducedMotion: false },
  { name: '844x390', viewport: { width: 844, height: 390 }, reducedMotion: false },
  { name: '390x844', viewport: { width: 390, height: 844 }, reducedMotion: false },
  { name: 'reduced-motion', viewport: { width: 1180, height: 720 }, reducedMotion: true },
] as const;
const browser = await chromium.launch({ headless: true });
const reports: Array<Record<string, unknown>> = [];
try {
  for (const item of cases) {
    const context = await browser.newContext({ viewport: item.viewport, reducedMotion: item.reducedMotion ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('http://127.0.0.1:4178/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(window.__PROTOTYPE_TEST__));
    const app = page.locator('#app');
    const pause = page.locator('[data-action="pause"]');
    reports.push({
      viewport: item.name,
      preload: await app.getAttribute('data-ui-preload'),
      segment: await app.getAttribute('data-segment'),
      pauseHitTarget: await pause.evaluate((el) => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      orientationBlocked: await app.locator('[data-ui="orientation-block"]').isVisible(),
      icons: await page.locator('[data-ui="copper-token"], [data-ui="pause-icon"], [data-ui="pursuit-icon"], [data-ui="closing-gate-icon"], [data-ui="route-state-icon"]').count(),
      errors,
    });
    await page.screenshot({ path: resolve(evidence, `level1-ui-${item.name}.png`), fullPage: false });
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(resolve(evidence, 'level1-ui-matrix.json'), `${JSON.stringify({ artifactType: 'level-1-ui-browser-matrix', generatedAt: new Date().toISOString(), reports }, null, 2)}\n`);
