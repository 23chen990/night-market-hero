import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

test('default journey exposes only tutorial plus endless patrol', () => {
  const state = createGrappleGame(31).getState();
  assert.equal(state.levelCount, 2);
  assert.equal(state.levelId, 'lantern-entry');
});

test('open-street patrol checkpoints never become terminal wins', () => {
  const game = createGrappleGame(31, { marketGates: false });
  game.restartEndless(31);
  game.setPlayerForTest({ x: 4900, y: 350, vx: 420, vy: 0 });
  const state = game.advanceTicks(1);
  assert.equal(state.levelId, 'night-patrol');
  assert.equal(state.status, 'playing');
  assert.equal(state.activeChaseEvent, null);
});

test('terminal UI hides result immediately on restart and suppresses endless checkpoints', async () => {
  const source = await readFile('src/main.ts', 'utf8');
  assert.match(source, /resultCard\.hidden\s*=\s*true/);
  assert.match(source, /state\.levelId === 'night-patrol'[\s\S]*?return/);
});

test('completed test journey uses the gate-and-pickup settlement formula', async () => {
  const source = await readFile('src/main.ts', 'utf8');
  assert.match(source, /settlementCoins\(/);
  assert.match(source, /depthMultiplier:\s*state\.depthCoefficient/);
});

test('endless state exposes live pickup entities and vehicle hold/release phase', () => {
  const game = createGrappleGame(31);
  // seed 11 deterministically grants 纸鸢 at segment 2 (probabilistic acquisition)
  game.restartEndless(11);
  const initial = game.getState() as any;
  assert.ok(Array.isArray(initial.activePickups));
  assert.equal(initial.vehiclePhase, 'idle');
  game.advanceTicks(1);
  game.setPlayerForTest({ x: 3300, y: 470, vx: 620, vy: 0 });
  game.advanceTicks(1);
  assert.equal((game.getState() as any).vehicleId, null, 'segment entry is an opportunity, not automatic reward');
  const fixture = game.getState();
  fixture.vehicleId = '纸鸢';
  fixture.vehicleTicksRemaining = 6 * 120;
  fixture.vehiclePhase = 'idle';
  assert.equal(game.restoreSnapshot(fixture), true);
  game.act('press');
  assert.equal((game.getState() as any).vehiclePhase, 'holding');
  game.act('release');
  assert.equal((game.getState() as any).vehiclePhase, 'released');
});
