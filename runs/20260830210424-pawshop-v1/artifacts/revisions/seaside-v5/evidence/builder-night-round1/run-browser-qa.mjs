import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = resolve(here, 'screenshots');
const logsDir = resolve(here, 'logs');
const baseUrl = process.env.PAWSHOP_QA_URL ?? 'http://127.0.0.1:4176/';
const currentSaveKey = 'ai-game-factory:beach_fish_market_v5:save-v4';
const legacySaveKey = 'ai-game-factory:beach_fish_market_v4:save-v3';
const consoleEntries = [];
const pageErrors = [];
const checks = [];
const screenshots = [];
const details = { viewports: [], gameplay: {}, storage: {}, alphaComposites: [] };

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function attachDiagnostics(page, label) {
  page.on('console', (message) => {
    consoleEntries.push({ source: 'console', label, type: message.type(), text: message.text() });
  });
  page.on('pageerror', (error) => {
    pageErrors.push({ source: 'pageerror', label, type: 'error', text: error.message, stack: error.stack });
  });
}

async function openGame(browser, label, viewport, initScript) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  if (initScript) await context.addInitScript(initScript.fn, initScript.arg);
  const page = await context.newPage();
  attachDiagnostics(page, label);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('#game canvas', { state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#game-shell')?.dataset.loading === 'false');
  await page.waitForTimeout(350);
  return { context, page };
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
      assert(data[8] === 8 && data[12] === 0 && channels > 0, 'QA screenshot PNG encoding is unsupported');
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
      else throw new Error(`Unsupported screenshot filter ${filter}`);
    }
  }
  return { width, height, channels, decoded };
}

function nearlyBlackRatio(pngBytes) {
  const { width, height, channels, decoded } = decodePng(pngBytes);
  let black = 0;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * channels;
    if (decoded[offset] < 8 && decoded[offset + 1] < 8 && decoded[offset + 2] < 8) black += 1;
  }
  return black / (width * height);
}

async function state(page) {
  return page.evaluate(() => window.__GAME_TEST__.getState());
}

async function hold(page, key, durationMs) {
  if (durationMs <= 0) return;
  await page.keyboard.down(key);
  await page.waitForTimeout(Math.min(durationMs, 2_400));
  await page.keyboard.up(key);
  await page.waitForTimeout(80);
}

async function moveTo(page, target) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await state(page);
    const dx = target.x - current.player.x;
    const dy = target.y - current.player.y;
    if (Math.abs(dx) > 14) await hold(page, dx > 0 ? 'ArrowRight' : 'ArrowLeft', Math.abs(dx) / 178 * 1_000);
    const afterX = await state(page);
    const remainingY = target.y - afterX.player.y;
    if (Math.abs(remainingY) > 14) await hold(page, remainingY > 0 ? 'ArrowDown' : 'ArrowUp', Math.abs(remainingY) / 178 * 1_000);
    const after = await state(page);
    if (Math.hypot(after.player.x - target.x, after.player.y - target.y) <= 24) return after;
  }
  const final = await state(page);
  throw new Error(`Could not move to ${JSON.stringify(target)}; ended at ${JSON.stringify(final.player)}`);
}

async function saveScreenshot(page, name, locator) {
  const path = resolve(screenshotsDir, name);
  const png = locator ? await locator.screenshot({ path }) : await page.screenshot({ path, fullPage: true });
  screenshots.push(`artifacts/revisions/seaside-v5/evidence/builder-night-round1/screenshots/${name}`);
  return png;
}

await mkdir(screenshotsDir, { recursive: true });
await mkdir(logsDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
let fatal;

try {
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    const label = `${viewport.width}x${viewport.height}`;
    const { context, page } = await openGame(browser, label, viewport);
    const layout = await page.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      canvas: (() => {
        const rect = document.querySelector('#game canvas').getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      })(),
    }));
    const pagePng = await saveScreenshot(page, `round1-${label}.png`);
    const canvasPng = await saveScreenshot(page, `round1-${label}-canvas.png`, page.locator('#game canvas'));
    const blackRatio = nearlyBlackRatio(canvasPng);
    assert(layout.scroll.width <= layout.viewport.width + 1, `${label} has horizontal overflow`);
    assert(layout.scroll.height <= layout.viewport.height + 1, `${label} has vertical overflow`);
    assert(layout.canvas.width > 300 && layout.canvas.height > 520, `${label} canvas is unexpectedly small`);
    assert(blackRatio < 0.08, `${label} canvas contains a black-block ratio of ${blackRatio}`);
    details.viewports.push({ label, layout, pageBytes: pagePng.length, canvasNearlyBlackRatio: blackRatio });
    await context.close();
  }
  checks.push({ name: '三种手机竖屏布局与黑块检测', passed: true, evidence: '360x800、390x844、430x932 均无页面溢出，Canvas 近黑像素占比均低于 8%。' });

  {
    const { context, page } = await openGame(browser, 'complete-business-loop', { width: 390, height: 844 });
    await page.locator('#game canvas').click({ position: { x: 180, y: 350 } });
    await page.evaluate(() => window.__GAME_TEST__.resetGame());
    await moveTo(page, { x: 88, y: 180 });
    await page.waitForFunction(() => {
      const value = window.__GAME_TEST__.getState();
      return value.carrying.fish + value.carrying.kelp === value.capacity;
    }, null, { timeout: 7_000 });
    const fullCarrier = await state(page);
    assert(fullCarrier.carrying.fish === 4, 'automatic fish harvesting did not fill the initial carrier');
    await saveScreenshot(page, 'round1-full-carrier.png');

    await moveTo(page, { x: 132, y: 470 });
    await page.waitForFunction(() => {
      const value = window.__GAME_TEST__.getState();
      return value.carrying.fish === 0 && value.shelves.fish >= 4;
    }, null, { timeout: 5_000 });
    await page.evaluate(() => window.__GAME_TEST__.spawnCustomer('fish'));
    await page.waitForFunction(() => window.__GAME_TEST__.getState().checkoutQueue.length > 0, null, { timeout: 5_000 });
    await moveTo(page, { x: 270, y: 696 });
    await page.waitForFunction(() => {
      const value = window.__GAME_TEST__.getState();
      return value.telemetry.completedOrders >= 1 && value.currency >= 4;
    }, null, { timeout: 5_000 });
    const completed = await state(page);
    assert(completed.telemetry.first.pickup !== null, 'pickup telemetry missing');
    assert(completed.telemetry.first.stock !== null, 'stock telemetry missing');
    assert(completed.telemetry.first.sale !== null, 'sale telemetry missing');
    assert(completed.telemetry.first.cashCollection !== null, 'cash collection telemetry missing');
    details.gameplay.completeLoop = {
      currency: completed.currency,
      shelves: completed.shelves,
      carrying: completed.carrying,
      completedOrders: completed.telemetry.completedOrders,
      first: completed.telemetry.first,
    };
    await saveScreenshot(page, 'round1-complete-loop.png');
    const fullFixture = await page.evaluate(() => window.__GAME_TEST__.resetGame());
    fullFixture.shelves.fish = 8;
    fullFixture.carrying.fish = 2;
    fullFixture.player = { x: 132, y: 470 };
    fullFixture.savedAtMs = Date.now();
    await context.close();

    const fullShelfScript = {
      fn: ({ key, fixture }) => localStorage.setItem(key, JSON.stringify(fixture)),
      arg: { key: currentSaveKey, fixture: fullFixture },
    };
    const fullShelfGame = await openGame(browser, 'full-shelf-boundary', { width: 390, height: 844 }, fullShelfScript);
    await fullShelfGame.page.waitForTimeout(1_100);
    const fullShelf = await state(fullShelfGame.page);
    assert(fullShelf.shelves.fish === 8, 'full shelf exceeded or lost its capacity boundary');
    assert(fullShelf.carrying.fish === 2, 'full shelf consumed carried overflow');
    details.gameplay.fullShelfBoundary = { shelf: fullShelf.shelves.fish, retainedCarry: fullShelf.carrying.fish };
    await saveScreenshot(fullShelfGame.page, 'round1-full-shelf-boundary.png');
    await fullShelfGame.context.close();
  }
  checks.push({ name: '完整经营循环与满仓边界', passed: true, evidence: '真实键盘移动完成自动捕鱼→满载→补货→顾客入队→收银→拾币；8/8 货架保持上限并保留携带溢出。' });

  {
    const legacy = {
      version: 3,
      currency: 31,
      player: { x: 270, y: 590, capacity: 6, inventory: { fish: 2, kelp: 1 } },
      upgrade: { purchases: 1 },
      shelves: { fish: 5, kelp: 2 },
      construction: { invested: 6, required: 12, unlocked: false },
      customers: [
        { id: 7, productId: 'fish', phase: 'waiting-stock', patienceRemainingMs: 4_200 },
        { id: 8, productId: 'kelp', phase: 'queued', patienceRemainingMs: 9_000 },
      ],
      checkout: { queue: [8], serviceProgressMs: 350 },
      shellTokens: [{ id: 21, value: 6, ageMs: 120, x: 270, y: 730 }],
      nextCustomerId: 9,
      nextTokenId: 22,
      elapsedMs: 31_400,
      savedAtMs: Date.now(),
    };
    const initScript = {
      fn: ({ currentKey, legacyKey, fixture }) => {
        if (sessionStorage.getItem('migration-fixture-installed')) return;
        localStorage.removeItem(currentKey);
        localStorage.setItem(legacyKey, JSON.stringify(fixture));
        sessionStorage.setItem('migration-fixture-installed', '1');
      },
      arg: { currentKey: currentSaveKey, legacyKey: legacySaveKey, fixture: legacy },
    };
    const { context, page } = await openGame(browser, 'migration-and-refresh', { width: 390, height: 844 }, initScript);
    const migrated = await state(page);
    assert(migrated.version === 4, 'legacy save did not migrate to version 4');
    assert(migrated.capacity === 6 && migrated.carrying.fish === 2 && migrated.carrying.kelp === 1, 'carrier migration lost progress');
    assert(migrated.construction.invested === 48, 'partial construction migration is incorrect');
    assert(migrated.checkoutQueue.includes(8), 'checkout queue migration failed');
    assert(migrated.tokens.some((token) => token.id === 21), 'shell token migration failed');
    assert(await page.evaluate((key) => localStorage.getItem(key) !== null, currentSaveKey), 'migrated save was not persisted under the current key');
    await page.evaluate(() => window.__GAME_TEST__.grantCurrency(13));
    const beforeRefresh = await state(page);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#game-shell')?.dataset.loading === 'false');
    const afterRefresh = await state(page);
    assert(afterRefresh.version === 4, 'refreshed save version changed');
    assert(afterRefresh.currency === beforeRefresh.currency, 'currency did not survive refresh');
    assert(afterRefresh.capacity === beforeRefresh.capacity, 'capacity did not survive refresh');
    assert(afterRefresh.carrying.fish === beforeRefresh.carrying.fish && afterRefresh.carrying.kelp === beforeRefresh.carrying.kelp, 'inventory did not survive refresh');
    details.storage.migration = {
      version: migrated.version,
      capacity: migrated.capacity,
      carrying: migrated.carrying,
      invested: migrated.construction.invested,
      queue: migrated.checkoutQueue,
      tokenIds: migrated.tokens.map((token) => token.id),
    };
    details.storage.refresh = { before: { currency: beforeRefresh.currency, capacity: beforeRefresh.capacity }, after: { currency: afterRefresh.currency, capacity: afterRefresh.capacity } };
    await context.close();

    const offlineFixture = structuredClone(afterRefresh);
    offlineFixture.player = { x: 88, y: 180 };
    offlineFixture.capacityTier = 0;
    offlineFixture.capacity = 4;
    offlineFixture.carrying = { fish: 0, kelp: 0 };
    offlineFixture.savedAtMs = Date.now() - 5_000;
    const recoveryScript = {
      fn: ({ key, fixture }) => localStorage.setItem(key, JSON.stringify(fixture)),
      arg: { key: currentSaveKey, fixture: offlineFixture },
    };
    const recoveredGame = await openGame(browser, 'offline-refresh-recovery', { width: 390, height: 844 }, recoveryScript);
    const recovered = await state(recoveredGame.page);
    assert(recovered.carrying.fish === 4, 'offline refresh recovery did not advance automatic fishing to carrier capacity');
    details.storage.offlineRecovery = { carrying: recovered.carrying, capacity: recovered.capacity };
    await recoveredGame.context.close();
  }
  checks.push({ name: '存档迁移与刷新恢复', passed: true, evidence: '真实 V3 运行态迁移保留容量、混合背包、建设进度、队列和贝壳币；刷新保留关键状态，5 秒离线推进捕鱼至容量上限。' });

  {
    const { context, page } = await openGame(browser, 'alpha-composites', { width: 900, height: 1100 });
    const foregrounds = ['character', 'fish', 'kelp', 'upgrade'];
    const backgrounds = [
      { name: 'light', color: '#F8FAE5' },
      { name: 'dark', color: '#163A4A' },
      { name: 'saturated', color: '#FF3B30' },
    ];
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>
      body{margin:0;padding:24px;background:#dbe7e8;font:16px sans-serif;color:#163a4a}
      h1{margin:0 0 18px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
      figure{margin:0;padding:12px;border-radius:16px;background:white}figcaption{font-weight:700;margin-bottom:8px}
      .tile{height:190px;display:grid;place-items:center;border-radius:12px}.tile img{width:164px;height:164px;object-fit:contain}
    </style><h1>透明素材三背景合成验证</h1><div class="grid">${foregrounds.flatMap((asset) => backgrounds.map((background) => `
      <figure><figcaption>${asset} / ${background.name}</figcaption><div class="tile" style="background:${background.color}"><img data-asset="${asset}" data-bg="${background.color}" src="${new URL(`assets/${asset}.png`, baseUrl).href}"></div></figure>`)).join('')}</div>`);
    await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
    const compositeResults = await page.evaluate(() => [...document.images].map((image) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      const background = image.dataset.bg;
      context.fillStyle = background;
      context.fillRect(0, 0, 256, 256);
      context.drawImage(image, 0, 0, 256, 256);
      const data = context.getImageData(0, 0, 256, 256).data;
      const probe = document.createElement('canvas').getContext('2d');
      probe.fillStyle = background;
      probe.fillRect(0, 0, 1, 1);
      const base = probe.getImageData(0, 0, 1, 1).data;
      let changed = 0;
      for (let pixel = 0; pixel < 256 * 256; pixel += 1) {
        const offset = pixel * 4;
        if (data[offset] !== base[0] || data[offset + 1] !== base[1] || data[offset + 2] !== base[2]) changed += 1;
      }
      const corners = [[0, 0], [255, 0], [0, 255], [255, 255]].map(([x, y]) => {
        const offset = (y * 256 + x) * 4;
        return data[offset] === base[0] && data[offset + 1] === base[1] && data[offset + 2] === base[2];
      });
      return { asset: image.dataset.asset, background, naturalSize: [image.naturalWidth, image.naturalHeight], changedRatio: changed / (256 * 256), transparentCorners: corners.every(Boolean) };
    }));
    for (const result of compositeResults) {
      assert(result.naturalSize[0] === 256 && result.naturalSize[1] === 256, `${result.asset} decoded at the wrong size`);
      assert(result.transparentCorners, `${result.asset} lost transparent corners on ${result.background}`);
      assert(result.changedRatio > 0.03 && result.changedRatio < 0.92, `${result.asset} has non-meaningful alpha coverage on ${result.background}`);
    }
    details.alphaComposites = compositeResults;
    await saveScreenshot(page, 'round1-alpha-composites.png');
    await context.close();
  }
  checks.push({ name: '透明素材三背景合成', passed: true, evidence: '角色、鲜鱼、海带、升级图标均为 256×256 RGBA PNG；在浅色、深色、饱和色背景上透明四角保持背景且可见像素覆盖有效。' });
} catch (error) {
  fatal = error;
  checks.push({ name: 'QA 执行完整性', passed: false, evidence: error instanceof Error ? error.message : String(error) });
} finally {
  await browser.close();
}

const textureWarnings = consoleEntries.filter((entry) => /texImage2D|bad image data/i.test(entry.text));
const consoleErrors = consoleEntries.filter((entry) => entry.type === 'error');
checks.push({
  name: '浏览器控制台与页面异常',
  passed: textureWarnings.length === 0 && consoleErrors.length === 0 && pageErrors.length === 0,
  evidence: `texImage2D/bad image data=${textureWarnings.length}，console error=${consoleErrors.length}，pageerror=${pageErrors.length}。`,
});

const diagnostics = {
  entries: consoleEntries,
  pageErrors,
  errorCounts: { consoleError: consoleErrors.length, pageError: pageErrors.length, textureUploadWarning: textureWarnings.length },
};
await writeFile(resolve(logsDir, 'browser-console.json'), `${JSON.stringify(diagnostics, null, 2)}\n`);
await writeFile(resolve(here, 'qa-details.json'), `${JSON.stringify(details, null, 2)}\n`);

const passed = !fatal && checks.every((check) => check.passed);
const report = {
  schemaVersion: 1,
  passed,
  checks,
  issues: passed ? [] : [{ id: 'BUILDER-NIGHT-R1', severity: 'error', message: fatal instanceof Error ? fatal.message : '浏览器复验未通过', evidence: 'artifacts/revisions/seaside-v5/evidence/builder-night-round1/qa-details.json' }],
  screenshots,
  consoleLog: 'artifacts/revisions/seaside-v5/evidence/builder-night-round1/logs/browser-console.json',
  testedAt: new Date().toISOString(),
};
await writeFile(resolve(here, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);

if (!passed) throw fatal ?? new Error('Browser QA failed');
console.log(JSON.stringify({ passed, checks: checks.length, screenshots: screenshots.length, errorCounts: diagnostics.errorCounts }, null, 2));
