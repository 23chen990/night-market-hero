import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createGrappleGame, type GrappleState } from '../src/game-core.ts';

type FormalEvent = {
  sequence: number;
  type: string;
  cause?: string;
};

type FormalManifest = {
  contractVersion: number;
  game: { title: string; shortTitle: string; subtitle: string };
  visualStandard: {
    status: string;
    referenceId: string;
    referenceImage: string;
    orientation: string;
    rendering: string;
    hud: Record<string, string | boolean>;
    keep: string[];
    avoid: string[];
    characterIdentity: {
      enforcement: string;
      referenceImage: string;
      referenceSha256: string;
      protagonist: string[];
      pursuer: string[];
      forbiddenDrift: string[];
    };
  };
  criticalPath: Array<{ order: number; id: string }>;
  grappleNodes: string[];
  routes: Array<{ id: string; surfaces: string[]; speedMultiplier: number; grappleWindowTicks: number; obstacles: string[]; pursuitDistanceEffect: number }>;
  terrain: Array<{ kind: string; teachingOrder: string; safeTeachingScenario: string; chaseTestScenario: string }>;
  chaseEvents: Array<{ id: string; allowedInput: string }>;
  inputs: { gameplay: string[]; physical: string[]; actionButtons: string[] };
  scenarios: Array<{ id: string; proves: string[] }>;
  uiAnimationStandard: {
    schemaVersion: number;
    strategy: string;
    runtimePolicy: {
      clock: string;
      preload: string;
      swapImageUrlsDuringPlayback: boolean;
      interpolateWith: string[];
      useSpriteFramesFor: string[];
      perFrameDurations: boolean;
    };
    verification: {
      refreshRatesHz: number[];
      requireSameFinalStateAcrossRefreshRates: boolean;
      requirePreloadTest: boolean;
      requireReducedMotionTest: boolean;
    };
  };
  environment: {
    spatialSetting: string;
    openSkyTraversal: unknown;
    enclosure: string[];
    routes: { high: string[]; low: string[] };
    architecturalObstacles: Array<{
      id: string;
      expression: string;
      anchoredTo: string;
      collision?: string;
      success?: string;
      closureMotion?: string;
      motionReference?: string;
    }>;
  };
};

type FormalGame = ReturnType<typeof createGrappleGame> & {
  getManifest?: () => FormalManifest;
  advanceTicks?: (ticks: number) => GrappleState;
  loadScenario?: (scenarioId: string) => GrappleState;
  getEvents?: () => FormalEvent[];
};

function formalGame(): Required<Pick<FormalGame, 'getManifest' | 'advanceTicks' | 'loadScenario' | 'getEvents'>> & FormalGame {
  const game = createGrappleGame(31) as FormalGame;
  assert.equal(typeof game.getManifest, 'function', 'expected contractVersion 1 manifest API');
  assert.equal(typeof game.advanceTicks, 'function', 'expected deterministic tick API');
  assert.equal(typeof game.loadScenario, 'function', 'expected deterministic scenario fixtures');
  assert.equal(typeof game.getEvents, 'function', 'expected monotonic formal event log');
  return game as ReturnType<typeof formalGame>;
}

describe('夜市飞侠 formal deterministic contract', () => {
  test('manifest locks the exact approved ui-f night-market reference and strict silhouette identities', () => {
    const manifest = formalGame().getManifest();
    assert.deepEqual(manifest.visualStandard, {
      status: 'HUMAN_APPROVED',
      referenceId: 'ui-f-night-market-interior',
      referenceImage: 'runs/mobile-chart-adaptation-20260830/art-review/ui-concepts-landscape-v3/ui-f-night-market-interior.png',
      orientation: 'LANDSCAPE_16_9',
      rendering: 'MINIMAL_FLAT_2D',
      hud: {
        topLeft: 'TOKEN_STATUS_ONLY',
        topRight: 'DESTINATION_AND_PAUSE',
        center: 'UNOBSTRUCTED',
        pursuit: 'VISIBLE_GUARDS_AND_THIN_LEFT_EDGE_ALERT',
        persistentTutorial: false,
      },
      keep: [
        'horizontal-lookahead',
        'small-readable-characters',
        'three-visible-grapple-nodes',
        'minimal-corner-hud',
        'covered-night-market-interior',
        'minimal-flat-character-silhouettes',
      ],
      avoid: [
        'portrait-layout',
        'ornate-frames',
        'scrolls-seals-calligraphy',
        'poster-composition',
        'dense-market-detail',
        'unbounded-sky-default',
        'anime-detailed-protagonist',
        'realistic-uniformed-guards',
        'character-identity-drift',
      ],
      characterIdentity: {
        enforcement: 'APPROVED_ROSTER',
        referenceImage: 'runs/mobile-chart-adaptation-20260830/art-review/ui-concepts-landscape-v3/ui-f-night-market-interior.png',
        referenceSha256: 'adb2a97b3f72d9233aa807a3f7833d4f2633c6e3210b570750ded32c04f2c3eb',
        protagonist: ['near-solid-blue-black-silhouette', 'short-vermilion-scarf', 'tiny-copper-waist-accent'],
        pursuer: ['near-solid-blue-black-silhouette', 'tiny-vermilion-headband', 'compact-low-running-pose', 'short-low-held-weapon'],
        forbiddenDrift: ['readable-face-or-skin', 'anime-rendering', 'realistic-costume-detail', 'spear-guard-redesign'],
      },
    });
  });

  test('manifest locks title, ordered path, nodes, routes, SAFE_THEN_CHASE evidence, events, and hold/release-only input', () => {
    const manifest = formalGame().getManifest();
    assert.equal(manifest.contractVersion, 1);
    assert.deepEqual(manifest.game, {
      title: '夜市飞侠：护印突围',
      shortTitle: '夜市飞侠',
      subtitle: '护印突围',
    });
    assert.deepEqual(manifest.criticalPath.map(({ order, id }) => ({ order, id })), [
      { order: 1, id: 'safe-tutorial' },
      { order: 2, id: 'first-pursuit' },
      { order: 3, id: 'route-alternation' },
      { order: 4, id: 'gate-climax' },
      { order: 5, id: 'combo-flight' },
    ]);
    assert.deepEqual(manifest.grappleNodes, ['檐角', '牌楼横梁', '灯绳架', '幌杆']);
    assert.deepEqual(manifest.routes.map((route) => route.id), ['high', 'low']);
    assert.notEqual(manifest.routes[0].speedMultiplier, manifest.routes[1].speedMultiplier);
    assert.notEqual(manifest.routes[0].grappleWindowTicks, manifest.routes[1].grappleWindowTicks);
    assert.notDeepEqual(manifest.routes[0].obstacles, manifest.routes[1].obstacles);
    assert.deepEqual(manifest.terrain.map((terrain) => terrain.kind), ['布棚', '竹架', '窄巷']);
    for (const terrain of manifest.terrain) {
      assert.equal(terrain.teachingOrder, 'SAFE_THEN_CHASE');
      assert.ok(manifest.scenarios.some((scenario) => scenario.id === terrain.safeTeachingScenario));
      assert.ok(manifest.scenarios.some((scenario) => scenario.id === terrain.chaseTestScenario));
    }
    assert.deepEqual(manifest.chaseEvents, [
      { id: 'barricade', allowedInput: 'HOLD_RELEASE_ONLY' },
      { id: 'roof-net', allowedInput: 'HOLD_RELEASE_ONLY' },
      { id: 'closing-gate', allowedInput: 'HOLD_RELEASE_ONLY' },
    ]);
    assert.deepEqual(manifest.inputs, {
      gameplay: ['hold', 'release'],
      physical: ['pointer', 'Space'],
      actionButtons: [],
    });
    assert.equal(manifest.uiAnimationStandard.schemaVersion, 1);
    assert.equal(manifest.uiAnimationStandard.strategy, 'key-poses-plus-runtime-motion');
    assert.deepEqual(manifest.uiAnimationStandard.runtimePolicy, {
      clock: 'time-based-requestAnimationFrame',
      preload: 'textures-and-atlases-before-first-use',
      swapImageUrlsDuringPlayback: false,
      interpolateWith: ['transform', 'opacity', 'mask'],
      useSpriteFramesFor: ['silhouette-change', 'deformation'],
      perFrameDurations: true,
    });
    assert.deepEqual(manifest.uiAnimationStandard.verification.refreshRatesHz, [30, 60, 120]);
    assert.equal(manifest.uiAnimationStandard.verification.requireSameFinalStateAcrossRefreshRates, true);
    assert.equal(manifest.uiAnimationStandard.verification.requirePreloadTest, true);
    assert.equal(manifest.uiAnimationStandard.verification.requireReducedMotionTest, true);
  });

  test('manifest locks the covered night-market interior, exact internal routes, and anchored architecture', () => {
    const manifest = formalGame().getManifest();
    assert.deepEqual(manifest.environment, {
      spatialSetting: 'NIGHT_MARKET_INTERIOR_WITH_OPEN_ROOF_SECTIONS',
      openSkyTraversal: { allowed: true, scope: 'DEDICATED_SKY_SEGMENTS_ONLY', maxConsecutiveSkySegments: 1, requiresCanopyBreakTransition: true },
      enclosure: ['continuous-canopies', 'overhead-crossbeams', 'stall-walls', 'interior-columns', 'broken-canopy-edge', 'floating-lantern-clusters', 'star-anchors'],
      routes: {
        high: ['awning-rafters', 'interior-balconies', 'paifang-crossbeams'],
        low: ['stall-aisles', 'covered-alley', 'counter-passages'],
      },
      architecturalObstacles: [
        { id: 'barricade', expression: 'closing-stall-shutter', anchoredTo: 'stall-frame' },
        { id: 'roof-net', expression: 'beam-hung-cargo-net', anchoredTo: 'overhead-crossbeam' },
        {
          id: 'closing-gate',
          expression: 'inner-market-gate',
          anchoredTo: 'market-exit-arch',
          collision: 'SOLID_LEAVES_LIVE_APERTURE',
          success: 'PLAYER_CROSSES_LIVE_APERTURE_ON_BEAT_3',
          closureMotion: 'VERTICAL_DOUBLE_LEAVES_INWARD',
          motionReference: 'FIXED_MARKET_EXIT_ARCH_WORLD_GEOMETRY',
        },
      ],
    });
    assert.deepEqual(manifest.routes.map(({ id, surfaces }) => ({ id, surfaces })), [
      { id: 'high', surfaces: ['棚顶内架', '内檐', '牌楼横梁'] },
      { id: 'low', surfaces: ['摊柜夹道', '有顶窄巷', '柜台通道'] },
    ]);
    assert.ok(manifest.routes.every((route) => route.pursuitDistanceEffect !== 0));
  });

  test('selected treatment uses the exact fixed fixture and scores forward anchors instead of randomizing courses', () => {
    const game = formalGame();
    const initial = game.getState();
    assert.deepEqual(initial.player, { x: 72, y: 575, vx: 245, vy: -185 });
    assert.deepEqual(initial.anchors.map(({ x, y }) => ({ x, y })), [
      { x: 275, y: 365 }, { x: 600, y: 335 }, { x: 925, y: 375 }, { x: 1250, y: 330 },
      { x: 1575, y: 370 }, { x: 1900, y: 340 }, { x: 2225, y: 365 }, { x: 2550, y: 335 },
      { x: 1575, y: 560 },
    ]);
    assert.equal(initial.attachRadius, 600);
    assert.equal(initial.maxSpeed, 840);
    assert.equal(initial.finishX, 2760);
    assert.equal(initial.failY, 900);

    game.resetGame(99);
    assert.deepEqual(game.getState().anchors, initial.anchors);
    assert.equal(game.getState().finishX, 2760);
  });

  test('fixtures expose every ordered segment and materially different high/low tradeoffs', () => {
    const game = formalGame();
    for (const segment of ['safe-tutorial', 'first-pursuit', 'route-alternation', 'gate-climax']) {
      assert.equal(game.loadScenario(`segment-${segment}`).segment, segment);
    }

    const high = game.loadScenario('route-high');
    const low = game.loadScenario('route-low');
    assert.equal(high.route, 'high');
    assert.equal(low.route, 'low');
    assert.ok(high.playerMotion.speed > low.playerMotion.speed + 100);
    assert.ok(high.routeProfile.grappleWindowTicks < low.routeProfile.grappleWindowTicks);
    assert.notDeepEqual(high.routeProfile.obstacles, low.routeProfile.obstacles);
    assert.ok(Math.abs(high.pursuer.distance - low.pursuer.distance) >= 40);
  });

  test('each terrain fixture teaches safely first and tests the same behavior later under guard pursuit', () => {
    const game = formalGame();
    for (const kind of ['布棚', '竹架', '窄巷']) {
      const safe = game.loadScenario(`terrain-${kind}-safe`);
      const chase = game.loadScenario(`terrain-${kind}-chase`);
      assert.equal(safe.activeTerrain?.kind, kind);
      assert.equal(safe.activeTerrain?.lesson, 'safe-teaching');
      assert.equal(safe.segment, 'safe-tutorial');
      assert.equal(chase.activeTerrain?.kind, kind);
      assert.equal(chase.activeTerrain?.lesson, 'chase-test');
      assert.notEqual(chase.segment, 'safe-tutorial');
      assert.ok(chase.pursuer.distance < safe.pursuer.distance);
    }

    for (const progress of [0.26, 0.52]) {
      const state = game.resetGame(31);
      game.setPlayerForTest({ x: state.finishX * progress, y: 470, vx: 0, vy: 0 });
      assert.ok(game.advanceTicks(1).activeTerrain);
    }
  });

  test('penalty and reward fixtures move a visible guard and append monotonic causal events', () => {
    const game = formalGame();
    for (const cause of ['collision', 'missed-hook', 'stalled-airtime']) {
      const before = game.resetGame(31).pursuer.distance;
      const after = game.loadScenario(`penalty-${cause}`);
      assert.equal(after.pursuer.visible, true);
      assert.equal(after.pursuer.kind, 'guard-silhouette');
      assert.ok(after.pursuer.distance < before);
      assert.ok(game.getEvents().some((event) => event.type === 'pursuit-penalty' && event.cause === cause));
    }
    for (const cause of ['stylish-flight', 'shortcut']) {
      const before = game.resetGame(31).pursuer.distance;
      const after = game.loadScenario(`reward-${cause}`);
      assert.ok(after.pursuer.distance > before);
      assert.ok(game.getEvents().some((event) => event.type === 'pursuit-reward' && event.cause === cause));
    }
    const events = game.getEvents();
    assert.ok(events.every((event, index) => index === 0 || event.sequence > events[index - 1].sequence));
    assert.equal(game.getState().eventSequence, events.at(-1)?.sequence);
  });

  test('hold/release-only fixtures cover barricade, roof-net, and all fixed closing-gate beats', () => {
    const game = formalGame();
    assert.equal(game.loadScenario('event-barricade').activeChaseEvent, 'barricade');
    assert.equal(game.loadScenario('event-roof-net').activeChaseEvent, 'roof-net');
    for (const beat of [1, 2, 3] as const) {
      const state = game.loadScenario(`event-closing-gate-beat-${beat}`);
      assert.equal(state.segment, 'gate-climax');
      assert.equal(state.activeChaseEvent, 'closing-gate');
      assert.equal(state.closingGateBeat, beat);
    }
  });

  test('advanceTicks is deterministic and reset keeps event sequence monotonic', () => {
    const first = formalGame();
    const second = formalGame();
    first.act('press');
    second.act('press');
    assert.deepEqual(first.advanceTicks(240).player, second.advanceTicks(240).player);
    const beforeReset = first.getState().eventSequence;
    const reset = first.resetGame(32);
    assert.ok(reset.eventSequence > beforeReset);
  });
});
