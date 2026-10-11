import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

const TUTORIAL_HOLD_TICKS = 30;
const TUTORIAL_RELEASE_TICKS = 8;
const ENDLESS_HOLD_TICKS = 90;
const ENDLESS_RELEASE_TICKS = 10;

function terrainImpactCount(game: ReturnType<typeof createGrappleGame>): number {
  return Math.max(0, ...game.getState().sceneObjects.map((terrain) => terrain.impactCount));
}

test('panorama core journey reaches tutorial settlement, patrol failure, and replay on normal input', () => {
  const game = createGrappleGame(31, { marketGates: false, terrainMode: 'panorama' });
  const startup = game.getState();
  assert.equal(startup.status, 'playing');
  assert.equal(startup.levelId, 'lantern-entry');
  assert.equal(startup.sceneObjects.find((terrain) => terrain.kind === '竹架')?.collision, 'none');

  let maximumHiddenTerrainImpact = terrainImpactCount(game);
  let tutorialCycles = 0;
  for (; tutorialCycles < 64 && game.getState().status === 'playing'; tutorialCycles += 1) {
    assert.equal(game.act('press'), true, `tutorial press ${tutorialCycles} should be accepted`);
    game.advanceTicks(TUTORIAL_HOLD_TICKS);
    assert.equal(game.act('release'), true, `tutorial release ${tutorialCycles} should be accepted`);
    game.advanceTicks(TUTORIAL_RELEASE_TICKS);
    maximumHiddenTerrainImpact = Math.max(maximumHiddenTerrainImpact, terrainImpactCount(game));
  }

  const tutorial = game.getState();
  assert.equal(tutorial.status, 'won', `tutorial should settle after normal cadence; cycles=${tutorialCycles}`);
  assert.equal(tutorial.failureReason, null);
  assert.ok(tutorial.player.x >= tutorial.finishX);

  const patrol = game.continueCampaign();
  assert.equal(patrol.status, 'playing');
  assert.equal(patrol.levelId, 'night-patrol');
  assert.equal(patrol.finishX, Number.MAX_SAFE_INTEGER);

  let endlessPairs = 0;
  let maximumEndlessX = patrol.player.x;
  while (game.getState().status === 'playing' && endlessPairs < 64) {
    assert.equal(game.act('press'), true, `endless press ${endlessPairs} should be accepted`);
    game.advanceTicks(ENDLESS_HOLD_TICKS);
    // A live roof-net can consume the held input before the paired release;
    // attempting the ordinary release still exercises the player control path.
    game.act('release');
    game.advanceTicks(ENDLESS_RELEASE_TICKS);
    const state = game.getState();
    endlessPairs += 1;
    maximumEndlessX = Math.max(maximumEndlessX, state.player.x);
    maximumHiddenTerrainImpact = Math.max(maximumHiddenTerrainImpact, terrainImpactCount(game));
  }

  // A successful hold/release rhythm may survive the sampling budget.
  // Exercise normal loss of control separately so continued play is never
  // incorrectly required to fail at an arbitrary cycle count.
  if (game.getState().status === 'playing') {
    game.act('release');
    game.advanceTicks(3_000);
  }
  const terminal = game.getState();
  assert.ok(endlessPairs > 0, 'patrol must run through normal hold/release input');
  assert.ok(maximumEndlessX > 1_000, `patrol must make real progress before terminal state; x=${maximumEndlessX}`);
  assert.equal(terminal.status, 'failed', 'bounded normal patrol should reach a replayable terminal state');
  assert.ok(['fell', 'caught'].includes(terminal.failureReason ?? ''), 'normal failure must have a physical cause');
  assert.equal(maximumHiddenTerrainImpact, 0, 'hidden panorama terrain must never record an impact');

  assert.equal(game.act('press'), true, 'press after terminal state should restart the patrol');
  const replay = game.getState();
  assert.equal(replay.status, 'playing');
  assert.equal(replay.levelId, 'night-patrol');
  assert.equal(replay.tick, 0);
  assert.equal(replay.sceneObjects.find((terrain) => terrain.kind === '竹架')?.collision, 'none');
  assert.equal(terrainImpactCount(game), 0);
});
