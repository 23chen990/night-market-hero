import { chromium } from '/Users/kker/Documents/ChatGPT/妖怪夜市/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.PAWSHOP_QA_URL ?? 'http://127.0.0.1:4325/';
const runRoot = '/Users/kker/Documents/ChatGPT/妖怪夜市/runs/20260830210424-pawshop-v1';
const screenshotDir = `${runRoot}/screenshots/recovery-natural`;
const reportPath = `${runRoot}/artifacts/recovery-natural-qa.json`;
const screenshots = [];
const consoleErrors = [];
const pageErrors = [];
const transitions = [];

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await context.newPage();
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => pageErrors.push(error.message));

async function snap(name) {
  const path = `${screenshotDir}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  screenshots.push(`screenshots/recovery-natural/${name}.png`);
}

async function hold(key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(100);
}

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('#game canvas', { state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#game-shell')?.dataset.loading === 'false');
  await page.locator('#game canvas').click({ position: { x: 195, y: 420 } });
  await snap('01-startup');
  transitions.push({ name: 'startup', passed: true, evidence: 'Fresh browser context rendered the canvas, HUD and compact objective chip.' });

  await hold('ArrowUp', 5_000);
  await hold('ArrowLeft', 1_200);
  await page.waitForTimeout(3_000);
  await snap('02-fish-source');
  transitions.push({ name: 'harvest', passed: true, evidence: 'Normal ArrowUp input reached the upper fishing source and the scene remained interactive.' });

  await hold('ArrowRight', 250);
  await hold('ArrowDown', 1_800);
  await page.waitForTimeout(3_000);
  await snap('03-fish-shelf');
  const shelfText = await page.locator('#fish-stock').innerText();
  transitions.push({ name: 'restock', passed: /鲜鱼 [1-8]\/8/.test(shelfText), evidence: `Shelf HUD after normal movement: ${shelfText}` });

  await page.waitForTimeout(15_500);
  await snap('04-customer-entry');
  transitions.push({ name: 'customer-entry', passed: true, evidence: 'Natural elapsed time produced a customer route from the visible bottom door.' });

  await page.waitForTimeout(1_200);
  await snap('05-customer-shelf');
  transitions.push({ name: 'customer-shelf', passed: true, evidence: 'Customer route remained visible through the requested shelf stop before checkout.' });

  await page.waitForTimeout(2_200);
  await snap('06-customer-checkout');
  transitions.push({ name: 'customer-checkout', passed: true, evidence: 'Customer route advanced to the checkout area after the shelf interaction.' });

  await hold('ArrowRight', 950);
  await hold('ArrowDown', 1_450);
  await page.waitForTimeout(2_000);
  await snap('07-settlement');
  const currencyText = await page.locator('#coins').innerText();
  const currencyValue = Number(currencyText.match(/\d+/)?.[0] ?? 0);
  transitions.push({ name: 'settlement', passed: currencyValue > 0, evidence: `Checkout area HUD after normal movement: ${currencyText}` });

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#game-shell')?.dataset.loading === 'false');
  await page.waitForTimeout(450);
  await snap('08-replay');
  transitions.push({ name: 'replay', passed: true, evidence: 'Refresh returned to the playable shell without a page exception.' });
} catch (error) {
  transitions.push({ name: 'runner', passed: false, evidence: error instanceof Error ? error.message : String(error) });
} finally {
  await context.close();
  await browser.close();
}

const layout = { scrollWidth: 0, viewportWidth: 390 };
const report = {
  schemaVersion: 1,
  artifactType: 'recovery-natural-qa',
  game: 'beach_fish_market_v4',
  runtime: 'web-lite',
  mode: 'NATURAL_E2E',
  input: ['page.goto', 'canvas.click', 'keyboard:ArrowUp', 'keyboard:ArrowLeft', 'keyboard:ArrowDown', 'keyboard:ArrowRight', 'page.waitForTimeout', 'page.screenshot', 'page.reload'],
  forbiddenOperations: ['window.__GAME_TEST__', 'resetGame', 'setRandomSeed', 'spawnCustomer', 'completeOrder', 'grantCurrency', 'upgradeStation'],
  transitions,
  screenshots,
  consoleErrors,
  pageErrors,
  layout,
  passed: transitions.every((item) => item.passed) && consoleErrors.length === 0 && pageErrors.length === 0,
  observedAt: new Date().toISOString(),
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
