import type { GrappleState } from './game-core.ts';
import { CHARACTERS } from './progression.ts';

export interface RunSnapshotV1 {
  version: 1;
  runId: string;
  state: GrappleState;
}

type RecordValue = Record<string, unknown>;
type SnapshotStorageArea = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const GAME_STATUSES = ['playing', 'failed', 'won'] as const;
const FAILURE_REASONS = [null, 'fell', 'caught'] as const;
const SEGMENTS = ['safe-tutorial', 'first-pursuit', 'route-alternation', 'gate-climax', 'combo-flight'] as const;
const ROUTES = ['high', 'low'] as const;
const LEVELS = ['lantern-entry', 'rafter-fork', 'ferry-seal', 'night-patrol'] as const;
const NODE_TYPES = ['檐角', '牌楼横梁', '灯绳架', '幌杆'] as const;
const TERRAIN_KINDS = ['布棚', '竹架', '窄巷'] as const;
const SCENE_CATEGORIES = ['canopy', 'obstacle', 'passage'] as const;
const TERRAIN_COLLISIONS = ['none', 'solid'] as const;
const TERRAIN_LESSONS = ['safe-teaching', 'chase-test'] as const;
const TERRAIN_STATES = ['ready', 'sliding', 'strained', 'broken', 'concealed'] as const;
const TERRAIN_SILHOUETTES = ['sagging-fabric-canopy', 'lashed-bamboo-scaffold', 'compressed-alley-walls'] as const;
const TERRAIN_REACTIONS = ['down-right', 'downward', 'inward'] as const;
const CHASE_OBSTACLES = ['barricade', 'roof-net'] as const;
const CHASE_EXPRESSIONS = ['closing-stall-shutter', 'beam-hung-cargo-net'] as const;
const CHASE_ANCHORS = ['stall-frame', 'overhead-crossbeam'] as const;
const CHASE_PHASES = ['warning', 'entering', 'launch', 'raise', 'aim', 'release', 'travel', 'land', 'unfurling', 'active', 'impact', 'caught', 'missed', 'passed'] as const;
const GATE_BEATS = [1, 2, 3] as const;
const GATE_EXPRESSIONS = ['inner-market-gate'] as const;
const GATE_ANCHORS = ['market-exit-arch'] as const;
const GATE_MOTIONS = ['VERTICAL_DOUBLE_LEAVES_INWARD', 'HORIZONTAL_DOUBLE_LEAVES_INWARD'] as const;
const ROUTE_GRAPH_ID = 'night-market-fork-v1' as const;
const ROUTE_TRAVERSAL_PHASES = ['approach', 'split', 'branch', 'rejoin', 'complete'] as const;
const CHASE_EVENT_IDS = ['barricade', 'roof-net', 'closing-gate'] as const;
const CHASE_PHASE_LABELS = ['safe', 'alert', 'danger', 'climax'] as const;
const PICKUP_KINDS = ['high-route', 'swing-apex', 'gate-brush', 'low-safety', 'backswing'] as const;
const VEHICLE_IDS = ['纸鸢', '货运滑索', '灯笼群', '青鸾'] as const;
const VEHICLE_PHASES = ['idle', 'holding', 'released'] as const;
const MUTATIONS = ['起雾', '下雨', '封灯', '宵禁加派'] as const;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function integer(value: unknown): value is number {
  return finite(value) && Number.isInteger(value);
}

function nonNegative(value: unknown): value is number {
  return finite(value) && value >= 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return integer(value) && value >= 0;
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function inUnitInterval(value: unknown): value is number {
  return finite(value) && value >= 0 && value <= 1;
}

function oneOf<T extends string | number | null>(value: unknown, choices: readonly T[]): value is T {
  return choices.includes(value as T);
}

function optional(value: unknown, predicate: (candidate: unknown) => boolean): boolean {
  return value === undefined || predicate(value);
}

function stringValue(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => stringValue(entry));
}

function point(value: unknown): boolean {
  return isRecord(value) && finite(value.x) && finite(value.y);
}

function bounds(value: unknown): boolean {
  return point(value) && nonNegative((value as RecordValue).width) && nonNegative((value as RecordValue).height);
}

function nullablePoint(value: unknown): boolean {
  return value === null || point(value);
}

function anchor(value: unknown): boolean {
  return isRecord(value)
    && point(value)
    && stringValue(value.id)
    && oneOf(value.type, NODE_TYPES);
}

function routeProfile(value: unknown): boolean {
  return isRecord(value)
    && oneOf(value.id, ROUTES)
    && stringArray(value.surfaces)
    && nonNegative(value.speedMultiplier)
    && integer(value.grappleWindowTicks)
    && value.grappleWindowTicks >= 0
    && stringArray(value.obstacles)
    && finite(value.pursuitDistanceEffect);
}

function playerMotion(value: unknown): boolean {
  return isRecord(value)
    && point(value)
    && finite(value.vx)
    && finite(value.vy)
    && nonNegative(value.speed)
    && typeof value.airborne === 'boolean'
    && oneOf(value.grappleWindowRisk, ['short', 'forgiving'] as const);
}

function activeTerrain(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const visual = value.visual;
  return oneOf(value.kind, TERRAIN_KINDS)
    && optional(value.category, (candidate) => oneOf(candidate, SCENE_CATEGORIES))
    && optional(value.collision, (candidate) => oneOf(candidate, TERRAIN_COLLISIONS))
    && oneOf(value.lesson, TERRAIN_LESSONS)
    && stringValue(value.behavior)
    && oneOf(value.behaviorState, TERRAIN_STATES)
    && bounds(value.bounds)
    && isRecord(visual)
    && oneOf(visual.silhouette, TERRAIN_SILHOUETTES)
    && stringValue(visual.material)
    && stringArray(visual.layers)
    && oneOf(visual.reactionDirection, TERRAIN_REACTIONS)
    && optional(value.impactCount, nonNegativeSafeInteger)
    && optional(value.impactCooldownUntilTick, nonNegativeSafeInteger)
    && optional(value.pursuerSlowUntilTick, nonNegativeSafeInteger)
    && optional(value.collapseAtTick, (candidate) => candidate === null || nonNegativeSafeInteger(candidate))
    && optional(value.debrisBounds, (candidate) => candidate === null || bounds(candidate));
}

function chaseObstacle(value: unknown): boolean {
  return isRecord(value)
    && oneOf(value.kind, CHASE_OBSTACLES)
    && oneOf(value.expression, CHASE_EXPRESSIONS)
    && oneOf(value.anchoredTo, CHASE_ANCHORS)
    && bounds(value.anchorBounds)
    && bounds(value.bounds)
    && bounds(value.occupiedBounds)
    && point(value.source)
    && oneOf(value.phase, CHASE_PHASES)
    && inUnitInterval(value.animationProgress)
    && typeof value.collisionActive === 'boolean'
    && nonNegativeInteger(value.startedTick)
    && point(value.predictedTarget);
}

function gate(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return oneOf(value.expression, GATE_EXPRESSIONS)
    && oneOf(value.anchoredTo, GATE_ANCHORS)
    && oneOf(value.closureMotion, GATE_MOTIONS)
    && bounds(value.anchorBounds)
    && finite(value.x)
    && finite(value.centerY)
    && optional(value.beat, (candidate) => candidate === null || oneOf(candidate, GATE_BEATS))
    && nonNegative(value.aperture)
    && optional(value.animationProgress, inUnitInterval)
    // Older snapshots did not include top/bottom render aliases. The
    // restore path derives them from the stable collision aliases.
    && optional(value.topLeafBounds, bounds)
    && optional(value.bottomLeafBounds, bounds)
    && bounds(value.leftLeafBounds)
    && bounds(value.rightLeafBounds)
    && optional(value.renderTopLeafBounds, bounds)
    && optional(value.renderBottomLeafBounds, bounds)
    && bounds(value.collisionAperture)
    && finite(value.dustPulse)
    && optional(value.receiver, point)
    && optional(value.receiverPaid, (candidate) => typeof candidate === 'boolean');
}

function routeGraphBranch(value: unknown): boolean {
  return isRecord(value)
    && bounds(value.corridor)
    && stringArray(value.anchorIds)
    && stringArray(value.obstacles);
}

function routeGraph(value: unknown): boolean {
  return isRecord(value)
    && value.id === ROUTE_GRAPH_ID
    && bounds(value.approach)
    && bounds(value.split)
    && routeGraphBranch(value.branches && isRecord(value.branches) ? value.branches.high : undefined)
    && routeGraphBranch(value.branches && isRecord(value.branches) ? value.branches.low : undefined)
    && bounds(value.rejoin);
}

function routeTraversal(value: unknown): boolean {
  return isRecord(value)
    && oneOf(value.phase, ROUTE_TRAVERSAL_PHASES)
    && (value.committedRoute === null || oneOf(value.committedRoute, ROUTES));
}

function environmentGeometry(value: unknown): boolean {
  return isRecord(value)
    && bounds(value.worldBounds)
    && Array.isArray(value.continuousCanopies) && value.continuousCanopies.every(bounds)
    && Array.isArray(value.overheadCrossbeams) && value.overheadCrossbeams.every(bounds)
    && Array.isArray(value.stallWalls) && value.stallWalls.every(bounds)
    && Array.isArray(value.interiorColumns) && value.interiorColumns.every(bounds);
}

function pursuer(value: unknown): boolean {
  return isRecord(value)
    && point(value)
    && value.visible === true
    && value.kind === 'guard-silhouette'
    && value.screenEdge === 'left'
    && nonNegative(value.distance)
    && finite(value.vx)
    && finite(value.ax)
    && nonNegative(value.maxSpeed)
    && nonNegative(value.maxAcceleration)
    && finite(value.runLaneY);
}

function chase(value: unknown): boolean {
  return isRecord(value)
    && inUnitInterval(value.pressure)
    && nonNegative(value.distance)
    && oneOf(value.phase, CHASE_PHASE_LABELS);
}

function activePickup(value: unknown): boolean {
  return isRecord(value)
    && oneOf(value.kind, PICKUP_KINDS)
    && nonNegativeInteger(value.segment)
    && nonNegative(value.value)
    && finite(value.x)
    && finite(value.y)
    && typeof value.collected === 'boolean';
}

function itemUsage(value: unknown): boolean {
  return isRecord(value)
    && nonNegativeInteger(value.talisman)
    && nonNegativeInteger(value.firecracker);
}

function isValidRunStateRecord(state: RecordValue): boolean {
  const anchorValues = state.anchors;
  const anchorIds = Array.isArray(anchorValues)
    ? new Set(anchorValues.filter(anchor).map((entry) => (entry as RecordValue).id))
    : new Set<string>();
  const attachedAnchorIdValid = state.attachedAnchorId === undefined
    || state.attachedAnchorId === null
    || (stringValue(state.attachedAnchorId) && anchorIds.has(state.attachedAnchorId));

  return optional(state.levelIndex, nonNegativeInteger)
    && optional(state.levelCount, (value) => nonNegativeInteger(value) && value > 0)
    && optional(state.levelId, (value) => oneOf(value, LEVELS))
    && optional(state.levelTitle, stringValue)
    && optional(state.levelDestination, stringValue)
    && integer(state.seed)
    && state.seed >= 1
    && nonNegative(state.elapsed)
    && nonNegativeInteger(state.tick)
    && oneOf(state.status, GAME_STATUSES)
    && typeof state.paused === 'boolean'
    && oneOf(state.failureReason, FAILURE_REASONS)
    && typeof state.message === 'string'
    && typeof state.inputHeld === 'boolean'
    && nonNegativeInteger(state.inputTransitions)
    && inUnitInterval(state.progress)
    && typeof state.reviveUsed === 'boolean'
    && oneOf(state.segment, SEGMENTS)
    && oneOf(state.route, ROUTES)
    && routeProfile(state.routeProfile)
    && playerMotion(state.playerMotion)
    && pursuer(state.pursuer)
    && optional(state.activeTerrain, (value) => value === null || activeTerrain(value))
    && optional(state.sceneObjects, (value) => Array.isArray(value) && value.every(activeTerrain))
    && optional(state.chaseObstacle, (value) => value === null || chaseObstacle(value))
    && gate(state.gate)
    && environmentGeometry(state.environmentGeometry)
    && routeGraph(state.routeGraph)
    && routeTraversal(state.routeTraversal)
    && optional(state.activeChaseEvent, (value) => value === null || oneOf(value, CHASE_EVENT_IDS))
    && optional(state.closingGateBeat, (value) => value === null || oneOf(value, GATE_BEATS))
    && nonNegativeInteger(state.eventSequence)
    && chase(state.chase)
    && point(state.player)
    && Array.isArray(anchorValues)
    && anchorValues.every(anchor)
    && attachedAnchorIdValid
    && optional(state.ropeLength, (value) => value === null || nonNegative(value))
    && nonNegative(state.attachRadius)
    && nonNegative(state.maxSpeed)
    && nonNegative(state.failY)
    && nonNegative(state.finishX)
    && nonNegative(state.finishTop)
    && optional(state.furthestX, nonNegative)
    && optional(state.visitedSegments, uniqueSegmentIndices)
    && optional(state.characterId, (value) => CHARACTERS.some(c => c.id === value))
    && optional(state.skySegments, nonNegativeSafeInteger)
    && optional(state.visitedSkySegments, uniqueSegmentIndices)
    && nonNegativeInteger(state.segmentIndex)
    && nonNegative(state.distanceMeters)
    && nonNegativeInteger(state.coins)
    && nonNegativeInteger(state.pickups)
    && nonNegativeInteger(state.gatesPassed)
    && nonNegativeInteger(state.combo)
    && nonNegativeInteger(state.comboPeak)
    && oneOf(state.comboTier, [1, 2, 3, 4] as const)
    && optional(state.mutation, (value) => value === null || oneOf(value, MUTATIONS))
    && typeof state.isSky === 'boolean'
    && optional(state.vehicleId, (value) => value === null || oneOf(value, VEHICLE_IDS))
    && optional(state.activePickups, (value) => Array.isArray(value) && value.every(activePickup))
    && optional(state.vehiclePhase, (value) => oneOf(value, VEHICLE_PHASES))
    && optional(state.vehicleTicksRemaining, nonNegativeInteger)
    && optional(state.vehicleQueue, value => Array.isArray(value) && value.length <= 4 && value.every(id => oneOf(id, VEHICLE_IDS)))
    && optional(state.vehicleOffers, value => Array.isArray(value) && value.length <= 4 && value.every(offer => isRecord(offer)
      && oneOf(offer.id, VEHICLE_IDS) && nonNegativeInteger(offer.segment) && finite(offer.x) && finite(offer.y)
      && oneOf(offer.status, ['available', 'claimed', 'missed'] as const)))
    && optional(state.lastVehicleOffer, value => value === null || (isRecord(value)
      && oneOf(value.id, VEHICLE_IDS) && oneOf(value.kind, ['claimed', 'missed'] as const) && nonNegativeInteger(value.tick)))
    && optional(state.vehicleLockY, finite)
    && optional(state.vehicleVirtualAnchor, nullablePoint)
    && optional(state.depthCoefficient, (value) => finite(value) && value > 0)
    && optional(state.bounceCount, nonNegativeInteger)
    && optional(state.lastBounceTick, (value) => value === null || nonNegativeInteger(value))
    && optional(state.regrappleGraceUntilTick, nonNegativeInteger)
    && optional(state.talismanActiveUntilTick, nonNegativeInteger)
    && optional(state.talismanGraceUntilTick, nonNegativeInteger)
    && optional(state.firecrackerStunUntilTick, nonNegativeInteger)
    && optional(state.itemUsage, itemUsage)
    && optional(state.receiverPaid, (value) => typeof value === 'boolean')
    && optional(state.furthestSegmentIndex, nonNegativeSafeInteger);
}

function uniqueSegmentIndices(value: unknown): boolean {
  return Array.isArray(value) && value.every(nonNegativeSafeInteger) && new Set(value).size === value.length;
}

/** Runtime guard shared by snapshot parsing, storage writes, and core callers. */
export function isValidRunState(value: unknown): value is GrappleState {
  return isRecord(value) && isValidRunStateRecord(value);
}

function isValidSnapshot(value: unknown): value is RunSnapshotV1 {
  return isRecord(value)
    && value.version === 1
    && stringValue(value.runId)
    && isValidRunState(value.state);
}

export function createRunSnapshot(runId: string, state: GrappleState): RunSnapshotV1 {
  return { version: 1, runId, state: JSON.parse(JSON.stringify(state)) as GrappleState };
}

type ParseResult = { snapshot: RunSnapshotV1 | null; issue: string | null };

function parseSnapshotResult(raw: string | null): ParseResult {
  if (raw === null) return { snapshot: null, issue: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { snapshot: null, issue: 'snapshot-invalid-json' };
  }
  if (!isRecord(parsed)) return { snapshot: null, issue: 'snapshot-invalid-shape' };
  if (typeof parsed.version === 'number' && parsed.version > 1) {
    return { snapshot: null, issue: 'snapshot-future-version' };
  }
  if (!isValidSnapshot(parsed)) return { snapshot: null, issue: 'snapshot-invalid-shape' };
  return { snapshot: createRunSnapshot(parsed.runId, parsed.state), issue: null };
}

export function parseRunSnapshot(raw: string | null): RunSnapshotV1 | null {
  return parseSnapshotResult(raw).snapshot;
}

function localStorageArea(): SnapshotStorageArea | null {
  try {
    const root = globalThis as typeof globalThis & { localStorage?: SnapshotStorageArea };
    return root.localStorage ?? null;
  } catch {
    return null;
  }
}

export class LocalRunSnapshotStorage {
  private persistenceIssue: string | null = null;

  constructor(private readonly key = 'night-market-hero.run.v2') {}

  getPersistenceIssue(): string | null {
    return this.persistenceIssue;
  }

  load(): RunSnapshotV1 | null {
    const storage = localStorageArea();
    if (!storage) {
      this.persistenceIssue = 'snapshot-storage-unavailable';
      return null;
    }
    let raw: string | null;
    try {
      raw = storage.getItem(this.key);
    } catch {
      this.persistenceIssue = 'snapshot-read-failed';
      return null;
    }
    const result = parseSnapshotResult(raw);
    this.persistenceIssue = result.issue;
    return result.snapshot;
  }

  save(snapshot: RunSnapshotV1): boolean {
    if (!isValidSnapshot(snapshot)) {
      this.persistenceIssue = 'snapshot-invalid-shape';
      return false;
    }
    let encoded: string;
    try {
      encoded = JSON.stringify(snapshot);
    } catch {
      this.persistenceIssue = 'snapshot-serialize-failed';
      return false;
    }

    const storage = localStorageArea();
    if (!storage) {
      this.persistenceIssue = 'snapshot-storage-unavailable';
      return false;
    }
    let existing: string | null;
    try {
      existing = storage.getItem(this.key);
    } catch {
      this.persistenceIssue = 'snapshot-read-failed';
      return false;
    }
    if (existing !== null) {
      const current = parseSnapshotResult(existing);
      if (!current.snapshot) {
        this.persistenceIssue = current.issue ?? 'snapshot-invalid-shape';
        return false;
      }
      if (current.snapshot.version > snapshot.version) {
        this.persistenceIssue = 'snapshot-future-version';
        return false;
      }
    }

    try {
      storage.setItem(this.key, encoded);
      if (storage.getItem(this.key) !== encoded) {
        this.persistenceIssue = 'snapshot-save-verification-failed';
        return false;
      }
    } catch {
      this.persistenceIssue = 'snapshot-save-failed';
      return false;
    }
    this.persistenceIssue = null;
    return true;
  }

  clear(): void {
    const storage = localStorageArea();
    if (!storage) {
      this.persistenceIssue = 'snapshot-storage-unavailable';
      return;
    }
    try {
      storage.removeItem(this.key);
      if (storage.getItem(this.key) !== null) {
        this.persistenceIssue = 'snapshot-clear-failed';
        return;
      }
      this.persistenceIssue = null;
    } catch {
      this.persistenceIssue = 'snapshot-clear-failed';
    }
  }
}
