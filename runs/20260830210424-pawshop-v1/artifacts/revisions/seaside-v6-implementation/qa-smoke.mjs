import { chromium } from '/Users/kker/Documents/ChatGPT/妖怪夜市/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = '/Users/kker/Documents/ChatGPT/妖怪夜市/runs/20260830210424-pawshop-v1/artifacts/revisions/seaside-v6-implementation/evidence';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
for (const [name, width, height] of [['portrait-360x800',360,800],['portrait-390x844',390,844],['portrait-430x932',430,932]]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const consoleErrors = []; const pageErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => pageErrors.push(String(e)));
  await page.goto('http://127.0.0.1:4325/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
    upgradeButton: !!document.querySelector('#upgrade-button'),
    buttonRect: document.querySelector('#upgrade-button')?.getBoundingClientRect().toJSON(),
    canvas: !!document.querySelector('canvas'),
  }));
  await page.click('#upgrade-button');
  const panel = await page.locator('#upgrade-panel').evaluate(el => ({ hidden: el.hidden, text: el.textContent }));
  results.push({ name, width, height, metrics, panel, consoleErrors, pageErrors });
  await page.close();
}
await browser.close();
fs.writeFileSync(`${out}/qa-smoke.json`, JSON.stringify({ schemaVersion: 1, results }, null, 2));
console.log(JSON.stringify({ results }, null, 2));
