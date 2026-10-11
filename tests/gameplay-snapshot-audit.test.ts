import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { createGrappleGame } from '../src/game-core.ts';
import {
  createRunSnapshot,
  isValidRunState,
  LocalRunSnapshotStorage,
  parseRunSnapshot,
} from '../src/run-snapshot.ts';

type FakeStorage = {
  value: string | null;
  failGet?: boolean;
  failSet?: boolean;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

function installStorage(value: string | null = null): FakeStorage {
  const storage: FakeStorage = {
    value,
    getItem() {
      if (storage.failGet) throw new Error('read denied');
      return storage.value;
    },
    setItem(_key, nextValue) {
      if (storage.failSet) throw new Error('quota exceeded');
      storage.value = nextValue;
    },
    removeItem() {
      if (storage.failSet) throw new Error('remove denied');
      storage.value = null;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  return storage;
}

afterEach(() => {
  if (originalLocalStorage) Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

function validSnapshot() {
  return createRunSnapshot('audit:stable', createGrappleGame(17).getState());
}

function rawSnapshot(overrides: Record<string, unknown> = {}): string {
  const source = validSnapshot();
  return JSON.stringify({ ...source, ...overrides });
}

describe('run snapshot shape audit', () => {
  test('accepts valid playing, paused, failed, won, tutorial, patrol, and legacy states', () => {
    const statuses = [
      ['playing', false, null],
      ['playing', true, null],
      ['failed', false, 'fell'],
      ['won', false, null],
    ] as const;
    for (const [status, paused, failureReason] of statuses) {
      const state = createGrappleGame(17).getState();
      state.status = status;
      state.paused = paused;
      state.failureReason = failureReason;
      const snapshot = createRunSnapshot(`audit:${status}:${paused}`, state);
      assert.deepEqual(parseRunSnapshot(JSON.stringify(snapshot)), snapshot);
      assert.equal(isValidRunState(snapshot.state), true);
    }

    const patrol = createGrappleGame(19);
    patrol.restartEndless(19);
    const patrolSnapshot = createRunSnapshot('audit:patrol', patrol.getState());
    assert.equal(patrolSnapshot.state.levelId, 'night-patrol');
    assert.ok(parseRunSnapshot(JSON.stringify(patrolSnapshot)));

    const legacy = JSON.parse(JSON.stringify(validSnapshot())) as ReturnType<typeof validSnapshot>;
    for (const field of [
      'vehicleTicksRemaining', 'vehicleLockY', 'vehicleVirtualAnchor', 'depthCoefficient',
      'bounceCount', 'lastBounceTick', 'regrappleGraceUntilTick', 'talismanActiveUntilTick',
      'talismanGraceUntilTick', 'firecrackerStunUntilTick', 'itemUsage', 'receiverPaid',
    ]) delete (legacy.state as unknown as Record<string, unknown>)[field];
    delete (legacy.state.gate as unknown as Record<string, unknown>).receiver;
    assert.ok(parseRunSnapshot(JSON.stringify(legacy)), 'supported legacy optional fields must migrate');
  });

  test('rejects malformed nested anchors, routes, bounds, resources, enums, and references', () => {
    const mutations: Array<(state: Record<string, unknown>) => void> = [
      (state) => { state.anchors = [null]; },
      (state) => { state.routeGraph = {}; },
      (state) => { (state.routeGraph as Record<string, unknown>).branches = {}; },
      (state) => { (state.gate as Record<string, unknown>).leftLeafBounds = {}; },
      (state) => { state.environmentGeometry = { worldBounds: {} }; },
      (state) => { state.coins = 'oops'; },
      (state) => { state.depthCoefficient = Number.NaN; },
      (state) => { state.activePickups = [{ kind: 'unknown', segment: 0, value: 1, x: 1, y: 1, collected: false }]; },
      (state) => { state.routeTraversal = { phase: 'unknown', committedRoute: null }; },
      (state) => { state.attachedAnchorId = 'missing-anchor'; },
      (state) => { state.routeProfile = { id: 'unknown' }; },
    ];
    for (const mutate of mutations) {
      const source = JSON.parse(rawSnapshot()) as { state: Record<string, unknown> };
      mutate(source.state);
      assert.equal(parseRunSnapshot(JSON.stringify(source)), null);
    }
  });

  test('accepts active-terrain legacy omissions but rejects supplied wrong types', () => {
    const legacy = JSON.parse(rawSnapshot()) as { state: Record<string, unknown> };
    const activeTerrain = legacy.state.activeTerrain as Record<string, unknown>;
    for (const field of [
      'category', 'collision', 'impactCount', 'impactCooldownUntilTick',
      'pursuerSlowUntilTick', 'collapseAtTick', 'debrisBounds',
    ]) delete activeTerrain[field];
    const sceneObjects = legacy.state.sceneObjects as Array<Record<string, unknown>>;
    for (const item of sceneObjects) {
      for (const field of [
        'category', 'collision', 'impactCount', 'impactCooldownUntilTick',
        'pursuerSlowUntilTick', 'collapseAtTick', 'debrisBounds',
      ]) delete item[field];
    }
    assert.ok(parseRunSnapshot(JSON.stringify(legacy)), 'restore defaults must keep supported terrain snapshots readable');

    for (const field of [
      'category', 'collision', 'impactCount', 'impactCooldownUntilTick',
      'pursuerSlowUntilTick', 'collapseAtTick', 'debrisBounds',
    ]) {
      const malformed = JSON.parse(rawSnapshot()) as { state: Record<string, unknown> };
      (malformed.state.activeTerrain as Record<string, unknown>)[field] = { malformed: true };
      assert.equal(parseRunSnapshot(JSON.stringify(malformed)), null, `invalid ${field} must fail closed`);
    }
  });

  test('preserves unknown top-level fields while validating saved furthest segment indices', () => {
    const compatible = JSON.parse(rawSnapshot()) as { state: Record<string, unknown> };
    compatible.state.furthestSegmentIndex = 7;
    compatible.state.futureCharacterMetadata = 'future-character';
    compatible.state.futureSkyMetadata = [6, 10];
    assert.ok(parseRunSnapshot(JSON.stringify(compatible)));

    for (const value of [null, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '7']) {
      const malformed = JSON.parse(rawSnapshot()) as { state: Record<string, unknown> };
      malformed.state.furthestSegmentIndex = value;
      assert.equal(parseRunSnapshot(JSON.stringify(malformed)), null, `invalid furthestSegmentIndex ${String(value)} must fail closed`);
    }
  });
});

describe('local run snapshot storage audit', () => {
  test('preserves malformed and future raw bytes and reports an issue until explicit clear', () => {
    for (const raw of ['{broken snapshot', rawSnapshot({ version: 99 })]) {
      const storage = installStorage(raw);
      const snapshots = new LocalRunSnapshotStorage('audit:snapshot');
      assert.equal(snapshots.load(), null);
      assert.equal(typeof snapshots.getPersistenceIssue(), 'string');
      assert.equal(snapshots.save(validSnapshot()), false);
      assert.equal(storage.value, raw);
      snapshots.clear();
      assert.equal(storage.value, null);
      assert.equal(snapshots.save(validSnapshot()), true);
      assert.equal(snapshots.getPersistenceIssue(), null);
    }
  });

  test('rejects invalid snapshots before writing and makes write failures retryable', () => {
    const storage = installStorage(null);
    const snapshots = new LocalRunSnapshotStorage('audit:snapshot');
    const invalid = validSnapshot() as ReturnType<typeof validSnapshot> & { state: Record<string, unknown> };
    (invalid.state as Record<string, unknown>).coins = 'bad';
    assert.equal(snapshots.save(invalid), false);
    assert.equal(storage.value, null);
    assert.equal(typeof snapshots.getPersistenceIssue(), 'string');

    storage.failSet = true;
    assert.equal(snapshots.save(validSnapshot()), false);
    assert.equal(storage.value, null);
    assert.equal(typeof snapshots.getPersistenceIssue(), 'string');

    storage.failSet = false;
    assert.equal(snapshots.save(validSnapshot()), true);
    assert.ok(parseRunSnapshot(storage.value));
    assert.equal(snapshots.getPersistenceIssue(), null);
  });

  test('reports storage read failures without overwriting or claiming a save', () => {
    const storage = installStorage('{preserve me');
    storage.failGet = true;
    const snapshots = new LocalRunSnapshotStorage('audit:snapshot');
    assert.equal(snapshots.load(), null);
    assert.equal(typeof snapshots.getPersistenceIssue(), 'string');
    assert.equal(snapshots.save(validSnapshot()), false);
    assert.equal(storage.value, '{preserve me');
  });
});
