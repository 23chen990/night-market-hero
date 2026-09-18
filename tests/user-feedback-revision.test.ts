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
  assert.match(source, /Math\.abs\(cameraTargetX - this\.cameraScrollX\)/);
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

test('terrain rendering prefetches only nearby objects and telegraphs canopies', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /terrain\.bounds\.x \+ terrain\.bounds\.width < visibleFrom/);
  assert.match(main, /terrain\.kind === '布棚'/);
  const style = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(style, /\.guard-presence\s*\{[\s\S]*left:\s*max\(/);
  assert.match(style, /\.left-edge-alert\s*\{[\s\S]*border-radius/);
});

test('the thrown net has a distinct danger header instead of an unexplained grid', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /This is the官兵抛网/);
  assert.match(main, /0xe55b54/);
});
