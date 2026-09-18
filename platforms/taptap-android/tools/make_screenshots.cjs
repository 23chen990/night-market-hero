#!/usr/bin/env node
/**
 * 用 Playwright + Chromium 以横屏视口启动游戏，截取真实画面，
 * 用于 TapTap 资质审核的「游戏截图」物料。
 *
 * 用法：
 *   1) 确认已完成 tools/import_game.py（生成 app/src/main/assets/index.html）
 *   2) node tools/make_screenshots.js
 *   3) 输出到 store/screenshots/01.jpg ~ 04.jpg
 *
 * 视口选择 1920x1080 横屏，与游戏的 16:9 横屏参考系匹配。
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require('@playwright/test');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TARGET = path.resolve(
  PROJECT_ROOT,
  'app/src/main/assets/index.html'
);
const OUT_DIR = path.resolve(PROJECT_ROOT, 'store/screenshots');

const VIEWPORT = { width: 1920, height: 1080 };

// 不同时间点抓到的画面，呈现游戏不同瞬间
const SHOTS = [
  { name: '01', delayMs: 1200, note: '开屏/起始' },
  { name: '02', delayMs: 3500, note: '主玩法·场景一' },
  { name: '03', delayMs: 6500, note: '主玩法·场景二' },
  { name: '04', delayMs: 10000, note: '主玩法·场景三' },
];

(async () => {
  if (!fs.existsSync(TARGET)) {
    console.error(`[错误] 找不到 ${TARGET}\n       请先运行：python3 tools/import_game.py`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const url = 'file://' + TARGET;
  console.log('==> 启动 Chromium，加载', url);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-features=VizDisplayCompositor',
    ],
  });
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('[console]', m.text());
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // 等 Phaser 启动并跑几帧
  await page.waitForTimeout(800);

  for (const shot of SHOTS) {
    console.log(`    截图 ${shot.name}  等待 ${shot.delayMs}ms ...`);
    await page.waitForTimeout(shot.delayMs);
    const outPath = path.join(OUT_DIR, `${shot.name}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`    -> ${outPath}`);
  }

  await browser.close();
  console.log('==> 完成。请打开 store/screenshots/ 挑选最适合提交的画面。');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});