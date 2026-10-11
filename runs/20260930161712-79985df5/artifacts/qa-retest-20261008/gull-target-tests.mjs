import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import * as qa from './qa-lib-attempt8.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const positions = { 'fish-shelf': { x: 270, y: 420 }, 'kelp-shelf': { x: 410, y: 420 }, 'smoked-shelf': { x: 420, y: 520 } };
const fixtures = [
  { id: 'landscape-alert', folder: 'natural-844x390-touch-landscape-metal-finalized', file: '039-gull-visible-target.png', crop: [2,46,528,297], landscape: true, expected: 'fish-shelf' },
  { id: 'portrait-alert', folder: 'natural-540x960-keyboard-root-metal', file: '039-gull-visible-target.png', crop: [97,216,346,615], landscape: false, expected: 'fish-shelf' },
  { id: 'phone-alert', folder: 'natural-390x844-touch-portrait-metal', file: '039-gull-visible-target.png', crop: [57,208,276,491], landscape: false, expected: 'fish-shelf' },
  { id: 'landscape-clean', folder: 'natural-844x390-touch-landscape-metal-finalized', file: '001-startup.png', crop: [2,46,528,297], landscape: true, expected: null },
  { id: 'portrait-clean', folder: 'natural-540x960-keyboard-root-metal', file: '001-startup.png', crop: [97,216,346,615], landscape: false, expected: null },
  // Pixel review shows the alert remains visible in this named "guarded" frame.
  // Filenames and prior harness phase names do not determine the pixel oracle.
  { id: 'portrait-alert-at-recovery', folder: 'natural-540x960-keyboard-root-metal', file: '040-gull-guarded-no-loss.png', crop: [97,216,346,615], landscape: false, expected: 'fish-shelf' },
];
function cropImage(im, [x,y,w,h]) {
  const data = Buffer.alloc(w*h*im.channels);
  for (let row=0;row<h;row++) im.data.copy(data,row*w*im.channels,((row+y)*im.w+x)*im.channels,((row+y)*im.w+x+w)*im.channels);
  return { w,h,channels:im.channels,data };
}
const bindings = [], results = [], loaded = new Map();
async function check(name, run) {
  try { const evidence = await run(); results.push({name,passed:true,evidence:JSON.stringify(evidence??null),error:null}); }
  catch(error) { results.push({name,passed:false,evidence:'null',error:String(error)}); }
}
for (const f of fixtures) {
  const source=path.join(dir,'attempt-7',f.folder,'screenshots',f.file),png=await fs.readFile(source);
  bindings.push({id:f.id,path:source,sha256:qa.sha(png),crop:f.crop,landscape:f.landscape,expected:f.expected});
  loaded.set(f.id,cropImage(qa.decode(png),f.crop));
  await check('pixels:'+f.id,()=>{
    assert.equal(typeof qa.detectGullTarget,'function','target detector export is required');
    const detection=qa.detectGullTarget(loaded.get(f.id),positions,f.landscape);
    assert.equal(detection.targetId,f.expected,JSON.stringify(detection));
    if(f.expected) assert.ok(detection.candidates.some(c=>c.stationId===f.expected&&c.matched));
    return detection;
  });
}
await check('unknown-station-does-not-substitute-nearby-shelf',()=>{
  assert.equal(typeof qa.detectGullTarget,'function');
  const detection=qa.detectGullTarget(loaded.get('landscape-alert'),{'kelp-shelf':positions['kelp-shelf'],'smoked-shelf':positions['smoked-shelf']},true);
  assert.equal(detection.targetId,null);return detection;
});
await check('ambiguous-visible-target-remains-null',()=>{
  assert.equal(typeof qa.detectGullTarget,'function');
  const detection=qa.detectGullTarget(loaded.get('portrait-alert'),{...positions,'duplicate-shelf':positions['fish-shelf']},false);
  assert.equal(detection.targetId,null);assert.equal(detection.reason,'ambiguous-visible-target');return detection;
});
for(const cue of ['annulus-only','triangle-only']) await check('unpaired-alert:'+cue,()=>{
  assert.equal(typeof qa.detectGullTarget,'function');
  const original=loaded.get('portrait-alert'),im={...original,data:Buffer.alloc(original.data.length)};
  for(let y=0;y<im.h;y++)for(let x=0;x<im.w;x++){
    const dx=(x+.5)/im.w*540-270,dy=(y+.5)/im.h*960-420;
    const retain=cue==='annulus-only'?Math.hypot(dx,dy)>=40&&Math.hypot(dx,dy)<=52&&!(dx>=20&&dx<=48&&dy>=-54&&dy<=-30):dx>=22&&dx<=46&&dy>=-52&&dy<=-32;
    if(retain){const j=(y*im.w+x)*im.channels;original.data.copy(im.data,j,j,j+im.channels);}
  }
  const detection=qa.detectGullTarget(im,positions,false);assert.equal(detection.targetId,null);return detection;
});

// Replay the observed asynchronous viewport transition at the Playwright boundary.
// No browser, runtime game state, or replacement Driver method is used here.
const failedClipPath=path.join(dir,'attempt-7/natural-360x800-keyboard-landscape-metal-finalized/screenshots/locator-failure.png');
const failedClip=await fs.readFile(failedClipPath),failedImage=qa.decode(failedClip);
bindings.push({id:'overlay-race-stale-crop',path:failedClipPath,sha256:qa.sha(failedClip),crop:[0,0,failedImage.w,failedImage.h],landscape:false,expected:null});
const oldGeometry={rect:{x:53,y:207,width:253,height:450},landscape:false};
const newGeometry={rect:{x:98,y:164,width:164,height:292},landscape:false};
function racePage({ overlay, changedLayout, stablePng, errorOnSecond }) {
  let screenshots=0,geometryReads=0;const keys=[];
  const page={
    evaluate:async()=>({settlementVisible:overlay&&screenshots>0,selectionVisible:false}),
    locator:()=>({evaluate:async()=>{geometryReads++;return changedLayout&&screenshots>0?newGeometry:oldGeometry;}}),
    screenshot:async()=>{screenshots++;if(screenshots>1&&errorOnSecond)throw Error('STABLE_CAPTURE_REQUESTED');return screenshots>1&&stablePng?stablePng:failedClip;},
    keyboard:{down:async key=>keys.push(key),up:async()=>{}},
    waitForTimeout:async()=>{},
  };
  return {page,keys,get screenshots(){return screenshots;},get geometryReads(){return geometryReads;}};
}
await check('overlay-between-geometry-and-screenshot-stops-movement',async()=>{
  const fixture=racePage({overlay:true,changedLayout:true});
  const driver=new qa.Driver(fixture.page,path.join(dir,'unused-test-screens'));
  const output=await driver.move({x:410,y:720},'offline-overlay-race',{maxMs:100});
  assert.equal(output.stoppedByOverlay,true);assert.equal(output.reached,false);assert.equal(fixture.keys.length,0);
  return {stoppedByOverlay:output.stoppedByOverlay,keyPresses:fixture.keys.length,screenshots:fixture.screenshots,geometryReads:fixture.geometryReads};
});
await check('player-does-not-return-coordinates-from-settlement-crop',async()=>{
  const fixture=racePage({overlay:true,changedLayout:true});const driver=new qa.Driver(fixture.page,path.join(dir,'unused-test-screens'));
  const output=await driver.player();assert.equal(output.stoppedByOverlay,true);assert.equal(output.x,undefined);assert.equal(driver.prior,null);return output;
});
await check('layout-change-without-overlay-recaptures-before-locating',async()=>{
  const fixture=racePage({overlay:false,changedLayout:true,errorOnSecond:true});const driver=new qa.Driver(fixture.page,path.join(dir,'unused-test-screens'));
  await assert.rejects(()=>driver.player(),/STABLE_CAPTURE_REQUESTED/);assert.equal(driver.prior,null);return {screenshots:fixture.screenshots,geometryReads:fixture.geometryReads};
});

const Binding=z.object({id:z.string(),path:z.string(),sha256:z.string().length(64),crop:z.array(z.number().int()).length(4),landscape:z.boolean(),expected:z.string().nullable()}).strict();
const Check=z.object({name:z.string(),passed:z.boolean(),evidence:z.string(),error:z.string().nullable()}).strict();
const History=z.object({at:z.string().datetime(),sourceHash:z.string().length(64),testHash:z.string().length(64),passed:z.boolean(),checks:z.array(Check)}).strict();
const Artifact=z.object({schemaVersion:z.literal(1),role:z.literal('QAAgent'),targetGame:z.literal('海滩渔货铺'),workspace:z.string(),api:z.string(),fixtures:z.array(Binding),history:z.array(History),passed:z.boolean(),limitations:z.array(z.string())}).strict();
const artifactPath=path.join(dir,'qa-harness-attempt8.json');
let history=[];try {history=Artifact.parse(JSON.parse(await fs.readFile(artifactPath,'utf8'))).history;}catch(error){if(error.code!=='ENOENT')throw error;}
const passed=results.every(r=>r.passed);
history.push({at:new Date().toISOString(),sourceHash:qa.sha(await fs.readFile(path.join(dir,'qa-lib-attempt8.mjs'))),testHash:qa.sha(await fs.readFile(fileURLToPath(import.meta.url))),passed,checks:results});
const artifact=Artifact.parse({schemaVersion:1,role:'QAAgent',targetGame:'海滩渔货铺',workspace:path.resolve(dir,'../../workspace/game'),api:'detectGullTarget(decodedCanvasImage, stationPositions, landscape) -> {targetId:string|null,candidates,reason}; Driver.player() may return {stoppedByOverlay:true,observation,geometry} when normal overlay appears; Driver.move() stops without further input.',fixtures:bindings,history,passed,limitations:['Offline detector and browser-boundary race tests are QA implementation evidence only.','Target localization does not constitute a perceptual pass for an obscured seagull.','Fresh natural runtime verification remains required against attempt-8 build.']});
await fs.writeFile(artifactPath,JSON.stringify(artifact,null,2)+'\n');
console.log(JSON.stringify({artifactPath,passed,checks:results.map(({name,passed,error})=>({name,passed,error}))},null,2));
if(!passed)process.exitCode=1;
