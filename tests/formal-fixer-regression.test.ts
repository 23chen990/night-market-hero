import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

test('high route exposes an early reachable upper anchor and distinct corridor', async () => {
  const state = createGrappleGame(31).getState();
  const high = state.routeGraph.branches.high;
  assert.ok(high.corridor.y < state.routeGraph.branches.low.corridor.y - 120);
  const source = await readFile('src/game-core.ts', 'utf8');
  assert.match(source, /committedRoute === 'high' \? this\.state\.routeGraph\.branches\.high\.anchorIds/);
});

test('edge pursuer is explicitly hidden when the world pursuer is on screen', async () => {
  const source = await readFile('src/main.ts', 'utf8');
  assert.match(source, /const edgeVisible\s*=\s*state\.pursuer\.visible\s*&&\s*chaseVisible\s*&&\s*!guardOnScreen/);
  assert.match(source, /pursuerPresence\.hidden\s*=\s*!edgeVisible/);
});

test('natural high commitment never persists after leaving the physical upper corridor', () => {
  const game = createGrappleGame(31);
  const high = game.getState().routeGraph.branches.high.corridor;
  const samples: number[] = [];
  game.act('press');
  for (let index = 0; index < 2_000 && game.getState().status === 'playing'; index += 1) {
    const state = game.advanceTicks(1);
    if (state.routeTraversal.phase === 'branch' && state.routeTraversal.committedRoute === 'high') {
      samples.push(state.player.y);
    }
    if (state.attachedAnchorId === null || state.ropeLength === null) continue;
    const anchor = state.anchors.find((item) => item.id === state.attachedAnchorId);
    if (anchor && state.player.x > anchor.x + state.ropeLength * 0.55 && state.player.vx > 100) {
      game.act('release');
      game.act('press');
    }
  }
  assert.ok(samples.length > 0, 'natural hold/release should commit to the high branch');
  assert.ok(samples.every((y) => y >= high.y - 16 && y <= high.y + high.height + 16),
    'high commitment must remain inside its declared upper corridor');
});

test('normal hold/release can collide with an independently closing gate and recover', () => {
  const game = createGrappleGame(31);
  game.act('press');
  let collisionState: ReturnType<typeof game.getState> | null = null;
  for (let index = 0; index < 2_000 && game.getState().status === 'playing'; index += 1) {
    const state = game.advanceTicks(1);
    if (game.getEvents().some((event) => event.type === 'closing-gate-collision')) {
      collisionState = state;
      break;
    }
    if (state.attachedAnchorId === null || state.ropeLength === null) continue;
    const anchor = state.anchors.find((item) => item.id === state.attachedAnchorId);
    if (anchor && state.player.x > anchor.x + state.ropeLength * 0.45 && state.player.vx > 100) {
      game.act('release');
      game.act('press');
    }
  }
  assert.ok(collisionState, 'normal hold/release should reach a live closing leaf');
  assert.equal(collisionState?.status, 'playing');
  assert.equal(collisionState?.closingGateBeat, 3);
  assert.ok(collisionState!.gate.aperture < 154, 'gate must have closed from elapsed beat time');
});

test('mobile pursuit copy remains readable', async () => {
  const source = await readFile('src/style.css', 'utf8');
  assert.match(source, /\.guard-copy strong\s*\{\s*font-size:\s*12px/);
  assert.match(source, /\.guard-copy small\s*\{\s*font-size:\s*12px/);
});
