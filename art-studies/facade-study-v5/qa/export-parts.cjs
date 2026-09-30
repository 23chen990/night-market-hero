const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const root = path.resolve(__dirname, '..'), browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(root, 'preview.html')).href);
    await page.waitForFunction(() => window.previewReady);
    const ids = ['nearFacade', 'midFacade', 'roofCode', 'roofMid', 'clothLeft', 'clothCenter', 'clothRight'];
    fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
    for (const id of ids) {
      const data = await page.evaluate(id => window.exportFacade(id), id);
      fs.writeFileSync(path.join(root, 'assets', `${id}.png`), Buffer.from(data.split(',')[1], 'base64'));
    }
    const composite = await page.evaluate(ids => {
      const arts = { ...createFacadeArt(), ...createSceneSurfaces() }, cellW = 350, cellH = 260;
      const c = document.createElement('canvas'); c.width = cellW * 3; c.height = cellH * ids.length;
      const g = c.getContext('2d');
      ids.forEach((id, row) => ['#e5e7e9', '#0b1423', '#f223a2'].forEach((color, col) => {
        const x = col * cellW, y = row * cellH, art = arts[id], s = Math.min((cellW - 24) / art.width, (cellH - 38) / art.height);
        g.fillStyle = color; g.fillRect(x, y, cellW, cellH);
        g.drawImage(art, x + (cellW - art.width * s) / 2, y + 30 + (cellH - 38 - art.height * s) / 2, art.width * s, art.height * s);
        g.fillStyle = col === 1 ? '#fafafa' : '#111'; g.font = '14px sans-serif'; g.fillText(`${id} / ${color}`, x + 12, y + 20);
      }));
      return c.toDataURL('image/png');
    }, ids);
    fs.writeFileSync(path.join(root, 'qa/code-parts-on-backgrounds.png'), Buffer.from(composite.split(',')[1], 'base64'));
    console.log('Exported six transparent code parts and light/dark/saturated composites.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
