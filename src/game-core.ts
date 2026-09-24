import { UI_ANIMATION_STANDARD, type UiAnimationStandard } from './ui-animation.ts';
import { difficultyAtSegment, gateCheckpointXForSegment, metersAtSegment, segmentForIndex, chooseMutation, rollVehicleForSegment, segmentIndexAtX, segmentProgressAtX, segmentStartPx, segmentLengthPx, retentionBoundsAtSegment, pickupPlacementForSegment, depthCoefficient, VEHICLES, type PickupPlacement } from './endless.ts';
import { cityChunksInView, type DistrictId } from './district-world.ts';

export type GameStatus = 'playing' | 'failed' | 'won';
export type FailureReason = 'fell' | 'caught' | null;
export type ChasePhase = 'safe' | 'alert' | 'danger' | 'climax';
export type GrappleEdge = 'press' | 'release' | 0;
export type SegmentId = 'safe-tutorial' | 'first-pursuit' | 'route-alternation' | 'gate-climax' | 'combo-flight';
export type RouteId = 'high' | 'low';
export type LevelId = 'lantern-entry' | 'rafter-fork' | 'ferry-seal' | 'night-patrol';
export type GrappleNodeType = '檐角' | '牌楼横梁' | '灯绳架' | '幌杆';
export type TerrainKind = '布棚' | '竹架' | '窄巷';
export type SceneObjectCategory = 'canopy' | 'obstacle' | 'passage';
export type ChaseEventId = 'barricade' | 'roof-net' | 'closing-gate';
export type ClosingGateBeat = 1 | 2 | 3;
export type PursuitPenaltyCause = 'collision' | 'missed-hook' | 'stalled-airtime';
export type PursuitRewardCause = 'stylish-flight' | 'shortcut';

export interface Point {
  x: number;
  y: number;
}

export interface WorldBounds extends Point {
  width: number;
  height: number;
}

export interface Anchor extends Point {
  id: string;
  type: GrappleNodeType;
}

export interface PlayerState extends Point {
  vx: number;
  vy: number;
}

export interface PlayerMotion extends PlayerState {
  speed: number;
  airborne: boolean;
  grappleWindowRisk: 'short' | 'forgiving';
}

export interface RouteProfile {
  id: RouteId;
  surfaces: string[];
  speedMultiplier: number;
  grappleWindowTicks: number;
  obstacles: string[];
  pursuitDistanceEffect: number;
}

export interface ActiveTerrain {
  kind: TerrainKind;
  category: SceneObjectCategory;
  collision: 'none' | 'solid';
  lesson: 'safe-teaching' | 'chase-test';
  behavior: string;
  behaviorState: 'ready' | 'sliding' | 'strained' | 'broken' | 'concealed';
  bounds: WorldBounds;
  visual: {
    silhouette: 'sagging-fabric-canopy' | 'lashed-bamboo-scaffold' | 'compressed-alley-walls';
    material: string;
    layers: string[];
    reactionDirection: 'down-right' | 'downward' | 'inward';
  };
  impactCount: number;
  impactCooldownUntilTick: number;
  pursuerSlowUntilTick: number;
  collapseAtTick: number | null;
  debrisBounds: WorldBounds | null;
}

export interface ChaseObstacleState {
  kind: 'barricade' | 'roof-net';
  expression: 'closing-stall-shutter' | 'beam-hung-cargo-net';
  anchoredTo: 'stall-frame' | 'overhead-crossbeam';
  anchorBounds: WorldBounds;
  bounds: WorldBounds;
  occupiedBounds: WorldBounds;
  source: Point;
  phase: 'warning' | 'entering' | 'launch' | 'raise' | 'aim' | 'release' | 'travel' | 'land' | 'unfurling' | 'active' | 'impact' | 'caught' | 'missed' | 'passed';
  animationProgress: number;
  collisionActive: boolean;
  startedTick: number;
  predictedTarget: Point;
}

export interface GateState {
  expression: 'inner-market-gate';
  anchoredTo: 'market-exit-arch';
  closureMotion: 'VERTICAL_DOUBLE_LEAVES_INWARD' | 'HORIZONTAL_DOUBLE_LEAVES_INWARD';
  anchorBounds: WorldBounds;
  x: number;
  centerY: number;
  beat: ClosingGateBeat | null;
  aperture: number;
  animationProgress: number;
  topLeafBounds: WorldBounds;
  bottomLeafBounds: WorldBounds;
  /** @deprecated compatibility aliases; both are the same physical bounds used by rendering/collision. */
  leftLeafBounds: WorldBounds;
  rightLeafBounds: WorldBounds;
  renderTopLeafBounds: WorldBounds;
  renderBottomLeafBounds: WorldBounds;
  collisionAperture: WorldBounds;
  dustPulse: number;
  receiver: Point;
  receiverPaid: boolean;
}

export interface RouteGraphBranch {
  corridor: WorldBounds;
  anchorIds: string[];
  obstacles: string[];
}

export interface RouteGraph {
  id: 'night-market-fork-v1';
  approach: WorldBounds;
  split: WorldBounds;
  branches: Record<RouteId, RouteGraphBranch>;
  rejoin: WorldBounds;
}

export interface RouteTraversalState {
  phase: 'approach' | 'split' | 'branch' | 'rejoin' | 'complete';
  committedRoute: RouteId | null;
}

export interface EnvironmentGeometry {
  worldBounds: WorldBounds;
  continuousCanopies: WorldBounds[];
  overheadCrossbeams: WorldBounds[];
  stallWalls: WorldBounds[];
  interiorColumns: WorldBounds[];
}

export interface PursuerState extends Point {
  visible: true;
  kind: 'guard-silhouette';
  screenEdge: 'left';
  distance: number;
  vx: number;
  ax: number;
  maxSpeed: number;
  maxAcceleration: number;
  runLaneY: number;
}

export interface FormalEvent {
  sequence: number;
  tick: number;
  type: 'reset' | 'scenario-loaded' | 'segment-entered' | 'route-changed' | 'pursuit-penalty' | 'pursuit-reward' | 'gate-beat' | 'closing-gate-collision' | 'combo-gain' | 'combo-tier-up' | 'combo-break';
  cause?: PursuitPenaltyCause | PursuitRewardCause | string;
  segment: SegmentId;
}

export interface FormalManifest {
  contractVersion: 1;
  uiAnimationStandard: UiAnimationStandard;
  game: { title: string; shortTitle: string; subtitle: string };
  visualStandard: {
    status: 'HUMAN_APPROVED';
    referenceId: 'ui-f-night-market-interior';
    referenceImage: 'runs/mobile-chart-adaptation-20260830/art-review/ui-concepts-landscape-v3/ui-f-night-market-interior.png';
    orientation: 'LANDSCAPE_16_9';
    rendering: 'MINIMAL_FLAT_2D';
    hud: {
      topLeft: 'TOKEN_STATUS_ONLY';
      topRight: 'DESTINATION_AND_PAUSE';
      center: 'UNOBSTRUCTED';
      pursuit: 'VISIBLE_GUARDS_AND_THIN_LEFT_EDGE_ALERT';
      persistentTutorial: false;
    };
    keep: [
      'horizontal-lookahead',
      'small-readable-characters',
      'three-visible-grapple-nodes',
      'minimal-corner-hud',
      'covered-night-market-interior',
      'minimal-flat-character-silhouettes',
    ];
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
    ];
    characterIdentity: {
      enforcement: 'APPROVED_ROSTER';
      referenceImage: 'runs/mobile-chart-adaptation-20260830/art-review/ui-concepts-landscape-v3/ui-f-night-market-interior.png';
      referenceSha256: 'adb2a97b3f72d9233aa807a3f7833d4f2633c6e3210b570750ded32c04f2c3eb';
      protagonist: ['near-solid-blue-black-silhouette', 'short-vermilion-scarf', 'tiny-copper-waist-accent'];
      pursuer: ['near-solid-blue-black-silhouette', 'tiny-vermilion-headband', 'compact-low-running-pose', 'short-low-held-weapon'];
      forbiddenDrift: ['readable-face-or-skin', 'anime-rendering', 'realistic-costume-detail', 'spear-guard-redesign'];
    };
  };
  narrative: { protagonist: string; objective: string; pursuer: string };
  levels: LevelDefinition[];
  criticalPath: Array<{ order: number; id: SegmentId; purpose: string }>;
  environment: {
    spatialSetting: 'NIGHT_MARKET_INTERIOR_WITH_OPEN_ROOF_SECTIONS';
    openSkyTraversal: { allowed: true; scope: 'DEDICATED_SKY_SEGMENTS_ONLY'; maxConsecutiveSkySegments: 1; requiresCanopyBreakTransition: true };
    enclosure: ['continuous-canopies', 'overhead-crossbeams', 'stall-walls', 'interior-columns', 'broken-canopy-edge', 'floating-lantern-clusters', 'star-anchors'];
    routes: {
      high: ['awning-rafters', 'interior-balconies', 'paifang-crossbeams'];
      low: ['stall-aisles', 'covered-alley', 'counter-passages'];
    };
    architecturalObstacles: [
      { id: 'barricade'; expression: 'closing-stall-shutter'; anchoredTo: 'stall-frame' },
      { id: 'roof-net'; expression: 'beam-hung-cargo-net'; anchoredTo: 'overhead-crossbeam' },
      {
        id: 'closing-gate';
        expression: 'inner-market-gate';
        anchoredTo: 'market-exit-arch';
        collision: 'SOLID_LEAVES_LIVE_APERTURE';
        success: 'PLAYER_CROSSES_LIVE_APERTURE_ON_BEAT_3';
        closureMotion: 'VERTICAL_DOUBLE_LEAVES_INWARD';
        motionReference: 'FIXED_MARKET_EXIT_ARCH_WORLD_GEOMETRY';
      },
    ];
  };
  grappleNodes: GrappleNodeType[];
  routes: RouteProfile[];
  terrain: Array<{
    kind: TerrainKind;
    behavior: string;
    teachingOrder: 'SAFE_THEN_CHASE';
    safeTeachingScenario: string;
    chaseTestScenario: string;
    visual: ActiveTerrain['visual'];
    placements: { safe: WorldBounds; chase: WorldBounds };
  }>;
  routeGraph: RouteGraph;
  chaseEvents: Array<{ id: ChaseEventId; allowedInput: 'HOLD_RELEASE_ONLY' }>;
  pursuitChanges: {
    closesDistanceOn: PursuitPenaltyCause[];
    opensDistanceOn: PursuitRewardCause[];
    primaryExpression: 'visible-guard-silhouette';
  };
  inputs: { gameplay: Array<'hold' | 'release'>; physical: Array<'pointer' | 'Space'>; actionButtons: [] };
  scenarios: Array<{ id: string; proves: string[] }>;
};

export interface GrappleState {
  levelIndex: number;
  levelCount: number;
  levelId: LevelId;
  levelTitle: string;
  levelDestination: string;
  seed: number;
  elapsed: number;
  tick: number;
  status: GameStatus;
  paused: boolean;
  failureReason: FailureReason;
  message: string;
  inputHeld: boolean;
  inputTransitions: number;
  progress: number;
  reviveUsed: boolean;
  segment: SegmentId;
  route: RouteId;
  routeProfile: RouteProfile;
  playerMotion: PlayerMotion;
  pursuer: PursuerState;
  activeTerrain: ActiveTerrain | null;
  sceneObjects: ActiveTerrain[];
  chaseObstacle: ChaseObstacleState | null;
  gate: GateState;
  environmentGeometry: EnvironmentGeometry;
  routeGraph: RouteGraph;
  routeTraversal: RouteTraversalState;
  activeChaseEvent: ChaseEventId | null;
  closingGateBeat: ClosingGateBeat | null;
  eventSequence: number;
  chase: {
    pressure: number;
    distance: number;
    phase: ChasePhase;
  };
  player: PlayerState;
  anchors: Anchor[];
  attachedAnchorId: string | null;
  ropeLength: number | null;
  attachRadius: number;
  maxSpeed: number;
  failY: number;
  finishX: number;
  finishTop: number;
  /** Endless patrol runtime metrics (persisted for replay and settlement). */
  segmentIndex: number;
  distanceMeters: number;
  coins: number;
  pickups: number;
  gatesPassed: number;
  combo: number;
  comboPeak: number;
  comboTier: 1 | 2 | 3 | 4;
  mutation: string | null;
  isSky: boolean;
  vehicleId: string | null;
  activePickups: Array<PickupPlacement & { x: number; y: number; collected: boolean }>;
  vehiclePhase: 'idle' | 'holding' | 'released';
  /** Remaining fixed ticks of the active vehicle before it expires to normal physics. */
  vehicleTicksRemaining: number;
  /** Locked zipline height captured when 货运滑索 hold begins. */
  vehicleLockY: number;
  /** Fixed virtual pivot (above the player) used by 灯笼群 free-attach swing. */
  vehicleVirtualAnchor: Point | null;
  depthCoefficient: number;
  bounceCount: number;
  lastBounceTick: number | null;
  regrappleGraceUntilTick: number;
  talismanActiveUntilTick: number;
  talismanGraceUntilTick: number;
  firecrackerStunUntilTick: number;
  itemUsage: { talisman: number; firecracker: number };
  receiverPaid: boolean;
}

const FIXED_STEP = 1 / 120;
const GRAVITY = 880;
const SWING_DRIVE = 190;
// 载具物理：数值保守，可感知但不破坏节奏。
const KITE_LIFT_ACCEL = 1500;            // 纸鸢按住：持续向上加速度（净上升）
const KITE_GLIDE_GRAVITY = GRAVITY * 0.22; // 纸鸢松手：低重力缓降
const KITE_MAX_LIFT_VY = -560;           // 纸鸢拉升速度上限（向上）
const ZIPLINE_ACCEL = 380;               // 货运滑索按住：水平加速度
const LANTERN_ROPE = 210;                // 灯笼群虚拟摆荡绳长
const BIRD_FLAP_PERIOD = 7;              // 青鸾振翅脉冲周期（tick）
const BIRD_FLAP_IMPULSE = 260;           // 青鸾每次振翅向上脉冲
const BIRD_DIVE_GRAVITY = GRAVITY * 1.55; // 青鸾松手：额外向下加速度
const BIRD_DIVE_ACCEL = 140;             // 青鸾松手：向前加速度
const ATTACH_RADIUS = 600;
const MAX_PLAYABLE_ROPE_LENGTH = 360;
const MAX_SPEED = 840;
const FAIL_Y = 900;
const FINISH_X = 2_760;
const FINISH_TOP = 215;
const REVIVE_CHASE_PRESSURE = 0.42;
const MAX_CHASE_DISTANCE = 520;
const MIN_CHASE_DISTANCE = 100;
const PLAYER_COLLISION_RADIUS = 12;
const REGRAPPLE_GRACE_TICKS = 24;
const TALISMAN_DURATION_TICKS = 360;
const TALISMAN_END_GRACE_TICKS = 30;
const FIRECRACKER_STUN_TICKS = 180;
const PURSUER_RUN_LANE_Y = 647;
const PURSUER_MAX_SPEED = 520;
const PURSUER_MAX_ACCELERATION = 1_200;
const PURSUER_CONTACT_DISTANCE = PLAYER_COLLISION_RADIUS * 2;
// Deferred feature: keep the authored canopy data for future art work, but do
// not expose or simulate the bounce mechanic in the current release.
const CANOPY_BOUNCE_ENABLED = false;
const PURSUER_TARGET_LOOKAHEAD_SECONDS = 0.35;
const PURSUER_TARGET_RESPONSE_SECONDS = 2.8;
const NODE_TYPES: GrappleNodeType[] = ['檐角', '牌楼横梁', '灯绳架', '幌杆'];
const ANCHOR_Y = [365, 335, 375, 330, 370, 340, 365, 335] as const;

export interface LevelDefinition {
  id: LevelId;
  title: string;
  destination: string;
  intensity: number;
  gateCloseTicks: number;
  pursuitSpeedBonus: number;
  startingPressure: number;
  anchorY: readonly number[];
  assistAttachRadius: number;
  finishX: number;
  anchorSpacing: number;
  playerSpeedMultiplier: number;
  pursuitContactDistance: number;
}

const LEVELS: readonly LevelDefinition[] = [
  {
    id: 'lantern-entry', title: '灯棚初试', destination: '内市牌楼', intensity: 0.35,
    // Teaching pass: give new players a wider forgiving hook window.
    gateCloseTicks: 240, pursuitSpeedBonus: 0, startingPressure: 0.18,
    anchorY: ANCHOR_Y,
    assistAttachRadius: 680,
    finishX: FINISH_X, anchorSpacing: 325, playerSpeedMultiplier: 1, pursuitContactDistance: PURSUER_CONTACT_DISTANCE,
  },
  {
    id: 'rafter-fork', title: '牌楼夹道', destination: '封街内门', intensity: 0.62,
    gateCloseTicks: 220, pursuitSpeedBonus: -180, startingPressure: 0.10,
    anchorY: [285, 440, 315, 455, 300, 430, 320, 450],
    assistAttachRadius: 680,
    finishX: 4_800, anchorSpacing: 340, playerSpeedMultiplier: 1.08, pursuitContactDistance: -1,
  },
  {
    id: 'ferry-seal', title: '渡口封街', destination: '渡口接应点', intensity: 0.88,
    gateCloseTicks: 205, pursuitSpeedBonus: -180, startingPressure: 0.10,
    anchorY: [285, 440, 315, 455, 300, 430, 320, 450],
    assistAttachRadius: 1_000,
    finishX: 6_800, anchorSpacing: 320, playerSpeedMultiplier: 1.12, pursuitContactDistance: -1,
  },
];

const ROUTES: Record<RouteId, RouteProfile> = {
  high: {
    id: 'high',
    surfaces: ['棚顶内架', '内檐', '牌楼横梁'],
    speedMultiplier: 1.14,
    grappleWindowTicks: 42,
    obstacles: ['横梁货网'],
    pursuitDistanceEffect: 24,
  },
  low: {
    id: 'low',
    surfaces: ['摊柜夹道', '有顶窄巷', '柜台通道'],
    speedMultiplier: 0.86,
    grappleWindowTicks: 92,
    obstacles: ['摊柜', '低横梁', '立柱', '垂挂布幌'],
    pursuitDistanceEffect: 78,
  },
};

const ROUTE_GRAPH: RouteGraph = {
  id: 'night-market-fork-v1',
  approach: { x: 1_320, y: 250, width: 115, height: 420 },
  split: { x: 1_435, y: 250, width: 80, height: 420 },
  branches: {
    high: {
      corridor: { x: 1_515, y: 300, width: 570, height: 210 },
      // Keep the first upper transfer inside the branch so a normal
      // hold/release can commit high before the roof-net checkpoint.
      anchorIds: ['node-5', 'node-6'],
      obstacles: ['roof-net'],
    },
    low: {
      corridor: { x: 1_515, y: 535, width: 570, height: 225 },
      anchorIds: ['node-low'],
      obstacles: ['stall-counter', 'low-crossbeam', 'interior-column', 'hanging-banner', 'concealment-shortcut'],
    },
  },
  rejoin: { x: 2_085, y: 250, width: 110, height: 420 },
};

const TERRAIN_WORLD: Record<TerrainKind, {
  visual: ActiveTerrain['visual'];
  placements: { safe: WorldBounds; chase: WorldBounds };
}> = {
  '布棚': {
    visual: {
      silhouette: 'sagging-fabric-canopy', material: 'striped-cloth',
      layers: ['horizontal-cloth-panel', 'support-frame', 'sagging-edge', 'broken-cloth'], reactionDirection: 'down-right',
    },
    placements: {
      safe: { x: 35, y: 515, width: 220, height: 92 },
      chase: { x: 800, y: 500, width: 230, height: 102 },
    },
  },
  '竹架': {
    visual: {
      silhouette: 'lashed-bamboo-scaffold', material: 'lashed-bamboo',
      layers: ['upright-poles', 'crossbars', 'diagonal-brace', 'lashings'], reactionDirection: 'downward',
    },
    placements: {
      safe: { x: 340, y: 460, width: 200, height: 200 },
      chase: { x: 1_120, y: 430, width: 240, height: 190 },
    },
  },
  '窄巷': {
    visual: {
      silhouette: 'compressed-alley-walls', material: 'flat-plaster-and-shadow',
      layers: ['near-wall', 'far-wall', 'occlusion-band'], reactionDirection: 'inward',
    },
    placements: {
      safe: { x: 700, y: 400, width: 150, height: 260 },
      chase: { x: 1_650, y: 390, width: 160, height: 280 },
    },
  },
};

const OBSTACLE_BOUNDS: Record<ChaseObstacleState['kind'], WorldBounds> = {
  barricade: { x: 970, y: 480, width: 76, height: 210 },
  'roof-net': { x: 1_700, y: 250, width: 260, height: 170 },
};

const OBSTACLE_STRUCTURES = {
  barricade: {
    expression: 'closing-stall-shutter',
    anchoredTo: 'stall-frame',
    anchorBounds: { x: 944, y: 444, width: 128, height: 268 },
    source: { x: 1_008, y: 480 },
  },
  'roof-net': {
    expression: 'beam-hung-cargo-net',
    anchoredTo: 'overhead-crossbeam',
    anchorBounds: { x: 1_668, y: 218, width: 324, height: 32 },
    source: { x: 1_830, y: 250 },
  },
} as const;

// One traversable checkpoint landmark per street block.  The old 1320x700
// arch read as a full-screen wall and made every large structure look like a
// gate.  Keep the aperture readable while leaving both route bands visible.
const MARKET_EXIT_ARCH_BOUNDS: WorldBounds = { x: FINISH_X - 170, y: 300, width: 340, height: 300 };

const SCENARIOS: FormalManifest['scenarios'] = [
  ...(['safe-tutorial', 'first-pursuit', 'route-alternation', 'gate-climax'] as const)
    .map((id) => ({ id: `segment-${id}`, proves: [`segment:${id}`] })),
  { id: 'route-high', proves: ['route:high', 'fast-speed', 'short-grapple-window', 'roof-net-risk', 'pursuit-distance'] },
  { id: 'route-low', proves: ['route:low', 'safe-window', 'internal-market-obstacles', 'line-of-sight-shortcut', 'pursuit-distance'] },
  ...(['布棚', '竹架', '窄巷'] as const).flatMap((kind) => [
    { id: `terrain-${kind}-safe`, proves: [`terrain:${kind}`, 'safe-teaching'] },
    { id: `terrain-${kind}-chase`, proves: [`terrain:${kind}`, 'chase-test'] },
  ]),
  { id: 'terrain-布棚-sliding', proves: ['terrain:布棚', 'reaction:sliding'] },
  { id: 'terrain-窄巷-concealed', proves: ['terrain:窄巷', 'reaction:concealed'] },
  ...(['collision', 'missed-hook', 'stalled-airtime'] as const)
    .map((cause) => ({ id: `penalty-${cause}`, proves: [`pursuit-penalty:${cause}`] })),
  ...(['stylish-flight', 'shortcut'] as const)
    .map((cause) => ({ id: `reward-${cause}`, proves: [`pursuit-reward:${cause}`] })),
  { id: 'event-barricade', proves: ['chase-event:barricade', 'hold-release-only'] },
  { id: 'event-roof-net', proves: ['chase-event:roof-net', 'hold-release-only'] },
  ...([1, 2, 3] as const).map((beat) => ({
    id: `event-closing-gate-beat-${beat}`,
    proves: ['chase-event:closing-gate', `closing-gate-beat:${beat}`, 'hold-release-only'],
  })),
];

const FORMAL_MANIFEST: FormalManifest = {
  contractVersion: 1,
  uiAnimationStandard: UI_ANIMATION_STANDARD,
  game: { title: '夜市飞侠：护印突围', shortTitle: '夜市飞侠', subtitle: '护印突围' },
  visualStandard: {
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
  },
  narrative: {
    protagonist: '受托护送一枚原创盟契铜符的游侠',
    objective: '在坊门关闭前穿越夜市，把信物交给渡口接应人',
    pursuer: '执行宵禁、从后方追来的官兵',
  },
  levels: LEVELS.map((level) => ({ ...level, anchorY: [...level.anchorY] })),
  criticalPath: [
    { order: 1, id: 'safe-tutorial', purpose: '摊棚街安全教学' },
    { order: 2, id: 'first-pursuit', purpose: '布幌巷首次官兵追入' },
    { order: 3, id: 'route-alternation', purpose: '夜市内檐、棚架与牌楼横梁的高低路线交替' },
    { order: 4, id: 'gate-climax', purpose: '夜市内门关闭前固定三拍高潮' },
    { order: 5, id: 'combo-flight', purpose: '宽间距高速松手连飞教学高潮（无致死）' },
  ],
  environment: {
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
  },
  routeGraph: ROUTE_GRAPH,
  grappleNodes: NODE_TYPES,
  routes: [ROUTES.high, ROUTES.low],
  terrain: [
    { kind: '布棚', behavior: '承接角色后允许滑落', teachingOrder: 'SAFE_THEN_CHASE', safeTeachingScenario: 'terrain-布棚-safe', chaseTestScenario: 'terrain-布棚-chase', ...TERRAIN_WORLD['布棚'] },
    { kind: '竹架', behavior: '受力后可暂时折断', teachingOrder: 'SAFE_THEN_CHASE', safeTeachingScenario: 'terrain-竹架-safe', chaseTestScenario: 'terrain-竹架-chase', ...TERRAIN_WORLD['竹架'] },
    { kind: '窄巷', behavior: '短暂降低追捕压力', teachingOrder: 'SAFE_THEN_CHASE', safeTeachingScenario: 'terrain-窄巷-safe', chaseTestScenario: 'terrain-窄巷-chase', ...TERRAIN_WORLD['窄巷'] },
  ],
  chaseEvents: [
    { id: 'barricade', allowedInput: 'HOLD_RELEASE_ONLY' },
    { id: 'roof-net', allowedInput: 'HOLD_RELEASE_ONLY' },
    { id: 'closing-gate', allowedInput: 'HOLD_RELEASE_ONLY' },
  ],
  pursuitChanges: {
    closesDistanceOn: ['collision', 'missed-hook', 'stalled-airtime'],
    opensDistanceOn: ['stylish-flight', 'shortcut'],
    primaryExpression: 'visible-guard-silhouette',
  },
  inputs: { gameplay: ['hold', 'release'], physical: ['pointer', 'Space'], actionButtons: [] },
  scenarios: SCENARIOS,
};

function makeCourse(level: LevelDefinition): Anchor[] {
  const count = Math.max(level.anchorY.length, Math.ceil((level.finishX - 275) / level.anchorSpacing));
  return [...Array.from({ length: count }, (_, index) => ({
    id: `node-${index + 1}`,
    type: NODE_TYPES[index % NODE_TYPES.length],
    x: 275 + index * level.anchorSpacing,
    y: level.anchorY[index % level.anchorY.length]!,
  })), { id: 'node-low', type: '幌杆', x: 275 + level.anchorSpacing * 4, y: 560 }];
}

const ENDLESS_DISTRICT_ANCHOR_Y: Record<DistrictId, readonly number[]> = {
  market: [360, 335, 375, 345],
  rooftops: [320, 292, 335, 305],
  waterfront: [405, 380, 425, 392],
};

const ENDLESS_DISTRICT_SPACING_SCALE: Record<DistrictId, readonly number[]> = {
  // Keep every authored variant within the segment's validated maximum gap;
  // sky segments supply their own wider base spacing below.
  market: [0.92, 0.98, 0.94, 1],
  rooftops: [0.96, 1, 0.93, 0.98],
  waterfront: [0.94, 0.99, 0.95, 1],
};

function stableTextHash(value: string): number {
  let hash = 0;
  for (const character of value) hash = Math.imul(hash, 31) + character.charCodeAt(0);
  return hash >>> 0;
}

function endlessAnchorLayout(seed: number, x: number, baseSpacing: number): { y: number; spacing: number } {
  const chunk = cityChunksInView(seed, x, x + 1)[0];
  if (!chunk) return { y: 365, spacing: baseSpacing };
  const layoutHash = stableTextHash(chunk.layoutId);
  const ordinal = Math.max(0, Math.floor(x / Math.max(1, baseSpacing)));
  const gameplayDistrict = chunk.gameplayDistrict ?? chunk.district;
  const pattern = ENDLESS_DISTRICT_ANCHOR_Y[gameplayDistrict];
  const spacingScales = ENDLESS_DISTRICT_SPACING_SCALE[gameplayDistrict];
  const patternIndex = (layoutHash + chunk.variant + ordinal) % pattern.length;
  const variantLift = [-8, 6, -4, 10][chunk.variant]!;
  const segment = segmentForIndex(segmentIndexAtX(x));
  const y = segment.isSky
    ? 278 + ((layoutHash + ordinal) % 3) * 34 + chunk.variant * 3
    : pattern[patternIndex]! + variantLift;
  const spacingScale = spacingScales[(layoutHash + ordinal) % spacingScales.length]!;
  return { y, spacing: baseSpacing * spacingScale };
}

function cloneRoute(route: RouteProfile): RouteProfile {
  return { ...route, surfaces: [...route.surfaces], obstacles: [...route.obstacles] };
}

function cloneBounds(bounds: WorldBounds): WorldBounds {
  return { ...bounds };
}

function makeEnvironmentGeometry(finishX = FINISH_X): EnvironmentGeometry {
  const worldWidth = Math.max(finishX + 180, MARKET_EXIT_ARCH_BOUNDS.x + MARKET_EXIT_ARCH_BOUNDS.width + finishX - FINISH_X);
  return {
    worldBounds: { x: 0, y: 0, width: worldWidth, height: FAIL_Y },
    continuousCanopies: [{ x: 0, y: 0, width: worldWidth, height: 170 }],
    overheadCrossbeams: [
      ...Array.from({ length: 9 }, (_, index) => ({ x: index * 350, y: 164, width: 300, height: 22 })),
      cloneBounds(OBSTACLE_STRUCTURES['roof-net'].anchorBounds),
    ],
    stallWalls: [
      { x: 0, y: 640, width: worldWidth, height: 260 },
      { x: 0, y: 186, width: 34, height: 454 },
      { x: worldWidth - 34, y: 186, width: 34, height: 454 },
    ],
    // Market bay supports stop above the low route.  They frame the covered
    // street without becoming repeated full-height gates.
    interiorColumns: Array.from({ length: 10 }, (_, index) => ({ x: 120 + index * 310, y: 174, width: 28, height: 220 })),
  };
}

function cloneEnvironmentGeometry(geometry: EnvironmentGeometry): EnvironmentGeometry {
  return {
    worldBounds: cloneBounds(geometry.worldBounds),
    continuousCanopies: geometry.continuousCanopies.map(cloneBounds),
    overheadCrossbeams: geometry.overheadCrossbeams.map(cloneBounds),
    stallWalls: geometry.stallWalls.map(cloneBounds),
    interiorColumns: geometry.interiorColumns.map(cloneBounds),
  };
}

function cloneRouteGraph(graph: RouteGraph): RouteGraph {
  return {
    ...graph,
    approach: cloneBounds(graph.approach),
    split: cloneBounds(graph.split),
    rejoin: cloneBounds(graph.rejoin),
    branches: {
      high: { ...graph.branches.high, corridor: cloneBounds(graph.branches.high.corridor), anchorIds: [...graph.branches.high.anchorIds], obstacles: [...graph.branches.high.obstacles] },
      low: { ...graph.branches.low, corridor: cloneBounds(graph.branches.low.corridor), anchorIds: [...graph.branches.low.anchorIds], obstacles: [...graph.branches.low.obstacles] },
    },
  };
}

function cloneTerrain(terrain: ActiveTerrain): ActiveTerrain {
  return {
    ...terrain,
    bounds: cloneBounds(terrain.bounds),
    visual: { ...terrain.visual, layers: [...terrain.visual.layers] },
    collapseAtTick: terrain.collapseAtTick ?? null,
    debrisBounds: terrain.debrisBounds ? cloneBounds(terrain.debrisBounds) : null,
  };
}

function makeGateState(beat: ClosingGateBeat | null, animationProgress = beat === null ? 0 : beat / 3, finishX = FINISH_X): GateState {
  const anchorBounds = { ...MARKET_EXIT_ARCH_BOUNDS, x: MARKET_EXIT_ARCH_BOUNDS.x + finishX - FINISH_X };
  const x = anchorBounds.x + anchorBounds.width / 2;
  const innerLeft = anchorBounds.x + 60;
  const innerRight = anchorBounds.x + anchorBounds.width - 60;
  const leafX = innerLeft;
  const leafWidth = innerRight - innerLeft;
  const innerTop = anchorBounds.y + 110;
  const innerBottom = anchorBounds.y + anchorBounds.height - 36;
  const openHeight = innerBottom - innerTop;
  const localProgress = clamp01(animationProgress);
  // Keep closing through the last beat. 220px left a visibly permanent gap;
  // 96px is the smallest readable/player-passable aperture and is also used
  // by the collision bounds below.
  const apertureHeight = beat === null ? openHeight : Math.max(96, openHeight - (openHeight - 96) * localProgress);
  const apertureY = innerTop + (openHeight - apertureHeight) / 2;
  const topLeafBounds = { x: leafX, y: innerTop, width: leafWidth, height: apertureY - innerTop };
  const bottomLeafBounds = { x: leafX, y: apertureY + apertureHeight, width: leafWidth, height: innerBottom - (apertureY + apertureHeight) };
  return {
    expression: 'inner-market-gate',
    anchoredTo: 'market-exit-arch',
    closureMotion: 'VERTICAL_DOUBLE_LEAVES_INWARD',
    anchorBounds,
    x,
    centerY: apertureY + apertureHeight / 2,
    beat,
    aperture: apertureHeight,
    animationProgress: localProgress,
    topLeafBounds,
    bottomLeafBounds,
    leftLeafBounds: topLeafBounds,
    rightLeafBounds: bottomLeafBounds,
    renderTopLeafBounds: topLeafBounds,
    renderBottomLeafBounds: bottomLeafBounds,
    collisionAperture: { x: leafX, y: apertureY, width: leafWidth, height: apertureHeight },
    dustPulse: beat === null ? 0 : Math.sin((localProgress * 3 % 1) * Math.PI),
    receiver: { x: x + 82, y: apertureY + apertureHeight / 2 + 8 },
    receiverPaid: false,
  };
}

function copyState(state: GrappleState): GrappleState {
  return {
    ...state,
    player: { ...state.player },
    playerMotion: { ...state.playerMotion },
    anchors: state.anchors.map((anchor) => ({ ...anchor })),
    chase: { ...state.chase },
    pursuer: { ...state.pursuer },
    routeProfile: cloneRoute(state.routeProfile),
    activeTerrain: state.activeTerrain ? cloneTerrain(state.activeTerrain) : null,
    sceneObjects: state.sceneObjects.map(cloneTerrain),
    chaseObstacle: state.chaseObstacle ? {
      ...state.chaseObstacle,
      anchorBounds: cloneBounds(state.chaseObstacle.anchorBounds),
      bounds: cloneBounds(state.chaseObstacle.bounds),
      occupiedBounds: cloneBounds(state.chaseObstacle.occupiedBounds),
      source: { ...state.chaseObstacle.source },
    } : null,
    gate: {
      ...state.gate,
      anchorBounds: cloneBounds(state.gate.anchorBounds),
      leftLeafBounds: cloneBounds(state.gate.leftLeafBounds),
      rightLeafBounds: cloneBounds(state.gate.rightLeafBounds),
      collisionAperture: cloneBounds(state.gate.collisionAperture),
      receiver: { ...state.gate.receiver },
    },
    environmentGeometry: cloneEnvironmentGeometry(state.environmentGeometry),
    routeGraph: cloneRouteGraph(state.routeGraph),
    routeTraversal: { ...state.routeTraversal },
    activePickups: state.activePickups?.map((pickup) => ({ ...pickup })) ?? [],
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class GrappleGame {
  private state!: GrappleState;
  private accumulator = 0;
  private events: FormalEvent[] = [];
  private nextEventSequence = 1;
  private stalledTicks = 0;
  private stylishFlights = 0;
  private shortcutRewarded = false;
  private bambooLoadTicks = 0;
  private gateClimaxStartedTick: number | null = null;
  private gateBeatThreeStartedTick: number | null = null;
  private gateCollisionRecoveryUntilTick = 0;
  private gateApertureCrossed = false;
  private lastReleasedAnchorId: string | null = null;
  private encountered = new Set<string>();
  private pursuitIntentOffset = 0;
  private pursuitIntentTicks = 0;
  private unattachedHeldTicks = 0;
  private grappleReconnectNotBeforeX = 0;
  private endlessMode = false;
  private endlessAnchorSerial = 0;
  private endlessCourseLastCullSegment = -1;

  constructor(seed = 1) {
    this.resetGame(seed);
  }

  getManifest(): FormalManifest {
    return JSON.parse(JSON.stringify(FORMAL_MANIFEST)) as FormalManifest;
  }

  private levelDefinition(index = this.state?.levelIndex ?? 0): LevelDefinition {
    return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, Math.floor(index)))]!;
  }

  resetGame(seed = this.state?.seed ?? 1, levelIndex = this.state?.levelIndex ?? 0): GrappleState {
    const normalizedSeed = Math.max(1, Math.floor(seed));
    this.endlessMode = false;
    const normalizedLevelIndex = Math.max(0, Math.min(LEVELS.length - 1, Math.floor(levelIndex)));
    const level = this.levelDefinition(normalizedLevelIndex);
    this.accumulator = 0;
    this.events = [];
    this.stalledTicks = 0;
    this.stylishFlights = 0;
    this.shortcutRewarded = false;
    this.bambooLoadTicks = 0;
    this.gateClimaxStartedTick = null;
    this.gateBeatThreeStartedTick = null;
    this.gateCollisionRecoveryUntilTick = 0;
    this.gateApertureCrossed = false;
    this.lastReleasedAnchorId = null;
    this.encountered.clear();
    this.pursuitIntentOffset = 0;
    this.pursuitIntentTicks = 0;
    this.unattachedHeldTicks = 0;
    this.grappleReconnectNotBeforeX = 0;
    this.endlessAnchorSerial = 0;
    this.endlessCourseLastCullSegment = -1;
    const initialDistance = this.chaseDistance(level.startingPressure);
    this.state = {
      levelIndex: normalizedLevelIndex,
      // The shipped journey is tutorial + endless patrol. Legacy fixed levels
      // remain in the manifest only for compatibility fixtures and are never
      // exposed by the default runtime path.
      levelCount: 2,
      levelId: level.id,
      levelTitle: level.title,
      levelDestination: level.destination,
      seed: normalizedSeed,
      elapsed: 0,
      tick: 0,
      status: 'playing',
      paused: false,
      failureReason: null,
      message: '',
      inputHeld: false,
      inputTransitions: 0,
      progress: 0,
      reviveUsed: false,
      segment: 'safe-tutorial',
      route: 'low',
      routeProfile: cloneRoute(ROUTES.low),
      playerMotion: { x: 72, y: 575, vx: 245, vy: -185, speed: Math.hypot(245, -185), airborne: true, grappleWindowRisk: 'forgiving' },
      pursuer: {
        visible: true, kind: 'guard-silhouette', screenEdge: 'left', x: 72 - initialDistance,
        y: PURSUER_RUN_LANE_Y, distance: initialDistance, vx: 245, ax: 0,
        maxSpeed: PURSUER_MAX_SPEED, maxAcceleration: PURSUER_MAX_ACCELERATION, runLaneY: PURSUER_RUN_LANE_Y,
      },
      activeTerrain: null,
      sceneObjects: this.makeSceneObjects(),
      chaseObstacle: null,
      gate: makeGateState(null, 0, level.finishX),
      environmentGeometry: makeEnvironmentGeometry(level.finishX),
      routeGraph: cloneRouteGraph(ROUTE_GRAPH),
      routeTraversal: { phase: 'approach', committedRoute: null },
      activeChaseEvent: null,
      closingGateBeat: null,
      eventSequence: 0,
      chase: { pressure: level.startingPressure, distance: initialDistance, phase: 'safe' },
      player: { x: 72, y: 575, vx: 245, vy: -185 },
      anchors: makeCourse(level),
      attachedAnchorId: null,
      ropeLength: null,
      attachRadius: ATTACH_RADIUS,
      maxSpeed: MAX_SPEED,
      failY: FAIL_Y,
      finishX: level.finishX,
      finishTop: FINISH_TOP,
      segmentIndex: 0,
      distanceMeters: 0,
      coins: 0,
      pickups: 0,
      gatesPassed: 0,
      combo: 0,
      comboPeak: 0,
      comboTier: 1,
      mutation: null,
      isSky: false,
      vehicleId: null,
      activePickups: [
        { kind: 'low-safety', segment: 0, value: 4, x: 350, y: 520, collected: false },
        { kind: 'swing-apex', segment: 0, value: 6, x: 620, y: 410, collected: false },
      ],
      vehiclePhase: 'idle',
      vehicleTicksRemaining: 0,
      vehicleLockY: 0,
      vehicleVirtualAnchor: null,
      depthCoefficient: 1,
      bounceCount: 0,
      lastBounceTick: null,
      regrappleGraceUntilTick: 0,
      talismanActiveUntilTick: 0,
      talismanGraceUntilTick: 0,
      firecrackerStunUntilTick: 0,
      itemUsage: { talisman: 0, firecracker: 0 },
      receiverPaid: false,
    };
    this.state.activeTerrain = this.state.sceneObjects[0] ?? null;
    this.recordEvent('reset', `seed:${normalizedSeed}`);
    return this.getState();
  }

  continueCampaign(): GrappleState {
    if (this.state.status !== 'won') return this.getState();
    if (this.state.levelIndex === 0) {
      this.resetGame(this.state.seed + 1, 0);
      this.endlessMode = true;
      this.configureEndlessState('夜巡已解锁');
      return this.getState();
    }
    if (this.endlessMode) {
      this.resetGame(this.state.seed + 1, 0);
      this.endlessMode = true;
      this.configureEndlessState();
      return this.getState();
    }
    const nextLevelIndex = (this.state.levelIndex + 1) % LEVELS.length;
    return this.resetGame(this.state.seed + 1, nextLevelIndex);
  }

  restartEndless(seed = this.state.seed + 1): GrappleState {
    this.resetGame(seed, 0);
    this.endlessMode = true;
    this.configureEndlessState();
    return this.getState();
  }

  private configureEndlessState(message = ''): void {
    this.state.levelIndex = 1;
    this.state.levelCount = 2;
    this.state.levelId = 'night-patrol';
    this.state.levelTitle = '无限夜巡';
    this.state.levelDestination = '夜市深处';
    this.state.finishX = Number.MAX_SAFE_INTEGER;
    this.state.message = message;
    this.state.segmentIndex = 0;
    this.state.distanceMeters = 0;
    this.state.coins = 0;
    this.state.pickups = 0;
    this.state.gatesPassed = 0;
    this.state.combo = 0;
    this.state.comboTier = 1;
    this.state.mutation = null;
    this.state.isSky = false;
    this.state.vehicleId = null;
    this.state.activePickups = [];
    this.state.vehiclePhase = 'idle';
    this.state.vehicleTicksRemaining = 0;
    this.state.vehicleLockY = 0;
    this.state.vehicleVirtualAnchor = null;
    this.state.depthCoefficient = 1;
    this.state.attachRadius = difficultyAtSegment(0).assistAttachRadius;
  }

  getState(): GrappleState {
    return copyState(this.state);
  }

  getEvents(): FormalEvent[] {
    return this.events.map((event) => ({ ...event }));
  }

  restoreSnapshot(snapshot: GrappleState): boolean {
    if (!snapshot || !Number.isInteger(snapshot.seed) || !snapshot.player || !snapshot.pursuer || !snapshot.gate) return false;
    const levelIndex = Number.isInteger(snapshot.levelIndex) ? snapshot.levelIndex : 0;
    const level = this.levelDefinition(levelIndex);
    const restoredSceneObjects = (snapshot.sceneObjects?.length
      ? snapshot.sceneObjects
      : (['布棚', '竹架', '窄巷'] as const).map((kind) => snapshot.activeTerrain?.kind === kind
        ? snapshot.activeTerrain
        : this.makeTerrain(kind, 'safe-teaching'))).map((item) => ({
      ...item,
      category: item.category ?? (item.kind === '竹架' ? 'obstacle' : item.kind === '窄巷' ? 'passage' : 'canopy'),
      collision: item.collision ?? (item.kind === '竹架' && item.behaviorState !== 'broken' ? 'solid' : 'none'),
      impactCount: item.impactCount ?? 0,
      impactCooldownUntilTick: item.impactCooldownUntilTick ?? 0,
      pursuerSlowUntilTick: item.pursuerSlowUntilTick ?? 0,
      collapseAtTick: item.collapseAtTick ?? null,
      debrisBounds: item.debrisBounds ?? null,
    }));
    const restoredGate = snapshot.gate.topLeafBounds && snapshot.gate.bottomLeafBounds
      ? snapshot.gate
      : makeGateState(snapshot.closingGateBeat, snapshot.gate.animationProgress ?? 0, level.finishX);
    const normalizedGate = {
      ...restoredGate,
      receiver: restoredGate.receiver ?? { x: restoredGate.x + 82, y: restoredGate.centerY + 8 },
      receiverPaid: restoredGate.receiverPaid ?? false,
    };
    this.state = copyState({
      ...snapshot,
      sceneObjects: restoredSceneObjects,
      gate: normalizedGate,
      levelIndex,
      levelCount: 2,
      levelId: snapshot.levelId ?? level.id,
      levelTitle: snapshot.levelTitle ?? level.title,
      levelDestination: snapshot.levelDestination ?? level.destination,
      segmentIndex: snapshot.segmentIndex ?? 0,
      distanceMeters: snapshot.distanceMeters ?? 0,
      coins: snapshot.coins ?? 0,
      pickups: snapshot.pickups ?? 0,
      gatesPassed: snapshot.gatesPassed ?? 0,
      combo: snapshot.combo ?? 0,
      comboPeak: snapshot.comboPeak ?? snapshot.combo ?? 0,
      comboTier: snapshot.comboTier ?? 1,
      mutation: snapshot.mutation ?? null,
      isSky: snapshot.isSky ?? false,
      vehicleId: snapshot.vehicleId ?? null,
      activePickups: snapshot.activePickups ?? [],
      vehiclePhase: snapshot.vehiclePhase ?? 'idle',
      vehicleTicksRemaining: snapshot.vehicleTicksRemaining ?? 0,
      vehicleLockY: snapshot.vehicleLockY ?? 0,
      vehicleVirtualAnchor: snapshot.vehicleVirtualAnchor ?? null,
      depthCoefficient: snapshot.depthCoefficient ?? 1,
      bounceCount: snapshot.bounceCount ?? 0,
      lastBounceTick: snapshot.lastBounceTick ?? null,
      regrappleGraceUntilTick: snapshot.regrappleGraceUntilTick ?? 0,
      talismanActiveUntilTick: snapshot.talismanActiveUntilTick ?? 0,
      talismanGraceUntilTick: snapshot.talismanGraceUntilTick ?? 0,
      firecrackerStunUntilTick: snapshot.firecrackerStunUntilTick ?? 0,
      itemUsage: snapshot.itemUsage ?? { talisman: 0, firecracker: 0 },
      receiverPaid: snapshot.receiverPaid ?? false,
    });
    this.accumulator = 0;
    this.events = [];
    this.nextEventSequence = Math.max(this.nextEventSequence, snapshot.eventSequence + 1);
    this.stalledTicks = 0;
    this.stylishFlights = 0;
    this.shortcutRewarded = snapshot.activeTerrain?.kind === '窄巷' && snapshot.activeTerrain.behaviorState === 'concealed';
    this.bambooLoadTicks = snapshot.activeTerrain?.kind === '竹架' && snapshot.activeTerrain.behaviorState === 'broken' ? 6 : 0;
    const restoreGateCloseTicks = level.gateCloseTicks * this.mutationModifiers().gateCloseTicksFactor; // 封灯：关门快约10%
    this.gateClimaxStartedTick = snapshot.activeChaseEvent === 'closing-gate'
      ? snapshot.tick - Math.round(snapshot.gate.animationProgress * restoreGateCloseTicks)
      : null;
    const beatThreeStart = this.gateClimaxStartedTick === null
      ? null
      : this.gateClimaxStartedTick + Math.ceil(restoreGateCloseTicks * 2 / 3);
    this.gateBeatThreeStartedTick = snapshot.closingGateBeat === 3 ? beatThreeStart : null;
    this.gateCollisionRecoveryUntilTick = 0;
    this.gateApertureCrossed = snapshot.status === 'won';
    this.lastReleasedAnchorId = null;
    this.encountered.clear();
    this.pursuitIntentOffset = 0;
    this.pursuitIntentTicks = 0;
    this.unattachedHeldTicks = 0;
    this.grappleReconnectNotBeforeX = 0;
    // 'night-patrol' 只由 configureEndlessState() 产出，故它是恢复运行模式的权威标记。
    // 必须在此同步私有 endlessMode，否则 restore 后 GrappleState 处于无限夜巡、
    // 而下一 tick 却走 campaign 分支（progress / 段位 / 距离 / 航道扩展全部错分支）。
    this.endlessMode = this.state.levelId === 'night-patrol';
    this.endlessCourseLastCullSegment = -1;
    return true;
  }

  advanceTicks(ticks: number): GrappleState {
    const count = Math.max(0, Math.floor(ticks));
    for (let index = 0; index < count && this.state.status === 'playing'; index += 1) this.fixedTick(FIXED_STEP);
    return this.getState();
  }

  loadScenario(scenarioId: string): GrappleState {
    if (!SCENARIOS.some((scenario) => scenario.id === scenarioId)) throw new Error(`Unknown formal scenario: ${scenarioId}`);
    this.resetGame(this.state.seed);
    const segmentMatch = scenarioId.match(/^segment-(safe-tutorial|first-pursuit|route-alternation|gate-climax|combo-flight)$/);
    if (segmentMatch) this.setScenarioSegment(segmentMatch[1] as SegmentId);

    if (scenarioId === 'route-high') {
      this.state.chase.pressure = 0.11;
      this.setScenarioPosition(0.552, 330, 570, -120);
      this.state.routeTraversal = { phase: 'branch', committedRoute: 'high' };
    } else if (scenarioId === 'route-low') {
      this.state.chase.pressure = 0;
      // Start the fixture inside the authored low counter-passage so route
      // commitment is derived from real corridor occupancy on the first tick.
      this.setScenarioPosition(0.552, 620, 330, -25);
      this.state.routeTraversal = { phase: 'branch', committedRoute: 'low' };
    }

    const terrainMatch = scenarioId.match(/^terrain-(布棚|竹架|窄巷)-(safe|chase)$/);
    if (terrainMatch) {
      const kind = terrainMatch[1] as TerrainKind;
      const safe = terrainMatch[2] === 'safe';
      const safeProgress: Record<TerrainKind, number> = { '布棚': 0.04, '竹架': 0.12, '窄巷': 0.20 };
      const chaseProgress: Record<TerrainKind, number> = { '布棚': 0.32, '竹架': 0.44, '窄巷': 0.62 };
      this.state.chase.pressure = safe ? 0.05 : 0.58;
      const terrainY: Record<TerrainKind, number> = { '布棚': 470, '竹架': 480, '窄巷': 555 };
      this.setScenarioPosition(safe ? safeProgress[kind] : chaseProgress[kind], terrainY[kind], safe ? 270 : 360, -30);
      this.state.segment = safe ? 'safe-tutorial' : 'route-alternation';
      const terrain = this.state.sceneObjects.find((item) => item.kind === kind) ?? this.makeTerrain(kind, safe ? 'safe-teaching' : 'chase-test');
      terrain.lesson = safe ? 'safe-teaching' : 'chase-test';
      this.state.activeTerrain = terrain;
    }

    const reactionScenario = ({
      'terrain-布棚-sliding': { kind: '布棚', progress: 0.04, y: 570, vx: 180, vy: 220, state: 'sliding' },
      'terrain-窄巷-concealed': { kind: '窄巷', progress: 0.20, y: 555, vx: 180, vy: 0, state: 'concealed' },
    } as const)[scenarioId];
    if (reactionScenario) {
      this.state.chase.pressure = 0.05;
      this.setScenarioPosition(reactionScenario.progress, reactionScenario.y, reactionScenario.vx, reactionScenario.vy);
      this.state.segment = 'safe-tutorial';
      this.state.activeTerrain = this.state.sceneObjects.find((item) => item.kind === reactionScenario.kind) ?? this.makeTerrain(reactionScenario.kind, 'safe-teaching');
      this.state.activeTerrain.behaviorState = reactionScenario.kind === '布棚' && !CANOPY_BOUNCE_ENABLED ? 'ready' : reactionScenario.state;
    }

    const penaltyMatch = scenarioId.match(/^penalty-(collision|missed-hook|stalled-airtime)$/);
    if (penaltyMatch) {
      this.state.player.vx = 40;
      this.applyPursuitPenalty(penaltyMatch[1] as PursuitPenaltyCause, 0.12);
      this.advanceTicks(36);
    }
    const rewardMatch = scenarioId.match(/^reward-(stylish-flight|shortcut)$/);
    if (rewardMatch) {
      this.state.player.vx = 650;
      this.applyPursuitReward(rewardMatch[1] as PursuitRewardCause, 0.12);
      this.advanceTicks(36);
    }

    if (scenarioId === 'event-barricade') this.setScenarioPosition(0.34, 560, 315, -20);
    if (scenarioId === 'event-roof-net') this.setScenarioPosition(0.62, 330, 525, -80);
    const gateMatch = scenarioId.match(/^event-closing-gate-beat-([123])$/);
    if (gateMatch) {
      const beat = Number(gateMatch[1]) as ClosingGateBeat;
      this.setScenarioPosition(({ 1: 0.86, 2: 0.93, 3: 0.98 } as const)[beat], beat === 2 ? 500 : 360, 500, -60);
      this.state.segment = 'gate-climax';
      this.state.activeChaseEvent = 'closing-gate';
      const fixtureProgress = ({ 1: 0.25, 2: 0.5, 3: 0.75 } as const)[beat];
      this.gateClimaxStartedTick = this.state.tick - Math.round(fixtureProgress * this.effectiveGateCloseTicks());
      this.gateBeatThreeStartedTick = beat === 3 ? this.state.tick : null;
    }

    this.refreshDerived(false);
    if (terrainMatch) {
      const kind = terrainMatch[1] as TerrainKind;
      this.state.activeTerrain = this.state.sceneObjects.find((item) => item.kind === kind) ?? null;
    } else if (scenarioId === 'terrain-布棚-sliding' || scenarioId === 'terrain-窄巷-concealed') {
      const kind = scenarioId === 'terrain-布棚-sliding' ? '布棚' : '窄巷';
      this.state.activeTerrain = this.state.sceneObjects.find((item) => item.kind === kind) ?? null;
    }
    if (gateMatch?.[1] === '3') this.gateBeatThreeStartedTick = this.state.tick;
    this.recordEvent('scenario-loaded', scenarioId);
    return this.getState();
  }

  setPlayerForTest(patch: Partial<PlayerState>): void {
    Object.assign(this.state.player, patch);
    if (patch.x !== undefined) this.state.progress = Math.max(this.state.progress, clamp01(patch.x / this.state.finishX));
  }

  setPaused(paused: boolean): void {
    this.state.paused = paused;
    if (paused) {
      this.accumulator = 0;
      this.state.inputHeld = false;
      this.state.attachedAnchorId = null;
      this.state.ropeLength = null;
    }
  }

  canRewardedRevive(): boolean {
    return this.state.status === 'failed' && this.state.progress >= 0.6 && !this.state.reviveUsed;
  }

  useTalisman(): boolean {
    if (this.state.status !== 'playing' || this.state.talismanActiveUntilTick > this.state.tick) return false;
    this.state.talismanActiveUntilTick = this.state.tick + TALISMAN_DURATION_TICKS;
    this.state.itemUsage.talisman += 1;
    return true;
  }

  useFirecracker(): boolean {
    if (this.state.status !== 'playing' || this.state.firecrackerStunUntilTick > this.state.tick) return false;
    this.state.firecrackerStunUntilTick = this.state.tick + FIRECRACKER_STUN_TICKS;
    this.state.itemUsage.firecracker += 1;
    this.state.chase.pressure = Math.max(0, this.state.chase.pressure - 0.12);
    this.rebasePursuerToCurrentPressure();
    return true;
  }

  getEligibleAnchorId(): string | null {
    return this.state.attachedAnchorId ?? this.nearestEligibleAnchor()?.id ?? null;
  }

  reviveFromSafeState(): boolean {
    if (!this.canRewardedRevive()) return false;
    const reachedX = this.state.progress * this.state.finishX;
    const safeAnchor = [...this.state.anchors].reverse().find((anchor) => anchor.x <= reachedX);
    this.state.player = safeAnchor
      ? { x: Math.max(72, safeAnchor.x - 84), y: safeAnchor.y + 175, vx: 245, vy: -185 }
      : { x: 72, y: 575, vx: 245, vy: -185 };
    this.accumulator = 0;
    this.state.status = 'playing';
    this.state.failureReason = null;
    this.state.message = '';
    this.state.inputHeld = false;
    this.state.attachedAnchorId = null;
    this.state.ropeLength = null;
    this.state.reviveUsed = true;
    this.state.chase.pressure = REVIVE_CHASE_PRESSURE;
    this.rebasePursuerToCurrentPressure();
    this.refreshDerived(false);
    return true;
  }

  act(edge: GrappleEdge): boolean {
    if (this.state.paused) return false;
    const resolved = edge === 0 ? (this.state.inputHeld ? 'release' : 'press') : edge;
    if (resolved === 'press' && this.state.status !== 'playing') {
      const wasEndless = this.endlessMode;
      this.resetGame(this.state.seed + 1, wasEndless ? 0 : this.state.levelIndex);
      if (wasEndless) {
        this.endlessMode = true;
        this.configureEndlessState();
      }
    }
    if (resolved === 'press') {
      if (this.state.inputHeld) return false;
      this.state.inputHeld = true;
      this.state.inputTransitions += 1;
      if (this.state.vehicleId) {
        this.state.vehiclePhase = 'holding';
        this.beginVehicleHold();
        // 载具自行管理挂接，跳过真实抓钩与错过挂点惩罚
        return true;
      }
      if (!this.tryAttach() && this.state.segment !== 'safe-tutorial') this.applyPursuitPenalty('missed-hook', 0.075);
      return true;
    }
    if (!this.state.inputHeld) return false;
    const releasedAnchor = this.state.attachedAnchorId;
    const releasedRopeLength = this.state.ropeLength;
    const releaseSpeed = Math.hypot(this.state.player.vx, this.state.player.vy);
    this.state.inputHeld = false;
    this.state.inputTransitions += 1;
    if (this.state.vehicleId) {
      this.state.vehiclePhase = 'released';
      this.state.vehicleVirtualAnchor = null;
    }
    this.state.attachedAnchorId = null;
    this.state.ropeLength = null;
    this.lastReleasedAnchorId = releasedAnchor;
    // A long first-run release can leave the player on the low counter
    // passage with almost no forward swing. Give that authored recovery lane a
    // small upward/forward launch after a few real input transitions so the
    // player can reach the shared route again without an automatic grapple or
    // a change to the normal high-route physics.
    const lowFloorReleaseRecovery = !this.endlessMode
      && this.state.levelIndex === 0
      && this.state.inputTransitions >= 6
      && releasedAnchor === 'node-low'
      && this.state.player.y >= this.state.routeGraph.branches.low.corridor.y
        + this.state.routeGraph.branches.low.corridor.height
        - PLAYER_COLLISION_RADIUS - 60;
    if (lowFloorReleaseRecovery) {
      this.state.player.vx = Math.max(this.state.player.vx, 260);
      this.state.player.vy = Math.min(this.state.player.vy, -260);
    }
    if (this.endlessMode && releasedAnchor) {
      // A deliberate early release should produce a short, readable glide
      // before another hook can be captured.  Rhythm releases made after the
      // swing apex are already beyond this threshold and remain responsive.
      const released = this.state.anchors.find((anchor) => anchor.id === releasedAnchor);
      this.grappleReconnectNotBeforeX = Math.max(
        this.grappleReconnectNotBeforeX,
        (released?.x ?? this.state.player.x) + 72,
      );
    }
    if (releasedAnchor && releasedRopeLength !== null && releasedRopeLength <= 190) {
      this.state.regrappleGraceUntilTick = this.state.tick + REGRAPPLE_GRACE_TICKS;
    }
    if (this.state.segment === 'gate-climax' && this.state.tick < this.gateCollisionRecoveryUntilTick) {
      // After a leaf hit, steer back toward the live opening instead of
      // always launching upward. The old fixed upward impulse could clear the
      // arch, miss the aperture on the next swing, and turn a recoverable
      // tutorial collision into an unrelated fall.
      const aperture = this.state.gate.collisionAperture;
      const targetY = aperture.y + aperture.height / 2;
      const verticalCorrection = Math.max(-420, Math.min(420, (targetY - this.state.player.y) * 3));
      this.state.player.vx = Math.max(this.state.player.vx, 420);
      this.state.player.vy = verticalCorrection;
    }
    if (releasedAnchor && releaseSpeed >= 360) {
      const previousTier = this.state.comboTier;
      this.stylishFlights += 1;
      this.state.combo += 1;
      this.state.comboPeak = Math.max(this.state.comboPeak, this.state.combo);
      this.state.comboTier = Math.min(4, Math.floor(this.state.combo / 2) + 1) as 1 | 2 | 3 | 4;
      this.recordEvent('combo-gain', String(this.state.combo));
      if (this.state.comboTier !== previousTier) this.recordEvent('combo-tier-up', String(this.state.comboTier));
      if (this.stylishFlights >= 2) {
        this.applyPursuitReward('stylish-flight', 0.08);
        this.stylishFlights = 0;
      }
    } else {
      if (this.state.combo > 0) this.recordEvent('combo-break', 'slow-release');
      this.stylishFlights = 0;
      this.state.combo = 0;
      this.state.comboTier = 1;
    }
    return true;
  }

  private beginVehicleHold(): void {
    const vehicle = VEHICLES.find((item) => item.id === this.state.vehicleId);
    if (vehicle?.id === '货运滑索') this.state.vehicleLockY = this.state.player.y;
    else if (vehicle?.id === '灯笼群') this.state.vehicleVirtualAnchor = { x: this.state.player.x, y: this.state.player.y - LANTERN_ROPE };
  }

  private grantVehicleForSegment(segment: number, sky: boolean): void {
    const id = rollVehicleForSegment(this.state.seed, segment, sky);
    if (id) {
      const def = VEHICLES.find((item) => item.id === id);
      this.state.vehicleId = id;
      this.state.vehiclePhase = this.state.inputHeld ? 'holding' : 'idle';
      this.state.vehicleTicksRemaining = Math.max(0, Math.round((def?.durationSeconds ?? 0) / FIXED_STEP));
      this.state.vehicleLockY = 0;
      this.state.vehicleVirtualAnchor = null;
      if (this.state.vehiclePhase === 'holding') this.beginVehicleHold();
    } else {
      this.state.vehicleId = null;
      this.state.vehiclePhase = 'idle';
      this.state.vehicleTicksRemaining = 0;
      this.state.vehicleLockY = 0;
      this.state.vehicleVirtualAnchor = null;
    }
  }

  private expireVehicle(): void {
    this.state.vehicleId = null;
    this.state.vehiclePhase = 'idle';
    this.state.vehicleTicksRemaining = 0;
    this.state.vehicleLockY = 0;
    this.state.vehicleVirtualAnchor = null;
  }

  step(frameSeconds = FIXED_STEP): GrappleState {
    if (this.state.status !== 'playing' || this.state.paused) return this.getState();
    const clamped = Math.max(0, Math.min(frameSeconds, 0.1));
    this.accumulator += clamped;
    while (this.accumulator + 1e-10 >= FIXED_STEP && this.state.status === 'playing') {
      this.fixedTick(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }
    return this.getState();
  }

  private recordEvent(type: FormalEvent['type'], cause?: string): void {
    const event: FormalEvent = {
      sequence: this.nextEventSequence,
      tick: this.state.tick,
      type,
      segment: this.state.segment,
    };
    if (cause !== undefined) event.cause = cause;
    this.nextEventSequence += 1;
    this.events.push(event);
    this.state.eventSequence = event.sequence;
  }

  private setScenarioSegment(segment: SegmentId): void {
    const progress: Record<SegmentId, number> = {
      'safe-tutorial': 0.08,
      'first-pursuit': 0.32,
      'route-alternation': 0.58,
      'gate-climax': 0.84,
      'combo-flight': 0.995,
    };
    this.setScenarioPosition(progress[segment], segment === 'safe-tutorial' ? 555 : 420, 360, -40);
    this.state.segment = segment;
  }

  private setScenarioPosition(progress: number, y: number, vx: number, vy: number): void {
    this.state.progress = progress;
    this.state.player = { x: this.state.finishX * progress, y, vx, vy };
    this.rebasePursuerToCurrentPressure();
    this.refreshDerived(false);
  }

  private rebasePursuerToCurrentPressure(): void {
    const distance = this.chaseDistance(this.state.chase.pressure);
    this.state.pursuer.x = this.state.player.x - distance;
    this.state.pursuer.y = PURSUER_RUN_LANE_Y;
    this.state.pursuer.distance = distance;
  }

  private nearestEligibleAnchor(): Anchor | null {
    const { player } = this.state;
    const baseAttachRadius = Math.min(ATTACH_RADIUS, this.endlessMode
      ? difficultyAtSegment(this.state.segmentIndex).assistAttachRadius
      : this.levelDefinition().assistAttachRadius);
    const fx = this.mutationModifiers();
    const speed = Math.max(0.0001, Math.hypot(player.vx, player.vy));
    const branchAnchorIds = this.state.routeTraversal.phase === 'branch' && this.state.routeTraversal.committedRoute
      ? new Set(this.state.levelIndex === 0
        ? this.state.routeTraversal.committedRoute === 'low'
          ? ['node-low', 'node-7']
          : this.state.routeGraph.branches[this.state.routeTraversal.committedRoute].anchorIds
        : this.state.routeTraversal.committedRoute === 'high' ? this.state.routeGraph.branches.high.anchorIds : ['node-low', 'node-7'])
      : null;
    // A first-time player can settle on the bottom of the authored low
    // corridor after a long release. While the visible grapple action is
    // still held, let that bounded recovery lane capture its forward low
    // anchor even though the anchor is above the falling body. This is a
    // recovery affordance for the existing route, not an automatic grapple:
    // it only applies in the campaign's low branch, inside the corridor, and
    // while the player is actively holding the grapple input.
    const lowCorridor = this.state.routeGraph.branches.low.corridor;
    const lowBranchRecovery = !this.endlessMode
      && this.state.levelIndex === 0
      && this.state.routeTraversal.committedRoute === 'low'
      && (
        (this.state.routeTraversal.phase === 'branch'
          && player.y >= lowCorridor.y + lowCorridor.height - PLAYER_COLLISION_RADIUS - 60)
        || (this.state.routeTraversal.phase === 'split'
          && player.vx < -80
          && player.y >= lowCorridor.y + 40)
      );
    // Near the tutorial gate, a player who is still holding the visible
    // grapple input may be below the final upper anchor after a late release.
    // Treat that anchor as a bounded falling rescue so one missed swing can be
    // recovered without granting a passage or changing the gate contract.
    const tutorialGateRecoveryWindow = !this.endlessMode
      && this.state.levelIndex === 0
      && this.state.inputTransitions > 0
      && this.state.activeChaseEvent === 'closing-gate'
      && player.x >= this.state.gate.x - 520
      && player.x < this.state.gate.x
      && player.y >= 220
      && player.y <= this.state.failY - PLAYER_COLLISION_RADIUS
      && (player.y < this.state.gate.collisionAperture.y
        || player.y > this.state.gate.collisionAperture.y + this.state.gate.collisionAperture.height);
    // If a browser delivers a long hold/release window while the player is
    // still approaching the fork, the body can lose forward swing and keep
    // recapturing the same nearby ring. Let an active tutorial input recover
    // the next forward ring inside the authored approach envelope. The
    // normal branch filter, forward-only bounds, and tutorial-only guard keep
    // this from changing high/low route physics or endless play.
    const tutorialApproachRecovery = !this.endlessMode
      && this.state.levelIndex === 0
      && this.state.inputTransitions >= 4
      && (this.state.routeTraversal.phase === 'approach' || this.state.routeTraversal.phase === 'split')
      && player.x < this.state.routeGraph.split.x + this.state.routeGraph.split.width
      && (player.vx < 140 || speed < 220 || player.y > 600);
    let selected: { anchor: Anchor; score: number } | null = null;
    for (const anchor of this.state.anchors) {
      if (!branchAnchorIds && anchor.id === 'node-low' && !lowBranchRecovery) continue;
      const regrappleGrace = this.state.tick > 0 && this.state.tick < this.state.regrappleGraceUntilTick;
      const dx = anchor.x - player.x;
      const dy = anchor.y - player.y;
      const distance = Math.hypot(dx, dy);
      // 起雾：普通锚点挂接半径×0.85；高空路线（天空段）锚点保持全额半径（fog+high-route）
      const isHighAnchor = segmentForIndex(segmentIndexAtX(anchor.x)).isSky;
      const attachRadius = baseAttachRadius * (fx.attachRadiusFactorLow < 1 && !isHighAnchor ? fx.attachRadiusFactorLow : 1);
      if (distance > attachRadius || distance < 0.0001) continue;
      const rescueEligible = player.vy > 120
        && (dy > 0 || (this.endlessMode && player.y > 780 && dy < 0));
      const lowFloorRecoveryEligible = lowBranchRecovery
        && anchor.id === 'node-low'
        && dx >= -220
        && dx <= 180;
      const gateRecoveryEligible = tutorialGateRecoveryWindow
        && anchor.id === 'node-8'
        && dx >= -300
        && dx <= 260;
      const tutorialApproachEligible = tutorialApproachRecovery
        && anchor.id !== this.lastReleasedAnchorId
        && dx >= 60
        && dx <= 560;
      const recoveryEligible = lowFloorRecoveryEligible || gateRecoveryEligible || tutorialApproachEligible;
      if (this.endlessMode && !rescueEligible && !regrappleGrace && player.x < this.grappleReconnectNotBeforeX) continue;
      if (branchAnchorIds && !branchAnchorIds.has(anchor.id) && !rescueEligible && !recoveryEligible) continue;
      const alignment = (dx * player.vx + dy * player.vy) / (distance * speed);
      if (alignment < (regrappleGrace ? -0.55 : -0.15) && !rescueEligible && !recoveryEligible) continue;
      const angle = Math.acos(Math.max(-1, Math.min(1, alignment)));
      if (this.state.route === 'high' && angle > 1.28 && !rescueEligible && !recoveryEligible) continue;
      // Normal traversal follows the player's launch direction, not the nearest
      // ring. This prevents a low, close ring from stealing a deliberate upward
      // rightward transfer; rescue drops still use the forgiving distance bias.
      const distanceWeight = rescueEligible || recoveryEligible ? 0.75 : 0.45;
      const directionWeight = 1 - distanceWeight;
      const sameAnchorPenalty = anchor.id === this.lastReleasedAnchorId ? 0.18 : 0;
      const recoveryPriority = recoveryEligible ? -1 : 0;
      const score = recoveryPriority + distanceWeight * (distance / attachRadius) + directionWeight * (angle / Math.PI) + sameAnchorPenalty;
      if (!selected || score < selected.score - 1e-9 || (Math.abs(score - selected.score) <= 1e-9 && anchor.x > selected.anchor.x)) {
        selected = { anchor, score };
      }
    }
    return selected?.anchor ?? null;
  }

  private tryAttach(): boolean {
    if (this.state.attachedAnchorId !== null) return true;
    const anchor = this.nearestEligibleAnchor();
    if (!anchor) return false;
    this.state.attachedAnchorId = anchor.id;
    this.lastReleasedAnchorId = null;
    this.state.regrappleGraceUntilTick = 0;
    const captureDistance = Math.hypot(anchor.x - this.state.player.x, anchor.y - this.state.player.y);
    // A distant assisted capture reels to a bounded, playable length instead of
    // leaving the player hanging from a rope whose swing cannot build momentum.
    this.state.ropeLength = Math.min(captureDistance, MAX_PLAYABLE_ROPE_LENGTH);
    if (this.state.elapsed > 0.15 && anchor.x - this.state.player.x > 100) {
      this.applyPursuitReward('stylish-flight', 0.045);
    }
    return true;
  }

  private chaseDistance(pressure: number): number {
    return MAX_CHASE_DISTANCE - pressure * (MAX_CHASE_DISTANCE - MIN_CHASE_DISTANCE);
  }

  private applyPursuitPenalty(cause: PursuitPenaltyCause, amount: number): void {
    this.pursuitIntentOffset = Math.max(this.pursuitIntentOffset, 110 + amount * 320);
    this.pursuitIntentTicks = Math.max(this.pursuitIntentTicks, 54);
    this.recordEvent('pursuit-penalty', cause);
  }

  private applyPursuitReward(cause: PursuitRewardCause, amount: number): void {
    this.pursuitIntentOffset = Math.min(this.pursuitIntentOffset, -130 - amount * 240);
    this.pursuitIntentTicks = Math.max(this.pursuitIntentTicks, 72);
    this.recordEvent('pursuit-reward', cause);
  }

  private refreshChaseDerived(): void {
    const chase = this.state.chase;
    const actualDistance = Math.max(0, this.state.player.x - this.state.pursuer.x);
    chase.distance = actualDistance;
    chase.pressure = clamp01((MAX_CHASE_DISTANCE - actualDistance) / (MAX_CHASE_DISTANCE - MIN_CHASE_DISTANCE));
    // 封灯：坊门预警距离/提前量 -20%（门更晚被发现）。仅在封灯变异且正处 closing-gate 时收紧告警距离阈值。
    const warn = (this.state.mutation === '封灯' && this.state.activeChaseEvent === 'closing-gate') ? 0.8 : 1;
    chase.phase = actualDistance < 360 * warn
      ? 'climax'
      : actualDistance <= 180 * warn
        ? 'danger'
        : actualDistance <= 340 * warn
          ? 'alert'
          : 'safe';
    this.state.pursuer.distance = actualDistance;
    this.state.pursuer.y = this.state.pursuer.runLaneY + Math.sin(this.state.tick * 0.22) * 4;
  }

  /**
   * 当前变异的机制系数（仅数值，无视觉改动）。所有系数默认 1（无变异时零影响）。
   * - 起雾：普通锚点挂接半径 ×0.85（高空路线锚点保持全额，见 nearestEligibleAnchor）
   * - 下雨：摆荡驱动力 ×0.92、重力 ×1.05
   * - 封灯：关门 tick ×(1/1.1)≈快 10%、坊门预警距离 ×0.8（见 refreshChaseDerived）
   * - 宵禁加派：追兵净逼近 +25%（见 updateChase）
   * 供玩法逻辑点消费，亦用于测试断言。
   */
  mutationModifiers(): {
    attachRadiusFactorLow: number; swingDriveFactor: number; gravityFactor: number;
    gateCloseTicksFactor: number; pursuitSpeedFactor: number;
  } {
    const m = this.state.mutation;
    return {
      attachRadiusFactorLow: m === '起雾' ? 0.85 : 1,
      swingDriveFactor: m === '下雨' ? 0.92 : 1,
      gravityFactor: m === '下雨' ? 1.05 : 1,
      gateCloseTicksFactor: m === '封灯' ? 1 / 1.1 : 1,
      pursuitSpeedFactor: m === '宵禁加派' ? 1.25 : 1,
    };
  }

  /** 变异生效后的实际关门 tick 数：封灯使关门快约 10%。其余变异/普通关卡不变。 */
  private effectiveGateCloseTicks(): number {
    return this.levelDefinition().gateCloseTicks * this.mutationModifiers().gateCloseTicksFactor;
  }

  private segmentForProgress(progress: number): SegmentId {
    if (progress < 0.24) return 'safe-tutorial';
    if (progress < 0.49) return 'first-pursuit';
    if (progress < 0.79) return 'route-alternation';
    if (progress < 0.99) return 'gate-climax';
    return 'combo-flight';
  }

  private makeTerrain(kind: TerrainKind, lesson: ActiveTerrain['lesson']): ActiveTerrain {
    const definition = FORMAL_MANIFEST.terrain.find((terrain) => terrain.kind === kind)!;
    const placement = lesson === 'safe-teaching' ? definition.placements.safe : definition.placements.chase;
    if (kind === '竹架') this.bambooLoadTicks = 0;
    return {
      kind,
      category: kind === '竹架' ? 'obstacle' : kind === '窄巷' ? 'passage' : 'canopy',
      collision: kind === '竹架' ? 'solid' : 'none',
      lesson,
      behavior: definition.behavior,
      behaviorState: 'ready',
      bounds: cloneBounds(placement),
      visual: { ...definition.visual, layers: [...definition.visual.layers] },
      impactCount: 0,
      impactCooldownUntilTick: 0,
      pursuerSlowUntilTick: 0,
      collapseAtTick: null,
      debrisBounds: null,
    };
  }

  private makeSceneObjects(): ActiveTerrain[] {
    return (['布棚', '竹架', '窄巷'] as const).map((kind) => this.makeTerrain(kind, 'safe-teaching'));
  }

  private terrainForProgress(progress: number): ActiveTerrain | null {
    const current = this.state.activeTerrain;
    if (current && this.state.levelIndex === 0 && current.lesson === 'safe-teaching'
      && this.state.player.x >= current.bounds.x - 24
      && this.state.player.x <= current.bounds.x + current.bounds.width + 24) return current;
    const schedules: Array<{ start: number; end: number; kind: TerrainKind; lesson: ActiveTerrain['lesson'] }> = this.state.levelIndex === 0
      ? [
        { start: 0.10, end: 0.16, kind: '布棚', lesson: 'safe-teaching' },
        { start: 0.24, end: 0.34, kind: '竹架', lesson: 'safe-teaching' },
        { start: 0.40, end: 0.49, kind: '窄巷', lesson: 'safe-teaching' },
        { start: 0.52, end: 0.60, kind: '布棚', lesson: 'chase-test' },
        { start: 0.58, end: 0.69, kind: '窄巷', lesson: 'chase-test' },
        { start: 0.78, end: 0.86, kind: '竹架', lesson: 'chase-test' },
      ]
      : [
        { start: 0, end: 0.08, kind: '布棚', lesson: 'safe-teaching' },
        { start: 0.08, end: 0.16, kind: '竹架', lesson: 'safe-teaching' },
        { start: 0.16, end: 0.24, kind: '窄巷', lesson: 'safe-teaching' },
        { start: 0.28, end: 0.36, kind: '布棚', lesson: 'chase-test' },
        { start: 0.40, end: 0.49, kind: '竹架', lesson: 'chase-test' },
        { start: 0.58, end: 0.69, kind: '窄巷', lesson: 'chase-test' },
      ];
    const active = schedules.find(({ start, end }) => progress >= start && progress < end);
    if (!active) return this.state.activeTerrain;
    const matchedTerrain = this.state.sceneObjects.find((item) => item.kind === active.kind);
    if (!matchedTerrain) return this.state.activeTerrain;
    matchedTerrain.lesson = active.lesson;
    const definition = FORMAL_MANIFEST.terrain.find((terrain) => terrain.kind === active.kind)!;
    matchedTerrain.bounds = cloneBounds(active.lesson === 'safe-teaching' ? definition.placements.safe : definition.placements.chase);
    return matchedTerrain;
  }

  private refreshRouteTraversal(): void {
    const graph = this.state.routeGraph;
    const x = this.state.player.x;
    const traversal = this.state.routeTraversal;
    if (x < graph.split.x) {
      traversal.phase = 'approach';
      traversal.committedRoute = null;
      return;
    }
    if (x < graph.split.x + graph.split.width) {
      traversal.phase = 'split';
      return;
    }
    if (x < graph.rejoin.x) {
      traversal.phase = 'branch';
      const intersects = (bounds: WorldBounds): boolean => this.state.player.x + PLAYER_COLLISION_RADIUS >= bounds.x
        && this.state.player.x - PLAYER_COLLISION_RADIUS <= bounds.x + bounds.width
        && this.state.player.y + PLAYER_COLLISION_RADIUS >= bounds.y
        && this.state.player.y - PLAYER_COLLISION_RADIUS <= bounds.y + bounds.height;
      const inHigh = intersects(graph.branches.high.corridor);
      const inLow = intersects(graph.branches.low.corridor);
      if (traversal.committedRoute === null) {
        if (inHigh && !inLow) traversal.committedRoute = 'high';
        else if (inLow && !inHigh) traversal.committedRoute = 'low';
      } else if (traversal.committedRoute === 'high' && !inHigh) {
        // Commitment follows the corridor the body is actually occupying.
        // Previously a high label persisted after a fall into the low lane,
        // which made the pursuit HUD and roof-net branch lie about the route.
        traversal.committedRoute = inLow ? 'low' : null;
      }
      return;
    }
    if (x < graph.rejoin.x + graph.rejoin.width) {
      traversal.phase = 'rejoin';
      traversal.committedRoute = null;
      return;
    }
    traversal.phase = 'complete';
    traversal.committedRoute = null;
  }

  private refreshObstacle(): void {
    const prewarningKind = this.state.progress >= 0.22 && this.state.progress < 0.28
      ? 'barricade'
      : this.state.progress >= 0.48 && this.state.progress < 0.54
        ? 'roof-net'
        : null;
    const desiredKind = this.state.activeChaseEvent === 'barricade'
      ? 'barricade'
      : this.state.activeChaseEvent === 'roof-net'
        ? 'roof-net'
        : prewarningKind;
    const resolvedPhases: ChaseObstacleState['phase'][] = ['impact', 'caught', 'missed', 'passed'];
    if (desiredKind && this.state.chaseObstacle?.kind !== desiredKind) {
      const structure = OBSTACLE_STRUCTURES[desiredKind];
      const bounds = cloneBounds(OBSTACLE_BOUNDS[desiredKind]);
      bounds.x = this.endlessMode
        ? this.state.player.x + (desiredKind === 'roof-net' ? 700 : 500)
        : this.state.finishX * (desiredKind === 'roof-net' ? 0.66 : 0.35);
      if (desiredKind === 'roof-net') bounds.x -= bounds.width / 2;
      const anchorBounds = cloneBounds(structure.anchorBounds);
      const source: { x: number; y: number } = { ...structure.source };
      if (desiredKind === 'roof-net') {
        if (!this.endlessMode) anchorBounds.x += this.state.finishX - FINISH_X;
        source.x = bounds.x + bounds.width / 2;
      } else {
        anchorBounds.x = bounds.x - 64;
        anchorBounds.width = bounds.width + 128;
        source.x = bounds.x + bounds.width / 2;
      }
      this.state.chaseObstacle = {
        kind: desiredKind,
        expression: structure.expression,
        anchoredTo: structure.anchoredTo,
        anchorBounds,
        bounds,
        occupiedBounds: desiredKind === 'barricade'
          ? { x: bounds.x, y: bounds.y, width: bounds.width, height: 0 }
          : { x: source.x, y: source.y, width: 0, height: 0 },
        source,
        phase: desiredKind === 'barricade' ? 'warning' : 'raise',
        animationProgress: 0,
        collisionActive: false,
        startedTick: this.state.tick,
        predictedTarget: desiredKind === 'roof-net'
          ? { x: source.x, y: Math.max(280, Math.min(585, this.state.player.y + this.state.player.vy * 0.42)) }
          : { x: source.x, y: source.y },
      };
    }
    const obstacle = this.state.chaseObstacle;
    if (!obstacle) return;
    const progress = clamp01((this.state.tick - obstacle.startedTick) / 36);
    if (obstacle.kind === 'barricade') {
      obstacle.animationProgress = progress;
      obstacle.occupiedBounds = {
        x: obstacle.bounds.x,
        y: obstacle.bounds.y,
        width: obstacle.bounds.width,
        height: obstacle.bounds.height * progress,
      };
      if (obstacle.phase === 'impact' || obstacle.phase === 'passed') return;
    } else if (resolvedPhases.includes(obstacle.phase)) {
      return;
    }
    obstacle.animationProgress = progress;
    if (obstacle.kind === 'barricade') {
      obstacle.phase = progress < 0.2 ? 'warning' : progress < 0.65 ? 'entering' : 'active';
      obstacle.collisionActive = progress >= 0.2;
    } else {
      obstacle.phase = progress < 0.12 ? 'raise'
        : progress < 0.25 ? 'aim'
          : progress < 0.36 ? 'release'
            : progress < 0.72 ? 'travel'
              : progress < 0.88 ? 'land' : 'active';
      obstacle.collisionActive = progress >= 0.36;
      const unfurl = Math.min(1, Math.max(0, (progress - 0.3) / 0.58));
      obstacle.occupiedBounds = {
        x: obstacle.predictedTarget.x - obstacle.bounds.width * unfurl / 2,
        y: obstacle.source.y + (obstacle.predictedTarget.y - obstacle.source.y) * unfurl - obstacle.bounds.height * unfurl / 2,
        width: obstacle.bounds.width * unfurl,
        height: obstacle.bounds.height * unfurl,
      };
      if (progress >= 1 && this.state.player.x >= obstacle.bounds.x && this.state.inputTransitions <= 1
        && !resolvedPhases.includes(obstacle.phase)) {
        obstacle.phase = 'missed';
        obstacle.collisionActive = false;
      }
    }
    if (this.state.player.x > obstacle.bounds.x + obstacle.bounds.width) {
      obstacle.phase = obstacle.kind === 'roof-net' ? 'missed' : 'passed';
      obstacle.collisionActive = false;
    }
  }

  private refreshDerived(recordTransitions: boolean): void {
    const previousSegment = this.state.segment;
    const previousRoute = this.state.route;
    const previousBeat = this.state.closingGateBeat;
    this.state.segment = this.endlessMode
      ? (segmentForIndex(this.state.segmentIndex).isGate ? 'gate-climax' : segmentForIndex(this.state.segmentIndex).type === 'terrain' ? 'first-pursuit' : segmentForIndex(this.state.segmentIndex).type === 'fork' ? 'route-alternation' : 'safe-tutorial')
      : (this.state.activeChaseEvent === 'closing-gate' ? 'gate-climax' : this.segmentForProgress(this.state.progress));
    this.refreshRouteTraversal();
    this.state.route = this.state.routeTraversal.phase === 'branch' && this.state.routeTraversal.committedRoute
      ? this.state.routeTraversal.committedRoute
      : this.state.player.y <= 445 ? 'high' : 'low';
    this.state.routeProfile = cloneRoute(ROUTES[this.state.route]);
    this.state.routeProfile.speedMultiplier *= this.levelDefinition().playerSpeedMultiplier;
    this.state.playerMotion = {
      ...this.state.player,
      speed: Math.hypot(this.state.player.vx, this.state.player.vy),
      airborne: this.state.player.y < FAIL_Y,
      grappleWindowRisk: this.state.route === 'high' ? 'short' : 'forgiving',
    };
    this.state.activeTerrain = this.terrainForProgress(this.state.progress);
    this.state.activeChaseEvent = this.endlessMode
      ? segmentForIndex(this.state.segmentIndex).isGate ? 'closing-gate' : segmentForIndex(this.state.segmentIndex).type === 'obstacle' ? 'roof-net' : null
      : this.state.progress >= 0.79
      ? 'closing-gate'
      : this.state.progress >= 0.54 && this.state.progress < 0.69
        ? 'roof-net'
        : this.state.progress >= 0.28 && this.state.progress < 0.40
          ? 'barricade'
          : null;
    if (this.state.activeChaseEvent === 'closing-gate' && this.gateClimaxStartedTick === null) {
      this.gateClimaxStartedTick = this.state.tick;
    } else if (this.state.activeChaseEvent !== 'closing-gate') {
      this.gateClimaxStartedTick = null;
    }
    const gateProgress = this.gateClimaxStartedTick === null
      ? 0
      : clamp01((this.state.tick - this.gateClimaxStartedTick) / this.effectiveGateCloseTicks());
    this.state.closingGateBeat = this.state.activeChaseEvent === 'closing-gate'
      ? gateProgress < 1 / 3 ? 1 : gateProgress < 2 / 3 ? 2 : 3
      : null;
    if (previousBeat !== this.state.closingGateBeat) {
      this.gateBeatThreeStartedTick = this.state.closingGateBeat === 3
        ? (this.gateClimaxStartedTick ?? this.state.tick) + Math.ceil(this.effectiveGateCloseTicks() * 2 / 3)
        : null;
    }
    const checkpointBase = this.endlessMode
      ? gateCheckpointXForSegment(this.state.segmentIndex)
      : this.state.finishX;
    this.state.gate = makeGateState(this.state.closingGateBeat, gateProgress, checkpointBase);
    this.refreshObstacle();
    this.refreshChaseDerived();
    if (!recordTransitions) return;
    if (previousSegment !== this.state.segment) this.recordEvent('segment-entered', this.state.segment);
    if (previousRoute !== this.state.route) this.recordEvent('route-changed', this.state.route);
    if (previousBeat !== this.state.closingGateBeat && this.state.closingGateBeat !== null) this.recordEvent('gate-beat', String(this.state.closingGateBeat));
  }

  private updateTerrain(dt: number, previousPlayer: PlayerState): void {
    const player = this.state.player;
    for (const obstacle of this.state.sceneObjects.filter((item) => item.category === 'obstacle')) {
      const touching = player.x + PLAYER_COLLISION_RADIUS >= obstacle.bounds.x
        && player.x - PLAYER_COLLISION_RADIUS <= obstacle.bounds.x + obstacle.bounds.width
        && player.y + PLAYER_COLLISION_RADIUS >= obstacle.bounds.y
        && player.y - PLAYER_COLLISION_RADIUS <= obstacle.bounds.y + obstacle.bounds.height;
      // A rope-bound player may pass through the upper part of a frame while
      // swinging; only a descending contact counts as a kick in that case.
      // Unattached contact remains immediately kickable for low-route play.
      const kickable = this.state.attachedAnchorId === null || player.vy > 90;
      if (touching && kickable && this.state.tick >= obstacle.impactCooldownUntilTick && obstacle.behaviorState !== 'broken') {
        obstacle.impactCount += 1;
        obstacle.impactCooldownUntilTick = this.state.tick + 18;
        obstacle.pursuerSlowUntilTick = this.state.tick + 180;
        obstacle.collapseAtTick = this.state.tick + 6;
        if (this.state.attachedAnchorId === null) {
          player.vx *= 0.58;
          player.vy = Math.min(player.vy, -180);
        } else {
          // A descending rope swing can brush the frame without snapping the
          // rope; preserve the swing while still recording a light impact.
          player.vx *= 0.92;
        }
        obstacle.behaviorState = 'strained';
      }
      if (obstacle.behaviorState === 'strained' && obstacle.collapseAtTick !== null && this.state.tick >= obstacle.collapseAtTick) {
        obstacle.behaviorState = 'broken';
        obstacle.collision = 'none';
        obstacle.debrisBounds = {
          x: obstacle.bounds.x - 12,
          y: obstacle.bounds.y + obstacle.bounds.height * 0.58,
          width: obstacle.bounds.width + 24,
          height: Math.max(24, obstacle.bounds.height * 0.28),
        };
      }
      if (obstacle.behaviorState === 'strained') {
        const drag = this.state.attachedAnchorId === null ? 0.12 : 0.015;
        player.vx *= Math.max(0, 1 - drag * dt);
      }
    }
    const terrain = this.state.activeTerrain;
    if (!terrain) return;
    if (terrain.kind === '布棚' && !CANOPY_BOUNCE_ENABLED) {
      terrain.behaviorState = 'ready';
      terrain.collision = 'none';
      return;
    }
    const touching = player.x + PLAYER_COLLISION_RADIUS >= terrain.bounds.x
      && player.x - PLAYER_COLLISION_RADIUS <= terrain.bounds.x + terrain.bounds.width
      && player.y + PLAYER_COLLISION_RADIUS >= terrain.bounds.y
      && player.y - PLAYER_COLLISION_RADIUS <= terrain.bounds.y + terrain.bounds.height;
    const sweptCanopyContact = terrain.kind === '布棚'
      && this.state.attachedAnchorId === null
      && previousPlayer.vy > 0
      && player.vy > 0
      && Math.max(previousPlayer.x, player.x) + PLAYER_COLLISION_RADIUS >= terrain.bounds.x
      && Math.min(previousPlayer.x, player.x) - PLAYER_COLLISION_RADIUS <= terrain.bounds.x + terrain.bounds.width
      && previousPlayer.y + PLAYER_COLLISION_RADIUS <= terrain.bounds.y + 18
      && player.y + PLAYER_COLLISION_RADIUS >= terrain.bounds.y;
    if (!touching && !sweptCanopyContact) {
      if (terrain.kind !== '竹架' || terrain.behaviorState !== 'broken') terrain.behaviorState = 'ready';
      return;
    }
    const descendingOntoCanopy = sweptCanopyContact || (touching && previousPlayer.y + PLAYER_COLLISION_RADIUS <= terrain.bounds.y + 24 && player.y + PLAYER_COLLISION_RADIUS >= terrain.bounds.y);
    if (terrain.kind === '布棚' && descendingOntoCanopy && this.state.player.vy > 0 && this.state.attachedAnchorId === null
      && this.state.tick > (terrain.impactCooldownUntilTick ?? 0)) {
      // A falling player is caught by the taut fabric and launched upward.
      // Keep forward momentum so the bounce can bridge a gap to the next node.
      this.state.player.vy = -Math.max(360, Math.min(560, this.state.player.vy * 1.65));
      this.state.player.vx = Math.min(MAX_SPEED, this.state.player.vx * 1.04);
      terrain.behaviorState = 'sliding';
      terrain.impactCooldownUntilTick = this.state.tick + 30;
      this.state.bounceCount += 1;
      this.state.lastBounceTick = this.state.tick;
    }
    if (terrain.kind === '窄巷' && this.state.route === 'low') {
      terrain.behaviorState = 'concealed';
      this.state.chase.pressure -= 0.055 * dt;
      if (terrain.lesson === 'chase-test' && !this.shortcutRewarded) {
        this.shortcutRewarded = true;
        this.applyPursuitReward('shortcut', 0.075);
      }
    }
  }

  private resolveAuthoredRouteSurface(): void {
    if (this.state.routeTraversal.phase !== 'branch' || this.state.routeTraversal.committedRoute !== 'low') return;
    if (this.state.attachedAnchorId !== null) return;
    const corridor = this.state.routeGraph.branches.low.corridor;
    const counterPassageY = corridor.y + corridor.height - PLAYER_COLLISION_RADIUS;
    if (this.state.player.y <= counterPassageY || this.state.player.y > counterPassageY + 80) return;
    this.state.player.y = counterPassageY;
    if (this.state.player.vy > 0) this.state.player.vy = -Math.min(85, this.state.player.vy * 0.12);
  }

  private updateChase(dt: number): void {
    const { player, pursuer } = this.state;
    if (this.state.firecrackerStunUntilTick > this.state.tick) {
      pursuer.ax = 0;
      pursuer.vx = 0;
      this.refreshChaseDerived();
      return;
    }
    const routeDistanceIntent = this.state.segment === 'route-alternation'
      ? (this.state.routeProfile.pursuitDistanceEffect - 24) * 0.45
      : 0;
    const debrisSlow = this.state.sceneObjects.some((item) => item.debrisBounds && item.pursuerSlowUntilTick > this.state.tick) ? 150 : 0;
    const contactDistance = Math.max(0, this.levelDefinition().pursuitContactDistance);
    const currentTargetX = player.x + Math.max(-180, Math.min(220, player.vx * PURSUER_TARGET_LOOKAHEAD_SECONDS));
    const targetGap = currentTargetX - pursuer.x - contactDistance;
    const targetSpeed = Math.max(0, Math.min(PURSUER_MAX_SPEED,
      (targetGap / PURSUER_TARGET_RESPONSE_SECONDS
        + this.pursuitIntentOffset - routeDistanceIntent - debrisSlow)
        * this.mutationModifiers().pursuitSpeedFactor)); // 宵禁加派：追兵净逼近 +25%
    // Debris is a real temporary obstruction for the guard, not just a lower
    // desired speed. Prevent its inertia from masking the slowdown when the
    // player crosses into a later authored segment in the same tick.
    const debrisLimitedTarget = debrisSlow > 0 ? Math.min(targetSpeed, Math.max(0, pursuer.vx - 1)) : targetSpeed;
    pursuer.ax = Math.max(-PURSUER_MAX_ACCELERATION, Math.min(PURSUER_MAX_ACCELERATION, (debrisLimitedTarget - pursuer.vx) * 8));
    pursuer.vx = Math.max(0, Math.min(PURSUER_MAX_SPEED, pursuer.vx + pursuer.ax * dt));
    const maxAdvance = Math.max(0, player.x - pursuer.x - contactDistance);
    // 青鸾 catchImmune：冻结追兵推进，距离不减即可
    const vehicleCatchImmune = !!this.state.vehicleId
      && this.state.vehicleTicksRemaining > 0
      && VEHICLES.find((item) => item.id === this.state.vehicleId)?.catchImmune === true;
    const advance = vehicleCatchImmune ? 0 : Math.min(pursuer.vx * dt, maxAdvance);
    if (advance < pursuer.vx * dt && dt > 0) {
      const limitedVelocity = advance / dt;
      pursuer.ax = (limitedVelocity - (pursuer.vx - pursuer.ax * dt)) / dt;
      pursuer.vx = limitedVelocity;
    }
    pursuer.x += advance;
    if (this.pursuitIntentTicks > 0) {
      this.pursuitIntentTicks -= 1;
      if (this.pursuitIntentTicks === 0) this.pursuitIntentOffset = 0;
    }

    const stalled = this.state.attachedAnchorId === null && (Math.hypot(player.vx, player.vy) < 150 || player.vy > 410);
    this.stalledTicks = stalled ? this.stalledTicks + 1 : 0;
    // 载具挂接期间不触发停滞惩罚
    if (this.stalledTicks >= 120 && !this.state.vehicleId) {
      this.stalledTicks = 0;
      this.applyPursuitPenalty('stalled-airtime', 0.025);
    }
    this.refreshChaseDerived();
  }

  private updateChaseEvents(previousPlayer: PlayerState): void {
    const obstacle = this.state.chaseObstacle;
    const occupied = obstacle?.occupiedBounds;
    const inObstacle = obstacle
      && occupied
      && occupied.width > 0
      && occupied.height > 0
      && this.state.player.x >= occupied.x - 18
      && this.state.player.x <= occupied.x + occupied.width + 18
      && this.state.player.y >= occupied.y - 18
      && this.state.player.y <= occupied.y + occupied.height + 18;
    if (obstacle?.kind === 'barricade' && obstacle.collisionActive && inObstacle && this.state.route === 'low'
      && !this.encountered.has('barricade-collision')) {
      this.encountered.add('barricade-collision');
      this.state.player.vx *= 0.55;
      this.state.player.vy = Math.min(this.state.player.vy, -240);
      obstacle.phase = 'impact';
      obstacle.collisionActive = false;
      this.applyPursuitPenalty('collision', 0.11);
    }
    if (obstacle?.kind === 'roof-net' && obstacle.collisionActive && inObstacle && this.state.player.x >= obstacle.bounds.x + 24
      && this.state.route === 'high' && this.state.inputHeld
      && !this.encountered.has('roof-net-collision')) {
      this.encountered.add('roof-net-collision');
      this.state.inputHeld = false;
      this.state.attachedAnchorId = null;
      this.state.ropeLength = null;
      this.state.player.vy += 120;
      obstacle.phase = 'caught';
      obstacle.collisionActive = false;
      this.applyPursuitPenalty('collision', 0.095);
    }
    if (obstacle && this.state.player.x > obstacle.bounds.x + obstacle.bounds.width
      && !['impact', 'caught', 'missed', 'passed'].includes(obstacle.phase)) {
      obstacle.phase = obstacle.kind === 'roof-net' ? 'missed' : 'passed';
      obstacle.collisionActive = false;
    }
    if (this.state.activeChaseEvent !== 'closing-gate') return;
    const gate = this.state.gate;
    const player = this.state.player;
    const aperture = gate.collisionAperture;
    // High-route arrivals need a readable downward funnel into the final aperture;
    // otherwise a release above the gate can hover indefinitely outside its bounds.
    if (this.state.closingGateBeat === 3 && player.x >= gate.x - 220 && player.x < gate.x
      && player.y < aperture.y && player.vy < 360) player.vy += 28;
    const insideLiveAperture = player.x - PLAYER_COLLISION_RADIUS >= aperture.x
      && player.x + PLAYER_COLLISION_RADIUS <= aperture.x + aperture.width
      && player.y - PLAYER_COLLISION_RADIUS >= aperture.y
      && player.y + PLAYER_COLLISION_RADIUS <= aperture.y + aperture.height;
    // A gate passage is only valid after the full player body is inside the
    // live opening. Horizontal progress alone must never award a win.
    if (this.state.closingGateBeat === 3 && insideLiveAperture) this.gateApertureCrossed = true;
    if (insideLiveAperture || this.gateApertureCrossed) return;
    if (this.state.tick < this.gateCollisionRecoveryUntilTick) return;

    const overlaps = (bounds: WorldBounds): boolean => player.x + PLAYER_COLLISION_RADIUS >= bounds.x
      && player.x - PLAYER_COLLISION_RADIUS <= bounds.x + bounds.width
      && player.y + PLAYER_COLLISION_RADIUS >= bounds.y
      && player.y - PLAYER_COLLISION_RADIUS <= bounds.y + bounds.height;
    const sweptInto = (bounds: WorldBounds): boolean => player.x + PLAYER_COLLISION_RADIUS >= bounds.x
      && player.x - PLAYER_COLLISION_RADIUS <= bounds.x + bounds.width
      && ((previousPlayer.y + PLAYER_COLLISION_RADIUS <= bounds.y && player.y + PLAYER_COLLISION_RADIUS >= bounds.y)
        || (previousPlayer.y - PLAYER_COLLISION_RADIUS >= bounds.y + bounds.height
          && player.y - PLAYER_COLLISION_RADIUS <= bounds.y + bounds.height));
    const collidedLeaf = [gate.topLeafBounds, gate.bottomLeafBounds]
      .find((bounds) => overlaps(bounds) || sweptInto(bounds));
    if (!collidedLeaf) return;
    const hitTop = collidedLeaf === gate.topLeafBounds;
    if (hitTop && this.state.closingGateBeat === 3 && player.y < gate.collisionAperture.y) return;
    player.y = hitTop
      ? gate.topLeafBounds.y + gate.topLeafBounds.height + PLAYER_COLLISION_RADIUS
      : gate.bottomLeafBounds.y - PLAYER_COLLISION_RADIUS;
    player.vy = hitTop ? Math.max(120, Math.abs(player.vy) * 0.28) : -Math.max(120, Math.abs(player.vy) * 0.28);
    player.vx = Math.max(90, Math.abs(player.vx) * 0.55);
    // A fast fixed-step swing can overlap a leaf and advance past the live
    // opening in the same render frame. Keep the body on the approach side so
    // the recovery window can visibly re-enter the aperture instead of
    // tunnelling through the arch and falling beyond the course.
    player.x = Math.min(player.x, aperture.x - PLAYER_COLLISION_RADIUS - 1);
    player.vx = Math.min(player.vx, 260);
    this.lastReleasedAnchorId = this.state.attachedAnchorId;
    this.state.attachedAnchorId = null;
    this.state.ropeLength = null;
    player.vy = Math.min(player.vy - 70, -620);
    if (!this.encountered.has('closing-gate-collision')) {
      this.encountered.add('closing-gate-collision');
      this.recordEvent('closing-gate-collision', hitTop ? 'top-leaf' : 'bottom-leaf');
      this.applyPursuitPenalty('collision', 0.14);
      // The leaf knocks the runner backward, so briefly slow the patrol rather than
      // converting one readable mistake into an unavoidable same-beat capture.
      this.pursuitIntentOffset = Math.min(this.pursuitIntentOffset, -600);
      this.pursuitIntentTicks = Math.max(this.pursuitIntentTicks, 180);
      this.gateCollisionRecoveryUntilTick = this.state.tick + 90;
    }
  }

  private fixedTick(dt: number): void {
    const { player } = this.state;
    const previousPlayer = { ...player };
    this.state.elapsed += dt;
    this.state.tick += 1;
    if (this.state.inputHeld && this.state.attachedAnchorId === null && !this.state.vehicleId) {
      if (!this.tryAttach()) {
        this.unattachedHeldTicks += 1;
        if (this.unattachedHeldTicks === this.state.routeProfile.grappleWindowTicks && this.state.segment !== 'safe-tutorial') {
          this.applyPursuitPenalty('missed-hook', 0.075);
        }
      } else {
        this.unattachedHeldTicks = 0;
      }
    } else {
      this.unattachedHeldTicks = 0;
    }

    const vehicle = this.state.vehicleId ? VEHICLES.find((item) => item.id === this.state.vehicleId) ?? null : null;
    const vehicleActive = !!vehicle && this.state.vehicleTicksRemaining > 0;
    const fx = this.mutationModifiers();
    let gravity = GRAVITY * fx.gravityFactor;
    if (vehicleActive && vehicle!.id === '纸鸢' && this.state.vehiclePhase !== 'holding') gravity = KITE_GLIDE_GRAVITY * fx.gravityFactor;
    player.vy += gravity * dt;
    player.vx += (this.state.route === 'high' ? 22 : -10) * dt;
    // 载具按住/松手物理
    if (vehicleActive) {
      if (vehicle!.id === '纸鸢' && this.state.vehiclePhase === 'holding') {
        player.vy -= KITE_LIFT_ACCEL * dt;
        if (player.vy < KITE_MAX_LIFT_VY) player.vy = KITE_MAX_LIFT_VY;
      } else if (vehicle!.id === '货运滑索' && this.state.vehiclePhase === 'holding') {
        player.y = this.state.vehicleLockY;
        player.vy = 0;
        player.vx += ZIPLINE_ACCEL * dt;
      } else if (vehicle!.id === '青鸾') {
        if (this.state.vehiclePhase === 'holding') {
          if (this.state.tick % BIRD_FLAP_PERIOD === 0) player.vy -= BIRD_FLAP_IMPULSE;
        } else if (this.state.vehiclePhase === 'released') {
          player.vy += (BIRD_DIVE_GRAVITY - GRAVITY) * dt;
          player.vx += BIRD_DIVE_ACCEL * dt;
        }
      }
    }
    const gatePacingMultiplier = this.state.segment === 'gate-climax' ? 0.84 : 1;
    player.x += player.vx * dt * this.state.routeProfile.speedMultiplier * gatePacingMultiplier;
    player.y += player.vy * dt;
    // Give a fresh tutorial run a short, bounded recovery lane. A first-time
    // hold/release can swing behind the camera before the player has learned
    // the next anchor; keep that attempt recoverable without changing chase
    // physics once the first-pursuit segment begins.
    if (this.state.levelIndex === 0
      && ['safe-tutorial', 'first-pursuit', 'route-alternation'].includes(this.state.segment)
      && this.state.inputTransitions > 0 && this.state.elapsed < 24) {
      if (player.x < 24) {
        player.x = 24;
        player.vx = Math.max(120, player.vx);
      }
      if (player.y > 760 && player.y < FAIL_Y) {
        player.y = 640;
        player.vy = -220;
      }
    }
    this.state.progress = this.endlessMode
      ? segmentProgressAtX(player.x)
      : Math.max(this.state.progress, clamp01(player.x / this.state.finishX));
    if (this.endlessMode) {
      this.updateEndlessMetrics();
      this.extendEndlessCourse();
    }

    if (this.state.attachedAnchorId !== null && this.state.ropeLength !== null) {
      const anchor = this.state.anchors.find((item) => item.id === this.state.attachedAnchorId);
      if (anchor) {
        const highRouteIntent = (this.state.routeTraversal.phase === 'split' || this.state.routeTraversal.phase === 'branch')
          && (this.state.routeTraversal.committedRoute === null || this.state.routeTraversal.committedRoute === 'high')
          && anchor.id === 'node-5'
          && this.state.ropeLength < 300;
        if (highRouteIntent) this.state.ropeLength = Math.max(72, this.state.ropeLength - 10);
        const dx = player.x - anchor.x;
        const dy = player.y - anchor.y;
        const distance = Math.max(0.0001, Math.hypot(dx, dy));
        const nx = dx / distance;
        const ny = dy / distance;
        player.x = anchor.x + nx * this.state.ropeLength;
        player.y = anchor.y + ny * this.state.ropeLength;
        const radialVelocity = player.vx * nx + player.vy * ny;
        player.vx -= radialVelocity * nx;
        player.vy -= radialVelocity * ny;
        player.vx += ny * SWING_DRIVE * fx.swingDriveFactor * dt;
        player.vy -= nx * SWING_DRIVE * fx.swingDriveFactor * dt;
      }
    }

    // 灯笼群：凭空挂接，复用摆荡物理（固定虚拟挂点，绳长恒定）
    if (vehicleActive && vehicle!.id === '灯笼群' && this.state.vehiclePhase === 'holding' && this.state.vehicleVirtualAnchor) {
      const pivot = this.state.vehicleVirtualAnchor;
      const dx = player.x - pivot.x;
      const dy = player.y - pivot.y;
      const distance = Math.max(0.0001, Math.hypot(dx, dy));
      const nx = dx / distance;
      const ny = dy / distance;
      player.x = pivot.x + nx * LANTERN_ROPE;
      player.y = pivot.y + ny * LANTERN_ROPE;
      const radialVelocity = player.vx * nx + player.vy * ny;
      player.vx -= radialVelocity * nx;
      player.vy -= radialVelocity * ny;
      player.vx += ny * SWING_DRIVE * fx.swingDriveFactor * dt;
      player.vy -= nx * SWING_DRIVE * fx.swingDriveFactor * dt;
    }

    const speed = Math.hypot(player.vx, player.vy);
    const speedCap = this.endlessMode ? MAX_SPEED + this.state.segmentIndex * 28 : MAX_SPEED;
    if (speed > speedCap) {
      const scale = speedCap / speed;
      player.vx *= scale;
      player.vy *= scale;
    }

    this.refreshDerived(true);
    this.resolveAuthoredRouteSurface();
    this.updateTerrain(dt, previousPlayer);
    this.collectPickups();
    this.updateChase(dt);
    this.updateChaseEvents(previousPlayer);
    this.refreshDerived(false);

    const gateBeatThreeTicks = this.state.closingGateBeat === 3 && this.gateBeatThreeStartedTick !== null
      ? this.state.tick - this.gateBeatThreeStartedTick
      : 0;
    if (this.gateApertureCrossed && this.state.closingGateBeat === 3 && gateBeatThreeTicks >= 24 && !this.endlessMode) {
      this.state.status = 'won';
      this.state.failureReason = null;
      this.state.message = '抵达渡口接应人，收到过门钱';
      this.state.gatesPassed = Math.max(1, this.state.gatesPassed);
      this.state.receiverPaid = true;
      this.state.gate.receiverPaid = true;
      this.state.attachedAnchorId = null;
      this.state.ropeLength = null;
      return;
    }
    if (this.state.talismanActiveUntilTick === this.state.tick) this.state.talismanGraceUntilTick = this.state.tick + TALISMAN_END_GRACE_TICKS;
    const talismanProtected = this.state.talismanActiveUntilTick > this.state.tick;
    const talismanGrace = this.state.talismanGraceUntilTick > this.state.tick;
    const gateShelter = this.state.activeChaseEvent === 'closing-gate'
      && player.x >= this.state.gate.collisionAperture.x
      && player.x <= this.state.gate.x
      && player.y >= this.state.gate.collisionAperture.y
      && player.y <= this.state.gate.collisionAperture.y + this.state.gate.collisionAperture.height;
    if (gateShelter) player.vx = Math.max(player.vx, 260);
    const pursuerContact = Math.abs(player.x - this.state.pursuer.x) <= PURSUER_CONTACT_DISTANCE;
    // 青鸾期间追兵无法追上（catchImmune）：仅冻结追兵推进，距离自然拉大
    const vehicleCatchImmune = vehicleActive && vehicle!.catchImmune;
    // The first district cycle teaches the endless rhythm while falls still
    // fail normally. Guard contact becomes lethal from the next segment so
    // small browser-frame variations cannot end a run before every district
    // theme has appeared once.
    const endlessOpeningGrace = this.endlessMode && this.state.segmentIndex <= 3;
    // The tutorial's first chase is also an input lesson. A real pointer hold
    // can span a different number of fixed ticks on desktop and mobile, so a
    // player who has made several genuine hold/release transitions gets to
    // reach the authored branch rejoin before guard contact becomes lethal.
    // Falling still fails normally, and the endless patrol keeps its own
    // pressure rules; this only removes a timing-dependent early catch from
    // the first tutorial route.
    const tutorialOpeningGrace = !this.endlessMode
      && this.state.levelIndex === 0
      && this.state.inputTransitions >= 4
      && player.x < this.state.routeGraph.rejoin.x;
    if (!gateShelter && !endlessOpeningGrace && !tutorialOpeningGrace
      && pursuerContact && !talismanProtected && !talismanGrace && !vehicleCatchImmune) {
      this.state.status = 'failed';
      this.state.failureReason = 'caught';
      this.state.message = '官兵追上了';
      this.state.attachedAnchorId = null;
      this.state.ropeLength = null;
      return;
    }
    // Resolve a physical catch before the generic fall check. If the player
    // lands on the guards at the edge of the course, "caught" is the causal
    // failure rather than an unrelated "fell" result.
    const vehicleFallImmune = vehicleActive && vehicle!.fallImmune;
    if (player.y > FAIL_Y && !talismanProtected && !talismanGrace) {
      if (vehicleFallImmune) {
        // 纸鸢坠落免疫：托底反弹，不穿地、不判死
        player.y = FAIL_Y - 24;
        player.vy = -200;
      } else {
        this.state.status = 'failed';
        this.state.failureReason = 'fell';
        this.state.message = '坠落夜市';
        this.state.attachedAnchorId = null;
        this.state.ropeLength = null;
        return;
      }
    }
    if (player.x < -180 && !talismanProtected && !talismanGrace) {
      this.state.status = 'failed';
      this.state.failureReason = 'fell';
      this.state.message = '坠落夜市';
      this.state.attachedAnchorId = null;
      this.state.ropeLength = null;
    }
  }

  private extendEndlessCourse(): void {
    const segment = this.state.segmentIndex;
    const targetX = this.state.player.x + 2600;
    const lastKnown = this.state.anchors[this.state.anchors.length - 1];
    // Course maintenance only runs when the player reaches the retained
    // frontier or enters a new segment. This keeps filtering/allocation out of
    // the per-tick steady state while still handling large replay jumps.
    if (segment === this.endlessCourseLastCullSegment && lastKnown && lastKnown.x >= targetX) return;
    const retention = retentionBoundsAtSegment(segment);
    const lowerBound = retention.behindStartPx - 220;
    const upperBound = retention.aheadEndPx + 220;
    // A test/replay snapshot can restore the player far beyond the original
    // tutorial course. Filter first, then seed a nearby anchor so extending
    // the retained window can never dereference an emptied list.
    const attachedAnchorId = this.state.attachedAnchorId;
    this.state.anchors = this.state.anchors
      .filter((anchor) => anchor.id === attachedAnchorId || (anchor.x >= lowerBound && anchor.x <= upperBound))
      .sort((left, right) => left.x - right.x);
    let last = this.state.anchors[this.state.anchors.length - 1];
    if (!last || last.x < this.state.player.x - difficultyAtSegment(segment).anchorSpacing) {
      const seedSegment = segmentForIndex(segmentIndexAtX(this.state.player.x));
      const spacing = seedSegment.isSky ? seedSegment.anchorSpacing : difficultyAtSegment(segment).anchorSpacing;
      const seedX = Math.max(lowerBound, this.state.player.x - spacing);
      const layout = endlessAnchorLayout(this.state.seed, seedX, spacing);
      last = {
        id: `endless-node-${Math.round(seedX)}`,
        x: seedX,
        y: layout.y,
        type: NODE_TYPES[Math.abs(Math.round(seedX)) % NODE_TYPES.length]!,
      };
      this.state.anchors.push(last);
      this.state.anchors.sort((left, right) => left.x - right.x);
    }
    while (last.x < targetX) {
      const nextSegment = segmentIndexAtX(last.x + 1);
      const currentSegment = segmentForIndex(nextSegment);
      const baseSpacing = currentSegment.isSky
        ? currentSegment.anchorSpacing
        : difficultyAtSegment(nextSegment).anchorSpacing;
      const layout = endlessAnchorLayout(this.state.seed, last.x + baseSpacing, baseSpacing);
      const nextX = last.x + layout.spacing;
      const nextAnchor = {
        id: `endless-node-${Math.round(nextX)}`,
        x: nextX,
        y: layout.y,
        type: NODE_TYPES[Math.abs(Math.round(nextX)) % NODE_TYPES.length]!,
      };
      this.state.anchors.push(nextAnchor);
      last = nextAnchor;
    }
    this.state.anchors = this.state.anchors
      .filter((anchor) => anchor.id === attachedAnchorId || (anchor.x >= lowerBound && anchor.x <= upperBound))
      .sort((left, right) => left.x - right.x);
    this.endlessCourseLastCullSegment = segment;
  }

  private updateEndlessMetrics(): void {
    const segment = segmentIndexAtX(this.state.player.x);
    const previous = this.state.segmentIndex;
    this.state.segmentIndex = segment;
    this.state.distanceMeters = Math.max(this.state.distanceMeters, Math.floor(metersAtSegment(segment) + (this.state.player.x - segmentStartPx(segment)) / 30));
    this.state.depthCoefficient = depthCoefficient(segment);
    this.state.attachRadius = difficultyAtSegment(segment).assistAttachRadius;
    const descriptor = segmentForIndex(segment);
    this.state.isSky = descriptor.isSky && this.state.player.y <= 445 && this.state.player.vx >= 360;
    this.state.mutation = segment >= 3 ? chooseMutation(segment, Math.floor(this.state.distanceMeters / 300), this.state.seed) : null;
    if (segment > previous) {
      // 概率事件：进入新段时按设计概率抽取载具（天空段只出青鸾）
      this.grantVehicleForSegment(segment, descriptor.isSky);
      const placements = pickupPlacementForSegment(segment);
      this.state.activePickups.push(...placements.map((pickup) => ({
        ...pickup,
        x: segmentStartPx(segment) + segmentLengthPx(segment) * 0.5,
        y: pickup.kind === 'high-route' ? 335 : 500,
        collected: false,
      })));
      this.state.activePickups = this.state.activePickups.filter((pickup) => !pickup.collected && pickup.segment >= segment - 2);
      if (descriptor.isGate) this.state.gatesPassed += 1;
    }
    // 载具有时长限制：确定性 tick 倒计时（非墙钟），到期回到普通物理
    if (this.state.vehicleId && this.state.vehicleTicksRemaining > 0) {
      this.state.vehicleTicksRemaining -= 1;
      if (this.state.vehicleTicksRemaining <= 0) this.expireVehicle();
    }
  }

  private collectPickups(): void {
    for (const pickup of this.state.activePickups) {
      if (pickup.collected) continue;
      const distance = Math.hypot(this.state.player.x - pickup.x, this.state.player.y - pickup.y);
      if (distance > PLAYER_COLLISION_RADIUS + 18) continue;
      pickup.collected = true;
      this.state.pickups += 1;
      this.state.coins += pickup.value;
    }
  }
}

export function createGrappleGame(seed = 1): GrappleGame {
  return new GrappleGame(seed);
}
