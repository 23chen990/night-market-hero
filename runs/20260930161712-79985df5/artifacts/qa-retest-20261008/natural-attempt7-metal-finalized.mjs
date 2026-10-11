import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { Driver, observeDom, components, decode, sha } from './qa-lib-attempt7-metal.mjs';
import { MARKET_DEFINITIONS } from '../../workspace/game/src/revision.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const workspace = path.join(root, 'workspace/game');
const attempt = Number(process.env.SHOP_QA_ATTEMPT ?? 7);
const width = Number(process.env.SHOP_QA_WIDTH ?? 540);
const height = Number(process.env.SHOP_QA_HEIGHT ?? 960);
const input = process.env.SHOP_QA_INPUT ?? 'keyboard';
const session = process.env.SHOP_QA_SESSION ?? new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(root, `artifacts/qa-retest-20261008/attempt-${attempt}/natural-${width}x${height}-${input}-${session}`);
await fs.mkdir(output, { recursive: true });
const harnessSourceBindings = await Promise.all([fileURLToPath(import.meta.url), fileURLToPath(new URL('./qa-lib-attempt7-metal.mjs',import.meta.url))].map(async path => ({path,sha256:sha(await fs.readFile(path))})));
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
const add = (name, passed, evidence) => checks.push({ name, passed: !!passed, evidence: JSON.stringify(evidence) });
const browser = await chromium.launch({ channel: 'chromium', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: true, recordVideo: { dir: path.join(output, 'video'), size: { width, height } } });
const page = await context.newPage();
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => pageErrors.push(String(e)));
const d = new Driver(page, path.join(output, 'screenshots'));
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
const coins = v => Number(v['#coins']?.match(/\d+/)?.[0] ?? 0);
const events = async pattern => (await d.dom()).filter(e => pattern.test(e.ui['#toast'] ?? ''));
async function walk(id, label, opts) { return d.move(pos(id), label, opts); }
async function stock(source, shelf, label) {
  await walk(source, label + '-harvest');
  await d.idle(900, label + '-cargo');
  await walk(shelf, label + '-deposit');
  return d.idle(1600, label + '-stock');
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
  const landscape = width > height;
  const birds = components(im, [248,250,252], 8, 4).map(c => ({ ...c, point: landscape ? { x:c.y/im.h*540, y:(1-c.x/im.w)*960 } : { x:c.x/im.w*540, y:c.y/im.h*960 } }));
  const candidates = birds.flatMap(b => ['fish-shelf','kelp-shelf','smoked-shelf'].map(id => ({id, component:b, distance:Math.hypot(b.point.x-pos(id).x,b.point.y-pos(id).y)}))).filter(c => c.distance < 65).sort((a,b) => b.component.n-a.component.n);
  d.trace.push({ phase:'gull-visible-target', candidates, screenshot: await d.capture('gull-visible-target') });
  return candidates[0]?.id ?? null;
}
try {
  await page.goto((process.env.SHOP_QA_URL ?? 'http://127.0.0.1:4177') + `/?qa=natural-${attempt}-${width}x${height}-${input}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#game canvas');
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
  const beforeHire = await d.read();
  await walk('runner-hire', 'runner-funding');
  await d.idle(1400, 'runner-hired');
  const avatar = await d.player();
  add('avatar-at-employee-label-crossing', Math.hypot(avatar.x - pos('runner-hire').x, avatar.y - pos('runner-hire').y) < 40, { avatar, screenshot: await d.capture('player-at-runner-hire') });
  const blue1 = await blueBodies('runner-moving-a');
  await d.idle(12000, 'runner-action');
  const blue2 = await blueBodies('runner-moving-b');
  const runnerEvents = (await events(/跑腿取货|跑腿补货/)).filter(e => e.atMs >= runnerStart);
  add('runner-funded-action', runnerEvents.some(e => /取货/.test(e.ui['#toast'] ?? '')) && runnerEvents.some(e => /补货/.test(e.ui['#toast'] ?? '')), { beforeHire, blue1, blue2, events: runnerEvents });
  await earn(5, 'cashier-fund');
  await walk('cashier-hire', 'cashier-funding');
  await d.idle(1600, 'cashier-hired');
  await stock('net', 'fish-shelf', 'cashier-fish');
  await stock('kelp-pool', 'kelp-shelf', 'cashier-kelp');
  await stock('smokehouse', 'smoked-shelf', 'cashier-smoked');
  await d.move({ x: 65, y: 610 }, 'observe-workers');
  const cashierStart = (await d.dom()).at(-1)?.atMs ?? 0;
  const cashierBefore = await d.read();
  await d.idle(10000, 'cashier-action');
  const cashierAfter = await d.read();
  const cashierEvents = (await events(/收银帮手|帮手打包/)).filter(e => e.atMs >= cashierStart);
  add('cashier-funded-action', cashierEvents.length > 0, { before: cashierBefore, after: cashierAfter, events: cashierEvents, screenshot: await d.capture('cashier-service-away-from-player') });
  await stock('net', 'fish-shelf', 'gull-stock');
  await stock('kelp-pool', 'kelp-shelf', 'gull-kelp-stock');
  await d.move({ x: 65, y: 610 }, 'gull-player-away');
  const gullStart = (await d.dom()).at(-1)?.atMs ?? 0;
  const lossSeen = await d.wait(v => /叼走/.test(v['#toast'] ?? ''), 'gull-visible-loss', 18000);
  const loss = await d.idle(200, 'gull-alert-loss');
  const gullBefore = (await events(/海鸥/)).filter(e => e.atMs >= gullStart);
  const attackedShelf = await visibleGullTarget();
  const recoveryStart = (await d.dom()).at(-1)?.atMs ?? 0;
  if (!attackedShelf) throw Error('Visible gull target not identified; cannot substitute another shelf');
  await walk(attackedShelf, 'gull-recovery-' + attackedShelf);
  await d.idle(4000, 'gull-guarded-no-loss');
  const gullEvents = (await events(/海鸥/)).filter(e => e.atMs >= gullStart);
  await stock({ 'fish-shelf':'net', 'kelp-shelf':'kelp-pool', 'smoked-shelf':'smokehouse' }[attackedShelf], attackedShelf, 'gull-replenish');
  add('seagull-loss-recovery', (lossSeen.found || gullBefore.some(e => /叼走/.test(e.ui['#toast'] ?? ''))) && gullEvents.some(e => e.atMs >= recoveryStart && /被驱赶/.test(e.ui['#toast'] ?? '')), { lossSeen, loss, attackedShelf, recoveryStart, events: gullEvents });
  await walk('market-entry', 'deliberate-market-entry');
  const selection = await d.wait(v => v.selectionVisible, 'market-selection', 4000);
  add('deliberate-market-selection', selection.found && selection.observation.buttons.filter(b => b.id === 'continue-round' || b.id === 'moon-tide-market').length === 2, selection);
  if (!selection.found) throw Error('Marker did not open market selection');
  await page.locator('[data-market-id="coral-cove-market"]').click();
  d.prior = null;
  market = 'coral-cove-market';
  const coral = await d.idle(500, 'coral-market');
  add('real-market-change', coral.observation['#title']?.includes(MARKET_DEFINITIONS[market].name), coral);
  for (let i = 0; i < 8 && !(await d.read()).settlementVisible; i++) {
    await stock('net', 'fish-shelf', 'coral-' + i + '-fish');
    await stock('smokehouse', 'smoked-shelf', 'coral-' + i + '-smoked');
    await collect('coral-' + i);
  }
  const end = await d.wait(v => v.settlementVisible, 'coral-settlement', 5000);
  newSettlement = end.found;
  add('new-market-own-settlement', newSettlement, end);
  if (end.found) {
    await page.locator('#continue-round').click();
    d.prior = null;
    await d.idle(600, 'coral-continue');
    await stock('net', 'fish-shelf', 'replay-fish');
    await stock('smokehouse', 'smoked-shelf', 'replay-smoked');
    const cash = await collect('replay');
    replay = !(await d.read()).settlementVisible && cash.found;
    add('operating-replay', replay, cash);
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
  add('restart-clears-overlays', !restart.observation.settlementVisible && !restart.observation.selectionVisible, restart);
} catch (error) {
  errors.push(String(error));
  await d.capture('blocked').catch(e => errors.push(String(e)));
} finally {
  dom.push(...(await d.dom().catch(() => [])).map(e => ({ ...e, segment: dom.length ? 'after-reload' : 'main' })));
  await context.close();
  finalizedVideoPath = path.join(output, 'natural.webm');
  await page.video().saveAs(finalizedVideoPath);
  await browser.close();
}
add('runtime-console-and-runner', errors.length === 0 && consoleErrors.length === 0 && pageErrors.length === 0, { errors, consoleErrors, pageErrors });
const required = ['first-settlement','settlement-choice-clarity','continue-local-no-unintended-selection','processor-natural-route','avatar-at-employee-label-crossing','runner-funded-action','cashier-funded-action','seagull-loss-recovery','deliberate-market-selection','real-market-change','new-market-own-settlement','operating-replay','natural-save-reload','restart-clears-overlays'];
const blockers = checks.filter(c => !c.passed).map(c => c.name);
for (const name of required) if (!checks.some(c => c.name === name)) blockers.push('unobserved:' + name);
const report = { schemaVersion:1, artifactType:'independent-natural-shop-depth', attempt, targetGame:'海滩渔货铺', targetRunId:'20260930161712-79985df5', workspace, runtime:'web-lite', buildHash, buildFiles:files, sourceBindings:harnessSourceBindings, viewport:{width,height}, input, startedAt, finishedAt:new Date().toISOString(), passed:blockers.length===0, blockers, checks, completion:firstSettlement?'settlement':'none', firstSettlement, newSettlement, replayObserved:replay, forbiddenOperations:[], errors, consoleErrors, pageErrors, trace:d.trace, visibleDomEvents:dom, screenshots:d.screens, holds:d.holds };
const videoPath = finalizedVideoPath;
report.video = { path: videoPath, sha256: sha(await fs.readFile(videoPath)) };
const reportPath = path.join(output,'natural.json');
await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({reportPath,passed:report.passed,blockers}));
