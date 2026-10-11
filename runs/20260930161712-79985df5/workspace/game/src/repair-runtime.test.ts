import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import generatedConfig from './generated/game-config.json';
import { advanceGame, createInitialState, selectMarket, setPlayerPosition, type GameState, type SpatialShopConfig } from './simulation.js';
import { getMarketDefinition } from './revision.js';
import { serializeGameState } from './save.js';

const shop = generatedConfig.spatialShop as SpatialShopConfig;
const evidence = process.env.REPAIR_RUNTIME_EVIDENCE;
let server: ViteDevServer;
let browser: Browser;
let baseUrl: string;
beforeAll(async () => {
  server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  baseUrl = server.resolvedUrls!.local[0]!;
  browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--use-angle=metal'] });
  if (evidence) await mkdir(evidence, { recursive: true });
}, 120_000);
afterAll(async () => { await browser?.close(); await server?.close(); });

async function load(page: Page, state: GameState): Promise<void> {
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), {
    key: `ai-game-factory:spatial-shop:${generatedConfig.title}`, save: serializeGameState(state),
  });
  await page.goto(baseUrl);
  await page.waitForFunction(() => !!window.__GAME_TEST__ && !!document.querySelector('#game canvas'));
  await page.waitForTimeout(150);
}
async function capture(page: Page, name: string): Promise<void> {
  if (evidence) await page.screenshot({ path: resolve(evidence, `${name}.png`) });
}
function settleMarket(marketId: 'coral-cove-market' | 'moon-tide-market'): GameState {
  let state = selectMarket({ ...createInitialState(shop), stage: 'market-selection', marketSelectionOpen: true }, marketId);
  const market = getMarketDefinition(marketId);
  const checkout = market.stationPositions.checkout!;
  for (let id = 1; id <= market.constructionTarget; id += 1) {
    const shoppingList = marketId === 'coral-cove-market'
      ? [{ productId: 'smoked-fish', quantity: 1, collected: 1, shelfId: 'smoked-shelf' }]
      : [{ productId: 'fresh-fish', quantity: 1, collected: 1, shelfId: 'fish-shelf' }, { productId: 'smoked-fish', quantity: 1, collected: 1, shelfId: 'smoked-shelf' }];
    state.customers = [{ id, ...checkout, phase: 'queued', productId: shoppingList[0]!.productId, targetShelfId: shoppingList[0]!.shelfId, patienceRemainingMs: 8_000, basketValue: 7, queuePosition: checkout, queueTicket: id, shoppingList, activeLineIndex: shoppingList.length - 1, departureReason: null }];
    state.checkout.queue = 1;
    state = advanceGame(shop, setPlayerPosition(state, checkout), 1_500);
  }
  expect(state.stage).toBe('settlement');
  return state;
}
async function gullPixels(page: Page, point: { x: number; y: number }): Promise<{ body: number; wings: number; relief: number }> {
  const box = (await page.locator('#game canvas').boundingBox())!;
  const screenshot = await page.screenshot({ clip: box });
  return page.evaluate(async ({ png, center }) => {
    const rotated = document.body.classList.contains('is-landscape');
    const image = new Image(); image.src = 'data:image/png;base64,' + png; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let body = 0; let wings = 0; let relief = 0;
    for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
      const wx = rotated ? y / canvas.height * 540 : x / canvas.width * 540;
      const wy = rotated ? (1 - x / canvas.width) * 960 : y / canvas.height * 960;
      const i = (y * canvas.width + x) * 4;
      if (Math.hypot(wx - center.x, wy - center.y) < 54 && Math.abs(pixels[i]! - 143) < 8 && Math.abs(pixels[i + 1]! - 205) < 8 && Math.abs(pixels[i + 2]! - 187) < 8) relief += 1;
      if (Math.abs(wx - center.x) > 22 || Math.abs(wy - center.y) > 10) continue;
      if (Math.abs(pixels[i]! - 244) < 10 && Math.abs(pixels[i + 1]! - 247) < 10 && Math.abs(pixels[i + 2]! - 247) < 10) body += 1;
      if (Math.abs(pixels[i]! - 100) < 10 && Math.abs(pixels[i + 1]! - 116) < 10 && Math.abs(pixels[i + 2]! - 139) < 10) wings += 1;
    }
    const scale = canvas.width * canvas.height / (540 * 960);
    return { body: body / scale, wings: wings / scale, relief: relief / scale };
  }, { png: screenshot.toString('base64'), center: point });
}

describe('validated attempt8 runtime branches', () => {
  it('shows shelf-local recovery pixels after a successful chase', async () => {
    let state = createInitialState(shop); state.level = 2;
    state.stations['fish-shelf']!.stock['fresh-fish'] = 8;
    state = advanceGame(shop, state, 8_000);
    state = advanceGame(shop, setPlayerPosition(state, { x: 270, y: 420 }), 50);
    expect(state.pressure.seagull.active).toBe(false);
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    try {
      await load(page, state); await capture(page, 'recovery-ring');
      const pixels = await gullPixels(page, { x: 270, y: 420 });
      if (evidence) await writeFile(resolve(evidence, 'recovery-pixels.json'), JSON.stringify(pixels));
      expect(pixels.relief).toBeGreaterThan(400);
      await page.evaluate(() => window.__GAME_TEST__.advanceTime(6_000));
      expect((await gullPixels(page, { x: 270, y: 420 })).relief).toBeLessThan(100);
      expect(await page.evaluate(() => window.__GAME_TEST__.getState().pressure.seagull.active)).toBe(false);
    } finally { await page.close(); }
  }, 30_000);

  it.each(['coral-cove-market', 'moon-tide-market'] as const)('attributes %s settlement to its completed goal', async marketId => {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    try {
      const state = settleMarket(marketId); await load(page, state); await capture(page, marketId);
      const terminal = page.locator('#settlement');
      expect(await terminal.isVisible()).toBe(true);
      expect(await terminal.locator('strong').first().textContent()).toContain(getMarketDefinition(marketId).goalLabel);
      expect(await terminal.textContent()).not.toContain('潮池扩建完成');
      const goal = terminal.locator('[role="progressbar"]');
      expect(await goal.isVisible()).toBe(true);
      expect(await goal.getAttribute('aria-valuenow')).toBe(String(getMarketDefinition(marketId).constructionTarget));
      expect(await terminal.locator('[data-market-id]:visible').count()).toBe(1);
    } finally { await page.close(); }
  }, 30_000);

  it('loads an explicit existing icon successfully', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl);
      const icon = page.locator('link[rel="icon"]');
      expect(await icon.count()).toBe(1);
      const href = await icon.getAttribute('href');
      expect((await page.request.get(new URL(href!, baseUrl).href)).status()).toBe(200);
    } finally { await page.close(); }
  });

  it.each([[540, 960], [844, 390]])('keeps the raiding gull distinct from shelf labels at %ix%i', async (width, height) => {
    let raiding = createInitialState(shop); raiding.level = 2;
    raiding.unlockedStationIds = shop.stations.map(station => station.id);
    raiding.stations['fish-shelf']!.stock['fresh-fish'] = 8;
    raiding = advanceGame(shop, setPlayerPosition(raiding, { x: 80, y: 260 }), 7_200);
    expect(raiding.feedback.some(event => event.kind === 'seagull-loss')).toBe(true);
    expect(raiding.pressure.seagull).toMatchObject({ active: true, mode: 'raiding', targetShelfId: 'fish-shelf' });
    const measurements: Array<{ body: number; wings: number }> = [];
    for (const [name, y] of [['unoccluded-control', 260], ['shelf-branch', 420]] as const) {
      const page = await browser.newPage({ viewport: { width, height } });
      try {
        const seed = structuredClone(raiding); seed.pressure.seagull.y = y;
        await load(page, seed); await capture(page, `${width}x${height}-${name}`);
        measurements.push(await gullPixels(page, { x: 270, y }));
      } finally { await page.close(); }
    }
    const [control, shelf] = measurements;
    if (evidence) await writeFile(resolve(evidence, `${width}x${height}-pixels.json`), JSON.stringify({ width, height, control, shelf }, null, 2));
    expect(control!.body).toBeGreaterThan(75); expect(control!.wings).toBeGreaterThan(100);
    expect(shelf!.body).toBeGreaterThan(control!.body * 0.8);
    expect(shelf!.wings).toBeGreaterThan(control!.wings * 0.8);
  }, 30_000);
});
