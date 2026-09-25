import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { INSPECTION_VIEWPORT } from '../src/dev-render-inspection.ts';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4194/dev/render-inspection.html';
const evidenceDir = resolve(process.env.EVIDENCE_DIR ?? resolve(process.cwd(), 'qa-evidence/b01-empty-slot-r1.1-20260925'));
const testedCommit = process.env.TESTED_COMMIT ?? 'unknown';
const seed = 20_260_919;
const expected = Object.freeze({
  assetId: 'rooftops.foregroundEaveOccluder',
  assetStatus: 'MISSING',
  checkpoint: 'market-to-rooftops',
  panOffset: 240,
  chunkId: 'chain-0/rooftops-01/low-tile-ridges',
  placementId: 'eave-occluder',
  world: { x: 8_510, y: 168, width: 491.52, height: 163.84 },
});

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function waitForTelemetry(page: Page): Promise<Record<string, any>> {
  await page.waitForFunction(() => document.documentElement.dataset.inspectionReady === 'true');
  await page.waitForFunction(() => {
    try {
      return JSON.parse(document.querySelector('[data-inspection="telemetry"]')?.textContent ?? '{}').artifactType === 'render-inspection-snapshot';
    } catch {
      return false;
    }
  });
  return JSON.parse(await page.locator('[data-inspection="telemetry"]').textContent() ?? '{}') as Record<string, any>;
}

async function capture(mode: 'default' | 'longmap', viewport: { id: string; width: number; height: number }): Promise<Record<string, unknown>> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('mode', mode);
    url.searchParams.set('checkpoint', expected.checkpoint);
    await page.goto(url.toString(), { waitUntil: 'networkidle' });
    await waitForTelemetry(page);
    await page.locator('[data-inspection="pan-right"]').click();
    await page.locator('[data-inspection="pan-right"]').click();
    await page.waitForFunction(() => document.documentElement.dataset.inspectionPanOffset === '240');
    const telemetry = await waitForTelemetry(page);
    const canvas = await page.locator('canvas').evaluate((element) => {
      const canvasElement = element as HTMLCanvasElement;
      const rect = element.getBoundingClientRect();
      return {
        logical: { width: canvasElement.width, height: canvasElement.height },
        display: { width: rect.width, height: rect.height },
        devicePixelRatio: window.devicePixelRatio,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      };
    });
    const camera = telemetry.camera as { left: number; right: number; panOffset: number };
    const screenshotPath = resolve(evidenceDir, 'screenshots', mode, `${viewport.id}.png`);
    await mkdir(resolve(evidenceDir, 'screenshots', mode), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return {
      mode,
      viewport,
      camera,
      logicalViewport: INSPECTION_VIEWPORT,
      canvas,
      checkpoint: telemetry.checkpoint,
      seed: telemetry.seed,
      sceneFamily: 'rooftops-01/low-tile-ridges',
      chunkId: expected.chunkId,
      placementId: expected.placementId,
      assetId: expected.assetId,
      assetStatus: expected.assetStatus,
      expectedWorldRect: expected.world,
      coverage: {
        horizontal: camera.left <= expected.world.x && camera.right >= expected.world.x + expected.world.width,
        vertical: 0 <= expected.world.y && expected.world.y + expected.world.height <= INSPECTION_VIEWPORT.height,
      },
      componentStats: telemetry.components,
      requestedTextureKeys: telemetry.requestedTextureKeys,
      loadedTextureKeys: telemetry.loadedTextureKeys,
      loadFailures: telemetry.loadFailures,
      consoleErrors,
      pageErrors,
      screenshot: {
        path: screenshotPath,
        sha256: sha256(await readFile(screenshotPath)),
      },
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main(): Promise<void> {
  await mkdir(evidenceDir, { recursive: true });
  const cases: Record<string, unknown>[] = [];
  const errors: string[] = [];
  for (const mode of ['longmap', 'default'] as const) {
    for (const viewport of [
      { id: '1280x720', width: 1_280, height: 720 },
      { id: '844x390', width: 844, height: 390 },
    ]) {
      try {
        const result = await capture(mode, viewport);
        cases.push(result);
        const camera = result.camera as { left: number; right: number; panOffset: number };
        const coverage = result.coverage as { horizontal: boolean; vertical: boolean };
        if (camera.panOffset !== expected.panOffset) errors.push(`${mode}/${viewport.id}: panOffset was not +240`);
        if (!coverage.horizontal || !coverage.vertical) errors.push(`${mode}/${viewport.id}: expected B01 rect is not fully in the logical camera`);
        if ((result.loadFailures as unknown[]).length > 0) errors.push(`${mode}/${viewport.id}: Phaser load failure`);
        if ((result.consoleErrors as unknown[]).length > 0) errors.push(`${mode}/${viewport.id}: console error`);
        if ((result.pageErrors as unknown[]).length > 0) errors.push(`${mode}/${viewport.id}: page error`);
      } catch (error) {
        errors.push(`${mode}/${viewport.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  const report = {
    schemaVersion: 1,
    artifactType: 'b01-empty-slot-baseline-report',
    testedCommit,
    generatedAt: new Date().toISOString(),
    entry: { url: baseUrl, label: '开发渲染预览，B01 空槽位基线，非资源接入证据' },
    seed,
    expected,
    cases,
    status: errors.length === 0 ? 'PASS' : 'FAILED',
    errors,
    notes: [
      '只使用现有检查页的 checkpoint 选择和 pan-right 操作；没有加载候选资源。',
      'B01 仍为 MISSING；longmap 只记录未来单资源对照所需的空槽位。',
      'missingAssetCount 含预取范围，不代表当前屏幕的缺图数量。',
    ],
  };
  const reportPath = resolve(evidenceDir, 'report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ reportPath, status: report.status, cases: cases.length, errors }, null, 2));
  if (errors.length > 0) process.exitCode = 1;
}

await main();
