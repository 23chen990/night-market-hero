import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { z } from 'zod';
import { QaReportSchema } from '../../../../src/schemas/index.ts';
import { visible, decode, components, sha } from './attempt-6-recovery/qa-lib.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const workspace = path.join(root, 'workspace/game');
const TaskSchema = z.object({schemaVersion:z.literal(1),role:z.literal('QAAgent'),workspace:z.string(),ownership:z.string(),inputs:z.array(z.string()),acceptance:z.array(z.string()),output:z.string()}).strict();
const task = TaskSchema.parse(JSON.parse(await fs.readFile(new URL('./task-deterministic-resume.json',import.meta.url))));
if (task.workspace !== workspace) throw new Error('Task workspace binding mismatch');
const attempt = 7;
const fixtureCorrection = 'completeOrder stops with the customer still packing (320 ms packing minus 200 ms advanced after service). Explicitly finish the remaining packing duration, assert cash on counter with wallet unchanged, leave and return to collect, then assert full sale value in wallet.';
const viewports = [[360,800],[390,844],[430,932],[540,960],[844,390],[1440,900]];
const output = path.join(root, `artifacts/qa-retest-20261008/attempt-${attempt}/deterministic-resume`);
await fs.mkdir(output, {recursive:true});
const manifest = JSON.parse(await fs.readFile(path.join(root, `artifacts/fix/attempt-${attempt}/build-manifest.json`)));
const files = await Promise.all(manifest.files.map(async f => ({path:f.path,expected:f.sha256,actual:sha(await fs.readFile(path.join(workspace,f.path)))})));
const checks = [{name:'immutable-build-source-binding',passed:files.every(f=>f.expected===f.actual),evidence:JSON.stringify(files)}];
const screenshots = [], consoleErrors = [], pageErrors = [];
const browser = await chromium.launch({headless:true});
try {
  for (const [width,height] of viewports) {
    const context = await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    const page = await context.newPage();
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
    page.on('pageerror',e=>pageErrors.push(String(e)));
    await page.goto((process.env.SHOP_QA_URL ?? 'http://127.0.0.1:4177')+'/?qa=deterministic-'+width+'x'+height);
    await page.waitForFunction(()=>!!window.__GAME_TEST__);
    const flow = await page.evaluate(()=>{
      const api=window.__GAME_TEST__;
      api.resetGame();api.setRandomSeed(11);
      const packing=api.completeOrder();
      const packingCustomer=packing.customers.find(customer=>customer.phase==='packing');
      const expectedSale=packingCustomer?.basketValue ?? 0;
      const remainingPackingMs=packingCustomer?.packingRemainingMs ?? 0;
      const counter=api.advanceTime(remainingPackingMs);
      api.setPlayerPosition({x:0,y:0});
      const armed=api.advanceTime(50);
      api.setPlayerPosition({x:270,y:640});
      const sold=api.advanceTime(50);
      api.resetGame();api.grantCurrency(14);api.setPlayerPosition({x:410,y:720});
      const settled=api.advanceTime(1300);
      const continued=api.continueGame();
      return {packingPhase:packingCustomer?.phase,remainingPackingMs,expectedSale,packingCurrency:packing.currency,packingCashPile:packing.cashPile,counterCurrency:counter.currency,counterCashPile:counter.cashPile,counterPhase:counter.customers.find(customer=>customer.id===packingCustomer?.id)?.phase,cashCollectionArmed:armed.cashCollectionArmed,saleCurrency:sold.currency,saleCashPile:sold.cashPile,settledStage:settled.stage,continuedStage:continued.stage,unlocked:continued.unlockedStationIds};
    });
    checks.push({name:`fixture-core-settlement-${width}x${height}`,passed:flow.packingPhase==='packing'&&flow.remainingPackingMs>0&&flow.expectedSale>0&&flow.packingCurrency===0&&flow.packingCashPile===0&&flow.counterCurrency===0&&flow.counterCashPile===flow.expectedSale&&flow.counterPhase==='leaving'&&flow.cashCollectionArmed===true&&flow.saleCurrency===flow.expectedSale&&flow.saleCashPile===0&&flow.settledStage==='settlement'&&flow.continuedStage==='operating',evidence:JSON.stringify(flow)});
    await page.evaluate(()=>{const api=window.__GAME_TEST__;api.resetGame();api.grantCurrency(8);api.setPlayerPosition({x:410,y:720});api.advanceTime(1300);});
    await page.waitForTimeout(300);
    const ui = await visible(page);
    const local = ui.buttons.filter(b=>b.text.includes('继续当地'));
    const file=path.join(output,`${width}x${height}-settlement.png`);
    await page.screenshot({path:file});screenshots.push(file);
    checks.push({name:`fixture-settlement-controls-${width}x${height}`,passed:ui.settlementVisible&&local.length===1&&ui.overflow.width<=width&&ui.overflow.height<=height,evidence:JSON.stringify({ui,screenshot:file})});
    await page.locator('#continue-round').click();
    await page.waitForTimeout(350);
    const afterContinue=await visible(page);
    checks.push({name:`fixture-continue-topology-${width}x${height}`,passed:!afterContinue.selectionVisible&&!afterContinue.settlementVisible,evidence:JSON.stringify(afterContinue)});
    for(const point of [{x:174,y:786},{x:120,y:820},{x:270,y:820}]){
      await page.evaluate(p=>window.__GAME_TEST__.setPlayerPosition(p),point);
      await page.waitForTimeout(900);
      const box=await page.locator('#game canvas').boundingBox();
      const png=await page.screenshot({clip:box});
      const im=decode(png);
      const teal=components(im,[44,155,155],8,12);
      const avatarFile=path.join(output,`${width}x${height}-avatar-${point.x}-${point.y}.png`);
      await fs.writeFile(avatarFile,png);screenshots.push(avatarFile);
      checks.push({name:`fixture-avatar-${width}x${height}-${point.x}-${point.y}`,passed:teal.some(c=>c.n>=20),evidence:JSON.stringify({point,teal,screenshot:avatarFile})});
    }
    await page.evaluate(()=>{const api=window.__GAME_TEST__;api.setPlayerPosition({x:480,y:840});api.advanceTime(700);});
    await page.waitForTimeout(300);
    const selection=await visible(page);
    checks.push({name:`fixture-distinct-market-choices-${width}x${height}`,passed:selection.selectionVisible&&selection.buttons.some(b=>b.text.includes('珊瑚湾'))&&selection.buttons.some(b=>b.text.includes('月潮')),evidence:JSON.stringify(selection)});
    await context.close();
  }
} finally {await browser.close();}
checks.push({name:'runtime-console',passed:consoleErrors.length===0&&pageErrors.length===0,evidence:JSON.stringify({consoleErrors,pageErrors})});
const report=QaReportSchema.parse({schemaVersion:1,passed:checks.every(c=>c.passed),checks,issues:checks.filter(c=>!c.passed).map(c=>({id:c.name,severity:'error',message:c.name+' failed',evidence:c.evidence})),screenshots,consoleLog:JSON.stringify({consoleErrors,pageErrors,track:'deterministic-fixture-implementation-evidence-only'}),testedAt:new Date().toISOString()});
await fs.writeFile(path.join(output,'qa-report.json'),JSON.stringify(report,null,2)+'\n');
const summary=z.object({schemaVersion:z.literal(1),role:z.literal('QAAgent'),targetGame:z.string(),workspace:z.string(),track:z.literal('deterministic-fixture-implementation-evidence-only'),report:z.string(),passed:z.boolean(),checkCount:z.number().int(),failures:z.array(z.string()),viewports:z.array(z.string()),fixtureCorrection:z.string(),remainingEvidence:z.array(z.string()),testedAt:z.string()}).strict().parse({schemaVersion:1,role:'QAAgent',targetGame:'海滩渔货铺',workspace,track:'deterministic-fixture-implementation-evidence-only',report:path.join(output,'qa-report.json'),passed:report.passed,checkCount:checks.length,failures:report.issues.map(i=>i.id),viewports:viewports.map(([w,h])=>`${w}x${h}`),fixtureCorrection,remainingEvidence:['Independent natural-input and perceptual gates remain separate and cannot be closed by this fixture suite.'],testedAt:report.testedAt});
await fs.writeFile(new URL('./'+task.output,import.meta.url),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
