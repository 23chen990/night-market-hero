const { chromium } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({viewport:{width:1440,height:1060},deviceScaleFactor:1});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const requests=[]; page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
  try {
    await page.goto(pathToFileURL(path.join(root,'preview.html')).href);
    await page.waitForFunction(()=>window.previewReady,{timeout:5000});
    assert.equal(await page.locator('canvas#view').count(),1);
    assert.equal(await page.evaluate(()=>window.previewInfo.completePanoramaInputs),0);
    const used=await page.evaluate(()=>window.previewInfo.materialIds);
    for(const id of ['innerEave','eave','beam','scaffold','banner','canopy','cart','stall','lanternCable','lantern']) assert.ok(used.includes(id),'Missing visible material: '+id);
    assert.equal(await page.evaluate(()=>window.previewInfo.codeRoofGeometry),false);
    const start=await page.evaluate(()=>window.previewInfo.cameraX);
    await page.getByRole('button',{name:'下一段',exact:true}).click();
    await page.waitForFunction(x=>window.previewInfo.cameraX>x, start);
    await page.locator('#position').focus(); await page.keyboard.press('End');
    await page.waitForFunction(()=>window.previewInfo.cameraX===window.previewInfo.maxCameraX);
    await page.getByRole('button',{name:'自动漫游',exact:true}).click();
    await page.waitForTimeout(250);
    assert.equal(await page.getByRole('button',{name:'暂停漫游',exact:true}).count(),1);
    await page.getByRole('button',{name:'暂停漫游',exact:true}).click();
    await page.getByRole('button',{name:'画面组成',exact:true}).click();
    assert.equal(await page.locator('#breakdown').isVisible(),true);
    for(const [label,width,height] of [['desktop',1672,1120],['phone',844,640]]){
      await page.setViewportSize({width,height});
      await page.locator('#position').focus(); await page.keyboard.press('Home');
      await page.waitForTimeout(100);
      await page.screenshot({path:path.join(root,'qa',label+'-page.png'),fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
    assert.deepEqual(errors,[]); assert.deepEqual(requests,[]);
    const info=await page.evaluate(()=>window.previewInfo);
    fs.writeFileSync(path.join(root,'qa','browser-check.json'),JSON.stringify({passed:true,scope:'isolated art preview only; no gameplay or platform QA',errors,externalRequests:requests,controls:['next','slider keyboard','play/pause','layer breakdown'],viewports:['1672x1120','844x640'],info},null,2));
    console.log('PASS: offline preview, navigation, responsive page, no external requests/errors');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
