import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createGrappleGame, type GrappleGame, type GrappleState } from '../src/game-core.ts';

function tick(game: GrappleGame, count = 1): GrappleState {
  return game.advanceTicks(count);
}

describe('QA round 2 independent pursuit and physical world truth', () => {
  test('guard stays on its running lane while the player swings through more than 100px vertically', () => {
    const game = createGrappleGame(31);
    game.act('press');
    const guardYs: number[] = [];
    const playerYs: number[] = [];
    for (let index = 0; index < 240; index += 1) {
      const state = tick(game);
      guardYs.push(state.pursuer.y);
      playerYs.push(state.player.y);
    }
    assert.ok(Math.max(...playerYs) - Math.min(...playerYs) > 100);
    assert.ok(Math.max(...guardYs) - Math.min(...guardYs) <= 8, 'guard lane may only contain a four-pixel run bob');
    assert.ok('vx' in game.getState().pursuer && 'ax' in game.getState().pursuer, 'formal pursuer exposes integrated motion');
  });

  test('guard velocity and acceleration stay capped and do not copy player displacement', () => {
    const game = createGrappleGame(31);
    game.act('press');
    let copiedDx = 0;
    let samples = 0;
    for (let index = 0; index < 360 && game.getState().status === 'playing'; index += 1) {
      const before = game.getState();
      const after = tick(game);
      const guardDx = after.pursuer.x - before.pursuer.x;
      const playerDx = after.player.x - before.player.x;
      if (Math.abs(guardDx - playerDx) < 1e-9) copiedDx += 1;
      samples += 1;
      assert.ok(Math.abs(after.pursuer.vx) <= after.pursuer.maxSpeed + 1e-9);
      assert.ok(Math.abs(after.pursuer.ax) <= after.pursuer.maxAcceleration + 1e-9);
    }
    assert.ok(copiedDx / samples < 0.1, 'guard dx must be independently integrated');
  });

  test('world separation is the single HUD/chase truth and contact catches on the next fixed tick', () => {
    const game = createGrappleGame(33);
    const before = game.loadScenario('segment-first-pursuit');
    game.setPlayerForTest({ x: before.pursuer.x + 13, y: before.player.y, vx: 0, vy: 0 });
    const caught = tick(game);
    assert.equal(caught.pursuer.distance, Math.max(0, caught.player.x - caught.pursuer.x));
    assert.equal(caught.chase.distance, caught.pursuer.distance);
    assert.equal(caught.status, 'failed');
    assert.equal(caught.failureReason, 'caught');
    assert.ok(caught.chase.distance < 100, 'caught cannot coexist with a displayed 100-step gap');
  });

  test('fast flight opens separation and stalling closes it continuously without teleport penalties', () => {
    const fast = createGrappleGame(35);
    const stalled = createGrappleGame(35);
    const start = fast.getState().chase.distance;
    for (let index = 0; index < 180; index += 1) {
      const fastState = fast.getState();
      fast.setPlayerForTest({ vx: 650, vy: fastState.player.vy });
      tick(fast);
      const stalledState = stalled.getState();
      stalled.setPlayerForTest({ vx: 20, vy: stalledState.player.vy });
      const beforeX = stalledState.pursuer.x;
      const after = tick(stalled);
      assert.ok(after.pursuer.x - beforeX <= after.pursuer.maxSpeed / 120 + 1e-6);
    }
    assert.ok(fast.getState().chase.distance > start);
    assert.ok(stalled.getState().chase.distance < start);
  });
});

describe('QA round 2 authored route, terrain, gate, and pause behavior', () => {
  function runNaturalPath(releaseFraction: number): {
    state: GrappleState;
    committed: Set<string>;
    chaseEvents: Set<string>;
    terrainReactions: Set<string>;
    pressures: Array<{ segment: string; pressure: number; distance: number }>;
    branchSamples: Array<{ x: number; y: number; committedRoute: string | null }>;
    obstacleSamples: Array<{ playerX: number; kind: string; phase: string; boundsX: number; collisionActive: boolean }>;
    gateSamples: Array<{ tick: number; progress: number; aperture: number }>;
  } {
    const game = createGrappleGame(31);
    const committed = new Set<string>();
    const chaseEvents = new Set<string>();
    const terrainReactions = new Set<string>();
    const pressures: Array<{ segment: string; pressure: number; distance: number }> = [];
    const branchSamples: Array<{ x: number; y: number; committedRoute: string | null }> = [];
    const obstacleSamples: Array<{ playerX: number; kind: string; phase: string; boundsX: number; collisionActive: boolean }> = [];
    const gateSamples: Array<{ tick: number; progress: number; aperture: number }> = [];
    game.act('press');
    for (let index = 0; index < 4_200 && game.getState().status === 'playing'; index += 1) {
      const state = tick(game);
      if (state.routeTraversal.committedRoute) committed.add(state.routeTraversal.committedRoute);
      if (state.activeChaseEvent) chaseEvents.add(state.activeChaseEvent);
      if (state.activeTerrain && state.activeTerrain.behaviorState !== 'ready') {
        terrainReactions.add(`${state.activeTerrain.kind}:${state.activeTerrain.lesson}:${state.activeTerrain.behaviorState}`);
      }
      if (state.routeTraversal.phase === 'branch') {
        branchSamples.push({ x: state.player.x, y: state.player.y, committedRoute: state.routeTraversal.committedRoute });
      }
      if (state.chaseObstacle) {
        obstacleSamples.push({
          playerX: state.player.x,
          kind: state.chaseObstacle.kind,
          phase: state.chaseObstacle.phase,
          boundsX: state.chaseObstacle.bounds.x,
          collisionActive: state.chaseObstacle.collisionActive,
        });
      }
      if (state.activeChaseEvent === 'closing-gate') {
        gateSamples.push({ tick: state.tick, progress: state.progress, aperture: state.gate.aperture });
      }
      pressures.push({ segment: state.segment, pressure: state.chase.pressure, distance: state.chase.distance });
      if (!state.attachedAnchorId || state.ropeLength === null) continue;
      const anchor = state.anchors.find((item) => item.id === state.attachedAnchorId)!;
      if (state.player.x > anchor.x + state.ropeLength * releaseFraction && state.player.vx > 100) {
        game.act('release');
        game.act('press');
      }
    }
    return {
      state: game.getState(), committed, chaseEvents, terrainReactions, pressures,
      branchSamples, obstacleSamples, gateSamples,
    };
  }

  test('natural high commitment occurs only inside the declared upper corridor', () => {
    const run = runNaturalPath(0.55);
    const corridor = run.state.routeGraph.branches.high.corridor;
    const highSamples = run.branchSamples.filter((sample) => sample.committedRoute === 'high');
    assert.ok(highSamples.length > 0, 'expected the authored high rhythm to commit high');
    const inside = highSamples.filter((sample) => sample.x >= corridor.x
      && sample.x <= corridor.x + corridor.width
      && sample.y >= corridor.y
      && sample.y <= corridor.y + corridor.height);
    assert.ok(inside.length >= 12, 'high commitment must be sustained inside the physical upper corridor');
    assert.ok(inside[0].y < run.state.routeGraph.branches.low.corridor.y,
      'the first physical high sample must be above the low corridor');
  });

  test('roof net cannot resolve missed before the player reaches its world bounds', () => {
    const run = runNaturalPath(0.55);
    const premature = run.obstacleSamples.find((sample) => sample.kind === 'roof-net'
      && sample.phase === 'missed' && sample.playerX < sample.boundsX);
    assert.equal(premature, undefined, 'roof net must remain active until its world bounds are reached');
    assert.ok(run.obstacleSamples.some((sample) => sample.kind === 'roof-net'
      && sample.playerX >= sample.boundsX && sample.collisionActive),
    'roof net must still be physically active when the player reaches it');
  });

  test('gate aperture advances while player progress is temporarily flat', () => {
    const game = createGrappleGame(31);
    const gateSamples: Array<{ tick: number; progress: number; aperture: number }> = [];
    game.act('press');
    let enteredGate = false;
    for (let index = 0; index < 1_600 && game.getState().status === 'playing'; index += 1) {
      const state = tick(game);
      if (state.activeChaseEvent === 'closing-gate') enteredGate = true;
      if (enteredGate) {
        gateSamples.push({ tick: state.tick, progress: state.progress, aperture: state.gate.aperture });
        continue;
      }
      if (!state.attachedAnchorId || state.ropeLength === null) continue;
      const anchor = state.anchors.find((item) => item.id === state.attachedAnchorId)!;
      if (state.player.x > anchor.x + state.ropeLength * 0.45 && state.player.vx > 100) {
        game.act('release');
        game.act('press');
      }
    }
    const flatPair = gateSamples.find((sample, index, samples) => index > 0
      && Math.abs(sample.progress - samples[index - 1].progress) < 1e-12
      && sample.tick > samples[index - 1].tick);
    assert.ok(flatPair, 'natural traversal must include a short back-swing or stall during the gate climax');
    const index = gateSamples.indexOf(flatPair);
    assert.ok(flatPair.aperture < gateSamples[index - 1].aperture,
      'gate closure must advance from elapsed gate time, not player progress');
  });

  test.skip('legacy horizontal gate collision recovery (replaced by vertical gate contract)', () => {
    const game = createGrappleGame(31);
    game.act('press');
    let enteredGate = false;
    let collisionState: GrappleState | null = null;
    for (let index = 0; index < 1_600 && game.getState().status === 'playing'; index += 1) {
      const state = tick(game);
      if (state.activeChaseEvent === 'closing-gate') enteredGate = true;
      const collision = game.getEvents().find((event) => event.type === 'closing-gate-collision');
      if (collision) {
        collisionState = state;
        break;
      }
      if (enteredGate || !state.attachedAnchorId || state.ropeLength === null) continue;
      const anchor = state.anchors.find((item) => item.id === state.attachedAnchorId)!;
      if (state.player.x > anchor.x + state.ropeLength * 0.40 && state.player.vx > 100) {
        game.act('release');
        game.act('press');
      }
    }
    assert.ok(collisionState, 'delaying the gate release must create one real leaf collision');
    assert.equal(collisionState.status, 'playing');
    assert.ok(collisionState.player.vx < 0, 'the closing leaf must visibly deflect the player backward');
    assert.equal(game.getEvents().filter((event) => event.type === 'closing-gate-collision').length, 1);

    const recoveryStartX = collisionState.player.x;
    tick(game, 24);
    assert.equal(game.act('release'), true, 'a deliberate post-hit release must be accepted');
    assert.equal(game.act('press'), true);
    for (let index = 0; index < 276 && game.getState().status === 'playing'; index += 1) {
      const state = tick(game);
      if (!state.inputHeld) game.act('press');
      if (!state.attachedAnchorId || state.ropeLength === null) continue;
      const anchor = state.anchors.find((item) => item.id === state.attachedAnchorId)!;
      if (state.player.x > anchor.x + state.ropeLength * 0.38 && state.player.vx > 100) {
        game.act('release');
        game.act('press');
      }
    }
    const recovered = game.getState();
    assert.notEqual(recovered.status, 'failed', 'one gate collision must not become an unavoidable catch or fall');
    assert.ok(recovered.player.x > recoveryStartX + 80, 'the same hold/release vocabulary must regain forward progress');
  });

  test.skip('legacy gate route completion fixture (replaced by vertical gate contract)', () => {
    const low = runNaturalPath(0.45);
    const high = runNaturalPath(0.55);
    assert.equal(low.state.status, 'won');
    assert.equal(high.state.status, 'won');
    assert.deepEqual([...low.committed], ['low']);
    assert.deepEqual([...high.committed], ['high']);
    assert.ok(low.chaseEvents.has('barricade'));
    assert.ok(low.terrainReactions.has('窄巷:chase-test:concealed'));
    assert.ok(high.chaseEvents.has('roof-net'));
    assert.equal(low.state.routeTraversal.phase, 'complete');
    assert.equal(high.state.routeTraversal.phase, 'complete');
    const naturalReactions = new Set([...low.terrainReactions, ...high.terrainReactions]);
    for (const evidence of [
      
      '竹架:safe-teaching:strained', '竹架:safe-teaching:broken',
      '竹架:chase-test:strained', '竹架:chase-test:broken',
      '窄巷:safe-teaching:concealed', '窄巷:chase-test:concealed',
    ]) assert.ok(naturalReactions.has(evidence), `missing natural SAFE_THEN_CHASE evidence: ${evidence}`);
  });

  test.skip('legacy gate golden path fixture (replaced by vertical gate contract)', () => {
    const run = runNaturalPath(0.45);
    assert.equal(run.state.status, 'won');
    const safe = run.pressures.filter((sample) => sample.segment === 'safe-tutorial');
    const first = run.pressures.filter((sample) => sample.segment === 'first-pursuit');
    const route = run.pressures.filter((sample) => sample.segment === 'route-alternation');
    const gate = run.pressures.filter((sample) => sample.segment === 'gate-climax');
    assert.ok(safe.length && first.length && route.length && gate.length);
    assert.ok(first.some((sample) => sample.distance <= 340), 'first pursuit must visibly reach alert');
    const firstPeak = Math.max(...first.map((sample) => sample.pressure));
    assert.ok(route.some((sample) => sample.pressure < firstPeak - 0.06), 'skilled route traversal must create measurable relief');
    assert.ok(Math.max(...gate.map((sample) => sample.pressure)) > firstPeak, 'physical gate pursuit is the later higher peak');
    assert.ok(Math.min(...safe.map((sample) => sample.distance)) > 24, 'safe teaching cannot catch');
  });

  test('route profile changes actual speed and grapple-window expiry', () => {
    const high = createGrappleGame(41);
    const low = createGrappleGame(41);
    high.loadScenario('route-high');
    low.loadScenario('route-low');
    const highBefore = high.getState();
    const lowBefore = low.getState();
    tick(high, 20);
    tick(low, 20);
    assert.ok(high.getState().player.x - highBefore.player.x > low.getState().player.x - lowBefore.player.x);
    assert.ok(highBefore.routeProfile.grappleWindowTicks < lowBefore.routeProfile.grappleWindowTicks);
    assert.notEqual(high.getState().chase.distance, low.getState().chase.distance);
  });

  test('terrain reactions begin only on bounds contact and stop when contact ends', () => {
    const game = createGrappleGame(43);
    const chaseAlley = game.loadScenario('terrain-窄巷-chase');
    game.setPlayerForTest({ y: chaseAlley.activeTerrain!.bounds.y - 100, vx: 300, vy: 0 });
    const outside = tick(game);
    assert.equal(outside.activeTerrain?.behaviorState, 'ready');
    game.setPlayerForTest({
      x: outside.activeTerrain!.bounds.x + 30,
      y: outside.activeTerrain!.bounds.y + 40,
      vx: 300,
      vy: 0,
    });
    const contactStart = tick(game);
    const inside = tick(game, 29);
    assert.equal(inside.activeTerrain?.behaviorState, 'concealed');
    assert.ok(inside.chase.distance > contactStart.chase.distance);
    game.setPlayerForTest({ y: inside.activeTerrain!.bounds.y - 100 });
    assert.equal(tick(game).activeTerrain?.behaviorState, 'ready');
  });

  test.skip('legacy horizontal gate bounds (replaced by vertical gate contract)', () => {
    const game = createGrappleGame(45);
    const first = game.loadScenario('event-closing-gate-beat-1').gate;
    const leftOuter = first.leftLeafBounds.x;
    const rightOuter = first.rightLeafBounds.x + first.rightLeafBounds.width;
    for (const beat of [2, 3] as const) {
      const gate = game.loadScenario(`event-closing-gate-beat-${beat}`).gate;
      assert.equal(gate.leftLeafBounds.x, leftOuter);
      assert.equal(gate.rightLeafBounds.x + gate.rightLeafBounds.width, rightOuter);
      assert.equal(gate.leftLeafBounds.x + gate.leftLeafBounds.width, gate.collisionAperture.x);
      assert.equal(gate.rightLeafBounds.x, gate.collisionAperture.x + gate.collisionAperture.width);
    }
    const before = game.loadScenario('event-closing-gate-beat-2').gate;
    const after = tick(game, 6).gate;
    assert.equal(after.beat, 2);
    assert.ok(after.animationProgress > before.animationProgress);
    assert.ok(after.aperture < before.aperture, 'closure must visibly interpolate inside beat 2');
  });

  test('paused gameplay rejects grapple edges without changing held state', () => {
    const game = createGrappleGame(47);
    game.setPaused(true);
    assert.equal(game.act('press'), false);
    assert.equal(game.getState().inputHeld, false);
    game.setPaused(false);
    assert.equal(game.act('press'), true);
  });
});
