import { describe, expect, it } from 'vitest';
import { RuntimeProductGateSchema, evaluateRuntimeProductGate, deriveRuntimeProductGate } from '../../src/core/runtime-product-gates.js';

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
