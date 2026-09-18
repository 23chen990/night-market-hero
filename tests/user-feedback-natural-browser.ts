import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4178/';
const outDir = 'qa-evidence/user-feedback-20260903';
mkdirSync(outDir, { recursive: true });

async function state(page: Page): Promise<any> {
  return page.evaluate(() => (window as any).__PROTOTYPE_TEST__?.getState?.());
}

async function playNatural(page: Page, label: string): Promise<{ label: string; state: any; tutorial: string; phases: string[] }> {
  const phases = new Set<string>();
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseUrl}?seed=31`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean((window as any).__PROTOTYPE_TEST__ && (window as any).__FORMAL_TEST__));
  await page.evaluate(() => { if ((window as any).__FORMAL_TEST__.getManifest().contractVersion !== 1) throw new Error('formal contract missing'); });
  await page.screenshot({ path: `${outDir}/${label}-startup.png`, fullPage: true });
  const surface = page.locator('[data-action="grapple"]');
  const box = await surface.boundingBox();
  if (!box) throw new Error('grapple surface missing');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  for (let i = 0; i < 45; i += 1) {
    await page.mouse.down();
    for (let sample = 0; sample < 12; sample += 1) {
      await page.waitForTimeout(20);
      const duringHold = await state(page);
      if (duringHold?.chaseObstacle?.phase) phases.add(duringHold.chaseObstacle.phase);
    }
    await page.mouse.up();
    await page.waitForTimeout(60);
    const current = await state(page);
    if (current?.chaseObstacle?.phase) phases.add(current.chaseObstacle.phase);
    if (current?.status !== 'playing') break;
  }
  await page.screenshot({ path: `${outDir}/${label}-natural.png`, fullPage: true });
  const finalState = await state(page);
  const tutorial = await page.locator('[data-ui="tutorial-stage"]').textContent();
  if (errors.length) throw new Error(`${label} console/page errors: ${errors.join(' | ')}`);
  return { label, state: finalState, tutorial: tutorial ?? '', phases: [...phases] };
}

const browser = await chromium.launch({ headless: true, args: ['--single-process'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const desktop = await playNatural(page, 'desktop');
await page.setViewportSize({ width: 844, height: 390 });
const landscape = await playNatural(page, 'landscape-844x390');
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${baseUrl}?seed=31`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean((window as any).__PROTOTYPE_TEST__ && (window as any).__FORMAL_TEST__));
await page.screenshot({ path: `${outDir}/portrait-390x844.png`, fullPage: true });
const portrait = await page.evaluate(() => ({
  orientationHidden: !(document.querySelector('[data-ui="orientation-block"]') as HTMLElement)?.hidden,
  tutorial: (document.querySelector('[data-ui="tutorial-stage"]') as HTMLElement)?.textContent,
}));
await browser.close();
console.log(JSON.stringify({ desktop, landscape, portrait, screenshots: outDir, consoleErrors: 0, pageErrors: 0 }, null, 2));
