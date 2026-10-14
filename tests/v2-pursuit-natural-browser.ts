/** Actual browser-touch pursuit failure path: normal tutorial + night
 * patrol until district three, then a deliberately held grapple. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GrappleState } from '../src/game-core.ts';
const out=resolve('evidence/v2-pursuit');await mkdir(out,{recursive:true});
const entry=resolve('dist/index.html');
const sha256=createHash('sha256').update(await readFile(entry)).digest('hex');
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,
  recordVideo:{dir:out,size:{width:844,height:390}}});
const page=await context.newPage();page.setDefaultTimeout(7000);
const cdp=await context.newCDPSession(page);
const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
const report:Record<string,unknown>={sha256,passed:false,
  method:'real touch and visible buttons; no game state mutation'};
const controls:Array<{tick:number;action:string;segment:number}>=[];
const chase:Array<{tick:number;phase:string;gap:number;segment:number}>=[];
report.input=controls;report.chase=chase;
// Natural falls before the intended chase are real failures and remain in the
// unedited report/video. A visible in-game revive or restart may be used to
// make a SECOND genuine attempt, never to relabel the fall as an officer.
const preCaptureFailures:Array<{reason:string|null;segment:number;tick:number;playerX:number}>=[];
report.preCaptureFailures=preCaptureFailures;
let recoveryAttempts=0;
let held=false,holdAt=-999,releaseAt=-999,stalled=false,tutorial=false;
const state=():Promise<GrappleState>=>page.evaluate(()=>(window as unknown as {
  __PROTOTYPE_TEST__:{getState():GrappleState}
}).__PROTOTYPE_TEST__.getState());
const edge=async(down:boolean,s:GrappleState):Promise<void>=>{
  if(held===down)return;
  await cdp.send('Input.dispatchTouchEvent',{type:down?'touchStart':'touchEnd',
    touchPoints:down?[{x:90,y:280,id:1}]:[]});
  held=down;if(down)holdAt=s.tick;else releaseAt=s.tick;
  controls.push({tick:s.tick,action:down?'press':'release',segment:s.segmentIndex});
};
let failure:Error|undefined;
try{
  await page.goto(pathToFileURL(entry).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean((window as unknown as {__PROTOTYPE_TEST__?:unknown}).__PROTOTYPE_TEST__));
  await page.locator('[data-action="start-run"]').click();
  const began=Date.now();let previousPhase='';
  for(let i=0;Date.now()-began<125_000;i++){
    const s=await state();
    if(s.levelId==='night-patrol'&&(s.chase.phase!==previousPhase||i%10===0)){
      chase.push({tick:s.tick,phase:s.chase.phase,gap:s.chase.distance,segment:s.segmentIndex});
      previousPhase=s.chase.phase;
    }
    if(s.status!=='playing'){
      await edge(false,s);
      if(s.levelId!=='night-patrol'&&s.status==='won'){
        tutorial=true;
        await page.locator('[data-action="continue"]').click();
        releaseAt=-999;holdAt=-999;continue;
      }
      if(s.status==='failed'&&s.failureReason==='fell'&&!stalled&&recoveryAttempts<2){
        const revive=page.locator('[data-action="revive"]');
        const restart=page.locator('[data-action="restart"]');
        const canRevive=await revive.isVisible();
        const canRestart=await restart.isVisible();
        if(canRevive||canRestart){
          preCaptureFailures.push({reason:s.failureReason,segment:s.segmentIndex,
            tick:s.tick,playerX:s.player.x});
          await page.screenshot({path:out+`/pre-capture-fall-${recoveryAttempts+1}.png`});
          if(canRevive) await revive.click();
          else await restart.click();
          recoveryAttempts++;
          // This is a genuine UI recovery, with recorded touch history and a
          // continuous screen video. No reset/teleport/test-scene API is used.
          releaseAt=-999;holdAt=-999;previousPhase='';
          continue;
        }
      }
      report.result={status:s.status,reason:s.failureReason,segment:s.segmentIndex,
        gap:s.chase.distance,playerY:s.player.y,netTop:s.pursuer.runLaneY-310,
        guardX:s.pursuer.x,playerX:s.player.x,tick:s.tick};
      await page.screenshot({path:out+'/officer-caught.png'});
      break;
    }
    if(s.levelId==='night-patrol'&&s.segmentIndex>=3)stalled=true;
    const anchor=s.anchors.find(a=>a.id===s.attachedAnchorId);
    const normal=s.vehicleId?s.vehicleId==='货运滑索'?s.vehicleTicksRemaining>100:s.player.y>390
      :anchor?!(s.player.x>anchor.x+12&&s.player.vx>0&&s.player.vy<60)&&s.player.vx>=0&&s.tick-holdAt<160
      :s.tick-releaseAt>(s.player.y>600?8:18)
        &&(s.player.vy>0||s.player.y>540||s.inputTransitions===0);
    await edge(stalled||normal,s);
    await page.waitForTimeout(60);
  }
  const v=report.result as {status:string;reason:string;segment:number;gap:number;playerY:number;netTop:number}|undefined;
  assert.ok(tutorial&&stalled,'must naturally complete tutorial and intentionally stall');
  assert.equal(v?.status,'failed','real input must reach a terminal state');
  assert.equal(v.reason,'caught','falling cannot substitute for officer capture');
  assert.ok(v.segment>=2&&v.gap<=60&&v.playerY>=v.netTop,'guard contact must match net geometry');
  assert.ok(chase.some(c=>['alert','danger','climax'].includes(c.phase)),'visible guard escalation needed');
  assert.ok(controls.some(c=>c.action==='press')&&controls.some(c=>c.action==='release'));
  assert.deepEqual(errors,[]);
  report.passed=true;
}catch(e){failure=e instanceof Error?e:new Error(String(e));report.error=String(e)}
finally{
  report.tutorialCompleted=tutorial;report.deliberatelyHeld=stalled;report.errors=errors;
  report.recoveryAttempts=recoveryAttempts;
  await context.close();
  try{
    await page.video()?.saveAs(out+'/pursuit-natural.webm');
    const bytes=await readFile(out+'/pursuit-natural.webm');
    assert.ok(bytes.length>65_536,'real officer-capture video is required');
    report.continuousVideo={path:'pursuit-natural.webm',bytes:bytes.length,
      sha256:createHash('sha256').update(bytes).digest('hex')};
  }catch(e){if(!failure)failure=e instanceof Error?e:new Error(String(e));report.passed=false}
  await writeFile(out+'/pursuit-natural.json',JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
if(failure)throw failure;
console.log(JSON.stringify({sha256,passed:true,result:report.result}));
