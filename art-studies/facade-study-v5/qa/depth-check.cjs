const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  const root = path.resolve(__dirname, '..'), browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(root, 'preview.html')).href);
    await page.waitForFunction(() => window.previewReady);
    const depth = await page.evaluate(() => {
      const g = document.querySelector('#view').getContext('2d');
      const mean = (x,y,w,h) => { const d=g.getImageData(x,y,w,h).data; let n=0;for(let i=0;i<d.length;i+=4)n+=d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722;return n/(w*h); };
      return { foreground:mean(0,180,180,180), background:mean(840,170,185,150) };
    });
    assert.ok(depth.foreground < depth.background * .72, `Near timber must read distinctly darker than atmospheric distance: ${JSON.stringify(depth)}`);
    fs.writeFileSync(path.join(root,'qa/depth-check.json'), JSON.stringify({ passed:true, measured:depth, limitation:'This is a relative depth guard, not a percentage of visual similarity.' },null,2));
    console.log('PASS: close timber remains darker than distance', depth);
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
