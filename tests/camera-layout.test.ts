import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  LOGICAL_VIEWPORT,
  createCameraLayout,
  projectCamera,
} from '../src/camera-layout.ts';

describe('night-city camera layout', () => {
  test('uses one logical 16:9 viewport and keeps the hero in the mobile landscape frame', () => {
    const layout = createCameraLayout({ width: 844, height: 390 });
    assert.equal(layout.logicalWidth, LOGICAL_VIEWPORT.width);
    assert.equal(layout.logicalHeight, LOGICAL_VIEWPORT.height);
    assert.ok(Math.abs(layout.aspect - 16 / 9) < 0.001);

    const projection = projectCamera(layout, { x: 420, y: 560 }, {
      left: 0,
      right: 20_000,
      top: 0,
      bottom: LOGICAL_VIEWPORT.height,
    });
    assert.ok(projection.playerScreenX >= -1 && projection.playerScreenX <= layout.width + 1);
    assert.ok(projection.playerScreenY >= -1 && projection.playerScreenY <= layout.height + 1);
    assert.ok(projection.worldViewportHeight >= LOGICAL_VIEWPORT.height - 1);
  });

  test('look-ahead is stable while camera scroll is clamped to world bounds', () => {
    const layout = createCameraLayout({ width: 1672, height: 941, lookAhead: 0.32 });
    const left = projectCamera(layout, { x: 0, y: 200 }, { left: 0, right: 3_200, top: 0, bottom: 941 });
    const forward = projectCamera(layout, { x: 1_800, y: 200 }, { left: 0, right: 3_200, top: 0, bottom: 941 });
    assert.equal(layout.lookAhead, 0.32);
    assert.ok(left.scrollX >= 0);
    assert.ok(forward.scrollX >= left.scrollX);
    assert.ok(forward.scrollX <= 3_200 - forward.worldViewportWidth + 0.001);
    assert.ok(forward.playerScreenY >= 0 && forward.playerScreenY <= layout.height);
  });

  test('keeps the side-view vertical origin fixed during a jump so raster scenery cannot uncover the shell', () => {
    const layout = createCameraLayout({ width: 844, height: 390 });
    const grounded = projectCamera(layout, { x: 420, y: 640 }, { left: 0, right: 20_000, top: 0, bottom: 900 });
    const airborne = projectCamera(layout, { x: 420, y: 180 }, { left: 0, right: 20_000, top: 0, bottom: 900 });
    assert.equal(grounded.scrollY, 0);
    assert.equal(airborne.scrollY, 0);
    assert.equal(grounded.worldViewportHeight, airborne.worldViewportHeight);
  });

  test('FlightScene pins the Phaser camera origin to the same logical projection', async () => {
    const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
    assert.match(source, /cameras\.main\.setOrigin\(0,\s*0\)/);
    assert.match(source, /projectCamera\(this\.cameraLayout/);
  });
});
