import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let server: ViteDevServer;
let browser: Browser;
let baseUrl: string;

beforeAll(async () => {
  server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  baseUrl = server.resolvedUrls!.local[0]!;
  browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--use-angle=metal'] });
}, 120_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

async function expansionSettlement(page: Page): Promise<void> {
  await page.goto(baseUrl);
  await page.waitForFunction(() => !!window.__GAME_TEST__ && !!document.querySelector('#game canvas'));
  await page.evaluate(() => {
    window.__GAME_TEST__.grantCurrency(30);
    window.__GAME_TEST__.setPlayerPosition({ x: 420, y: 720 });
    window.__GAME_TEST__.advanceTime(3200);
  });
  await page.waitForFunction(() => window.__GAME_TEST__.getState().stage === 'settlement'
    && document.querySelector<HTMLElement>('#settlement')?.hidden === false);
}

async function avatarPixels(page: Page, position: { x: number; y: number }): Promise<{ body: number; head: number }> {
  const box = (await page.locator('#game canvas').boundingBox())!;
  const screenshot = await page.screenshot({ clip: box });
  const landscape = await page.locator('body').evaluate(n => n.classList.contains('is-landscape'));
  return page.evaluate(async ({ png, point, rotated }) => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + png;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let body = 0;
    let head = 0;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const worldX = rotated ? y / canvas.height * 540 : x / canvas.width * 540;
        const worldY = rotated ? (1 - x / canvas.width) * 960 : y / canvas.height * 960;
        if (Math.abs(worldX - point.x) > 20 || worldY < point.y - 40 || worldY > point.y + 32) continue;
        const index = (y * canvas.width + x) * 4;
        if (Math.abs(rgba[index]! - 44) <= 4 && Math.abs(rgba[index + 1]! - 155) <= 4 && Math.abs(rgba[index + 2]! - 155) <= 4) body += 1;
        if (Math.abs(rgba[index]! - 255) <= 4 && Math.abs(rgba[index + 1]! - 235) <= 4 && Math.abs(rgba[index + 2]! - 190) <= 4) head += 1;
      }
    }
    const areaScale = canvas.width * canvas.height / (540 * 960);
    return { body: body / areaScale, head: head / areaScale };
  }, { png: screenshot.toString('base64'), point: position, rotated: landscape });
}

describe('runtime settlement and avatar presentation', () => {
  it.each([[360, 800], [390, 844], [430, 932], [540, 960], [844, 390]])(
    'shows one full-width continue command at %ix%i and preserves two market destinations',
    async (width, height) => {
      const page = await browser.newPage({ viewport: { width, height } });
      try {
        await expansionSettlement(page);
        const choices = page.locator('#settlement [data-market-id]:visible');
        expect(await choices.count()).toBe(1);
        expect(await page.locator('#restart-round:visible').count()).toBe(1);
        const widths = await page.locator('#continue-round').evaluate((button) => ({
          button: button.getBoundingClientRect().width,
          options: button.parentElement!.getBoundingClientRect().width,
          hiddenDisplay: getComputedStyle(document.querySelector('#moon-tide-market')!).display,
        }));
        expect(widths.hiddenDisplay).toBe('none');
        expect(widths.button).toBeCloseTo(widths.options, 0);

        await page.locator('#continue-round').click();
        await page.evaluate(() => {
          window.__GAME_TEST__.setPlayerPosition({ x: 480, y: 840 });
          window.__GAME_TEST__.advanceTime(1000);
        });
        await page.waitForFunction(() => window.__GAME_TEST__.getState().stage === 'market-selection');
        expect(await choices.count()).toBe(2);
        expect(await choices.locator('span').allTextContents()).toEqual(['珊瑚湾市场', '月潮码头']);
      } finally { await page.close(); }
    }, 30_000,
  );

  it.each([[540, 960], [844, 390]])('keeps the avatar body and head visible through funding labels at %ix%i', async (width, height) => {
    const page = await browser.newPage({ viewport: { width, height } });
    try {
      await expansionSettlement(page);
      await page.locator('#continue-round').click();
      await page.evaluate(() => window.__GAME_TEST__.setPlayerPosition({ x: 270, y: 260 }));
      await page.waitForTimeout(100);
      const unobscured = await avatarPixels(page, { x: 270, y: 260 });
      expect(unobscured.body).toBeGreaterThan(400);
      expect(unobscured.head).toBeGreaterThan(200);
      for (const position of [{ x: 174, y: 786 }, { x: 120, y: 786 }, { x: 120, y: 806 }, { x: 120, y: 880 }]) {
        await page.evaluate((point) => {
          window.__GAME_TEST__.setPlayerPosition(point);
          window.__GAME_TEST__.advanceTime(250);
        }, position);
        const pixels = await avatarPixels(page, position);
        expect(pixels.body, JSON.stringify({ position, pixels })).toBeGreaterThan(unobscured.body * 0.8);
        expect(pixels.head, JSON.stringify({ position, pixels })).toBeGreaterThan(unobscured.head * 0.8);
      }
    } finally { await page.close(); }
  }, 30_000);
});
