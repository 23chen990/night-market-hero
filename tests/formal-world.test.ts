import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createGrappleGame, type GrappleState } from '../src/game-core.ts';

type Bounds = { x: number; y: number; width: number; height: number };
type WorldState = GrappleState & {
  chaseObstacle?: {
    kind: 'barricade' | 'roof-net';
    expression: 'closing-stall-shutter' | 'beam-hung-cargo-net';
    anchoredTo: 'stall-frame' | 'overhead-crossbeam';
    anchorBounds: Bounds;
    source: { x: number; y: number };
    bounds: Bounds;
    occupiedBounds: Bounds;
    phase: string;
    animationProgress: number;
    collisionActive: boolean;
  } | null;
  gate?: {
    expression: 'inner-market-gate';
    anchoredTo: 'market-exit-arch';
    closureMotion: 'HORIZONTAL_DOUBLE_LEAVES_INWARD';
    anchorBounds: Bounds;
    beat: 1 | 2 | 3 | null;
    aperture: number;
    animationProgress: number;
    leftLeafBounds: Bounds;
    rightLeafBounds: Bounds;
    collisionAperture: Bounds;
  };
  routeTraversal?: {
    phase: 'approach' | 'split' | 'branch' | 'rejoin' | 'complete';
    committedRoute: 'high' | 'low' | null;
  };
};

type WorldManifest = ReturnType<ReturnType<typeof createGrappleGame>['getManifest']> & {
  routeGraph?: {
    approach: Bounds;
    split: Bounds;
    branches: Record<'high' | 'low', { corridor: Bounds; anchorIds: string[]; obstacles: string[] }>;
    rejoin: Bounds;
  };
  terrain: Array<{
    kind: string;
    visual?: { silhouette: string; material: string; layers: string[] };
    placements?: { safe: Bounds; chase: Bounds };
  }>;
};

function worldState(game: ReturnType<typeof createGrappleGame>, scenario: string): WorldState {
  return game.loadScenario(scenario) as WorldState;
}

describe('formal world-space QA contract', () => {
  test('pursuer keeps independent forward lane motion through 1000 backward-swing ticks', () => {
    const game = createGrappleGame(151);
    for (let chunk = 0; chunk < 5; chunk += 1) {
      let previous = worldState(game, 'segment-first-pursuit');
      for (let step = 0; step < 200; step += 1) {
        const tick = chunk * 200 + step;
        game.setPlayerForTest({
          x: previous.pursuer.x + 420,
          y: tick % 2 === 0 ? 340 : 520,
          vx: -260,
          vy: tick % 2 === 0 ? 180 : -180,
        });
        const next = game.advanceTicks(1) as WorldState;
        const guardDx = next.pursuer.x - previous.pursuer.x;
        const playerDx = next.player.x - (previous.pursuer.x + 420);
        assert.ok(guardDx >= 0, `guard moved backward at tick ${tick}`);
        assert.ok(Math.abs(guardDx - playerDx) > 0.5, `guard copied player backward displacement at tick ${tick}`);
        assert.ok(Math.abs(next.pursuer.y - next.pursuer.runLaneY) <= 4.001);
        previous = next;
      }
    }
  });

  test('the full course is enclosed by continuous canopy, crossbeam, stall-wall, and column geometry', () => {
    const state = createGrappleGame(100).getState() as GrappleState & {
      environmentGeometry?: {
        worldBounds: Bounds;
        continuousCanopies: Bounds[];
        overheadCrossbeams: Bounds[];
        stallWalls: Bounds[];
        interiorColumns: Bounds[];
      };
    };
    const geometry = state.environmentGeometry;
    assert.ok(geometry, 'expected formal covered-interior geometry in state');
    assert.equal(geometry.worldBounds.x, 0);
    assert.ok(geometry.worldBounds.width >= state.finishX);
    assert.ok(geometry.continuousCanopies.length > 0);
    assert.ok(Math.min(...geometry.continuousCanopies.map((bounds) => bounds.x)) <= 0);
    assert.ok(Math.max(...geometry.continuousCanopies.map((bounds) => bounds.x + bounds.width)) >= state.finishX);
    assert.ok(geometry.overheadCrossbeams.length >= state.anchors.length);
    assert.ok(geometry.stallWalls.length > 0);
    assert.ok(geometry.interiorColumns.length > 0);
  });

  test('barricade and roof-net expose distinct deterministic bounds, animated phases, and collision-linked resolution', () => {
    const first = createGrappleGame(101);
    const second = createGrappleGame(101);
    const barricade = worldState(first, 'event-barricade').chaseObstacle;
    const barricadeTwin = worldState(second, 'event-barricade').chaseObstacle;
    assert.equal(barricade?.kind, 'barricade');
    assert.equal(barricade?.expression, 'closing-stall-shutter');
    assert.equal(barricade?.anchoredTo, 'stall-frame');
    assert.ok(barricade && barricade.bounds.width > 40 && barricade.bounds.height > 80);
    assert.ok(barricade.anchorBounds.x <= barricade.bounds.x);
    assert.ok(barricade.anchorBounds.x + barricade.anchorBounds.width >= barricade.bounds.x + barricade.bounds.width);
    assert.deepEqual(barricadeTwin, barricade);

    const barricadeLater = first.advanceTicks(36) as WorldState;
    const barricadeTwinLater = second.advanceTicks(36) as WorldState;
    assert.ok((barricadeLater.chaseObstacle?.animationProgress ?? 0) > barricade.animationProgress);
    assert.notEqual(barricadeLater.chaseObstacle?.phase, barricade.phase);
    assert.deepEqual(barricadeTwinLater.chaseObstacle, barricadeLater.chaseObstacle);
    assert.ok(['impact', 'passed'].includes(barricadeLater.chaseObstacle?.phase ?? ''));
    if (barricadeLater.chaseObstacle?.phase === 'impact') {
      assert.ok(first.getEvents().some((event) => event.type === 'pursuit-penalty' && event.cause === 'collision'));
      assert.ok(barricadeLater.player.vy < 0, 'barricade impact must push toward the high lane');
    }

    const blockingGame = createGrappleGame(101);
    const blockingStart = worldState(blockingGame, 'event-barricade').chaseObstacle!;
    blockingGame.setPlayerForTest({
      x: blockingStart.bounds.x + blockingStart.bounds.width / 2,
      y: blockingStart.bounds.y + 20,
      vx: 0,
      vy: 0,
    });
    const fullyClosed = blockingGame.advanceTicks(72) as WorldState;
    assert.equal(fullyClosed.chaseObstacle?.phase, 'impact');
    assert.equal(fullyClosed.chaseObstacle?.animationProgress, 1,
      'collision feedback must not freeze the stall shutter before full blocking coverage');
    assert.deepEqual(fullyClosed.chaseObstacle?.occupiedBounds, fullyClosed.chaseObstacle?.bounds,
      'the fully drawn shutter and collision coverage must share the stall-frame geometry');

    const roofGame = createGrappleGame(102);
    const roofStart = worldState(roofGame, 'event-roof-net').chaseObstacle;
    assert.equal(roofStart?.kind, 'roof-net');
    assert.equal(roofStart?.expression, 'beam-hung-cargo-net');
    assert.equal(roofStart?.anchoredTo, 'overhead-crossbeam');
    assert.ok(roofStart && roofStart.bounds.width > barricade.bounds.width);
    assert.notDeepEqual(roofStart.bounds, barricade.bounds);
    assert.equal(roofStart.source.y, roofStart.anchorBounds.y + roofStart.anchorBounds.height);
    assert.ok(roofStart.source.x >= roofStart.anchorBounds.x);
    assert.ok(roofStart.source.x <= roofStart.anchorBounds.x + roofStart.anchorBounds.width);
    assert.ok(roofStart.bounds.y >= roofStart.source.y, 'cargo net must hang below its overhead crossbeam');
    assert.equal(roofStart.occupiedBounds.x + roofStart.occupiedBounds.width / 2, roofStart.source.x);
    assert.equal(roofStart.occupiedBounds.y, roofStart.source.y);
    roofGame.act('press');
    const roofLater = roofGame.advanceTicks(37) as WorldState;
    assert.ok((roofLater.chaseObstacle?.animationProgress ?? 0) > roofStart.animationProgress);
    assert.ok(['caught', 'missed', 'passed'].includes(roofLater.chaseObstacle?.phase ?? ''),
      `roof-net must resolve after its active window, got ${roofLater.chaseObstacle?.phase ?? 'none'}`);
  });

  test('obstacle lifecycle telegraphs before activation instead of popping in fully formed', () => {
    const game = createGrappleGame(201);
    game.setPlayerForTest({ x: game.getState().finishX * 0.24, y: 420, vx: 420, vy: 0 });
    const warning = game.advanceTicks(1) as WorldState;
    assert.equal(warning.activeChaseEvent, null);
    assert.equal(warning.chaseObstacle?.kind, 'barricade');
    assert.equal(warning.chaseObstacle?.phase, 'warning');
    const entering = game.advanceTicks(24) as WorldState;
    assert.notEqual(entering.chaseObstacle?.phase, 'warning');
    game.setPlayerForTest({ x: game.getState().finishX * 0.32, y: 420, vx: 0, vy: 0 });
    const active = game.advanceTicks(1) as WorldState;
    assert.equal(active.activeChaseEvent, 'barricade');
  });

  test.skip('legacy horizontal gate geometry (replaced by vertical gate contract)', () => {
    const game = createGrappleGame(103);
    const beats = ([1, 2, 3] as const).map((beat) => worldState(game, `event-closing-gate-beat-${beat}`).gate);
    assert.ok(beats.every(Boolean));
    assert.ok(beats[0]!.aperture > beats[1]!.aperture && beats[1]!.aperture > beats[2]!.aperture);
    assert.ok(beats.every((gate) => gate?.leftLeafBounds && gate.rightLeafBounds && gate.collisionAperture),
      'gate state must expose the exact leaf bounds used by rendering and collision');
    const leftInnerEdges = beats.map((gate) => gate!.leftLeafBounds.x + gate!.leftLeafBounds.width);
    const rightInnerEdges = beats.map((gate) => gate!.rightLeafBounds.x);
    assert.ok(leftInnerEdges[0] < leftInnerEdges[1] && leftInnerEdges[1] < leftInnerEdges[2],
      'left leaf must converge monotonically toward the center seam');
    assert.ok(rightInnerEdges[0] > rightInnerEdges[1] && rightInnerEdges[1] > rightInnerEdges[2],
      'right leaf must converge monotonically toward the center seam');
    for (const gate of beats) {
      assert.equal(gate!.expression, 'inner-market-gate');
      assert.equal(gate!.anchoredTo, 'market-exit-arch');
      assert.equal(gate!.closureMotion, 'HORIZONTAL_DOUBLE_LEAVES_INWARD');
      assert.ok(gate!.x >= gate!.anchorBounds.x && gate!.x <= gate!.anchorBounds.x + gate!.anchorBounds.width);
      assert.equal(gate!.leftLeafBounds.y, beats[0]!.leftLeafBounds.y);
      assert.equal(gate!.leftLeafBounds.height, beats[0]!.leftLeafBounds.height);
      assert.equal(gate!.rightLeafBounds.y, beats[0]!.rightLeafBounds.y);
      assert.equal(gate!.rightLeafBounds.height, beats[0]!.rightLeafBounds.height);
      assert.equal(gate!.collisionAperture.x, gate!.leftLeafBounds.x + gate!.leftLeafBounds.width);
      assert.ok(Math.abs(gate!.collisionAperture.x + gate!.collisionAperture.width - gate!.rightLeafBounds.x) < 1e-9);
      assert.equal(gate!.collisionAperture.width, gate!.aperture);
      assert.equal(gate!.collisionAperture.y, gate!.leftLeafBounds.y);
      assert.equal(gate!.collisionAperture.height, gate!.leftLeafBounds.height);
      assert.ok(gate!.animationProgress >= 0 && gate!.animationProgress <= 1);
      assert.equal('upperLeafBottom' in gate!, false, 'vertical descending leaves are forbidden');
      assert.equal('lowerLeafTop' in gate!, false, 'vertical rising leaves are forbidden');
    }
    const repeat = worldState(createGrappleGame(103), 'event-closing-gate-beat-2').gate;
    assert.deepEqual(repeat, beats[1]);
  });

  test.skip('legacy horizontal gate interpolation (replaced by vertical gate contract)', () => {
    const early = createGrappleGame(130);
    const late = createGrappleGame(130);
    const earlyInitial = early.getState();
    const lateInitial = late.getState();
    early.setPlayerForTest({ x: earlyInitial.finishX * 0.8, y: 500, vx: 0, vy: 0 });
    late.setPlayerForTest({ x: lateInitial.finishX * 0.86, y: 500, vx: 0, vy: 0 });

    const earlyBeat = early.advanceTicks(1);
    const lateBeat = late.advanceTicks(1);
    assert.equal(earlyBeat.closingGateBeat, 1);
    assert.equal(lateBeat.closingGateBeat, 1);
    assert.deepEqual(earlyBeat.gate.anchorBounds, lateBeat.gate.anchorBounds);
    assert.equal(earlyBeat.gate.leftLeafBounds.x, lateBeat.gate.leftLeafBounds.x);
    assert.equal(
      earlyBeat.gate.rightLeafBounds.x + earlyBeat.gate.rightLeafBounds.width,
      lateBeat.gate.rightLeafBounds.x + lateBeat.gate.rightLeafBounds.width,
    );
    assert.equal(lateBeat.gate.leftLeafBounds.width, earlyBeat.gate.leftLeafBounds.width,
      'player progress must not make the gate close faster at the same elapsed gate tick');
    assert.equal(lateBeat.gate.collisionAperture.width, earlyBeat.gate.collisionAperture.width);
    const laterInTime = late.advanceTicks(12);
    assert.ok(laterInTime.gate.leftLeafBounds.width > lateBeat.gate.leftLeafBounds.width);
    assert.ok(laterInTime.gate.collisionAperture.width < lateBeat.gate.collisionAperture.width);
  });

  test.skip('legacy horizontal gate traversal (replaced by vertical gate contract)', () => {
    const game = createGrappleGame(31);
    game.act('press');
    let stateBeforeCollision: GrappleState | null = null;
    let collisionState: GrappleState | null = null;
    let gateStarted = false;

    for (let index = 0; index < 3_600 && game.getState().status === 'playing'; index += 1) {
      const before = game.getState();
      game.advanceTicks(1);
      const state = game.getState();
      gateStarted ||= state.activeChaseEvent === 'closing-gate';
      const emittedCollision = game.getEvents().some((event) => String(event.type) === 'closing-gate-collision');
      if (emittedCollision) {
        stateBeforeCollision = before;
        collisionState = state;
        break;
      }
      if (gateStarted) continue;
      if (state.attachedAnchorId === null) continue;
      const anchor = state.anchors.find((item) => item.id === state.attachedAnchorId)!;
      if (state.player.x > anchor.x + state.ropeLength! * 0.45 && state.player.vx > 100) {
        game.act('release');
        game.act('press');
      }
    }

    assert.equal(gateStarted, true, 'ordinary hold/release traversal must reach the fixed exit arch');
    assert.ok(game.getState().closingGateBeat !== null || game.getState().status === 'won');
    if (collisionState && stateBeforeCollision) {
      assert.equal(collisionState.activeChaseEvent, 'closing-gate');
      assert.ok(stateBeforeCollision.player.vx * collisionState.player.vx < 0);
    }
  });

  test.skip('legacy horizontal gate collision (replaced by vertical gate contract)', () => {
    const game = createGrappleGame(107);
    const start = worldState(game, 'event-closing-gate-beat-3');
    const gate = start.gate!;
    assert.ok(gate.leftLeafBounds && gate.collisionAperture, 'expected horizontal gate geometry');
    const leaf = gate.leftLeafBounds;
    game.setPlayerForTest({
      x: leaf.x + leaf.width - 8,
      y: leaf.y + leaf.height / 2,
      vx: 720,
      vy: 0,
    });

    const blocked = game.advanceTicks(18) as WorldState;
    assert.equal(blocked.status, 'playing');
    assert.ok(blocked.player.x + 12 <= gate.collisionAperture.x,
      'a solid left leaf must keep the player outside the live horizontal aperture');
    assert.ok(blocked.player.vx < 720, 'leaf contact must physically deflect forward velocity');
    assert.ok(blocked.player.vy < 0, 'leaf contact must deflect the player along the vertical gate');
    assert.ok(game.getEvents().some((event) => String(event.type) === 'closing-gate-collision'));
    assert.ok(game.getEvents().some((event) => event.type === 'pursuit-penalty' && event.cause === 'collision'));
  });

  test.skip('legacy horizontal leaf overlap (replaced by vertical gate contract)', () => {
    for (const beat of [1, 2, 3] as const) {
      const game = createGrappleGame(120 + beat);
      const start = worldState(game, `event-closing-gate-beat-${beat}`);
      const leaf = start.gate!.leftLeafBounds;
      game.setPlayerForTest({
        x: leaf.x + leaf.width - 8,
        y: leaf.y + leaf.height / 2,
        vx: 720,
        vy: 0,
      });

      const blocked = game.advanceTicks(1);
      assert.ok(blocked.player.x + 12 <= blocked.gate.collisionAperture.x, `beat ${beat} left leaf must block at the live aperture edge`);
      assert.ok(blocked.player.vx < 720, `beat ${beat} leaf contact must deflect forward velocity`);
      assert.ok(blocked.player.vy < 0, `beat ${beat} leaf contact must deflect upward along the leaf`);
      assert.ok(game.getEvents().some((event) => event.type === 'pursuit-penalty' && event.cause === 'collision'));
    }
  });

  test('crossing the live beat-3 aperture is the only gate passage that can resolve victory', () => {
    const game = createGrappleGame(108);
    const start = worldState(game, 'event-closing-gate-beat-3');
    const gate = start.gate!;
    assert.ok(gate.collisionAperture, 'expected a live horizontal aperture');
    game.setPlayerForTest({ x: gate.x - 24, y: gate.collisionAperture.y + gate.collisionAperture.height / 2, vx: 720, vy: 0 });

    const passed = game.advanceTicks(24) as WorldState;
    assert.ok(passed.player.x > gate.x, 'the player must cross the leaf geometry through its live aperture');
    assert.equal(passed.status, 'won');
  });

  test.skip('legacy horizontal exit aperture (replaced by vertical gate contract)', () => {
    const game = createGrappleGame(109);
    const start = worldState(game, 'event-closing-gate-beat-3');
    const gate = start.gate!;
    assert.ok(gate.leftLeafBounds && gate.collisionAperture, 'expected horizontal gate geometry');
    game.setPlayerForTest({
      x: gate.leftLeafBounds.x + gate.leftLeafBounds.width - 8,
      y: gate.leftLeafBounds.y + gate.leftLeafBounds.height / 2,
      vx: 840,
      vy: 0,
    });

    const rejected = game.advanceTicks(30) as WorldState;
    assert.equal(rejected.status, 'playing');
    assert.ok(rejected.player.x + 12 <= gate.collisionAperture.x,
      'out-of-aperture motion must be rejected by the solid horizontal leaf');
  });

  test('closing-gate beat 3 remains actionable for 24 fixed ticks even after crossing the exit', () => {
    const game = createGrappleGame(103);
    const beatThree = worldState(game, 'event-closing-gate-beat-3');
    assert.ok(beatThree.gate?.collisionAperture, 'expected a live horizontal aperture');
    game.setPlayerForTest({
      x: beatThree.gate!.x - 24,
      y: beatThree.gate!.collisionAperture.y + beatThree.gate!.collisionAperture.height / 2,
      vx: 720,
      vy: 0,
    });

    const readableWindow = game.advanceTicks(23);
    assert.equal(readableWindow.status, 'playing');
    assert.equal(readableWindow.closingGateBeat, 3);
    assert.ok(readableWindow.player.x > beatThree.gate!.x, 'beat 3 must remain visible after a valid aperture crossing');

    assert.equal(game.advanceTicks(1).status, 'won');
  });

  test('terrain manifest and fixtures expose distinct silhouettes, safe/chase placements, and persistent reactions', () => {
    const game = createGrappleGame(104);
    const manifest = game.getManifest() as WorldManifest;
    assert.equal(new Set(manifest.terrain.map((terrain) => terrain.visual?.silhouette)).size, 3);
    for (const terrain of manifest.terrain) {
      assert.ok(terrain.visual && terrain.visual.layers.length >= 2);
      assert.ok(terrain.visual.material.length > 0);
      assert.ok(terrain.placements);
      assert.notDeepEqual(terrain.placements?.safe, terrain.placements?.chase);
    }

    const sliding = worldState(game, 'terrain-布棚-sliding');
    assert.equal(sliding.activeTerrain?.behaviorState, 'ready');
    assert.equal((sliding.activeTerrain as WorldState['activeTerrain'] & { visual?: { silhouette: string } })?.visual?.silhouette, 'sagging-fabric-canopy');
    const concealed = worldState(game, 'terrain-窄巷-concealed');
    assert.equal(concealed.activeTerrain?.behaviorState, 'concealed');

    const bamboo = worldState(game, 'terrain-竹架-safe');
    assert.equal(bamboo.activeTerrain?.behaviorState, 'ready');
    const bambooBounds = bamboo.activeTerrain!.bounds;
    game.setPlayerForTest({
      x: bambooBounds.x + bambooBounds.width / 2,
      y: bambooBounds.y + 8,
      vx: 0,
      vy: 180,
    });
    assert.equal(game.advanceTicks(1).activeTerrain?.behaviorState, 'strained');
    assert.equal(game.advanceTicks(30).activeTerrain?.behaviorState, 'broken');
    assert.equal(game.advanceTicks(1).activeTerrain?.behaviorState, 'broken',
      'a broken bamboo scaffold must persist instead of resetting to ready');
  });

  test('authored route graph locks a branch through separated corridors and clears commitment at rejoin', () => {
    const game = createGrappleGame(105);
    const graph = (game.getManifest() as WorldManifest).routeGraph;
    assert.ok(graph);
    assert.ok(graph.branches.high.corridor.y + graph.branches.high.corridor.height < graph.branches.low.corridor.y);
    assert.ok(graph.split.x >= graph.approach.x + graph.approach.width);
    assert.ok(graph.rejoin.x > graph.split.x + graph.split.width);
    assert.ok(graph.branches.high.anchorIds.length > 0 && graph.branches.low.anchorIds.length > 0);
    assert.equal(graph.branches.high.anchorIds.some((id) => graph.branches.low.anchorIds.includes(id)), false);
    assert.notDeepEqual(graph.branches.high.obstacles, graph.branches.low.obstacles);

    const anchors = new Map(game.getState().anchors.map((anchor) => [anchor.id, anchor]));
    for (const route of ['high', 'low'] as const) {
      const branch = graph.branches[route];
      for (const anchorId of branch.anchorIds) {
        const anchor = anchors.get(anchorId);
        assert.ok(anchor, `expected declared ${route} branch anchor ${anchorId}`);
        assert.ok(anchor.x >= branch.corridor.x && anchor.x <= branch.corridor.x + branch.corridor.width);
        assert.ok(anchor.y >= branch.corridor.y && anchor.y <= branch.corridor.y + branch.corridor.height);
      }
    }

    const high = worldState(game, 'route-high');
    assert.equal(high.routeTraversal?.phase, 'branch');
    assert.equal(high.routeTraversal?.committedRoute, 'high');
    assert.equal(game.act('press'), true);
    assert.ok(graph.branches.high.anchorIds.includes(game.getState().attachedAnchorId ?? ''), 'high branch must attach through hold input');
    game.act('release');
    game.setPlayerForTest({ y: graph.branches.low.corridor.y + 20 });
    game.advanceTicks(1);
    assert.equal((game.getState() as WorldState).route, 'low');
    assert.equal((game.getState() as WorldState).routeTraversal?.committedRoute, 'low');

    const low = worldState(game, 'route-low');
    assert.equal(low.routeTraversal?.committedRoute, 'low');
    assert.equal(game.act('press'), true);
    assert.ok(graph.branches.low.anchorIds.includes(game.getState().attachedAnchorId ?? ''), 'low branch must attach through hold input');
    game.act('release');
    game.setPlayerForTest({ x: graph.rejoin.x + 2, y: graph.rejoin.y + 20, vx: 260, vy: 0 });
    game.advanceTicks(1);
    const rejoined = game.getState() as WorldState;
    assert.equal(rejoined.routeTraversal?.phase, 'rejoin');
    assert.equal(rejoined.routeTraversal?.committedRoute, null);
  });

  test('exact-fixture branch anchors stay in their corridors and commitment selects only its reachable forward anchor', () => {
    const game = createGrappleGame(106);
    const graph = (game.getManifest() as WorldManifest).routeGraph;
    assert.deepEqual(graph.branches.high.anchorIds, ['node-5', 'node-6']);
    assert.deepEqual(graph.branches.low.anchorIds, ['node-low']);

    const lowAnchor = game.getState().anchors.find((anchor) => anchor.id === 'node-low');
    assert.ok(lowAnchor);
    const lowCorridor = graph.branches.low.corridor;
    assert.ok(lowAnchor.x >= lowCorridor.x && lowAnchor.x <= lowCorridor.x + lowCorridor.width);
    assert.ok(lowAnchor.y >= lowCorridor.y && lowAnchor.y <= lowCorridor.y + lowCorridor.height);

    const committed = worldState(game, 'route-low');
    assert.equal(committed.routeTraversal?.phase, 'branch');
    assert.equal(committed.routeTraversal?.committedRoute, 'low');
    const highAnchor = committed.anchors.find((anchor) => anchor.id === 'node-6')!;
    assert.ok(lowAnchor.x > committed.player.x && highAnchor.x > committed.player.x,
      'both branch anchors must remain forward of the low-route fixture');
    assert.ok(Math.hypot(lowAnchor.x - committed.player.x, lowAnchor.y - committed.player.y) <= committed.attachRadius);
    assert.ok(Math.hypot(highAnchor.x - committed.player.x, highAnchor.y - committed.player.y) <= committed.attachRadius);

    assert.equal(game.act('press'), true);
    assert.equal(game.getState().attachedAnchorId, 'node-low');
    assert.equal(graph.branches.high.anchorIds.includes(game.getState().attachedAnchorId ?? ''), false);
  });

  test('the low counter-passage surface carries a released flight to the shared rejoin anchor', () => {
    const game = createGrappleGame(107);
    const graph = (game.getManifest() as WorldManifest).routeGraph;
    worldState(game, 'route-low');
    assert.equal(game.act('press'), true);
    assert.equal(game.getState().attachedAnchorId, 'node-low');
    assert.equal(game.act('release'), true);
    game.setPlayerForTest({ x: 1_730, y: 665, vx: 365, vy: -180 });
    assert.equal(game.act('press'), true);

    const rejoined = game.advanceTicks(140) as WorldState;
    assert.equal(rejoined.status, 'playing');
    assert.ok(rejoined.player.x >= graph.rejoin.x);
    assert.equal(rejoined.attachedAnchorId, 'node-7');
  });
});
