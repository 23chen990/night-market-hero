import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RuntimeProductGateSchema, deriveRuntimeProductGate, evaluateRuntimeProductGate, verifyRuntimeWiredFiles } from '../../src/core/runtime-product-gates.js';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

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
  const derive = (naturalFlow: unknown) => deriveRuntimeProductGate({
    naturalFlow,
    runtimeWiredFiles: ['workspace/game/index.html'],
    browserEvidence: ['screenshots/natural.png'],
  });

  it('accepts the full good-flow trace (positive control)', () => {
    const gate = derive(goodFlow);
    expect(gate.passed).toBe(true);
    expect(gate.terminal).toContain('settlement');
    expect(gate.replay).toContain('replay');
  });

  it('rejects a trace that never started from a reset', () => {
    expect(derive({ ...goodFlow, startedFromReset: false }).passed).toBe(false);
  });

  it('rejects a trace with no state transition that changed', () => {
    expect(derive({
      ...goodFlow,
      transitions: [
        { name: 'produce', changed: false, evidence: 'no change observed' },
        { name: 'settle', changed: false, evidence: 'no change observed' },
      ],
    }).passed).toBe(false);
  });

  it('rejects a trace with no terminal outcome', () => {
    expect(derive({ ...goodFlow, completion: 'none' }).passed).toBe(false);
  });

  it('rejects a trace with no replay observation', () => {
    expect(derive({ ...goodFlow, replayObserved: false }).passed).toBe(false);
  });

  it('rejects a trace that forced state via forbidden operations', () => {
    expect(derive({ ...goodFlow, passed: false, forbiddenOperations: ['page.evaluate:setState'] }).passed).toBe(false);
  });

  it('rejects a trace with an unsupported schema version', () => {
    expect(derive({ schemaVersion: 2 }).passed).toBe(false);
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
