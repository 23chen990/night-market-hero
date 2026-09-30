const {chromium}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
  const root=path.resolve(__dirname,'..');const browser=await chromium.launch();
  try {
    const page=await browser.newPage({viewport:{width:1672,height:1100},deviceScaleFactor:1});
    await page.goto(pathToFileURL(path.join(root,'preview.html')).href);
    await page.waitForFunction(()=>window.previewReady);
    const save=(file,data)=>fs.writeFileSync(path.join(root,file),Buffer.from(data.split(',')[1],'base64'));
    save('screen.png',await page.evaluate(()=>window.exportPreview()));
    save('sky.png',await page.evaluate(()=>window.exportSky()));
    fs.writeFileSync(path.join(root,'qa/placements.json'),JSON.stringify(await page.evaluate(()=>window.previewInfo),null,2));
    await page.getByRole('button',{name:'缺口提示',exact:true}).click();
    save('gaps.png',await page.locator('#view').evaluate(c=>c.toDataURL('image/png')));
    await page.getByRole('button',{name:'完整画面',exact:true}).click();
    await page.getByRole('button',{name:'素材位置',exact:true}).click();
    await page.getByRole('button',{name:'牌坊横梁',exact:true}).click();
    save('material-inspection.png',await page.locator('#view').evaluate(c=>c.toDataURL('image/png')));
    await page.getByRole('button',{name:'完整画面',exact:true}).click();
    await page.setViewportSize({width:844,height:640});
    await page.locator('#view').screenshot({path:path.join(root,'screen-mobile.png')});
    console.log('Exported single-screen, source outline, gap and phone evidence');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
