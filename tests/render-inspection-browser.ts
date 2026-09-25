import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type BrowserContext, type Page } from '@playwright/test';
import {
  createRenderInspectionCheckpoints,
  RENDER_INSPECTION_SEED,
  type InspectionMode,
} from '../src/dev-render-inspection.ts';
import { collectionErrorsForRuntime } from '../src/dev-render-observation.ts';

const workspace = process.env.WORKSPACE ?? process.cwd();
const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4178/dev/render-inspection.html';
const evidenceDir = resolve(process.env.EVIDENCE_DIR ?? resolve(workspace, 'qa-evidence/render-inspection-r1-20260925'));
const testedCommit = process.env.TESTED_COMMIT ?? 'unknown';
const viewports = [
  { id: '1280x720', width: 1_280, height: 720 },
  { id: '844x390', width: 844, height: 390 },
] as const;
const modes: readonly InspectionMode[] = ['default', 'longmap'];
const checkpoints = createRenderInspectionCheckpoints();

export interface Telemetry {
  artifactType: string;
  seed: number;
  mode: InspectionMode;
  checkpoint: string;
  checkpointLabel: string;
  boundaryX: number;
  camera: { left: number; right: number; panOffset: number };
  chunks: unknown;
  nightCity: unknown;
  components: unknown;
  requestedTextureKeys: string[];
  loadedTextureKeys: string[];
  loadFailures: Array<{ key: string; url: string; message?: string }>;
  v36Requested: {
    status: 'MEASURED' | 'NOT_MEASURED' | 'FAILED';
    value?: boolean;
    scope?: string;
    observedCallCount?: number;
    reason?: string;
  };
  v36Visible: {
    status: 'MEASURED' | 'NOT_MEASURED' | 'FAILED';
    value?: boolean;
    scope?: string;
    reason?: string;
  };
  v36Drawn: {
    status: 'MEASURED' | 'NOT_MEASURED' | 'FAILED';
    value?: boolean;
    scope?: string;
    reason?: string;
  };
}

export interface CaseEvidence {
  mode: InspectionMode;
  viewport: { id: string; width: number; height: number };
  checkpoint: string;
  boundaryX: number;
  sceneFamilies: unknown;
  screenshot: { path: string; sha256: string };
  nightCity: unknown;
  components: unknown;
  requestedTextureKeys: string[];
  loadedTextureKeys: string[];
  loadFailures: Telemetry['loadFailures'];
  consoleErrors: string[];
  pageErrors: string[];
  v36: {
    requested: Telemetry['v36Requested'];
    visible: Telemetry['v36Visible'];
    drawn: Telemetry['v36Drawn'];
  };
  collectionErrors: string[];
}

export interface CaseCaptureResult {
  screenshot: { path: string; sha256: string };
  video?: { path: string; sha256: string };
}

export interface CaseCollectionInput {
  mode: InspectionMode;
  viewport: { id: string; width: number; height: number };
  checkpoint: { id: string };
  telemetry: Telemetry;
  consoleErrors: string[];
  pageErrors: string[];
  capture: () => Promise<CaseCaptureResult>;
}

export interface CaseCollectionResult {
  evidence: CaseEvidence;
  errors: string[];
  video?: { path: string; sha256: string };
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function writeScreenshot(page: Page, filePath: string): Promise<{ path: string; sha256: string }> {
  await mkdir(dirname(filePath), { recursive: true });
  await page.screenshot({ path: filePath, fullPage: true });
  return { path: filePath, sha256: sha256(await readFile(filePath)) };
}

/**
 * Finalizes a case only after screenshot and any bounded pan capture complete.
 * The listener arrays are intentionally read here, rather than at telemetry time,
 * so late browser errors affect the case, report, and process result together.
 */
export async function collectCaseEvidence(input: CaseCollectionInput): Promise<CaseCollectionResult> {
  const captured = await input.capture();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  const { mode, viewport, checkpoint, telemetry, consoleErrors, pageErrors } = input;
  const caseErrors: string[] = [];
  if (telemetry.seed !== RENDER_INSPECTION_SEED) caseErrors.push(`Unexpected seed: ${telemetry.seed}`);
  if (telemetry.mode !== mode || telemetry.checkpoint !== checkpoint.id) caseErrors.push('Unexpected telemetry identity');
  if (telemetry.v36Requested.status !== 'MEASURED') caseErrors.push(`v36 request observation status=${telemetry.v36Requested.status}`);
  else if (telemetry.v36Requested.value === true) caseErrors.push('v36 request observed in the adapter call window');
  if (telemetry.v36Visible.status !== 'NOT_MEASURED') caseErrors.push(`v36 visibility observation status=${telemetry.v36Visible.status}`);
  if (telemetry.v36Drawn.status !== 'NOT_MEASURED') caseErrors.push(`v36 draw observation status=${telemetry.v36Drawn.status}`);
  if (telemetry.requestedTextureKeys.some((key) => key.includes('v36'))) caseErrors.push('v36 texture key appeared in requestedTextureKeys');
  caseErrors.push(...collectionErrorsForRuntime({
    loadFailures: telemetry.loadFailures.length,
    consoleErrors: consoleErrors.length,
    pageErrors: pageErrors.length,
  }));
  return {
    evidence: {
      mode,
      viewport,
      checkpoint: checkpoint.id,
      boundaryX: telemetry.boundaryX,
      sceneFamilies: telemetry.chunks,
      screenshot: captured.screenshot,
      nightCity: telemetry.nightCity,
      components: telemetry.components,
      requestedTextureKeys: telemetry.requestedTextureKeys,
      loadedTextureKeys: telemetry.loadedTextureKeys,
      loadFailures: telemetry.loadFailures,
      consoleErrors: [...consoleErrors],
      pageErrors: [...pageErrors],
      v36: { requested: telemetry.v36Requested, visible: telemetry.v36Visible, drawn: telemetry.v36Drawn },
      collectionErrors: caseErrors,
    },
    errors: caseErrors,
    video: captured.video,
  };
}

export function collectionOutcome(collectionErrors: readonly unknown[]): { status: 'PASS' | 'FAILED'; exitCode: 0 | 1 } {
  return collectionErrors.length === 0 ? { status: 'PASS', exitCode: 0 } : { status: 'FAILED', exitCode: 1 };
}

async function waitForTelemetry(page: Page): Promise<Telemetry> {
  await page.waitForFunction(() => document.documentElement.dataset.inspectionReady === 'true', undefined, { timeout: 20_000 });
  await page.waitForFunction(() => {
    const text = document.querySelector('[data-inspection="telemetry"]')?.textContent ?? '';
    try {
      const value = JSON.parse(text) as { artifactType?: string };
      return value.artifactType === 'render-inspection-snapshot';
    } catch {
      return false;
    }
  }, undefined, { timeout: 20_000 });
  return JSON.parse(await page.locator('[data-inspection="telemetry"]').textContent() ?? '{}') as Telemetry;
}

async function openCase(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  mode: InspectionMode,
  checkpoint: (typeof checkpoints)[number],
  viewport: (typeof viewports)[number],
  recordVideo = false,
): Promise<{ context: BrowserContext; page: Page; telemetry: Telemetry; consoleErrors: string[]; pageErrors: string[] }> {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    recordVideo: recordVideo ? { dir: resolve(evidenceDir, 'video'), size: { width: viewport.width, height: viewport.height } } : undefined,
  });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const url = new URL(baseUrl);
  url.searchParams.set('mode', mode);
  url.searchParams.set('checkpoint', checkpoint.id);
  await page.goto(url.toString(), { waitUntil: 'networkidle' });
  const telemetry = await waitForTelemetry(page);
  return { context, page, telemetry, consoleErrors, pageErrors };
}

async function main(): Promise<void> {
  await mkdir(evidenceDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const cases: CaseEvidence[] = [];
  const collectionErrors: Array<{ mode: InspectionMode; viewport: string; checkpoint: string; message: string }> = [];
  const incompleteCases: Array<{
    mode: InspectionMode;
    viewport: string;
    checkpoint: string;
    message: string;
    telemetry?: Telemetry;
    consoleErrors: string[];
    pageErrors: string[];
  }> = [];
  let video: { path: string; sha256: string } | null = null;
  try {
    for (const mode of modes) {
      for (const viewport of viewports) {
        for (const checkpoint of checkpoints) {
          const captureVideo = mode === 'default' && viewport.id === '1280x720' && checkpoint.id === 'rooftops-01-to-02';
          let context: BrowserContext | undefined;
          let openedForDiagnostics: Pick<Awaited<ReturnType<typeof openCase>>, 'telemetry' | 'consoleErrors' | 'pageErrors'> | undefined;
          try {
            const opened = await openCase(browser, mode, checkpoint, viewport, captureVideo);
            openedForDiagnostics = opened;
            context = opened.context;
            const { page, telemetry, consoleErrors, pageErrors } = opened;
            const caseResult = await collectCaseEvidence({
              mode,
              viewport,
              checkpoint,
              telemetry,
              consoleErrors,
              pageErrors,
              capture: async () => {
                const screenshotPath = resolve(evidenceDir, 'screenshots', mode, viewport.id, `${checkpoint.id}.png`);
                const screenshot = await writeScreenshot(page, screenshotPath);
                if (captureVideo) {
                  await page.locator('[data-inspection="pan-right"]').click();
                  await page.waitForTimeout(220);
                  await page.locator('[data-inspection="pan-left"]').click();
                  await page.waitForTimeout(220);
                  await page.locator('[data-inspection="pan-center"]').click();
                  await page.waitForTimeout(220);
                }
                const videoHandle = page.video();
                if (!context) throw new Error('Browser context closed before case capture completed');
                await context.close();
                context = undefined;
                if (captureVideo && videoHandle) {
                  const videoPath = await videoHandle.path();
                  return { screenshot, video: { path: videoPath, sha256: sha256(await readFile(videoPath)) } };
                }
                return { screenshot };
              },
            });
            for (const message of caseResult.errors) collectionErrors.push({ mode, viewport: viewport.id, checkpoint: checkpoint.id, message });
            if (caseResult.video) video = caseResult.video;
            cases.push(caseResult.evidence);
            openedForDiagnostics = undefined;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            collectionErrors.push({ mode, viewport: viewport.id, checkpoint: checkpoint.id, message });
            if (openedForDiagnostics) {
              incompleteCases.push({
                mode,
                viewport: viewport.id,
                checkpoint: checkpoint.id,
                message,
                telemetry: openedForDiagnostics.telemetry,
                consoleErrors: [...openedForDiagnostics.consoleErrors],
                pageErrors: [...openedForDiagnostics.pageErrors],
              });
            }
            if (context) await context.close().catch(() => undefined);
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
  const outcome = collectionOutcome(collectionErrors);
  const report = {
    schemaVersion: 1,
    artifactType: 'render-inspection-qa-report',
    testedCommit,
    generatedAt: new Date().toISOString(),
    entry: { url: baseUrl, label: '开发渲染预览，非自然游玩证据' },
    longmapMode: {
      status: 'legacy-component-overlay-diagnostic',
      hybridComposition: 'unavailable-and-not-integrated',
      note: '当前 longmap 模式仅用于现有组件叠加诊断，不代表最终组景方案、资源批准或默认启用。',
    },
    seed: RENDER_INSPECTION_SEED,
    checkpoints: checkpoints.map(({ id, boundaryX, leftChunk, rightChunk }) => ({
      id,
      boundaryX,
      leftChunk: { chunkId: leftChunk.chunkId, sceneFamily: leftChunk.sceneFamily, startX: leftChunk.startX, endX: leftChunk.endX },
      rightChunk: { chunkId: rightChunk.chunkId, sceneFamily: rightChunk.sceneFamily, startX: rightChunk.startX, endX: rightChunk.endX },
    })),
    viewports,
    modes,
    cases,
    incompleteCases,
    video,
    status: outcome.status,
    collectionErrors,
    notes: [
      '截图和录像使用真实 Chromium、Phaser loader、NightCityRenderer 和 ComponentRenderer。',
      '当前 longmap 模式仅用于现有组件叠加诊断，不代表最终组景方案、资源批准或默认启用。',
      'v36Requested 只测量 Phaser load.image 适配器调用窗口；v36Visible 和 v36Drawn 明确为 NOT_MEASURED。',
      '缺失/加载失败、控制台错误和页面异常按实际结果保留；非零错误会使采集任务失败。',
      '本报告不代表自然游玩到达，也不代表屋脊接缝已修复。',
    ],
  };
  const reportPath = resolve(evidenceDir, 'report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const loadFailures = cases.reduce((total, item) => total + item.loadFailures.length, 0);
  const consoleErrors = cases.reduce((total, item) => total + item.consoleErrors.length, 0);
  const pageErrors = cases.reduce((total, item) => total + item.pageErrors.length, 0);
  console.log(JSON.stringify({ reportPath, status: outcome.status, cases: cases.length, incompleteCases: incompleteCases.length, video, loadFailures, consoleErrors, pageErrors, collectionErrors }, null, 2));
  if (outcome.exitCode !== 0) process.exitCode = outcome.exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
