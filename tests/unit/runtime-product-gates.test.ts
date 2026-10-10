import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RuntimeProductGateSchema, deriveRuntimeProductGate, evaluateRuntimeProductGate, failClosedRuntimeProductPlaceholder, isRuntimeProductPlaceholder, resolveRuntimeProductGate, verifyRuntimeWiredFiles } from '../../src/core/runtime-product-gates.js';

const roots: string[] = [];
const buildHashA = 'a'.repeat(64);
const buildHashB = 'b'.repeat(64);
afterEach(async () => {
  // Restore execute bits before recursive delete so chmod(0) fixtures can be cleaned up.
  await Promise.all(roots.splice(0).map(async (root) => {
    try { await chmod(root, 0o755); } catch { /* already gone */ }
    await rm(root, { recursive: true, force: true });
  }));
});

const good = {
  schemaVersion: 1 as const,
  entrypoint: 'workspace/game/src/main.ts',
  defaultMode: 'tutorial-then-endless',
  journey: ['启动', '教学关', '无限夜巡', '检查点门', '死亡', '结算', '再跑一次'],
  runtimeWiredFiles: ['workspace/game/src/main.ts', 'workspace/game/src/game-core.ts'],
  legacyBehavior: { status: 'COMPATIBILITY_ONLY' as const, evidence: ['旧三关仅保留迁移测试'] },
  browserEvidence: ['artifacts/runtime-product-journey.json'],
};

describe('runtime product completion gate', () => {
  it('requires a real user journey and runtime wiring', () => {
    expect(evaluateRuntimeProductGate(good).passed).toBe(true);
  });
  it('rejects legacy behavior that remains the default path', () => {
    expect(() => RuntimeProductGateSchema.parse({ ...good, legacyBehavior: { status: 'STILL_DEFAULT_PATH', evidence: ['scan'] }, passed: true })).toThrow(/legacy/u);
  });
  it('rejects a static-only report with no browser evidence', () => {
    expect(() => RuntimeProductGateSchema.parse({ ...good, browserEvidence: [], passed: true })).toThrow();
  });

  it('accepts settlement-and-replay products that have no death state', () => {
    const idle = deriveRuntimeProductGate({
      naturalFlow: {
        schemaVersion: 1,
        line: 'idle-management',
        startedFromReset: true,
        actions: ['page.goto', 'produce', 'deliver', 'page.reload', 'produce'],
        transitions: [{ name: 'produce', changed: true, evidence: 'inventory changed' }, { name: 'deliver', changed: true, evidence: 'currency changed' }, { name: 'refresh', changed: true, evidence: 'save restored' }],
        completion: 'settlement',
        replayObserved: true,
        forbiddenOperations: [],
        screenshots: ['screenshots/natural.png'],
        passed: true,
        blockers: [],
        runner: 'trusted-qa-runner',
      },
      runtimeWiredFiles: ['workspace/game/index.html'],
      browserEvidence: ['screenshots/natural.png'],
    });
    expect(idle.passed).toBe(true);
    expect(idle.terminal).toContain('settlement');
    expect(idle.replay).toContain('replay');
  });
});

/** A natural-play trace that satisfies every derive gate requirement; each
 * rejection test below corrupts exactly one property of this baseline. */
const goodFlow = {
  schemaVersion: 1,
  startedFromReset: true,
  actions: ['page.goto', 'page.click', 'page.reload', 'page.click'],
  transitions: [
    { name: 'produce', changed: true, evidence: 'inventory counter incremented' },
    { name: 'settle', changed: true, evidence: 'settlement modal observed' },
  ],
  completion: 'settlement',
  replayObserved: true,
  forbiddenOperations: [],
  screenshots: ['screenshots/natural.png'],
  passed: true,
  blockers: [],
  runner: 'trusted-qa-runner',
};

describe('deriveRuntimeProductGate rejects incomplete natural flows', () => {
  const derive = (naturalFlow: unknown, browserEvidence: string[] = ['screenshots/natural.png'], currentBuildHash?: string) => deriveRuntimeProductGate({
    naturalFlow,
    runtimeWiredFiles: ['workspace/game/index.html'],
    browserEvidence,
    ...(currentBuildHash ? { currentBuildHash } : {}),
  });

  /** Pin the gate to a specific blocker id. Derive does not expose blockers on
   * the gate object, so we assert the observable projections that each blocker
   * produces (passed=false plus the field that blocker clears / invalidates). */
  it('accepts the full good-flow trace (positive control)', () => {
    const gate = derive(goodFlow);
    expect(gate.passed).toBe(true);
    expect(gate.terminal).toContain('settlement');
    expect(gate.replay).toContain('replay');
    expect(gate.coreLoop).toEqual(['produce', 'settle']);
  });

  it('rejects a trace that never started from a reset (natural-reset-missing)', () => {
    const gate = derive({ ...goodFlow, startedFromReset: false });
    expect(gate.passed).toBe(false);
    // Reset missing is the only corrupted field; projections otherwise remain.
    expect(gate.coreLoop).toEqual(['produce', 'settle']);
    expect(gate.terminal).toContain('settlement');
    expect(gate.replay).toContain('replay');
  });

  it('rejects a trace with no state transition that changed (natural-state-transition-missing)', () => {
    const gate = derive({
      ...goodFlow,
      transitions: [
        { name: 'produce', changed: false, evidence: 'no change observed' },
        { name: 'settle', changed: false, evidence: 'no change observed' },
      ],
    });
    expect(gate.passed).toBe(false);
    expect(gate.coreLoop).toEqual([]);
  });

  it('rejects a trace with no terminal outcome (natural-terminal-missing)', () => {
    const gate = derive({ ...goodFlow, completion: 'none' });
    expect(gate.passed).toBe(false);
    expect(gate.terminal).toEqual([]);
  });

  it('rejects a trace with no replay observation (natural-replay-missing)', () => {
    const gate = derive({ ...goodFlow, replayObserved: false });
    expect(gate.passed).toBe(false);
    expect(gate.replay).toEqual([]);
  });

  it('rejects a trace that forced state via forbidden operations (natural-state-forcing-operation)', () => {
    const gate = derive({ ...goodFlow, passed: false, forbiddenOperations: ['page.evaluate:setState'] });
    expect(gate.passed).toBe(false);
    // Forbidden ops do not clear terminal/replay projections; only fail the gate.
    expect(gate.terminal).toContain('settlement');
    expect(gate.replay).toContain('replay');
  });

  it('rejects a complete projection when the natural trace is failed or blocked', () => {
    expect(derive({ ...goodFlow, passed: false, blockers: [] }).passed).toBe(false);
    expect(derive({ ...goodFlow, passed: true, blockers: ['natural-action-trace-too-short'] }).passed).toBe(false);
  });

  it('copies build identity only from natural-flow evidence and enforces an expected hash', () => {
    const bound = derive({ ...goodFlow, buildHash: buildHashA });
    expect(bound.buildHash).toBe(buildHashA);
    expect(derive(goodFlow).buildHash).toBeUndefined();
    expect(derive({ ...goodFlow, buildHash: buildHashA }, ['screenshots/natural.png'], buildHashB).passed).toBe(false);
  });

  it('rejects a trace with an unsupported schema version (natural-flow-schema-invalid)', () => {
    const gate = derive({ schemaVersion: 2 });
    expect(gate.passed).toBe(false);
    expect(gate.coreLoop).toEqual([]);
    expect(gate.terminal).toEqual([]);
    expect(gate.replay).toEqual([]);
  });

  it('rejects when browser evidence is missing (browser-evidence-missing)', () => {
    // browserEvidence.min(1) is enforced by the base schema, so derive cannot
    // emit a failed gate object with an empty list — it throws instead. The
    // resolver must catch this without inventing a passing evidence path.
    expect(() => derive(goodFlow, [])).toThrow(/browserEvidence|Too small/u);
  });
});

describe('verifyRuntimeWiredFiles rejects unsafe or broken wiring', () => {
  it('accepts a real relative file under the run root (positive control)', async () => {
    const runRoot = await mkdtemp(path.join(tmpdir(), 'rpg-rw-'));
    roots.push(runRoot);
    await writeFile(path.join(runRoot, 'real.ts'), 'export const wired = true;\n');
    const result = await verifyRuntimeWiredFiles({ runRoot, files: ['real.ts'] });
    expect(result.passed).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.checked).toEqual(['real.ts']);
  });

  it('rejects an absolute path as unsafe wiring', async () => {
    const runRoot = await mkdtemp(path.join(tmpdir(), 'rpg-rw-'));
    roots.push(runRoot);
    const result = await verifyRuntimeWiredFiles({ runRoot, files: ['workspace/game/index.html', '/etc/passwd'] });
    expect(result.passed).toBe(false);
    expect(result.blockers).toContain('unsafe:/etc/passwd');
  });

  it('rejects a parent-directory escape as unsafe wiring', async () => {
    const runRoot = await mkdtemp(path.join(tmpdir(), 'rpg-rw-'));
    roots.push(runRoot);
    const result = await verifyRuntimeWiredFiles({ runRoot, files: ['workspace/../game/index.html'] });
    expect(result.passed).toBe(false);
    expect(result.blockers).toContain('unsafe:workspace/../game/index.html');
  });

  it('rejects a URL as unsafe wiring', async () => {
    const runRoot = await mkdtemp(path.join(tmpdir(), 'rpg-rw-'));
    roots.push(runRoot);
    const result = await verifyRuntimeWiredFiles({ runRoot, files: ['https://example.com/game.js'] });
    expect(result.passed).toBe(false);
    expect(result.blockers).toContain('unsafe:https://example.com/game.js');
  });

  it('rejects duplicate wiring entries', async () => {
    const runRoot = await mkdtemp(path.join(tmpdir(), 'rpg-rw-'));
    roots.push(runRoot);
    await mkdir(path.join(runRoot, 'workspace', 'game'), { recursive: true });
    await writeFile(path.join(runRoot, 'workspace', 'game', 'index.html'), '<html></html>');
    const result = await verifyRuntimeWiredFiles({ runRoot, files: ['workspace/game/index.html', 'workspace/game/index.html'] });
    expect(result.passed).toBe(false);
    expect(result.blockers).toContain('duplicate:workspace/game/index.html');
  });

  it('rejects wiring that points at a missing file', async () => {
    const runRoot = await mkdtemp(path.join(tmpdir(), 'rpg-rw-'));
    roots.push(runRoot);
    const result = await verifyRuntimeWiredFiles({ runRoot, files: ['workspace/game/index.html'] });
    expect(result.passed).toBe(false);
    expect(result.blockers).toContain('missing:workspace/game/index.html');
  });

  it('rejects wiring that resolves through a symlink', async () => {
    const runRoot = await mkdtemp(path.join(tmpdir(), 'rpg-rw-'));
    roots.push(runRoot);
    await writeFile(path.join(runRoot, 'real.ts'), 'export const wired = true;\n');
    await symlink(path.join(runRoot, 'real.ts'), path.join(runRoot, 'linked.ts'));
    const result = await verifyRuntimeWiredFiles({ runRoot, files: ['linked.ts'] });
    expect(result.passed).toBe(false);
    expect(result.blockers).toContain('symlink:linked.ts');
  });

  it('rejects wiring when the run root itself is missing', async () => {
    const ghost = await mkdtemp(path.join(tmpdir(), 'rpg-ghost-'));
    roots.push(ghost);
    await rm(ghost, { recursive: true, force: true });
    const result = await verifyRuntimeWiredFiles({ runRoot: ghost, files: ['real.ts'] });
    expect(result.passed).toBe(false);
    expect(result.blockers).toContain('run-root:missing');
  });

  it('rejects the run-root itself (.) as outside wiring', async () => {
    const runRoot = await mkdtemp(path.join(tmpdir(), 'rpg-outside-'));
    roots.push(runRoot);
    const result = await verifyRuntimeWiredFiles({ runRoot, files: ['.'] });
    expect(result.passed).toBe(false);
    expect(result.blockers).toContain('outside:.');
  });

  it('rejects wiring that points at a directory instead of a file', async () => {
    const runRoot = await mkdtemp(path.join(tmpdir(), 'rpg-notfile-'));
    roots.push(runRoot);
    await mkdir(path.join(runRoot, 'workspace'), { recursive: true });
    const result = await verifyRuntimeWiredFiles({ runRoot, files: ['workspace'] });
    expect(result.passed).toBe(false);
    expect(result.blockers).toContain('not-file:workspace');
  });

  it('rejects wiring whose realpath escapes the run root via a parent directory symlink', async () => {
    const runRoot = await mkdtemp(path.join(tmpdir(), 'rpg-outres-'));
    roots.push(runRoot);
    const outside = await mkdtemp(path.join(tmpdir(), 'rpg-outside-target-'));
    roots.push(outside);
    await writeFile(path.join(outside, 'secret.ts'), 'export const leaked = true;\n');
    // Intermediate directory symlink: the final path component is a regular file,
    // so lstat does not see a symlink, but realpath resolves outside realRoot.
    await symlink(outside, path.join(runRoot, 'escape'));
    const result = await verifyRuntimeWiredFiles({ runRoot, files: ['escape/secret.ts'] });
    expect(result.passed).toBe(false);
    expect(result.blockers).toContain('outside-resolved:escape/secret.ts');
  });

  it('rejects wiring that exists but cannot be read (non-ENOENT lstat failure)', async () => {
    const runRoot = await mkdtemp(path.join(tmpdir(), 'rpg-unreadable-'));
    roots.push(runRoot);
    await mkdir(path.join(runRoot, 'locked'), { recursive: true });
    await writeFile(path.join(runRoot, 'locked', 'secret.ts'), 'export const hidden = true;\n');
    await chmod(path.join(runRoot, 'locked'), 0);
    const result = await verifyRuntimeWiredFiles({ runRoot, files: ['locked/secret.ts'] });
    // Restore execute bit so afterEach cleanup can delete the tree.
    await chmod(path.join(runRoot, 'locked'), 0o755);
    expect(result.passed).toBe(false);
    expect(result.blockers).toContain('unreadable:locked/secret.ts');
  });
});

describe('RuntimeProductGateSchema rejects passed reports with missing journey evidence', () => {
  it('rejects a passed report whose journey never includes startup', () => {
    expect(() => RuntimeProductGateSchema.parse({ ...good, journey: ['教学关', '无限夜巡', '检查点门', '死亡', '结算', '再跑一次'], passed: true })).toThrow(/startup/u);
  });
  it('rejects a passed report with no core loop evidence', () => {
    expect(() => RuntimeProductGateSchema.parse({ ...good, coreLoop: [], passed: true })).toThrow(/core loop evidence/u);
  });
  it('rejects a passed report with no terminal evidence', () => {
    expect(() => RuntimeProductGateSchema.parse({ ...good, terminal: [], passed: true })).toThrow(/terminal evidence/u);
  });
  it('rejects a passed report with no replay evidence', () => {
    expect(() => RuntimeProductGateSchema.parse({ ...good, replay: [], passed: true })).toThrow(/replay evidence/u);
  });
  it('rejects a passed report whose journey has no terminal outcome', () => {
    expect(() => RuntimeProductGateSchema.parse({ ...good, journey: ['启动', '教学关', '无限夜巡', '检查点门', '再跑一次'], passed: true })).toThrow(/terminal evidence/u);
  });
});

describe('resolveRuntimeProductGate keeps the primary path above rescue', () => {
  const completeNatural = {
    ...goodFlow,
    buildHash: buildHashA,
    observedAt: new Date(0).toISOString(),
  };

  it('preserves a passed gate only with matching build and wiring evidence', () => {
    const existing = evaluateRuntimeProductGate({ ...good, buildHash: buildHashA });
    const preserved = resolveRuntimeProductGate({
      existing,
      currentBuildHash: buildHashA,
      runtimeWiredFiles: [...good.runtimeWiredFiles],
      browserEvidence: [...good.browserEvidence],
    });
    expect(preserved).toEqual(existing);
    expect(preserved.passed).toBe(true);
  });

  it('rejects preservation when the current build hash changes', () => {
    const existing = evaluateRuntimeProductGate({ ...good, buildHash: buildHashA });
    const rejected = resolveRuntimeProductGate({
      existing,
      currentBuildHash: buildHashB,
      runtimeWiredFiles: [...good.runtimeWiredFiles],
      browserEvidence: [...good.browserEvidence],
    });
    expect(rejected.passed).toBe(false);
    expect(rejected).not.toEqual(existing);
  });

  it('rejects preservation when the current wiring set changes', () => {
    const existing = evaluateRuntimeProductGate({ ...good, buildHash: buildHashA });
    const rejected = resolveRuntimeProductGate({
      existing,
      currentBuildHash: buildHashA,
      runtimeWiredFiles: ['workspace/game/index.html'],
      browserEvidence: [...good.browserEvidence],
    });
    expect(rejected.passed).toBe(false);
    expect(rejected).not.toEqual(existing);
  });

  it('rejects preservation of an unbound legacy passed gate', () => {
    const existing = evaluateRuntimeProductGate(good);
    const rejected = resolveRuntimeProductGate({
      existing,
      currentBuildHash: buildHashA,
      runtimeWiredFiles: [...good.runtimeWiredFiles],
      browserEvidence: [...good.browserEvidence],
    });
    expect(rejected.passed).toBe(false);
    expect(isRuntimeProductPlaceholder(rejected)).toBe(true);
  });

  it('preserves a useful failed diagnostic when no new trace is supplied', () => {
    const existing = failClosedRuntimeProductPlaceholder('prior natural trace failed');
    const preserved = resolveRuntimeProductGate({
      existing,
      currentBuildHash: buildHashB,
      runtimeWiredFiles: [],
      browserEvidence: [],
    });
    expect(preserved).toEqual(existing);
    expect(preserved.passed).toBe(false);
  });

  it('evaluates a failed new trace before any existing passed gate', () => {
    const existing = evaluateRuntimeProductGate({ ...good, buildHash: buildHashA });
    const rejected = resolveRuntimeProductGate({
      existing,
      naturalFlow: { ...completeNatural, passed: false, blockers: [] },
      currentBuildHash: buildHashA,
      runtimeWiredFiles: ['workspace/game/index.html'],
      browserEvidence: ['screenshots/natural.png'],
    });
    expect(rejected.passed).toBe(false);
    expect(rejected).not.toEqual(existing);
  });

  it('keeps missing browser evidence fail-closed without inventing a path', () => {
    const existing = evaluateRuntimeProductGate({ ...good, buildHash: buildHashA });
    const rejected = resolveRuntimeProductGate({
      existing,
      naturalFlow: completeNatural,
      currentBuildHash: buildHashA,
      runtimeWiredFiles: [...good.runtimeWiredFiles],
      browserEvidence: [],
    });
    expect(rejected.passed).toBe(false);
    expect(rejected).not.toEqual(existing);
    expect(rejected.browserEvidence).not.toContain('artifacts/runtime-product-journey.json');
  });

  it('derives from a complete natural trace when the existing report is a placeholder', () => {
    const gate = resolveRuntimeProductGate({
      existing: failClosedRuntimeProductPlaceholder(),
      naturalFlow: completeNatural,
      runtimeWiredFiles: ['workspace/game/index.html'],
      browserEvidence: ['screenshots/natural.png'],
    });
    expect(isRuntimeProductPlaceholder(gate)).toBe(false);
    expect(gate.passed).toBe(true);
    expect(gate.runtimeWiredFiles).toEqual(['workspace/game/index.html']);
  });

  it('stays fail-closed when there is no natural trace and no wired files', () => {
    const gate = resolveRuntimeProductGate({ runtimeWiredFiles: [], browserEvidence: [] });
    expect(gate.passed).toBe(false);
    expect(isRuntimeProductPlaceholder(gate)).toBe(true);
  });
});
