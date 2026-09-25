import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  INSPECTION_PAN_LIMIT,
  INSPECTION_VIEWPORT,
  RENDER_INSPECTION_SEED,
  cameraLeftForCheckpoint,
  clampInspectionPan,
  createRenderInspectionCheckpoints,
  parseInspectionMode,
} from '../src/dev-render-inspection.ts';
import {
  collectCaseEvidence,
  collectionOutcome,
  type Telemetry,
} from './render-inspection-browser.ts';

test('derives the three R1 checkpoints from the authoritative RunPlan', () => {
  const checkpoints = createRenderInspectionCheckpoints();
  assert.deepEqual(checkpoints.map((checkpoint) => checkpoint.id), [
    'market-to-rooftops',
    'rooftops-01-to-02',
    'rooftops-03-to-04',
  ]);
  assert.deepEqual(checkpoints.map((checkpoint) => checkpoint.boundaryX), [8_000, 9_600, 12_800]);
  assert.equal(checkpoints[0]?.leftChunk.sceneFamily, 'transition/market-to-rooftops/climb-to-eaves');
  assert.equal(checkpoints[0]?.rightChunk.sceneFamily, 'rooftops-01/low-tile-ridges');
  assert.equal(checkpoints[1]?.leftChunk.sceneFamily, 'rooftops-01/low-tile-ridges');
  assert.equal(checkpoints[1]?.rightChunk.sceneFamily, 'rooftops-02/stepped-eaves');
  assert.equal(checkpoints[2]?.leftChunk.sceneFamily, 'rooftops-03/cross-street-roof-bridge');
  assert.equal(checkpoints[2]?.rightChunk.sceneFamily, 'rooftops-04/open-high-ridge');
  assert.ok(checkpoints.every((checkpoint) => checkpoint.leftChunk.endX === checkpoint.boundaryX));
  assert.ok(checkpoints.every((checkpoint) => checkpoint.rightChunk.startX === checkpoint.boundaryX));
  assert.equal(checkpoints[0]?.seed, RENDER_INSPECTION_SEED);
});

test('centers the actual logical camera on a checkpoint and bounds preview panning', () => {
  const checkpoint = createRenderInspectionCheckpoints()[1]!;
  assert.equal(cameraLeftForCheckpoint(checkpoint), checkpoint.boundaryX - INSPECTION_VIEWPORT.width / 2);
  assert.equal(clampInspectionPan(-INSPECTION_PAN_LIMIT - 1), -INSPECTION_PAN_LIMIT);
  assert.equal(clampInspectionPan(INSPECTION_PAN_LIMIT + 1), INSPECTION_PAN_LIMIT);
  assert.equal(clampInspectionPan(120), 120);
});

test('only the explicit longmap mode enables component comparison', () => {
  assert.equal(parseInspectionMode(null), 'default');
  assert.equal(parseInspectionMode('default'), 'default');
  assert.equal(parseInspectionMode('longmap'), 'longmap');
  assert.equal(parseInspectionMode('1'), 'default');
});

test('the R1 entry is isolated from formal bootstrap, state APIs, and player persistence', async () => {
  const source = await readFile(new URL('../src/dev-render-inspection.ts', import.meta.url), 'utf8');
  const html = await readFile(new URL('../dev/render-inspection.html', import.meta.url), 'utf8');
  assert.match(source, /createNightCityRenderer/);
  assert.match(source, /createComponentRenderer/);
  assert.match(source, /runPlanChunkAtIndex/);
  assert.doesNotMatch(source, /from ['"].*main/);
  assert.doesNotMatch(source, /LocalRunSnapshotStorage|LocalProgressStorage|__GAME_TEST__|__FORMAL_TEST__|__PROTOTYPE_TEST__/);
  assert.match(html, /开发渲染预览，非自然游玩证据/);
  assert.match(html, /legacy overlay/);
  assert.match(html, /当前 longmap 模式仅用于现有组件叠加诊断，不代表最终组景方案、资源批准或默认启用/);
  assert.match(html, /src="\/src\/dev-render-inspection\.ts"/);
});

test('the dev-only HTML is not the formal self-contained build entry', async () => {
  const config = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(config, /dev\/render-inspection\.html/);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /src\/main\.ts/);
  assert.doesNotMatch(html, /dev\/render-inspection/);
});

test('R1 telemetry exposes measured request state and explicit unmeasured visibility state', async () => {
  const browserSource = await readFile(new URL('../src/dev-render-inspection-browser.ts', import.meta.url), 'utf8');
  const collector = await readFile(new URL('./render-inspection-browser.ts', import.meta.url), 'utf8');
  assert.match(browserSource, /v36RequestObservation\.read\(\)/);
  assert.match(browserSource, /v36Visible: NOT_MEASURED_V36_VISIBILITY/);
  assert.match(browserSource, /v36Drawn: \{\s*status: 'NOT_MEASURED'/);
  assert.doesNotMatch(browserSource, /visibleTextureKeys/);
  assert.match(collector, /telemetry\.v36Requested\.status !== 'MEASURED'/);
  assert.match(collector, /telemetry\.v36Visible\.status !== 'NOT_MEASURED'/);
  assert.match(collector, /telemetry\.v36Drawn\.status !== 'NOT_MEASURED'/);
  assert.doesNotMatch(collector, /if \(telemetry\.v36Requested \|\| telemetry\.v36Visible \|\| telemetry\.v36Drawn\)/);
  assert.match(collector, /collectionOutcome\(collectionErrors\)/);
  assert.match(collector, /process\.exitCode = outcome\.exitCode/);
});

function lateErrorTelemetry(): Telemetry {
  return {
    artifactType: 'render-inspection-snapshot',
    seed: RENDER_INSPECTION_SEED,
    mode: 'default',
    checkpoint: 'market-to-rooftops',
    checkpointLabel: 'market-to-rooftops',
    boundaryX: 8_000,
    camera: { left: 7_164, right: 8_836, panOffset: 0 },
    chunks: [],
    nightCity: {},
    components: {},
    requestedTextureKeys: [],
    loadedTextureKeys: [],
    loadFailures: [],
    v36Requested: { status: 'MEASURED', value: false },
    v36Visible: { status: 'NOT_MEASURED' },
    v36Drawn: { status: 'NOT_MEASURED' },
  };
}

test('late console errors after telemetry fail the case and collection outcome', async () => {
  const consoleErrors: string[] = [];
  const result = await collectCaseEvidence({
    mode: 'default',
    viewport: { id: '1280x720', width: 1_280, height: 720 },
    checkpoint: { id: 'market-to-rooftops' },
    telemetry: lateErrorTelemetry(),
    consoleErrors,
    pageErrors: [],
    capture: async () => {
      consoleErrors.push('late console error during screenshot/pan');
      return { screenshot: { path: '/tmp/fake.png', sha256: 'fake' } };
    },
  });
  assert.deepEqual(result.evidence.consoleErrors, ['late console error during screenshot/pan']);
  assert.deepEqual(result.errors, ['console errors: 1']);
  assert.deepEqual(collectionOutcome(result.errors), { status: 'FAILED', exitCode: 1 });
});

test('late page errors after telemetry fail the case and collection outcome', async () => {
  const pageErrors: string[] = [];
  const result = await collectCaseEvidence({
    mode: 'default',
    viewport: { id: '1280x720', width: 1_280, height: 720 },
    checkpoint: { id: 'market-to-rooftops' },
    telemetry: lateErrorTelemetry(),
    consoleErrors: [],
    pageErrors,
    capture: async () => {
      pageErrors.push('late page error during screenshot/pan');
      return { screenshot: { path: '/tmp/fake.png', sha256: 'fake' } };
    },
  });
  assert.deepEqual(result.evidence.pageErrors, ['late page error during screenshot/pan']);
  assert.deepEqual(result.errors, ['page errors: 1']);
  assert.deepEqual(collectionOutcome(result.errors), { status: 'FAILED', exitCode: 1 });
});

test('a case without late errors remains a passing collection outcome', async () => {
  const result = await collectCaseEvidence({
    mode: 'default',
    viewport: { id: '1280x720', width: 1_280, height: 720 },
    checkpoint: { id: 'market-to-rooftops' },
    telemetry: lateErrorTelemetry(),
    consoleErrors: [],
    pageErrors: [],
    capture: async () => ({ screenshot: { path: '/tmp/fake.png', sha256: 'fake' } }),
  });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(collectionOutcome(result.errors), { status: 'PASS', exitCode: 0 });
});
