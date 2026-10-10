import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateCostBudgetAuthorization } from '../../src/core/cost-budget-authorization.js';
import { sha256Text } from '../../src/core/files.js';
import { createFactory } from '../../src/factory.js';

const priorBudget = {
  currency: 'CNY' as const,
  maxTotalCents: 30_000,
  maxPaidTrafficCents: 10_000,
  maxAgentTokens: 500_000,
  maxHumanMinutes: 360,
  maxFixAttempts: 5,
  paybackWindowDays: 30,
  maxWallClockMinutes: 1_440,
  maxAssetBatches: 20,
  maxBuildAttempts: 2,
  maxRepairLoops: 2,
};
const usage = {
  totalCents: 0,
  paidTrafficCents: 0,
  agentTokens: 506_526,
  humanMinutes: 0,
  fixAttempts: 0,
  wallClockMinutes: 114,
  assetBatches: 0,
  buildAttempts: 0,
  repairLoops: 0,
  breakdown: { agentCents: 0, imageCents: 0, humanCents: 0, paidTrafficCents: 0, adjustmentCents: 0 },
};
const abandonment = {
  schemaVersion: 1 as const,
  runId: 'run-1',
  stage: 'REFERENCE_DEEP_RESEARCH',
  decision: 'ABANDON' as const,
  reason: 'cost-cap' as const,
  budget: priorBudget,
  usage,
  evidence: ['cost-or-fix-cap-exceeded'],
  decidedAt: new Date(0).toISOString(),
};
const abandonmentSha256 = sha256Text(JSON.stringify(abandonment));
const authorization = {
  schemaVersion: 1 as const,
  runId: 'run-1',
  scope: 'agent-token-cap' as const,
  abandonmentDecision: { path: 'artifacts/abandonment-decision.json' as const, sha256: abandonmentSha256 },
  previousMaxAgentTokens: 500_000,
  maxAgentTokens: 1_500_000,
  authorizedBy: 'human' as const,
  rationale: 'Continue the explicitly requested Luna quality run without repeating completed research.',
  authorizedAt: new Date().toISOString(),
};
const activeCostGate = {
  schemaVersion: 1 as const,
  passed: true,
  blockers: [],
  budget: priorBudget,
  usage: { ...usage, agentTokens: 487_892 },
};
const activeCostGateSha256 = sha256Text(JSON.stringify(activeCostGate));
const activeAuthorization = {
  schemaVersion: 1 as const,
  runId: 'run-1',
  scope: 'agent-token-cap' as const,
  costGate: { path: 'artifacts/cost-gate.json' as const, sha256: activeCostGateSha256 },
  previousMaxAgentTokens: 500_000,
  maxAgentTokens: 1_000_000,
  authorizedBy: 'human' as const,
  rationale: 'Continue the approved core playable slice and natural-input QA before the current ceiling is exhausted.',
  authorizedAt: new Date().toISOString(),
};

describe('cost budget authorization', () => {
  it('reopens only a cost-abandoned run and changes only its agent-token ceiling', () => {
    const result = evaluateCostBudgetAuthorization({ state: { runId: 'run-1', stage: 'ABANDONED' }, abandonment, authorization, actualAbandonmentSha256: abandonmentSha256 });
    expect(result).toMatchObject({ resumeStage: 'REFERENCE_DEEP_RESEARCH', budget: { maxAgentTokens: 1_500_000 } });
    expect(result.budget).toEqual({ ...priorBudget, maxAgentTokens: 1_500_000 });
  });

  it('rejects an unbound decision or a ceiling that cannot cover measured usage', () => {
    expect(() => evaluateCostBudgetAuthorization({ state: { runId: 'run-1', stage: 'ABANDONED' }, abandonment, authorization, actualAbandonmentSha256: sha256Text('other') })).toThrow(/hash/i);
    expect(() => evaluateCostBudgetAuthorization({
      state: { runId: 'run-1', stage: 'ABANDONED' },
      abandonment,
      authorization: { ...authorization, maxAgentTokens: usage.agentTokens },
      actualAbandonmentSha256: abandonmentSha256,
    })).toThrow(/measured usage/i);
  });

  it('does not reopen manual, fix-cap, or non-terminal runs', () => {
    expect(() => evaluateCostBudgetAuthorization({ state: { runId: 'run-1', stage: 'QA' }, abandonment, authorization, actualAbandonmentSha256: abandonmentSha256 })).toThrow(/ABANDONED/i);
    expect(() => evaluateCostBudgetAuthorization({ state: { runId: 'run-1', stage: 'ABANDONED' }, abandonment: { ...abandonment, reason: 'fix-cap' }, authorization, actualAbandonmentSha256: abandonmentSha256 })).toThrow(/cost-cap/i);
  });

  it('raises only the token ceiling for an active non-terminal run without changing its stage', () => {
    const result = evaluateCostBudgetAuthorization({
      state: { runId: 'run-1', stage: 'WAITING_FOR_REFERENCE_APPROVAL' },
      costGate: activeCostGate,
      authorization: activeAuthorization,
      actualCostGateSha256: activeCostGateSha256,
    } as any);
    expect(result).toMatchObject({
      authorizationKind: 'active',
      resumeStage: 'WAITING_FOR_REFERENCE_APPROVAL',
      budget: { maxAgentTokens: 1_000_000 },
    });
    expect(result.budget).toEqual({ ...priorBudget, maxAgentTokens: 1_000_000 });
  });

  it('rejects an active authorization with a stale cost gate or terminal state', () => {
    expect(() => evaluateCostBudgetAuthorization({
      state: { runId: 'run-1', stage: 'WAITING_FOR_REFERENCE_APPROVAL' },
      costGate: activeCostGate,
      authorization: activeAuthorization,
      actualCostGateSha256: sha256Text('stale'),
    } as any)).toThrow(/hash/i);
    expect(() => evaluateCostBudgetAuthorization({
      state: { runId: 'run-1', stage: 'COMPLETED' },
      costGate: activeCostGate,
      authorization: activeAuthorization,
      actualCostGateSha256: activeCostGateSha256,
    } as any)).toThrow(/terminal/i);
  });

  it('persists an immutable active-run basis and keeps the current stage', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'factory-active-cost-auth-'));
    const runId = 'run-1';
    const runRoot = path.join(root, 'runs', runId);
    await mkdir(path.join(runRoot, 'artifacts'), { recursive: true });
    await mkdir(path.join(runRoot, 'logs'), { recursive: true });
    const now = new Date().toISOString();
    const state = {
      schemaVersion: 1, runId, runKind: 'game', stage: 'WAITING_FOR_REFERENCE_APPROVAL', status: 'waiting', readiness: 'IN_PROGRESS',
      createdAt: now, updatedAt: now, fixAttempts: 0, prototypeBatch: 1, providerMode: 'mock', stages: {}, transitionHistory: [],
    };
    const factory = createFactory({ root, mode: 'mock', qaMode: 'stub' });
    const profile = factory.effectiveOperatingProfile;
    const gate = { ...activeCostGate, budget: profile.budget };
    const gateText = `${JSON.stringify(gate, null, 2)}\n`;
    await writeFile(path.join(runRoot, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
    await writeFile(path.join(runRoot, 'artifacts', 'factory-profile.json'), `${JSON.stringify(profile, null, 2)}\n`);
    await writeFile(path.join(runRoot, 'artifacts', 'cost-gate.json'), gateText);
    const result = await factory.authorizeCostContinuation(runId, {
      ...activeAuthorization,
      costGate: { path: 'artifacts/cost-gate.json', sha256: sha256Text(gateText) },
    });

    expect(result.state.stage).toBe('WAITING_FOR_REFERENCE_APPROVAL');
    expect(result.state.status).toBe('waiting');
    const stored = JSON.parse(await readFile(path.join(runRoot, 'artifacts', 'cost-budget-authorization.json'), 'utf8'));
    expect(stored.costGate.path).toBe('artifacts/cost-budget-authorization-basis.json');
    expect(await readFile(path.join(runRoot, 'artifacts', 'cost-budget-authorization-basis.json'), 'utf8')).toBe(gateText);
    const updatedProfile = JSON.parse(await readFile(path.join(runRoot, 'artifacts', 'factory-profile.json'), 'utf8'));
    expect(updatedProfile.budget.maxAgentTokens).toBe(1_000_000);
  });
});
