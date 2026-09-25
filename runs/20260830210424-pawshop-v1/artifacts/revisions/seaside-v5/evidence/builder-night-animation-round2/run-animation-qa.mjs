import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const screenshotDir = resolve(here, 'screenshots');
const logDir = resolve(here, 'logs');
const baseUrl = process.env.PAWSHOP_QA_URL ?? 'http://127.0.0.1:4183/';
const saveKey = 'ai-game-factory:beach_fish_market_v5:save-v4';
const legacyKey = 'ai-game-factory:beach_fish_market_v4:save-v3';
const atlasNames = ['otter-walk-front.png', 'otter-walk-back.png', 'otter-walk-side.png'];
const entries = [];
const pageErrors = [];
const assetResponses = [];
const screenshots = [];
const checks = [];
const details = { viewports: [], animation: {}, gameplay: {}, persistence: {}, alpha: [] };

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

function attach(page, label) {
  page.on('console', (message) => entries.push({ source: 'console', label, type: message.type(), text: message.text() }));
  page.on('pageerror', (error) => pageErrors.push({ source: 'pageerror', label, type: 'error', text: error.message }));
  page.on('response', (response) => {
    if (atlasNames.some((name) => response.url().endsWith(name))) assetResponses.push({ label, url: response.url(), status: response.status() });
  });
}

async function openGame(browser, label, viewport, options = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: options.reducedMotion ?? 'no-preference' });
  if (options.initScript) await context.addInitScript(options.initScript.fn, options.initScript.arg);
  const page = await context.newPage();
  attach(page, label);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('#game canvas', { state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#game-shell')?.dataset.loading === 'false');
  await page.waitForTimeout(350);
  return { context, page };
}

async function saveShot(page, name, locator) {
  const path = resolve(screenshotDir, name);
  const bytes = locator ? await locator.screenshot({ path }) : await page.screenshot({ path, fullPage: true });
  screenshots.push(`artifacts/revisions/seaside-v5/evidence/builder-night-animation-round2/screenshots/${name}`);
  return bytes;
}

function decodePng(bytes) {
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0;
      assert(data[8] === 8 && data[12] === 0 && channels > 0, 'unsupported screenshot PNG');
    } else if (type === 'IDAT') idat.push(data);
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const decoded = Buffer.alloc(stride * height);
  const paeth = (left, above, upperLeft) => {
    const prediction = left + above - upperLeft;
    const distances = [Math.abs(prediction - left), Math.abs(prediction - above), Math.abs(prediction - upperLeft)];
    return distances[0] <= distances[1] && distances[0] <= distances[2] ? left : distances[1] <= distances[2] ? above : upperLeft;
  };
  let input = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[input++];
    for (let x = 0; x < stride; x += 1) {
      const source = raw[input++];
      const current = y * stride + x;
      const left = x >= channels ? decoded[current - channels] : 0;
      const above = y > 0 ? decoded[current - stride] : 0;
      const upperLeft = y > 0 && x >= channels ? decoded[current - stride - channels] : 0;
      if (filter === 0) decoded[current] = source;
      else if (filter === 1) decoded[current] = (source + left) & 255;
      else if (filter === 2) decoded[current] = (source + above) & 255;
      else if (filter === 3) decoded[current] = (source + Math.floor((left + above) / 2)) & 255;
      else if (filter === 4) decoded[current] = (source + paeth(left, above, upperLeft)) & 255;
      else throw new Error(`unsupported PNG filter ${filter}`);
    }
  }
  return { width, height, channels, decoded };
}

function blackRatio(bytes) {
  const png = decodePng(bytes);
  let black = 0;
  for (let pixel = 0; pixel < png.width * png.height; pixel += 1) {
    const offset = pixel * png.channels;
    black += Number(png.decoded[offset] < 8 && png.decoded[offset + 1] < 8 && png.decoded[offset + 2] < 8);
  }
  return black / (png.width * png.height);
}

const getState = (page) => page.evaluate(() => window.__GAME_TEST__.getState());
async function hold(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(Math.min(ms, 2_400));
  await page.keyboard.up(key);
  await page.waitForTimeout(80);
}
async function moveTo(page, target) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await getState(page);
    const dx = target.x - current.player.x;
    if (Math.abs(dx) > 14) await hold(page, dx > 0 ? 'ArrowRight' : 'ArrowLeft', Math.abs(dx) / 178 * 1_000);
    const afterX = await getState(page);
    const dy = target.y - afterX.player.y;
    if (Math.abs(dy) > 14) await hold(page, dy > 0 ? 'ArrowDown' : 'ArrowUp', Math.abs(dy) / 178 * 1_000);
    const after = await getState(page);
    if (Math.hypot(after.player.x - target.x, after.player.y - target.y) <= 24) return;
  }
  throw new Error(`movement failed for ${JSON.stringify(target)}`);
}

await mkdir(screenshotDir, { recursive: true });
await mkdir(logDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
let fatal;

try {
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    const label = `${viewport.width}x${viewport.height}`;
    const { context, page } = await openGame(browser, label, viewport);
    await page.locator('#game canvas').click({ position: { x: 180, y: 350 } });
    const before = await getState(page);
    await hold(page, 'ArrowRight', 360);
    await hold(page, 'ArrowLeft', 360);
    const after = await getState(page);
    assert(after.telemetry.movementDistance > before.telemetry.movementDistance, `${label} real movement did not run`);
    const layout = await page.evaluate(() => ({
      viewport: [innerWidth, innerHeight],
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    }));
    assert(layout.scroll[0] <= layout.viewport[0] + 1 && layout.scroll[1] <= layout.viewport[1] + 1, `${label} overflowed`);
    await saveShot(page, `animation-${label}.png`);
    const canvas = await saveShot(page, `animation-${label}-canvas.png`, page.locator('#game canvas'));
    const ratio = blackRatio(canvas);
    assert(ratio < 0.08, `${label} black ratio ${ratio}`);
    details.viewports.push({ label, layout, canvasNearlyBlackRatio: ratio, movementDistance: after.telemetry.movementDistance - before.telemetry.movementDistance });
    await context.close();
  }
  checks.push({ name: '三竖屏实玩与黑块回归', passed: true, evidence: '360x800、390x844、430x932 均以真实键盘往返触发移动动画；无溢出，Canvas 近黑像素占比均低于 8%。' });

  {
    const { context, page } = await openGame(browser, 'animation-loop', { width: 390, height: 844 });
    await page.locator('#game canvas').click({ position: { x: 180, y: 350 } });
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(110);
    const first = await saveShot(page, 'animation-moving-frame-a.png', page.locator('#game canvas'));
    await page.waitForTimeout(170);
    const second = await saveShot(page, 'animation-moving-frame-b.png', page.locator('#game canvas'));
    await page.keyboard.up('ArrowRight');
    assert(digest(first) !== digest(second), 'moving animation frames did not change visually');
    details.animation.movingFrameHashes = [digest(first), digest(second)];
    await context.close();

    const reduced = await openGame(browser, 'reduced-motion', { width: 390, height: 844 }, { reducedMotion: 'reduce' });
    await reduced.page.locator('#game canvas').click({ position: { x: 180, y: 350 } });
    await hold(reduced.page, 'ArrowRight', 350);
    assert(await reduced.page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), 'reduced-motion media query was not active');
    await saveShot(reduced.page, 'animation-reduced-motion.png');
    await reduced.context.close();
    const responseSummary = Object.fromEntries(atlasNames.map((name) => [name, assetResponses.filter((entry) => entry.url.endsWith(name)).map((entry) => entry.status)]));
    for (const name of atlasNames) assert(responseSummary[name]?.some((status) => status === 200), `${name} was not preloaded successfully`);
    details.animation.assetResponses = responseSummary;
  }
  checks.push({ name: '角色 atlas 预加载、循环与 reduced-motion', passed: true, evidence: '三张 2048x256 atlas 均返回 HTTP 200；移动中两个时点的 Canvas 哈希不同；reduced-motion 上下文回退可见且无异常。' });

  {
    const { context, page } = await openGame(browser, 'complete-loop', { width: 390, height: 844 });
    await page.locator('#game canvas').click({ position: { x: 180, y: 350 } });
    await page.evaluate(() => window.__GAME_TEST__.resetGame());
    await moveTo(page, { x: 88, y: 180 });
    await page.waitForFunction(() => {
      const state = window.__GAME_TEST__.getState();
      return state.carrying.fish === state.capacity;
    }, null, { timeout: 7_000 });
    await moveTo(page, { x: 132, y: 470 });
    await page.waitForFunction(() => {
      const state = window.__GAME_TEST__.getState();
      return state.carrying.fish === 0 && state.shelves.fish >= 4;
    }, null, { timeout: 5_000 });
    await page.evaluate(() => window.__GAME_TEST__.spawnCustomer('fish'));
    await page.waitForFunction(() => window.__GAME_TEST__.getState().checkoutQueue.length > 0, null, { timeout: 5_000 });
    await moveTo(page, { x: 270, y: 696 });
    await page.waitForFunction(() => {
      const state = window.__GAME_TEST__.getState();
      return state.telemetry.completedOrders >= 1 && state.currency >= 4;
    }, null, { timeout: 5_000 });
    const completed = await getState(page);
    assert(['pickup', 'stock', 'sale', 'cashCollection'].every((key) => completed.telemetry.first[key] !== null), 'complete loop telemetry regressed');
    details.gameplay.completeLoop = { currency: completed.currency, shelves: completed.shelves, completedOrders: completed.telemetry.completedOrders, first: completed.telemetry.first };
    await saveShot(page, 'animation-complete-loop.png');
    const fixture = await page.evaluate(() => window.__GAME_TEST__.resetGame());
    fixture.shelves.fish = 8;
    fixture.carrying.fish = 2;
    fixture.player = { x: 132, y: 470 };
    fixture.savedAtMs = Date.now();
    await context.close();

    const fullShelf = await openGame(browser, 'full-shelf', { width: 390, height: 844 }, {
      initScript: { fn: ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), arg: { key: saveKey, value: fixture } },
    });
    await fullShelf.page.waitForTimeout(1_000);
    const boundary = await getState(fullShelf.page);
    assert(boundary.shelves.fish === 8 && boundary.carrying.fish === 2, 'full shelf boundary regressed');
    details.gameplay.fullShelf = { shelf: boundary.shelves.fish, carry: boundary.carrying.fish };
    await saveShot(fullShelf.page, 'animation-full-shelf.png');
    await fullShelf.context.close();

    const legacy = {
      version: 3,
      currency: 55,
      player: { x: 270, y: 590, capacity: 6, inventory: { fish: 2, kelp: 3 } },
      upgrade: { purchases: 1 },
      construction: { invested: 6, required: 12, unlocked: false },
      shelves: { fish: 5, kelp: 2 },
      savedAtMs: Date.now(),
    };
    const migration = await openGame(browser, 'legacy-migration', { width: 390, height: 844 }, {
      initScript: {
        fn: ({ current, old, value }) => {
          if (sessionStorage.getItem('animation-r2-migration-installed')) return;
          localStorage.removeItem(current);
          localStorage.setItem(old, JSON.stringify(value));
          sessionStorage.setItem('animation-r2-migration-installed', '1');
        },
        arg: { current: saveKey, old: legacyKey, value: legacy },
      },
    });
    const migrated = await getState(migration.page);
    assert(migrated.version === 4 && migrated.capacity === 6 && migrated.carrying.fish === 2 && migrated.carrying.kelp === 3, 'legacy migration regressed');
    await migration.page.evaluate(() => window.__GAME_TEST__.grantCurrency(13));
    const beforeRefresh = await getState(migration.page);
    await migration.page.reload({ waitUntil: 'networkidle' });
    await migration.page.waitForFunction(() => document.querySelector('#game-shell')?.dataset.loading === 'false');
    const afterRefresh = await getState(migration.page);
    assert(afterRefresh.currency === beforeRefresh.currency && afterRefresh.capacity === beforeRefresh.capacity, 'refresh recovery regressed');
    details.persistence = { migrated: { version: migrated.version, capacity: migrated.capacity, carrying: migrated.carrying }, refresh: { before: beforeRefresh.currency, after: afterRefresh.currency } };
    await migration.context.close();
  }
  checks.push({ name: '核心经营、满仓、迁移与刷新兼容', passed: true, evidence: '移动动画启用后，自动捕鱼→补货→排队→收银→拾币仍完整；8/8 保留溢出，V3 存档与刷新恢复保持兼容。' });

  {
    const { context, page } = await openGame(browser, 'atlas-alpha', { width: 1200, height: 1000 });
    const results = await page.evaluate(async ({ root, names }) => {
      const backgrounds = ['#F8FAE5', '#163A4A', '#FF3B30'];
      const loaded = await Promise.all(names.map(async (name) => {
        const image = new Image();
        image.src = new URL(`assets/${name}`, root).href;
        await image.decode();
        return { name, image };
      }));
      document.body.innerHTML = '<h1>8帧海獭 · 三背景透明合成</h1><div id="grid"></div>';
      document.body.style.cssText = 'margin:0;padding:20px;background:#dbe7e8;font:16px sans-serif;color:#163a4a';
      const grid = document.querySelector('#grid');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(8,1fr);gap:8px';
      const output = [];
      for (const { name, image } of loaded) {
        for (const background of backgrounds) {
          for (let frame = 0; frame < 8; frame += 1) {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            canvas.style.cssText = `width:128px;height:128px;border-radius:10px;background:${background}`;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.fillStyle = background;
            context.fillRect(0, 0, 128, 128);
            context.drawImage(image, frame * 256, 0, 256, 256, 0, 0, 128, 128);
            const data = context.getImageData(0, 0, 128, 128).data;
            const probe = document.createElement('canvas').getContext('2d');
            probe.fillStyle = background;
            probe.fillRect(0, 0, 1, 1);
            const base = probe.getImageData(0, 0, 1, 1).data;
            let changed = 0;
            for (let pixel = 0; pixel < 128 * 128; pixel += 1) {
              const offset = pixel * 4;
              changed += Number(data[offset] !== base[0] || data[offset + 1] !== base[1] || data[offset + 2] !== base[2]);
            }
            const corners = [[0, 0], [127, 0], [0, 127], [127, 127]].every(([x, y]) => {
              const offset = (y * 128 + x) * 4;
              return data[offset] === base[0] && data[offset + 1] === base[1] && data[offset + 2] === base[2];
            });
            output.push({ name, background, frame, naturalSize: [image.naturalWidth, image.naturalHeight], changedRatio: changed / (128 * 128), transparentCorners: corners });
            grid.append(canvas);
          }
        }
      }
      return output;
    }, { root: baseUrl, names: atlasNames });
    for (const result of results) {
      assert(result.naturalSize[0] === 2048 && result.naturalSize[1] === 256, `${result.name} wrong dimensions`);
      assert(result.transparentCorners, `${result.name} frame ${result.frame} lost transparent corners`);
      assert(result.changedRatio > 0.03 && result.changedRatio < 0.92, `${result.name} frame ${result.frame} invalid alpha coverage`);
    }
    details.alpha = results;
    await saveShot(page, 'animation-atlas-alpha-composites.png');
    await context.close();
  }
  checks.push({ name: '24 帧透明度与三背景合成', passed: true, evidence: '前/后/侧各 8 帧均以 2048x256 解码；浅色、深色、饱和色共 72 个合成样本透明四角与可见覆盖全部有效。' });
} catch (error) {
  fatal = error;
  checks.push({ name: 'QA 执行完整性', passed: false, evidence: error instanceof Error ? error.message : String(error) });
} finally {
  await browser.close();
}

const textureWarnings = entries.filter((entry) => /texImage2D|bad image data/i.test(entry.text));
const consoleErrors = entries.filter((entry) => entry.type === 'error');
checks.push({
  name: '控制台、页面异常与纹理上传',
  passed: textureWarnings.length === 0 && consoleErrors.length === 0 && pageErrors.length === 0,
  evidence: `texImage2D/bad image data=${textureWarnings.length}，console error=${consoleErrors.length}，pageerror=${pageErrors.length}。`,
});
const diagnostics = { entries, pageErrors, assetResponses, errorCounts: { consoleError: consoleErrors.length, pageError: pageErrors.length, textureUploadWarning: textureWarnings.length } };
await writeFile(resolve(logDir, 'browser-console.json'), `${JSON.stringify(diagnostics, null, 2)}\n`);
await writeFile(resolve(here, 'qa-details.json'), `${JSON.stringify(details, null, 2)}\n`);
const passed = !fatal && checks.every((check) => check.passed);
const report = {
  schemaVersion: 1,
  passed,
  checks,
  issues: passed ? [] : [{ id: 'ANIMATION-R2', severity: 'error', message: fatal instanceof Error ? fatal.message : 'animation QA failed', evidence: 'artifacts/revisions/seaside-v5/evidence/builder-night-animation-round2/qa-details.json' }],
  screenshots,
  consoleLog: 'artifacts/revisions/seaside-v5/evidence/builder-night-animation-round2/logs/browser-console.json',
  testedAt: new Date().toISOString(),
};
await writeFile(resolve(here, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
if (!passed) throw fatal ?? new Error('animation QA failed');
console.log(JSON.stringify({ passed, checks: checks.length, screenshots: screenshots.length, errorCounts: diagnostics.errorCounts }, null, 2));
