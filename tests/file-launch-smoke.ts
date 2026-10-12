import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { webkit } from '@playwright/test';

const directory = await mkdtemp(join(tmpdir(), 'night-market-standalone-'));
const renamed = join(directory, 'My downloaded game.html');
await copyFile(resolve('dist/index.html'), renamed);
const browser = await webkit.launch({ headless: true });
try {
  for (const entry of [resolve('夜市飞侠-护印突围-试玩版.html'), renamed]) {
    const page = await browser.newPage({ viewport: { width: 1180, height: 720 } });
    const errors: string[] = [];
    const remote: string[] = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
    page.on('request', request => { if (/^https?:/.test(request.url())) remote.push(request.url()); });
    const url = pathToFileURL(entry).href;
    await page.goto(url);
    await page.waitForFunction(() => Boolean((window as Window & { __PROTOTYPE_TEST__?: unknown }).__PROTOTYPE_TEST__));
    await page.waitForSelector('canvas');
    assert.equal(page.url(), url, 'standalone must not redirect to a prescribed filename');
    assert.equal(await page.locator('canvas').count(), 1);
    assert.equal(await page.locator('#app').getAttribute('data-ui-preload'), 'ready');
    assert.equal(await page.locator('#app').evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.deepEqual(errors, []);
    assert.deepEqual(remote, [], 'single-file startup must not fetch remote dependencies');
    await page.close();
  }
} finally { await browser.close(); await rm(directory, { recursive: true, force: true }); }
console.log('file-launch-smoke: original and isolated renamed file passed');
