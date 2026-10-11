import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1180, height: 720 } });
  await page.goto('http://127.0.0.1:41873/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__GAME_TEST__));
  console.log(JSON.stringify(await page.evaluate(() => ({ state: window.__GAME_TEST__.getState(), render: window.__GAME_TEST__.getRenderState() }))));
  await browser.close();
})();
