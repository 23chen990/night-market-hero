import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { webkit } from '@playwright/test';

const browser = await webkit.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 720 } });
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto(pathToFileURL(resolve('夜市飞侠-护印突围-试玩版.html')).href);
await page.waitForFunction(() => Boolean((window as Window & { __PROTOTYPE_TEST__?: unknown }).__PROTOTYPE_TEST__));
await page.waitForSelector('canvas');
assert.equal(await page.locator('canvas').count(), 1);
assert.equal(await page.locator('#app').getAttribute('data-ui-preload'), 'ready');
assert.equal(await page.locator('#app').evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(8, 24, 35)');
assert.deepEqual(errors, []);

await browser.close();
console.log('file-launch-smoke: passed');
