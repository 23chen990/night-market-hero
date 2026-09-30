const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(root, 'preview.html')).href);
    await page.waitForFunction(() => window.previewReady);
    const info = await page.evaluate(() => window.previewInfo);
    const parts = ['nearFacade', 'midFacade', 'roofCode', 'roofMid', 'clothLeft', 'clothCenter', 'clothRight'];
    for (const part of parts) assert.ok(info.materialIds.includes(part), `Code part ${part} must be assembled, not left in an unused file`);
    const results = await page.evaluate(parts => {
      const art = createFacadeArt(), surfaces = createSceneSurfaces();
      const repeat = { ...createFacadeArt(), ...createSceneSurfaces() };
      return parts.map(id => {
        const c = { ...art, ...surfaces }[id];
        const bytes = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let empty = 0, solid = 0, partial = 0, borderAlpha = 0;
        for (let i = 3; i < bytes.length; i += 4) { if (bytes[i] === 0) empty++; else if (bytes[i] === 255) solid++; else partial++; }
        if (id === 'roofMid') for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (x === 0 || y === 0 || x === c.width - 1 || y === c.height - 1) borderAlpha += bytes[(y * c.width + x) * 4 + 3];
        return { id, width: c.width, height: c.height, empty, solid, partial, borderAlpha, deterministic: c.toDataURL() === repeat[id].toDataURL() };
      });
    }, parts);
    for (const p of results) {
      assert.ok(p.empty > p.width * p.height * .04, `${p.id} must have meaningful transparent exterior`);
      assert.ok(p.solid > p.width * p.height * .08, `${p.id} must retain solid material`);
      assert.ok(p.partial > 0, `${p.id} must have antialiased edges`);
      assert.equal(p.deterministic, true, `${p.id} must be repeatable`);
      if (p.id === 'roofMid') assert.equal(p.borderAlpha, 0, 'Interior roof must have transparent margins; near-framing cropped geometry cannot serve the central branch');
    }
    const center = info.placements.find(p => p.id === 'clothCenter');
    assert.ok(center.x >= 600 && center.x <= 730 && center.y >= 460 && center.y <= 540, 'Central drape must occupy the reference branch below the open flight corridor');
    assert.equal(info.completePanoramaInputs, 0);
    assert.equal(info.runtimeIntegrated, false);
    fs.writeFileSync(path.join(root, 'qa/code-parts-check.json'), JSON.stringify({ passed: true, scope: 'offline code part generation and assembly only', results }, null, 2));
    console.log('PASS: 7 placed code parts, real transparency, central roof margins, deterministic exports, central canopy branch');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
