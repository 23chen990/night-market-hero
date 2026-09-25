import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4178/';
const evidenceDir = resolve(process.env.EVIDENCE_DIR ?? resolve(process.cwd(), 'qa-evidence/natural-entry-r1-20260925'));
const testedCommit = process.env.TESTED_COMMIT ?? 'unknown';
const landscapeViewports = [
  { id: '1280x720', width: 1_280, height: 720 },
  { id: '844x390', width: 844, height: 390 },
] as const;

function hash(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function screenshot(page: Page, path: string): Promise<{ path: string; sha256: string }> {
  await page.screenshot({ path, fullPage: true });
  return { path, sha256: hash(await readFile(path)) };
}

async function preparePage(page: Page, width: number, height: number, requireVisibleSurface = true): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('GPU stall')) errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.clear());
  await page.setViewportSize({ width, height });
  await page.goto(`${baseUrl}?seed=31&fresh=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#app')?.getAttribute('data-ui-preload') === 'ready');
  if (requireVisibleSurface) await page.locator('[data-action="grapple"]').waitFor({ state: 'visible' });
  return errors;
}

async function runLandscape(browser: Awaited<ReturnType<typeof chromium.launch>>, viewport: (typeof landscapeViewports)[number]): Promise<Record<string, unknown>> {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const errors = await preparePage(page, viewport.width, viewport.height);
  const shots: Record<string, unknown> = {};
  shots.startup = await screenshot(page, resolve(evidenceDir, `${viewport.id}-startup.png`));
  const surface = page.locator('[data-action="grapple"]');
  const box = await surface.boundingBox();
  assert.ok(box, `${viewport.id}: formal grapple surface must be visible`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  let tutorialResultTitle = '';
  for (let attempt = 0; attempt < 4 && !tutorialResultTitle; attempt += 1) {
    for (let cycle = 0; cycle < 60; cycle += 1) {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.waitForTimeout(240);
      await page.mouse.up();
      await page.waitForTimeout(60);
      if (await page.locator('[data-ui="result"]').isVisible()) break;
    }
    const candidateTitle = (await page.locator('[data-ui="result-title"]').textContent())?.trim() ?? '';
    if (await page.locator('[data-action="continue"]').isVisible()) {
      tutorialResultTitle = candidateTitle;
      break;
    }
    if (await page.locator('[data-action="restart"]').isVisible()) {
      await page.locator('[data-action="restart"]').click();
      await page.locator('[data-ui="result"]').waitFor({ state: 'hidden' });
      await page.waitForTimeout(250);
    }
  }
  assert.ok(tutorialResultTitle.length > 0, `${viewport.id}: tutorial must reach a visible settlement card through formal input`);
  await page.locator('[data-action="continue"]').waitFor({ state: 'visible' });
  shots.tutorialSettlement = await screenshot(page, resolve(evidenceDir, `${viewport.id}-tutorial-settlement.png`));
  await page.locator('[data-action="continue"]').click();
  await page.locator('[data-ui="result"]').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => (document.querySelector('[data-ui="level-title"]')?.textContent ?? '').includes('无限夜巡'));
  shots.nightPatrol = await screenshot(page, resolve(evidenceDir, `${viewport.id}-night-patrol.png`));
  await page.locator('[data-ui="result"]').waitFor({ state: 'visible', timeout: 12_000 });
  const failedResultTitle = (await page.locator('[data-ui="result-title"]').textContent())?.trim() ?? '';
  assert.ok(failedResultTitle.length > 0, `${viewport.id}: night patrol must show a failure settlement without injected state`);
  shots.failureSettlement = await screenshot(page, resolve(evidenceDir, `${viewport.id}-failure-settlement.png`));
  await page.locator('[data-action="restart"]').click();
  await page.locator('[data-ui="result"]').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => (document.querySelector('[data-ui="level-title"]')?.textContent ?? '').includes('无限夜巡'));
  shots.replay = await screenshot(page, resolve(evidenceDir, `${viewport.id}-replay.png`));
  assert.deepEqual(errors, [], `${viewport.id}: natural browser path must have no console/page errors`);
  await page.close();
  return {
    viewport: `${viewport.width}x${viewport.height}`,
    tutorialSettlement: { title: tutorialResultTitle, continueVisible: true },
    nightPatrol: { levelTitle: '无限夜巡', input: 'formal pointer hold/release only' },
    failureSettlement: { title: failedResultTitle, cause: 'natural no-input patrol failure' },
    replay: { levelTitle: '无限夜巡', resultHidden: true },
    screenshots: shots,
    consoleErrors: errors,
    pageErrors: errors,
  };
}

async function runPortrait(browser: Awaited<ReturnType<typeof chromium.launch>>): Promise<Record<string, unknown>> {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = await preparePage(page, 390, 844, false);
  const orientation = page.locator('[data-ui="orientation-block"]');
  await orientation.waitFor({ state: 'visible' });
  assert.equal(await orientation.isVisible(), true);
  assert.equal(await page.locator('#app').getAttribute('data-orientation-blocked'), 'true');
  const beforeDistance = await page.locator('[data-ui="distance"]').textContent();
  const box = await page.locator('[data-action="grapple"]').boundingBox();
  assert.ok(box, 'portrait: formal grapple surface must exist behind orientation guard');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
  const afterDistance = await page.locator('[data-ui="distance"]').textContent();
  assert.equal(afterDistance, beforeDistance, 'portrait: orientation block must keep gameplay paused');
  const shotPath = resolve(evidenceDir, '390x844-orientation-paused.png');
  const shot = await screenshot(page, shotPath);
  assert.deepEqual(errors, [], 'portrait: natural browser path must have no console/page errors');
  await page.close();
  return {
    viewport: '390x844',
    orientationPromptVisible: true,
    orientationBlocked: true,
    distanceBefore: beforeDistance,
    distanceAfter: afterDistance,
    pausedByStableDistance: true,
    screenshot: shot,
    consoleErrors: errors,
    pageErrors: errors,
  };
}

async function main(): Promise<void> {
  await mkdir(evidenceDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  try {
    const landscapes = [];
    for (const viewport of landscapeViewports) landscapes.push(await runLandscape(browser, viewport));
    const portrait = await runPortrait(browser);
    const report = {
      schemaVersion: 1,
      artifactType: 'natural-runtime-r1-report',
      testedCommit,
      entry: { url: baseUrl, input: 'formal pointer hold/release and visible result actions; no state APIs' },
      landscapes,
      portrait,
      evidenceGaps: [
        'This natural journey checks the existing gameplay route; it is separate from the dev render inspection report.',
        'Rooftops art remains a rendering inspection subject; this run does not claim a seam repair.',
      ],
    };
    const reportPath = resolve(evidenceDir, 'report.json');
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ reportPath, landscapes: landscapes.length, portrait: true }, null, 2));
  } finally {
    await browser.close();
  }
}

await main();
