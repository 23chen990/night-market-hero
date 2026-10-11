import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { SliceSimulation, type FinishOption } from '../src/game-core';
import {
  cameraFollowTargetSimulationY,
  cameraLeadSimulation,
  cameraTargetSimulationY,
  createCameraSpec,
  createFogSpec,
  resolveCameraTarget,
  worldPointFromSimulation,
} from '../src/three-presentation';

const viewports = [
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 1100, height: 720 },
] as const;
const knifeYs = [40, 100, 200, 300, 420, 550, 700] as const;

function cameraForRuntime(
  width: number,
  height: number,
  knifeX: number,
  knifeY: number,
  finishOptions: readonly FinishOption[] = [],
) {
  const targetX = (knifeX + cameraLeadSimulation(width, height)) / 100;
  const followTargetY = cameraTargetSimulationY(knifeY);
  const spec = createCameraSpec(width, height, targetX, finishOptions, followTargetY);
  const camera = new THREE.PerspectiveCamera(spec.fov, spec.aspect, spec.near, spec.far);
  camera.position.fromArray(spec.position);
  camera.lookAt(new THREE.Vector3().fromArray(spec.target));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return { camera, spec };
}

function projectKnife(
  width: number,
  height: number,
  knifeX: number,
  knifeY: number,
  finishOptions: readonly FinishOption[] = [],
): { fx: number; fy: number } {
  const { camera } = cameraForRuntime(width, height, knifeX, knifeY, finishOptions);
  const projected = new THREE.Vector3().fromArray(worldPointFromSimulation(knifeX, knifeY)).project(camera);
  return { fx: projected.x * 0.5 + 0.5, fy: -projected.y * 0.5 + 0.5 };
}

test('camera framing keeps the knife in the safe screen corridor', () => {
  for (const viewport of viewports) {
    for (const knifeY of knifeYs) {
      const { fx, fy } = projectKnife(viewport.width, viewport.height, 1000, knifeY);
      assert.ok(fx >= 0.12 && fx <= 0.88, `${viewport.width}x${viewport.height} y=${knifeY} fx=${fx}`);
      assert.ok(fy >= 0.1 && fy <= 0.85, `${viewport.width}x${viewport.height} y=${knifeY} fy=${fy}`);
    }
  }
});

test('opening framing keeps the knife left of center', () => {
  for (const viewport of viewports) {
    const { fx, fy } = projectKnife(viewport.width, viewport.height, 120, 420);
    assert.ok(fx >= 0.12 && fx < 0.5, `${viewport.width}x${viewport.height} opening fx=${fx}`);
    assert.ok(fy >= 0.1 && fy <= 0.85, `${viewport.width}x${viewport.height} opening fy=${fy}`);
  }
});

test('vertical follow uses a dead zone and bounded lookahead', () => {
  assert.equal(cameraFollowTargetSimulationY(700, undefined), 700);
  assert.equal(cameraFollowTargetSimulationY(600, 700), 700, 'small upward movement stays in the dead zone');
  assert.equal(cameraFollowTargetSimulationY(500, 700), 600, 'large upward movement advances the target');
  assert.equal(cameraFollowTargetSimulationY(40, 600), 140, 'top boundary remains bounded');
});

test('runtime opening states keep the knife in the left half', () => {
  for (const [seed, viewport] of [[31, viewports[0]], [22, viewports[1]], [31, viewports[2]]] as const) {
    const state = new SliceSimulation(seed, 1).getState();
    const { fx, fy } = projectKnife(viewport.width, viewport.height, state.player.x, state.player.y);
    assert.ok(fx >= 0.12 && fx < 0.5, `${viewport.width}x${viewport.height} fx=${fx}`);
    assert.ok(fy >= 0.1 && fy <= 0.85, `${viewport.width}x${viewport.height} fy=${fy}`);
  }
});

test('runtime finish approach keeps every multiplier wall corner and knife in frame', () => {
  const finishOptions = new SliceSimulation(22, 1).getState().finishOptions;
  const wallX = finishOptions[0]!.x;
  const ember = finishOptions.find((lane) => lane.id === 'ember-four')!;
  for (const viewport of viewports) {
    const approachXs = viewport.width === 1100
      ? [wallX - 700, wallX - 600, wallX - 300, wallX - 150, wallX - 60]
      : [wallX - 300, wallX - 150, wallX - 60];
    for (const knifeX of approachXs) {
      for (const knifeY of [100, 200, 300, 390, 450, 550, 650, 700]) {
        const { camera, spec } = cameraForRuntime(viewport.width, viewport.height, knifeX, knifeY, finishOptions);
        const knife = new THREE.Vector3().fromArray(worldPointFromSimulation(knifeX, knifeY)).project(camera);
        const fx = knife.x * 0.5 + 0.5;
        const fy = -knife.y * 0.5 + 0.5;
        assert.ok(fx >= 0.12 && fx <= 0.88, `${viewport.width} x=${knifeX} y=${knifeY} knife fx=${fx}`);
        assert.ok(fy >= 0.1 && fy <= 0.85, `${viewport.width} x=${knifeX} y=${knifeY} knife fy=${fy}`);
        const followTargetY = cameraTargetSimulationY(knifeY);
        const resolved = resolveCameraTarget((knifeX + cameraLeadSimulation(viewport.width, viewport.height)) / 100, followTargetY, finishOptions);
        const baselineDistance = Math.hypot(3.8, 5.1, 13.2) * Math.max(1 + resolved.blend * 0.6, 0.95 / (viewport.width / viewport.height));
        assert.ok(camera.position.distanceTo(new THREE.Vector3().fromArray(spec.target)) <= baselineDistance * 1.05,
          `${viewport.width} x=${knifeX} y=${knifeY} camera distance regressed`);
        const fog = createFogSpec(viewport.width, viewport.height);
        const fogFactor = (camera.position.distanceTo(new THREE.Vector3().fromArray(worldPointFromSimulation(ember.x, ember.y))) - fog.near) / (fog.far - fog.near);
        assert.ok(fogFactor <= 0.1, `${viewport.width} x=${knifeX} y=${knifeY} ember fog=${fogFactor}`);
        const emberTop = new THREE.Vector3().fromArray(worldPointFromSimulation(ember.x, ember.y - ember.height / 2, -0.1)).project(camera);
        const emberBottom = new THREE.Vector3().fromArray(worldPointFromSimulation(ember.x, ember.y + ember.height / 2, -0.1)).project(camera);
        const emberHeight = Math.abs(emberBottom.y - emberTop.y) * viewport.height / 2;
        const minimumHeight = viewport.width === 390 ? 48 : viewport.width === 430 ? 52 : 54;
        assert.ok(emberHeight >= minimumHeight, `${viewport.width} x=${knifeX} y=${knifeY} ember height=${emberHeight}`);
        for (const lane of finishOptions) {
          for (const x of [lane.x - lane.width / 2, lane.x + lane.width / 2]) {
            for (const y of [lane.y - lane.height / 2, lane.y + lane.height / 2]) {
              const corner = new THREE.Vector3().fromArray(worldPointFromSimulation(x, y, -0.1)).project(camera);
              const sx = (corner.x * 0.5 + 0.5) * viewport.width;
              const sy = (-corner.y * 0.5 + 0.5) * viewport.height;
              assert.ok(sx >= 36 && sx <= viewport.width - 36 && sy >= 100 && sy <= viewport.height - 80,
                `${viewport.width} x=${knifeX} y=${knifeY} ${lane.id} clipped at ${sx},${sy}`);
            }
          }
        }
      }
    }
  }
});

test('finish and non-finish runtime knife corridors cover the required x/y contract', () => {
  const finishOptions = new SliceSimulation(22, 1).getState().finishOptions;
  for (const viewport of viewports) {
    for (const knifeX of [1900, 2100, 2300, 2400, 2550, 2700, 2940]) {
      for (const knifeY of [100, 200, 300, 390, 450, 550, 650, 700]) {
        const { camera } = cameraForRuntime(viewport.width, viewport.height, knifeX, knifeY, finishOptions);
        const point = new THREE.Vector3().fromArray(worldPointFromSimulation(knifeX, knifeY)).project(camera);
        const fx = point.x * 0.5 + 0.5;
        const fy = -point.y * 0.5 + 0.5;
        assert.ok(fx >= 0.12 && fx <= 0.88, `${viewport.width} x=${knifeX} y=${knifeY} fx=${fx}`);
        assert.ok(fy >= 0.1 && fy <= 0.85, `${viewport.width} x=${knifeX} y=${knifeY} fy=${fy}`);
      }
    }
  }
});
