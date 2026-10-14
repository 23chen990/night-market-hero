import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

import { createGrappleGame } from '../src/game-core.ts';

test('canopy bounce is retired without affecting the fixed economy', () => {
  const game = createGrappleGame(101);
  const initial = game.loadScenario('terrain-布棚-safe');
  const canopy = initial.activeTerrain!;
  game.setPlayerForTest({
    x: canopy.bounds.x - 34,
    y: canopy.bounds.y - 48,
    vx: 840,
    vy: 760,
  });

  game.step(0.1);
  const rescued = game.getState();
  assert.equal((rescued as typeof rescued & { bounceCount: number }).bounceCount, 0);
  assert.equal(rescued.coins, 0, 'canopy rescue must not create currency outside pickup/gate rewards');

  game.step(0.1);
  assert.equal((game.getState() as typeof rescued & { bounceCount: number }).bounceCount, 0);
});

test('a released short-rope anchor remains regrappleable while it stays within range', () => {
  const game = createGrappleGame(102);
  const initial = game.getState();
  game.setPlayerForTest({ x: initial.anchors[0]!.x - 40, y: initial.anchors[0]!.y, vx: 180, vy: 0 });
  assert.equal(game.act('press'), true);
  const releasedId = game.getState().attachedAnchorId;
  assert.ok(releasedId);
  game.act('release');
  const released = game.getState();
  assert.equal(released.attachedAnchorId, null);
  assert.ok((released as typeof released & { regrappleGraceUntilTick: number }).regrappleGraceUntilTick > released.tick);
  game.advanceTicks(40);
  const releasedAnchor = released.anchors.find((anchor) => anchor.id === releasedId)!;
  game.setPlayerForTest({ x: releasedAnchor.x - 30, y: releasedAnchor.y, vx: 220, vy: 0 });
  assert.equal(game.act('press'), true);
  assert.equal(game.getState().attachedAnchorId, releasedId);
});

test('camera keeps a forward-only deadzone and runtime exposes bounce feedback', async () => {
  const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(source, /comfortCameraStep\(this\.cameraScrollX, cameraTargetX, elapsedCameraSeconds\)/);
  assert.match(source, /terrain\.kind === '布棚'/);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /data-action="clear-progress"/);
});

test('closing gate continues narrowing below the old visible plateau', () => {
  const game = createGrappleGame(103);
  const gate = game.loadScenario('event-closing-gate-beat-3').gate;
  assert.ok(gate.aperture < 220, 'final gate beat must visibly close past the old 220px plateau');
  assert.equal(gate.collisionAperture.height, gate.aperture, 'collision and render aperture must stay identical');
});

test('endless mode has no completion percentage UI or terminal copy', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /state\.levelId === 'night-patrol'[\s\S]*progressFill\.style\.width/);
  assert.match(main, /state\.levelId === 'night-patrol'[\s\S]*本次夜巡已行进/);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /data-ui="progress"/);
});

test('static terrain blockout is not painted over the approved image stream', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /for \(const terrain of state\.sceneObjects\)/);
  assert.doesNotMatch(main, /this\.drawActiveTerrain\(graphics, \{ \.\.\.state, activeTerrain: terrain \}\)/);
  assert.match(main, /sceneOwner/);
  const style = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(style, /\.guard-presence\s*\{[\s\S]*left:\s*max\(/);
  assert.match(style, /\.left-edge-alert\s*\{[\s\S]*border-radius/);
});

test('the thrown net retains an attributable telegraph and the roadblock uses approved cloth art', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /This is the官兵抛网/);
  assert.match(main, /targetRadius/);
  assert.match(main, /0xd76572/, 'aiming reticle must still warn before the thrown net');
  assert.match(main, /syncBarricadeSprite\(state\)/);
  assert.match(main, /'module-blank-banner'/, 'reuse the existing approved street banner artwork');
  assert.doesNotMatch(main, /0xe55b54/, 'the temporary full-frame magenta overlay must be retired');
});

test('the thrown net is a transient directional hazard, not a permanent debug grid', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /this\.drawRoofNet\(graphics, state, obstacle\)/);
  assert.match(main, /private drawRoofNet\(/);
  assert.match(main, /private drawRoofNetMesh\(/);
  assert.match(main, /Math\.atan2\(target\.y - source\.y, target\.x - source\.x\)/);
  assert.match(main, /phase === 'raise' \|\| phase === 'aim'/);
  assert.match(main, /obstacle\.phase === 'missed' \|\| obstacle\.phase === 'passed'/);
  assert.doesNotMatch(main, /for \(let column = 0; column <= 5; column \+= 1\)/);
  assert.doesNotMatch(main, /for \(let row = 0; row <= 4; row \+= 1\)/);
});

async function roofNetRenderer() {
  const [{ transpileModule, ModuleKind }, { runInNewContext }] = await Promise.all([
    import('typescript'), import('node:vm'),
  ]);
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  const helpers = main.slice(main.indexOf('  private drawRoofNet('), main.indexOf('  private drawStrictReferencePursuer('));
  const script = transpileModule(`class NetRenderer { ${helpers} }\nmodule.exports = NetRenderer;`, {
    compilerOptions: { module: ModuleKind.CommonJS },
  }).outputText;
  const context = { module: { exports: undefined as unknown }, CHARACTER_BLUE_BLACK: 0x061522, VERMILION_HEADBAND: 0xb94f50 };
  runInNewContext(script, context);
  return context.module.exports as new () => { drawRoofNet: (graphics: unknown, state: unknown, obstacle: unknown) => void };
}

function netGraphicsRecorder() {
  const vertices: { x: number; y: number }[] = [];
  const rectangles: unknown[][] = [];
  const strands: { from: { x: number; y: number }; to: { x: number; y: number } }[] = [];
  let strokeWidth = 0;
  let strokeColor = 0;
  const graphics = {
    vertices, rectangles, strands,
    lineStyle(width: number, color: number) { strokeWidth = width; strokeColor = color; return this; },
    fillStyle() { return this; },
    lineBetween(x1: number, y1: number, x2: number, y2: number) {
      if (strokeWidth === 3 && strokeColor === 0xe0a15b) strands.push({ from: { x: x1, y: y1 }, to: { x: x2, y: y2 } });
      vertices.push({ x: x1, y: y1 }, { x: x2, y: y2 });
      return this;
    },
    fillTriangle(...points: number[]) { for (let i = 0; i < points.length; i += 2) vertices.push({ x: points[i], y: points[i + 1] }); return this; },
    fillRect(...args: unknown[]) { rectangles.push(args); return this; },
    fillRoundedRect(...args: unknown[]) { rectangles.push(args); return this; },
    fillCircle() { return this; },
    strokeCircle() { return this; },
  };
  return graphics;
}

test('an unfolded net stays inside the visible danger bounds and leaves no solid panel', async () => {
  const Renderer = await roofNetRenderer();
  const graphics = netGraphicsRecorder();
  const obstacle = {
    phase: 'active', animationProgress: 1,
    source: { x: 100, y: 100 }, predictedTarget: { x: 100, y: 300 },
    anchorBounds: { x: 80, y: 90, width: 40, height: 10 },
    bounds: { x: -30, y: 215, width: 260, height: 170 },
    occupiedBounds: { x: -30, y: 215, width: 260, height: 170 },
  };
  new Renderer().drawRoofNet(graphics, { tick: 36 }, obstacle);
  // Net strands must cover the same area the player can hit, even on a vertical throw.
  const meshVertices = graphics.vertices.filter((point) => point.y > 170);
  assert.ok(Math.min(...meshVertices.map((point) => point.x)) <= -25);
  assert.ok(Math.max(...meshVertices.map((point) => point.x)) >= 225);
  assert.ok(meshVertices.every((point) => point.y >= 209 && point.y <= 391));
  assert.equal(graphics.rectangles.length, 0);
});

test('flying net strands move with the bundle, and resolved nets draw nothing', async () => {
  const Renderer = await roofNetRenderer();
  const renderer = new Renderer();
  const obstacle = {
    phase: 'travel', animationProgress: 0.5,
    source: { x: 100, y: 100 }, predictedTarget: { x: 100, y: 500 },
    anchorBounds: { x: 80, y: 90, width: 40, height: 10 },
    bounds: { x: -30, y: 415, width: 260, height: 170 },
    occupiedBounds: { x: 40, y: 240, width: 120, height: 80 },
  };
  const early = netGraphicsRecorder();
  const late = netGraphicsRecorder();
  renderer.drawRoofNet(early, { tick: 18 }, obstacle);
  renderer.drawRoofNet(late, { tick: 24 }, { ...obstacle, animationProgress: 0.66 });
  assert.ok(early.strands.length > 0 && late.strands.length > 0);
  assert.ok(late.strands[0].to.y > early.strands[0].to.y + 30);
  for (const phase of ['missed', 'passed']) {
    const resolved = netGraphicsRecorder();
    renderer.drawRoofNet(resolved, { tick: 60 }, { ...obstacle, phase });
    assert.equal(resolved.vertices.length, 0);
    assert.equal(resolved.rectangles.length, 0);
  }
});
