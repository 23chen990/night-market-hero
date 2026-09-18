import { chromium } from '@playwright/test';

async function main() {
  const baseUrl = 'http://127.0.0.1:4178/?seed=31';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean((window as any).__PROTOTYPE_TEST__ && (window as any).__FORMAL_TEST__));
  const s = await page.evaluate(() => {
    const state = (window as any).__PROTOTYPE_TEST__.getState();
    const t = document.querySelector<HTMLElement>('[data-ui="tutorial-stage"]');
    return {
      keys: Object.keys(state).slice(0, 40),
      tick: state.tick,
      levelId: state.levelId,
      status: state.status,
      levelIndex: state.levelIndex,
      tutorial: t?.textContent ?? null,
      resultHidden: (document.querySelector<HTMLElement>('[data-ui="result"]')?.hidden) ?? null,
    };
  });
  console.log(JSON.stringify(s, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
