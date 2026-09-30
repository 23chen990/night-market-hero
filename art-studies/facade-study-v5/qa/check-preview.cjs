const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  try {
    await page.goto(pathToFileURL(process.env.PREVIEW_PATH || path.join(root, 'preview.html')).href);
    await page.waitForFunction(() => window.previewReady);
    assert.ok(await page.evaluate(() => window.previewInfo.materialIds.includes('nearFacade')), 'Missing near facade trial');
    assert.equal(await page.getByRole('button', { name: '素材位置', exact: true }).count(), 1, 'Missing material placement inspector');
    await page.getByRole('button', { name: '素材位置', exact: true }).click();
    assert.equal(await page.locator('#materials').isVisible(), true);
    await page.getByRole('button', { name: '牌坊横梁', exact: true }).click();
    assert.equal(await page.evaluate(() => window.previewInfo.selectedMaterial), 'beam');
    assert.ok((await page.evaluate(() => window.previewInfo.selectionCount)) > 0);
    await page.getByRole('button', { name: '近处木楼试绘', exact: true }).click();
    await page.getByRole('button', { name: '单看此部件', exact: true }).click();
    assert.equal(await page.locator('#isolated').isVisible(), true);
    assert.equal(await page.locator('#part-view').evaluate(c => c.width), 768);
    await page.getByRole('button', { name: '完整画面', exact: true }).click();
    assert.equal(await page.locator('#isolated').isVisible(), false, 'Full view must dismiss a stale isolated part');
    await page.getByRole('button', { name: '只看天空', exact: true }).click();
    assert.equal(await page.evaluate(() => window.previewInfo.mode), 'sky');
    await page.getByRole('button', { name: '完整画面', exact: true }).click();
    await page.getByRole('button', { name: '缺口提示', exact: true }).click();
    assert.equal(await page.evaluate(() => window.previewInfo.showGaps), true);
    await page.getByRole('button', { name: '对照定稿', exact: true }).click();
    assert.equal(await page.locator('#reference').isVisible(), true);
    assert.equal(await page.locator('#view').isVisible(), false);
    await page.getByRole('button', { name: '返回预览', exact: true }).click();
    assert.equal(await page.locator('#view').isVisible(), true);
    const info = await page.evaluate(() => window.previewInfo);
    assert.equal(info.completePanoramaInputs, 0);
    assert.ok(['code-study','material-study'].includes(info.facadeTechnique));
    assert.equal(info.runtimeIntegrated, false);
    assert.deepEqual(info.worldSize, [1672, 941]);
    for (const id of ['innerEave','eave','support','beam','scaffold','banner','canopy','cart','stall','lantern']) assert.ok(info.materialIds.includes(id), `Missing placed source ${id}`);
    for (const [width, height] of [[1672,1100], [844,640], [390,844]]) {
      await page.setViewportSize({ width, height });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Page overflows mobile viewport');
      await page.getByRole('button', { name: '完整画面', exact: true }).click();
      await page.screenshot({ path: path.join(root, 'qa', `page-${width}x${height}.png`), fullPage: true });
    }
    assert.deepEqual(errors, []); assert.deepEqual(requests, []);
    fs.writeFileSync(path.join(root,'qa/browser-check.json'), JSON.stringify({ passed: true, errors, externalRequests: requests, controls: ['material inspection','sky isolation','gaps','reference comparison'], info }, null, 2));
    console.log('PASS: one screen, real material selections, sky isolation, gaps, comparison, mobile layout');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
