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
  assert.match(html, /src="\/src\/dev-render-inspection\.ts"/);
});

test('the dev-only HTML is not the formal self-contained build entry', async () => {
  const config = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(config, /dev\/render-inspection\.html/);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /src\/main\.ts/);
  assert.doesNotMatch(html, /dev\/render-inspection/);
});
