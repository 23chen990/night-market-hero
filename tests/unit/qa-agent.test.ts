import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { QAAgent } from '../../src/agents/index.js';
import type { QAProvider } from '../../src/providers/interfaces.js';
import type { RuntimeAdapter } from '../../src/adapters/runtime.js';

describe('QAAgent evidence normalization', () => {
  it('creates usable fallback evidence when a provider returns an empty evidence list', async () => {
    const runRoot = await mkdtemp(path.join(os.tmpdir(), 'factory-qa-agent-'));
    await mkdir(path.join(runRoot, 'artifacts'), { recursive: true });
    const provider: QAProvider = {
      playtest: async () => ({
        schemaVersion: 1,
        passed: true,
        checks: [{ name: 'provider-check', passed: true, evidence: 'provider' }],
        issues: [],
        screenshots: [],
        consoleLog: 'logs/console.log',
        testedAt: new Date(0).toISOString(),
        evidence: [],
      }),
      playtestTournament: async () => ({}),
      playtestActionMechanics: async () => ({}),
    };
    const runtime = {} as RuntimeAdapter;

    try {
      const report = await new QAAgent(provider, runtime).run(path.join(runRoot, 'workspace', 'game'), runRoot, true);
      const evidence = JSON.parse(await readFile(path.join(runRoot, 'artifacts', 'qa-evidence.json'), 'utf8')) as Array<{ artifacts: string[] }>;
      expect(report.evidence).toHaveLength(1);
      expect(evidence).toHaveLength(1);
      expect(evidence[0]?.artifacts.length).toBeGreaterThan(0);
    } finally {
      await rm(runRoot, { recursive: true, force: true });
    }
  });

  it('does not crash when one provider evidence item violates the evidence contract', async () => {
    const runRoot = await mkdtemp(path.join(os.tmpdir(), 'factory-qa-agent-invalid-'));
    await mkdir(path.join(runRoot, 'artifacts'), { recursive: true });
    const provider: QAProvider = {
      playtest: async () => ({
        schemaVersion: 1,
        passed: false,
        checks: [{ name: 'provider-check', passed: false, evidence: 'provider' }],
        issues: [],
        screenshots: [],
        consoleLog: 'logs/console.log',
        testedAt: new Date(0).toISOString(),
        evidence: [{ schemaVersion: 1, mode: 'NATURAL_E2E', actions: ['tap'], artifacts: [], forbiddenOperations: [] }],
      }),
      playtestTournament: async () => ({}),
      playtestActionMechanics: async () => ({}),
    };

    try {
      const report = await new QAAgent(provider, {} as RuntimeAdapter).run(path.join(runRoot, 'workspace', 'game'), runRoot, false);
      expect(report.evidence?.every((item) => item.artifacts.length > 0)).toBe(true);
      expect(report.issues.some((issue) => issue.id === 'qa-evidence-normalization')).toBe(true);
    } finally {
      await rm(runRoot, { recursive: true, force: true });
    }
  });

  it('turns a declared continuity failure into a QA blocker and persists machine evidence', async () => {
    const runRoot = await mkdtemp(path.join(os.tmpdir(), 'factory-qa-agent-continuity-'));
    await mkdir(path.join(runRoot, 'artifacts'), { recursive: true });
    const provider: QAProvider = {
      playtest: async () => ({
        schemaVersion: 1, passed: true, checks: [], issues: [], screenshots: [], consoleLog: 'logs/console.log', testedAt: new Date(0).toISOString(),
        interactionContinuityContract: {
          schemaVersion: 1, contractId: 'c', gameId: 'g', targetWorkspace: 'workspace/game', fixedStepMs: 16,
          actions: [{ actionId: 'a', feedbackSignal: 'glow', successCondition: 'resolved', constraints: [{ id: 'r', measure: 'steps', operator: '<=', target: 2 }], recovery: { required: true, description: 'retry' }, repetition: { attempts: 1, minimumSuccesses: 1 }, evidence: { flow: ['flow'], state: ['state'], visual: ['visual'] } }],
          nodes: [{ nodeId: 'n', actionId: 'a', feedbackVisible: true, highlightedActionId: 'a', actionCandidates: ['a'], selectedActionId: 'a', success: true, successState: 'resolved', terminal: true, recoverable: false, successorIds: [], failure: false, recoverySuccessorIds: [], physicalResult: 'none', candidateVerified: false, stateTransitionVerified: true, physicalResultVerified: false }],
          scenarios: [
            { id: 'normal', simulated: true, passed: true, fixedStepTicks: 1, evidence: ['n'] },
            { id: 'edge', simulated: true, passed: true, fixedStepTicks: 1, evidence: ['e'] },
            { id: 'rescue', simulated: true, passed: true, fixedStepTicks: 1, evidence: ['r'] },
          ],
        },
        interactionContinuityObservation: { nodes: [], repetitions: [] },
      }),
      playtestTournament: async () => ({}), playtestActionMechanics: async () => ({}),
    };
    try {
      const report = await new QAAgent(provider, {} as RuntimeAdapter).run(path.join(runRoot, 'workspace', 'game'), runRoot, true);
      expect(report.passed).toBe(false);
      expect(report.interactionContinuity?.passed).toBe(false);
      expect(JSON.parse(await readFile(path.join(runRoot, 'artifacts/interaction-continuity-report.json'), 'utf8')).passed).toBe(false);
    } finally { await rm(runRoot, { recursive: true, force: true }); }
  });
});
