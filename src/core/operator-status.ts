import { OperatorRunSummarySchema, type OperatorRunSummary, type RunState } from '../schemas/index.js';

const HUMAN_WAIT_ACTIONS: Partial<Record<RunState['stage'], { action: string; reviewArtifacts: string[]; decisionCommand: (runId: string) => string }>> = {
  WAITING_FOR_REFERENCE_APPROVAL: {
    action: 'review reference mechanic lock',
    reviewArtifacts: ['human/reference-mechanic-review.json', 'artifacts/reference-mechanic-spec.json'],
    decisionCommand: (runId) => `pnpm factory approve-reference ${runId} --decision <APPROVE|REJECT> --notes "..."`,
  },
  WAITING_FOR_PROTOTYPE_APPROVAL: {
    action: 'review prototype candidates',
    reviewArtifacts: ['human/prototype-review.json'],
    decisionCommand: (runId) => `pnpm factory approve-prototype ${runId} --decision <APPROVE|PREFER_A|PREFER_B|PREFER_C|REJECT|REVISE> --notes "..."`,
  },
  WAITING_FOR_ACTION_APPROVAL: {
    action: 'review action experiment',
    reviewArtifacts: ['human/action-mechanic-review.json', 'artifacts/action-playtest-report.json'],
    decisionCommand: (runId) => `pnpm factory approve-action ${runId} --decision <KEEP|REFACTOR|KILL> --slot <A|B|C|NONE> --rationale "..." --changes "..."`,
  },
  WAITING_FOR_ART_APPROVAL: {
    action: 'review art directions',
    reviewArtifacts: ['art-review/index.html', 'artifacts/art-directions.json'],
    decisionCommand: (runId) => `pnpm factory approve ${runId} --direction <direction-id> --notes "..."`,
  },
  WAITING_FOR_HUMAN_PLAYTEST: {
    action: 'review and play the candidate',
    reviewArtifacts: ['artifacts/build-report.json', 'artifacts/qa-report.json', 'human/playtest-acceptance.example.json'],
    decisionCommand: (runId) => `pnpm factory approve-playtest ${runId} <playtest-json>`,
  },
};

function retryStageFor(state: RunState): RunState['stage'] | undefined {
  if (state.status !== 'failed') return undefined;
  if (state.stage !== 'FAILED') return state.stage;
  return Object.values(state.stages)
    .filter((record) => record?.status === 'failed' && record.stage !== 'FAILED')
    .sort((left, right) => (right!.finishedAt ?? right!.startedAt ?? '').localeCompare(left!.finishedAt ?? left!.startedAt ?? ''))[0]?.stage;
}

function reasonFor(state: RunState, retryStage?: RunState['stage']): string | null {
  const record = state.stages[retryStage ?? state.stage];
  if (state.status === 'failed') return state.failureReason ?? record?.errors[0] ?? `stage ${state.stage} failed`;
  if (state.status !== 'waiting') return null;
  const blocked = record?.evidence.find((item) => item.startsWith('blocked:'));
  return record?.errors[0] ?? blocked ?? record?.evidence.find((item) => item.startsWith('human/')) ?? `waiting at ${state.stage}`;
}

/** Convert low-level state into one concise operator decision. This is a
 * projection only: it never changes readiness or stage state. */
export function buildOperatorRunSummary(state: RunState): OperatorRunSummary {
  const retryStage = retryStageFor(state);
  const waitReason = reasonFor(state, retryStage);
  const humanWait = state.status === 'waiting' ? HUMAN_WAIT_ACTIONS[state.stage] : undefined;
  const missingCandidateEvidence = state.stage === 'COMPLETED' && !['CANDIDATE_READY', 'RELEASE_READY'].includes(state.readiness);
  const nextAction = state.status === 'failed'
    ? retryStage ? 'retry failed stage' : 'inspect the failure'
    : missingCandidateEvidence
      ? 'review missing candidate evidence'
    : humanWait
      ? humanWait.action
      : state.status === 'waiting'
        ? 'resolve the waiting gate'
        : state.status === 'completed'
          ? 'review the completed candidate'
          : 'continue the current stage';
  const nextCommand = state.status === 'failed'
    ? retryStage ? `pnpm factory retry ${state.runId} ${retryStage}` : `pnpm factory inspect ${state.runId}`
    : missingCandidateEvidence
      ? `pnpm factory inspect ${state.runId}`
    : humanWait
      ? `pnpm factory inspect ${state.runId}`
      : state.status === 'completed'
        ? `pnpm factory operating-status ${state.runId}`
        : `pnpm factory resume ${state.runId}`;
  const reviewArtifacts = humanWait?.reviewArtifacts ?? [];
  const prototypeEvidence = state.stage === 'WAITING_FOR_PROTOTYPE_APPROVAL' && humanWait
    ? ['prototype-build-report', 'playtest-tournament', 'winner-selection', 'prototype-approval-evidence', 'prototype-approval-verification'].map(name => `artifacts/${name}.batch-${state.prototypeBatch}.json`)
    : [];
  return OperatorRunSummarySchema.parse({
    schemaVersion: 1,
    runId: state.runId,
    runKind: state.runKind,
    status: state.status,
    readiness: state.readiness,
    stage: state.stage,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    ...(state.canonicalGameId ? { canonicalGameId: state.canonicalGameId } : {}),
    ...(state.variantId ? { variantId: state.variantId } : {}),
    nextAction,
    waitReason,
    nextCommand,
    reviewArtifacts: missingCandidateEvidence ? ['artifacts/completion-gates.json', 'artifacts/runtime-product-gates.json', 'artifacts/qa-report.json', 'artifacts/release-candidate.json'] : [...reviewArtifacts, ...prototypeEvidence],
    decisionCommandTemplate: humanWait?.decisionCommand(state.runId) ?? null,
  });
}
