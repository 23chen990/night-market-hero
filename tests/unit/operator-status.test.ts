import { describe, expect, it } from 'vitest';
import { buildOperatorRunSummary } from '../../src/core/operator-status.js';
import { RunStateSchema } from '../../src/schemas/index.js';

describe('operator run status', () => {
  it('does not describe a completed implementation with missing evidence as a completed candidate', () => {
    const state = RunStateSchema.parse({ schemaVersion: 1, runId: 'unverified', stage: 'COMPLETED', status: 'completed', readiness: 'IMPLEMENTATION_READY', providerMode: 'mock', fixAttempts: 0, stages: {}, createdAt: '2026-10-08T00:00:00.000Z', updatedAt: '2026-10-08T00:00:00.000Z' });
    expect(buildOperatorRunSummary(state)).toMatchObject({ nextAction: 'review missing candidate evidence', nextCommand: 'pnpm factory inspect unverified', reviewArtifacts: expect.arrayContaining(['artifacts/runtime-product-gates.json', 'artifacts/completion-gates.json']) });
  });
  it('recovers the actual failed stage from the terminal failure wrapper', () => {
    const state = RunStateSchema.parse({
      schemaVersion: 1, runId: 'wrapped-failure', runKind: 'game', stage: 'FAILED', status: 'failed',
      readiness: 'FAILED', createdAt: '2026-10-08T00:00:00.000Z', updatedAt: '2026-10-08T00:02:00.000Z',
      fixAttempts: 0, providerMode: 'mock',
      stages: Object.fromEntries(['FULL_BUILD', 'QA'].map((stage, index) => [stage, {
        stage, status: 'failed', startedAt: '2026-10-08T00:00:00.000Z',
        finishedAt: `2026-10-08T00:0${index + 1}:00.000Z`, attempts: 1,
        inputArtifacts: [], outputArtifacts: [], errors: [`${stage} failed`], evidence: [],
        providerCalls: { agent: 0, image: 0 }, tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      }])),
    });
    expect(buildOperatorRunSummary(state)).toMatchObject({
      stage: 'FAILED', nextCommand: 'pnpm factory retry wrapped-failure QA', waitReason: 'QA failed',
    });
    expect(buildOperatorRunSummary({ ...state, stages: {} })).toMatchObject({
      nextAction: 'inspect the failure', nextCommand: 'pnpm factory inspect wrapped-failure',
    });
  });
  it('points a human wait to review materials before a neutral decision template', () => {
    const summary = buildOperatorRunSummary({
      schemaVersion: 1,
      runId: 'run-reference',
      runKind: 'game',
      stage: 'WAITING_FOR_REFERENCE_APPROVAL',
      status: 'waiting',
      readiness: 'WAITING',
      createdAt: '2026-10-03T00:00:00.000Z',
      updatedAt: '2026-10-03T00:01:00.000Z',
      fixAttempts: 0,
      prototypeBatch: 1,
      providerMode: 'mock',
      stages: {
        WAITING_FOR_REFERENCE_APPROVAL: {
          stage: 'WAITING_FOR_REFERENCE_APPROVAL',
          status: 'waiting',
          startedAt: '2026-10-03T00:01:00.000Z',
          finishedAt: null,
          attempts: 1,
          inputArtifacts: ['artifacts/reference-mechanic-spec.json'],
          outputArtifacts: ['human/reference-decision.yaml'],
          errors: [],
          evidence: ['human/reference-decision.example.yaml'],
          providerCalls: { agent: 0, image: 0 },
          tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        },
      },
      transitionHistory: [],
    });

    expect(summary).toMatchObject({
      runId: 'run-reference',
      readiness: 'WAITING',
      waitReason: 'human/reference-decision.example.yaml',
      nextAction: 'review reference mechanic lock',
      nextCommand: 'pnpm factory inspect run-reference',
      reviewArtifacts: ['human/reference-mechanic-review.json', 'artifacts/reference-mechanic-spec.json'],
      decisionCommandTemplate: 'pnpm factory approve-reference run-reference --decision <APPROVE|REJECT> --notes "..."',
    });
  });

  it('turns a failed run into a retry command without hiding the stage', () => {
    const summary = buildOperatorRunSummary({
      schemaVersion: 1,
      runId: 'run-failed',
      runKind: 'game',
      stage: 'QA',
      status: 'failed',
      readiness: 'FAILED',
      createdAt: '2026-10-03T00:00:00.000Z',
      updatedAt: '2026-10-03T00:01:00.000Z',
      fixAttempts: 1,
      prototypeBatch: 1,
      providerMode: 'mock',
      failureReason: 'browser journey failed',
      stages: {
        QA: {
          stage: 'QA',
          status: 'failed',
          startedAt: '2026-10-03T00:01:00.000Z',
          finishedAt: '2026-10-03T00:01:01.000Z',
          attempts: 1,
          inputArtifacts: [],
          outputArtifacts: [],
          errors: ['browser journey failed'],
          evidence: [],
          providerCalls: { agent: 0, image: 0 },
          tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        },
      },
      transitionHistory: [],
    });

    expect(summary).toMatchObject({
      status: 'failed',
      waitReason: 'browser journey failed',
      nextAction: 'retry failed stage',
      nextCommand: 'pnpm factory retry run-failed QA',
    });
  });

  it.each([
    ['WAITING_FOR_PROTOTYPE_APPROVAL', 'human/prototype-review.json', '<APPROVE|PREFER_A|PREFER_B|PREFER_C|REJECT|REVISE>'],
    ['WAITING_FOR_ACTION_APPROVAL', 'human/action-mechanic-review.json', '<KEEP|REFACTOR|KILL>'],
    ['WAITING_FOR_ART_APPROVAL', 'art-review/index.html', '<direction-id>'],
    ['WAITING_FOR_HUMAN_PLAYTEST', 'artifacts/build-report.json', '<playtest-json>'],
  ] as const)('keeps %s review-first without inventing a positive decision', (stage, reviewPath, placeholder) => {
    const state = RunStateSchema.parse({
      schemaVersion: 1, runId: 'review-run', runKind: 'game', stage, status: 'waiting', readiness: 'WAITING',
      createdAt: '2026-10-08T00:00:00.000Z', updatedAt: '2026-10-08T00:00:00.000Z',
      fixAttempts: 0, providerMode: 'mock', stages: {},
    });
    const summary = buildOperatorRunSummary(state);
    expect(summary.nextCommand).toBe('pnpm factory inspect review-run');
    expect(summary.nextAction).toMatch(/^review /u);
    expect(summary.reviewArtifacts).toContain(reviewPath);
    expect(summary.decisionCommandTemplate).toContain(placeholder);
    expect(state.stage).toBe(stage);
    expect(state.status).toBe('waiting');
  });
});
