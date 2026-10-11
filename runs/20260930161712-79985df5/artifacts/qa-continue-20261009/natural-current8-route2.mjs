import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { Driver, observeDom, components, decode, sha, detectGullTarget } from '../qa-retest-20261008/qa-lib-attempt8.mjs';
import { visibleCargo } from './visible-cargo.mjs';
import { MARKET_DEFINITIONS } from '../../workspace/game/src/revision.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const workspace = path.join(root, 'workspace/game');
const attempt = Number(process.env.SHOP_QA_ATTEMPT ?? 8);
const width = Number(process.env.SHOP_QA_WIDTH ?? 540);
const height = Number(process.env.SHOP_QA_HEIGHT ?? 960);
const input = process.env.SHOP_QA_INPUT ?? 'keyboard';
const session = process.env.SHOP_QA_SESSION ?? new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(root, `artifacts/qa-continue-20261009/natural-${width}x${height}-${input}-${session}`);
await fs.mkdir(output, { recursive: true });
const harnessSourceBindings = await Promise.all([fileURLToPath(import.meta.url), fileURLToPath(new URL('../qa-retest-20261008/qa-lib-attempt8.mjs',import.meta.url)), fileURLToPath(new URL('./visible-cargo.mjs',import.meta.url))].map(async path => ({path,sha256:sha(await fs.readFile(path))})));
const manifest = JSON.parse(await fs.readFile(path.join(root, `artifacts/fix/attempt-${attempt}/build-manifest.json`)));
const files = await Promise.all(manifest.files.map(async f => {
  const file = path.join(workspace, f.path);
  const actual = sha(await fs.readFile(file));
  return { path: file, sha256: actual, matches: actual === f.sha256 };
}));
if (files.some(f => !f.matches)) throw Error('Attempt build/source hashes changed before QA');
const buildHash = files.find(f => /index-.*\.js$/.test(f.path)).sha256;
const checks = [], errors = [], consoleErrors = [], pageErrors = [];
let finalizedVideoPath;
const add = (name, passed, evidence) => {
  checks.push({ name, passed: !!passed, evidence: JSON.stringify(evidence) });
  journalPending=journalPending.then(()=>checkpoint('check:'+name));
};
let journalPending=Promise.resolve();
async function checkpoint(phase){
 const partial={schemaVersion:1,artifactType:'interrupted-natural-progress',attempt,targetGame:'海滩渔货铺',workspace,buildHash,viewport:{width,height},input,phase,passed:false,status:'IN_PROGRESS_NOT_ACCEPTANCE',checks,trace:d.trace,screenshots:d.screens,holds:d.holds,sourceBindings:harnessSourceBindings,updatedAt:new Date().toISOString()};
 await fs.writeFile(path.join(output,'progress.json.tmp'),JSON.stringify(partial,null,2)+'\n');
 await fs.rename(path.join(output,'progress.json.tmp'),path.join(output,'progress.json'));
}
const browser = await chromium.launch({ channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: true, recordVideo: { dir: path.join(output, 'video'), size: { width, height } } });
const page = await context.newPage();
page.on('console', m => { if (m.type() === 'error') consoleErrors.push({text:m.text(),location:m.location()}); });
page.on('pageerror', e => pageErrors.push(String(e)));
page.on('response', r => {if(r.status()>=400) consoleErrors.push({url:r.url(),status:r.status()});});
const d = new Driver(page, path.join(output, 'screenshots'));
const originalCapture=d.capture.bind(d);
d.capture=async label=>{const result=await originalCapture(label);journalPending=journalPending.then(()=>checkpoint('capture:'+label));await journalPending;return result;};
if (input === 'touch') {
  const cdp = await context.newCDPSession(page);
  d.pulse = async (key, hold) => {
    const direction = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[key];
    const box = await page.locator(`[data-move="${direction}"]`).boundingBox();
    const points = [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
    try { await page.waitForTimeout(hold); }
    finally { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    d.holds.push({ direction, hold, released: true, input: 'browser-native-touch' });
    await page.waitForTimeout(25);
  };
}
let market = 'beach-stall', expanded = false, firstSettlement = false, newSettlement = false, replay = false, dom = [];
const startedAt = new Date().toISOString();
const pos = id => MARKET_DEFINITIONS[market].stationPositions[id];
const cashPile = v => Number(v['#cash-pile']?.match(/\d+/)?.[0] ?? 0);
const coins = v => Number(v['#coins']?.match(/\d+/)?.[0] ?? 0);
const events = async pattern => (await d.dom()).filter(e => pattern.test(e.ui['#toast'] ?? ''));
async function walk(id, label, opts) { return d.move(pos(id), label, opts); }
const productForShelf = {'fish-shelf':'fresh-fish','kelp-shelf':'kelp','smoked-shelf':'smoked-fish'};
async function discharge(shelf, label) {
  if ((await d.read()).settlementVisible) return {stoppedByOverlay:true};
  await walk(shelf, label + '-deposit');
  await d.idle(1500, label + '-stock');
  const started = Date.now();
  let cargo = await visibleCargo(d);
  const before = cargo;
  while (!cargo.stoppedByOverlay && (cargo.counts[productForShelf[shelf]] ?? 0) > 0 && Date.now()-started < 25000) {
    await page.waitForTimeout(500);
    cargo = await visibleCargo(d);
  }
  const result = {phase:label+'-visible-deposit',shelf,before,after:cargo,waitMs:Date.now()-started,screenshot:await d.capture(label+'-deposited-stack')};
  d.trace.push(result);
  console.log(JSON.stringify({phase:result.phase,shelf,cargo:cargo.counts,waitMs:result.waitMs}));
  // A full shelf legitimately leaves compatible cargo in the bag; retain it and continue the productive route.
  if (!cargo.stoppedByOverlay && (cargo.counts[productForShelf[shelf]] ?? 0) > 0) d.trace.push({phase:label+'-partial-deposit-retained', shelf, remaining:cargo.counts[productForShelf[shelf]] ?? 0});
  return result;
}
async function stock(source, shelf, label) {
  // A full input shelf may leave raw goods in the bag. Observe and unload them
  // before trying to collect a different product, just as a player would.
  const initial = await visibleCargo(d);
  if (initial.stoppedByOverlay) return initial;
  if (source==='smokehouse') {
    if (initial.counts['fresh-fish'] > 0) await discharge('fish-shelf',label+'-clear-fresh');
    if (initial.counts.kelp > 0) await discharge('kelp-shelf',label+'-clear-kelp');
  }
  await walk(source, label + '-harvest');
  await d.idle(3500, label + '-cargo');
  const cargo = await visibleCargo(d);
  d.trace.push({phase:label+'-visible-cargo',source,shelf,observation:cargo,screenshot:await d.capture(label+'-cargo-identified')});
  if (cargo.stoppedByOverlay) return cargo;
  return discharge(shelf,label);
}
async function collect(label) {
  const before = await d.read();
  await walk('checkout', label + '-checkout');
  await d.idle(2800, label + '-service');
  if ((await d.read()).settlementVisible) return { found: true, settlement: true };
  await d.move({ x: Math.max(50, pos('checkout').x - 150), y: pos('checkout').y }, label + '-leave');
  await walk('checkout', label + '-return');
  return d.wait(v => coins(v) > coins(before), label + '-cash', 3000);
}
async function earn(min, label, max = 6) {
  for (let i = 0; i < max; i++) {
    const current = await d.read();
    if (coins(current) >= min || current.settlementVisible) return current;
    await stock('net', 'fish-shelf', label + '-' + i + '-fish');
    if (expanded) {
      await stock('kelp-pool', 'kelp-shelf', label + '-' + i + '-kelp');
      await stock('smokehouse', 'smoked-shelf', label + '-' + i + '-smoked');
    }
    await collect(label + '-' + i);
  }
  return d.read();
}
async function blueBodies(label) {
  const box = await page.locator('#game canvas').boundingBox();
  const im = decode(await page.screenshot({ clip: box, timeout: 30000 }));
  const parts = components(im, [96,165,250], 5, 15).filter(c => c.n > 25 && c.n < 1000);
  return { parts, screenshot: await d.capture(label) };
}
async function visibleGullTarget() {
  const box = await page.locator('#game canvas').boundingBox();
  const im = decode(await page.screenshot({ clip: box, timeout: 30000 }));
  const detection = detectGullTarget(im, MARKET_DEFINITIONS[market].stationPositions, width > height);
  d.trace.push({ phase:'gull-visible-target', ...detection, screenshot: await d.capture('gull-visible-target') });
  return detection.targetId;
}
try {
  await page.goto((process.env.SHOP_QA_URL ?? 'http://127.0.0.1:4177') + `/?qa=natural-${attempt}-${width}x${height}-${input}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#game canvas');
  const scripts = await page.locator('script[src]').evaluateAll(nodes => nodes.map(n=>n.src));
  const runtimeScript = scripts.find(url=>/index-.*\.js$/.test(url));
  if (!runtimeScript || sha(await (await page.request.get(runtimeScript)).body()) !== buildHash) throw Error('Served runtime asset differs from the Attempt 8 manifest');
  add('served-build-hash', true, {runtimeScript,buildHash});
  await observeDom(page);
  await page.waitForTimeout(500);
  const boot = await d.read();
  await d.player();
  await d.capture('startup');
  add('startup-viewport', boot.overflow.width <= width && boot.overflow.height <= height, boot);
  await d.idle(9000, 'empty-shelf-shortage');
  await stock('net', 'fish-shelf', 'base-first');
  await collect('base-first');
  const funded = await earn(14, 'pre-expansion');
  add('base-normal-sales-funded', coins(funded) >= 12, funded);
  if (coins(funded) < 12) throw Error('Normal sales did not fund expansion and staff');
  await walk('kelp-build', 'expansion');
  const settled = await d.wait(v => v.settlementVisible, 'first-settlement', 5000);
  firstSettlement = settled.found;
  add('first-settlement', settled.found, settled);
  if (!settled.found) throw Error('First settlement missing');
  const localCommands = settled.observation.buttons.filter(b => b.text.includes('继续当地'));
  add('settlement-choice-clarity', localCommands.length === 1 && settled.observation.buttons.some(b => b.id === 'restart-round'), settled);
  await page.locator('#continue-round').click();
  d.prior = null;
  const continued = await d.idle(650, 'continue-local');
  add('continue-local-no-unintended-selection', !continued.observation.settlementVisible && !continued.observation.selectionVisible, continued);
  if (continued.observation.settlementVisible || continued.observation.selectionVisible) throw Error('Continue opened an unintended overlay');
  expanded = true;
  await walk('smokehouse', 'processor-starved');
  const starved = await d.idle(1000, 'processor-starved');
  await stock('net', 'fish-shelf', 'processor-input');
  await d.idle(2200, 'processor-making');
  await stock('smokehouse', 'smoked-shelf', 'processor-output');
  const processorEvents = await events(/烟熏完成|采集|补货/);
  add('processor-natural-route', processorEvents.some(e => /烟熏完成/.test(e.ui['#toast'] ?? '')), { starved, events: processorEvents });
  const runnerStart = (await d.dom()).at(-1)?.atMs ?? 0;
  await earn(8, 'ensure-staff-funds');
  const beforeHire = await d.read();
  const approach = await d.player();
  await d.move({x:40,y:approach.y}, 'hire-safe-left', {tolerance:10});
  await d.move({x:40,y:820}, 'hire-safe-down', {tolerance:10});
  await walk('runner-hire', 'runner-funding');
  await d.idle(3200, 'runner-hired');
  const avatar = await d.player();
  add('avatar-at-employee-label-crossing', Math.hypot(avatar.x - pos('runner-hire').x, avatar.y - pos('runner-hire').y) < 40, { avatar, screenshot: await d.capture('player-at-runner-hire') });
  const blue1 = await blueBodies('runner-moving-a');
  await d.idle(12000, 'runner-action');
  const blue2 = await blueBodies('runner-moving-b');
  const runnerEvents = (await events(/跑腿取货|跑腿补货/)).filter(e => e.atMs >= runnerStart);
  add('runner-funded-action', runnerEvents.some(e => /取货/.test(e.ui['#toast'] ?? '')) && runnerEvents.some(e => /补货/.test(e.ui['#toast'] ?? '')), { beforeHire, blue1, blue2, events: runnerEvents });
  await earn(5, 'cashier-fund');
  await walk('cashier-hire', 'cashier-funding');
  await d.idle(4200, 'cashier-hired');
  const cashierStart = (await d.dom()).at(-1)?.atMs ?? 0;
  const cashierBefore = await d.read();
  await d.move({x:40,y:820}, 'cashier-safe-left', {tolerance:10});
  await d.move({x:40,y:180}, 'cashier-safe-north', {tolerance:10});
  await stock('net', 'fish-shelf', 'cashier-fish');
  await stock('kelp-pool', 'kelp-shelf', 'cashier-kelp');
  await stock('smokehouse', 'smoked-shelf', 'cashier-smoked');
  await d.move({ x: 65, y: 610 }, 'observe-workers');
  await d.idle(10000, 'cashier-action');
  const cashierAfter = await d.read();
  const cashierEvents = (await events(/收银帮手|帮手打包/)).filter(e => e.atMs >= cashierStart);
  add('cashier-funded-action', cashierEvents.length > 0 && coins(cashierBefore)===coins(cashierAfter) && cashPile(cashierAfter)>cashPile(cashierBefore), { before: cashierBefore, after: cashierAfter, events: cashierEvents, screenshot: await d.capture('cashier-service-away-from-player') });
  await collect('cashier-manual-cash');
  await stock('net', 'fish-shelf', 'gull-stock');
  await stock('kelp-pool', 'kelp-shelf', 'gull-kelp-stock');
  await d.move({ x: pos('kelp-shelf').x-95, y: pos('kelp-shelf').y+95 }, 'gull-player-away', {tolerance:10});
  const gullStart = (await d.dom()).at(-1)?.atMs ?? 0;
  const lossSeen = await d.wait(v => /叼走/.test(v['#toast'] ?? ''), 'gull-visible-loss', 18000);
  const loss = await d.idle(200, 'gull-alert-loss');
  const gullBefore = (await events(/海鸥/)).filter(e => e.atMs >= gullStart);
  const attackedShelf = await visibleGullTarget();
  const recoveryStart = (await d.dom()).at(-1)?.atMs ?? 0;
  if (!attackedShelf) throw Error('Visible gull target not identified; cannot substitute another shelf');
  await walk(attackedShelf, 'gull-recovery-' + attackedShelf);
  const guardStarted = (await d.dom()).at(-1)?.atMs ?? 0;
  await d.capture('gull-recovery-immediate');
  await d.idle(4000, 'gull-guarded-no-loss');
  const guarded = (await events(/海鸥/)).filter(e => e.atMs > guardStarted && /叼走/.test(e.ui['#toast'] ?? ''));
  const guardTarget = await visibleGullTarget();
  add('seagull-readable-relief', guarded.length===0 && guardTarget!==attackedShelf, {attackedShelf,guardStarted,guarded,guardTarget});
  const gullEvents = (await events(/海鸥/)).filter(e => e.atMs >= gullStart);
  await stock({ 'fish-shelf':'net', 'kelp-shelf':'kelp-pool', 'smoked-shelf':'smokehouse' }[attackedShelf], attackedShelf, 'gull-replenish');
  add('seagull-loss-recovery', (lossSeen.found || gullBefore.some(e => /叼走/.test(e.ui['#toast'] ?? ''))) && gullEvents.some(e => e.atMs >= recoveryStart && /被驱赶/.test(e.ui['#toast'] ?? '')), { lossSeen, loss, attackedShelf, recoveryStart, events: gullEvents });
  // Clear mixed cargo via ordinary shelf deposits before the fresh/smoked-only markets.
  for (const id of ['kelp-shelf','smoked-shelf','fish-shelf']) {
    await walk(id, 'pre-market-clear-'+id);
    await d.idle(2000, 'pre-market-deposited-'+id);
  }
  for (const nextMarket of ['coral-cove-market','moon-tide-market']) {
    const label=nextMarket==='coral-cove-market'?'coral':'moon';
    await walk('market-entry', label+'-deliberate-market-entry');
    const selection = await d.wait(v => v.selectionVisible, label+'-market-selection', 4000);
    add(label+'-deliberate-market-selection', selection.found && selection.observation.buttons.filter(b => b.id === 'continue-round' || b.id === 'moon-tide-market').length === 2, selection);
    if (!selection.found) throw Error('Marker did not open market selection for '+label);
    await page.locator('[data-market-id="'+nextMarket+'"]').click();
    d.prior=null; market=nextMarket;
    const arrival=await d.idle(500,label+'-market');
    add(label+'-real-market-change', arrival.observation['#title']?.includes(MARKET_DEFINITIONS[market].name), arrival);
    for (let i=0;i<12 && !(await d.read()).settlementVisible;i++) {
      await stock('net','fish-shelf',label+'-'+i+'-fish');
      await stock('net','fish-shelf',label+'-'+i+'-extra-fish');
      await d.idle(1800,label+'-'+i+'-processing-input');
      await stock('smokehouse','smoked-shelf',label+'-'+i+'-smoked');
      await collect(label+'-'+i);
    }
    const end=await d.wait(v=>v.settlementVisible,label+'-settlement',5000);
    newSettlement=end.found;
    const panel=end.observation['#settlement']??'';
    add(label+'-own-settlement',end.found && panel.includes(MARKET_DEFINITIONS[market].goalLabel) && panel.includes('目标达成') && !panel.includes('潮池扩建完成'),end);
    if(!end.found) throw Error(label+' natural goal never reached');
    await page.locator('#continue-round').click(); d.prior=null;
    await d.idle(600,label+'-continue');
    await collect(label+'-clear-earned-cash');
    const beforeFresh=await d.read();
    let cash={found:false};
    const replayStart=(await d.dom()).at(-1)?.atMs ?? 0;
    for(let cycle=0;cycle<4 && coins(await d.read())<=coins(beforeFresh);cycle++) {
      await stock('net','fish-shelf',label+'-replay-'+cycle+'-fish');
      await stock('smokehouse','smoked-shelf',label+'-replay-'+cycle+'-smoked');
      cash=await collect(label+'-replay-'+cycle);
    }
    replay=!(await d.read()).settlementVisible && cash.found && coins(await d.read())>coins(beforeFresh);
    const replayEvents=(await d.dom()).filter(e=>e.atMs>=replayStart);
    add(label+'-new-transaction-replay',replay && replayEvents.some(e=>/打包完成|市场目标进度/.test(e.ui['#toast']??'')),{beforeFresh,cash,after:await d.read(),replayStart,events:replayEvents.filter(e=>/顾客取货|打包完成|市场目标进度|收银帮手/.test(e.ui['#toast']??''))});
  }
  const beforeReload = await d.read();
  dom = (await d.dom()).map(e => ({ ...e, segment: 'before-reload' }));
  await page.reload();
  await page.waitForSelector('#game canvas');
  await page.waitForTimeout(700);
  await observeDom(page);
  const afterReload = await d.read();
  add('natural-save-reload', afterReload['#title'] === beforeReload['#title'] && coins(afterReload) >= coins(beforeReload), { beforeReload, afterReload, screenshot: await d.capture('save-reload') });
  d.prior = null;
  await walk('market-entry', 'replay-marker');
  await d.wait(v => v.selectionVisible, 'restart-menu', 4000);
  await page.locator('#restart-round').click();
  d.prior = null;
  const restart = await d.idle(600, 'restart-round');
  add('restart-clears-overlays', !restart.observation.settlementVisible && !restart.observation.selectionVisible && coins(restart.observation)===0 && restart.observation['#title']?.includes(MARKET_DEFINITIONS['beach-stall'].name), restart);
  market='beach-stall';expanded=false;
  await stock('net','fish-shelf','restart-new-fish');
  const restartedCash=await collect('restart-new-sale');
  add('restart-new-transaction',restartedCash.found && coins(await d.read())>0,restartedCash);
} catch (error) {
  errors.push(String(error));
  await d.capture('blocked').catch(e => errors.push(String(e)));
} finally {
  dom.push(...(await d.dom().catch(() => [])).map(e => ({ ...e, segment: dom.length ? 'after-reload' : 'main' })));
  await journalPending;
  await checkpoint('finalizing');
  await context.close();
  finalizedVideoPath = path.join(output, 'natural.webm');
  await page.video().saveAs(finalizedVideoPath);
  await browser.close();
}
const afterFiles=await Promise.all(manifest.files.map(async f=>({path:f.path,matches:sha(await fs.readFile(path.join(workspace,f.path)))===f.sha256})));
add('immutable-source-build-after-qa',afterFiles.every(f=>f.matches),afterFiles);
add('runtime-console-and-runner', errors.length === 0 && consoleErrors.length === 0 && pageErrors.length === 0, { errors, consoleErrors, pageErrors });
const required = ['first-settlement','settlement-choice-clarity','continue-local-no-unintended-selection','processor-natural-route','avatar-at-employee-label-crossing','runner-funded-action','cashier-funded-action','seagull-loss-recovery','seagull-readable-relief','natural-save-reload','restart-clears-overlays','restart-new-transaction',...['coral','moon'].flatMap(m=>['deliberate-market-selection','real-market-change','own-settlement','new-transaction-replay'].map(n=>m+'-'+n))];
const blockers = checks.filter(c => !c.passed).map(c => c.name);
for (const name of required) if (!checks.some(c => c.name === name)) blockers.push('unobserved:' + name);
const report = { schemaVersion:1, artifactType:'independent-natural-shop-depth', attempt, targetGame:'海滩渔货铺', targetRunId:'20260930161712-79985df5', workspace, runtime:'web-lite', buildHash, buildFiles:files, sourceBindings:harnessSourceBindings, viewport:{width,height}, input, startedAt, finishedAt:new Date().toISOString(), passed:blockers.length===0, blockers, checks, completion:firstSettlement?'settlement':'none', firstSettlement, newSettlement, replayObserved:replay, forbiddenOperations:[], errors, consoleErrors, pageErrors, trace:d.trace, visibleDomEvents:dom, screenshots:d.screens, holds:d.holds };
const videoPath = finalizedVideoPath;
report.video = { path: videoPath, sha256: sha(await fs.readFile(videoPath)) };
const reportPath = path.join(output,'natural.json');
await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({reportPath,passed:report.passed,blockers}));
