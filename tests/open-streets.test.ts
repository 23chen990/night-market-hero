import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';

test('default browser entrypoint explicitly selects the open-streets journey', () => {
  const source = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(source, /createGrappleGame\([^\n]+\{ marketGates: false, terrainMode: 'panorama', guidedExperience: true \}/);
  assert.doesNotMatch(source, /this\.drawMarketGate\(graphics, state\)/);
});

test('open streets cross the old gate leaves without collision and settle at the destination', () => {
  const game = createGrappleGame(31, { marketGates: false });
  const fixture = game.loadScenario('event-closing-gate-beat-3');
  const y = fixture.gate.bottomLeafBounds.y + 20;
  game.setPlayerForTest({ x: fixture.finishX - 28, y, vx: 420, vy: 0 });
  const state = game.advanceTicks(30);
  assert.equal(state.status, 'won');
  assert.equal(state.activeChaseEvent, null);
  assert.equal(state.closingGateBeat, null);
  assert.equal(game.getEvents().some((event) => event.type === 'closing-gate-collision'), false);
  assert.equal(state.gatesPassed, 1, 'compatibility field counts the completed district');
  assert.equal(game.continueCampaign().levelId, 'night-patrol');
});

test('restored patrol at a former gate checkpoint stays open and keeps progress', () => {
  const original = createGrappleGame(31);
  const fixture = original.loadScenario('event-closing-gate-beat-3');
  original.setPlayerForTest({ x: fixture.gate.x - 42, y: fixture.gate.centerY, vx: 720, vy: 0 });
  original.advanceTicks(30);
  original.continueCampaign();
  const snapshot = original.getState();
  snapshot.segmentIndex = 2;
  snapshot.player.x = 4900;
  snapshot.player.y = 470;
  snapshot.player.vx = 400;
  snapshot.activeChaseEvent = 'closing-gate';
  snapshot.closingGateBeat = 3;
  snapshot.gatesPassed = 2;
  const restored = createGrappleGame(31, { marketGates: false });
  assert.equal(restored.restoreSnapshot(snapshot), true);
  const state = restored.advanceTicks(1);
  assert.equal(state.levelId, 'night-patrol');
  assert.equal(state.activeChaseEvent, null);
  assert.equal(state.closingGateBeat, null);
  assert.ok(state.gatesPassed >= 2);
});

test('legacy gate fixtures remain explicitly available for compatibility checks', () => {
  const game = createGrappleGame(31, { marketGates: true });
  const state = game.loadScenario('event-closing-gate-beat-3');
  assert.equal(state.activeChaseEvent, 'closing-gate');
  assert.equal(state.closingGateBeat, 3);
});

test('open-street tutorial keeps the final held-input rescue after a long release rhythm', () => {
  const game = createGrappleGame(31, { marketGates: false });
  for (let cycle = 0; cycle < 100 && game.getState().status === 'playing'; cycle += 1) {
    game.act('press');
    game.advanceTicks(60);
    game.act('release');
    game.advanceTicks(8);
  }
  const state = game.getState();
  assert.equal(state.status, 'won', 'removing the gate must retain the final tutorial recovery affordance');
  assert.equal(state.activeChaseEvent, null);
});

test('a paused legacy snapshot restores with no active gate before any physics tick', () => {
  const legacy = createGrappleGame(31).loadScenario('event-closing-gate-beat-3');
  legacy.paused = true;
  const game = createGrappleGame(31, { marketGates: false });
  assert.equal(game.restoreSnapshot(legacy), true);
  assert.equal(game.getState().activeChaseEvent, null);
  assert.equal(game.getState().closingGateBeat, null);
  assert.equal(game.getState().paused, true);
});
