import { AbandonmentDecisionSchema } from '../schemas/launch-operations.js';
import { CostGateReportSchema } from '../schemas/factory-operating.js';
import { ActiveCostBudgetAuthorizationSchema, CostBudgetAuthorizationSchema } from '../schemas/cost-budget-authorization.js';
import { StageNameSchema } from '../schemas/stage-name.js';

export function resolveAuthorizedCostBudget(input: {
  runId: string;
  abandonment: unknown;
  authorization: unknown;
  actualAbandonmentSha256: string;
}) {
  const abandonment = AbandonmentDecisionSchema.parse(input.abandonment);
  const authorization = CostBudgetAuthorizationSchema.parse(input.authorization);
  if (input.runId !== authorization.runId || abandonment.runId !== authorization.runId) throw new Error('cost continuation run mismatch');
  if (abandonment.decision !== 'ABANDON' || abandonment.reason !== 'cost-cap') throw new Error('cost continuation requires a cost-cap abandonment decision');
  if (authorization.abandonmentDecision.sha256 !== input.actualAbandonmentSha256) throw new Error('cost continuation abandonment-decision hash mismatch');
  if (authorization.previousMaxAgentTokens !== abandonment.budget.maxAgentTokens) throw new Error('cost continuation previous token ceiling mismatch');
  if (authorization.maxAgentTokens <= abandonment.usage.agentTokens) throw new Error('authorized token ceiling must exceed measured usage');
  const resumeStage = StageNameSchema.parse(abandonment.stage);
  if (resumeStage === 'ABANDONED' || resumeStage === 'COMPLETED') throw new Error(`cost continuation cannot resume terminal stage ${resumeStage}`);
  return {
    authorizationKind: 'abandonment' as const,
    authorization,
    resumeStage,
    budget: { ...abandonment.budget, maxAgentTokens: authorization.maxAgentTokens },
  };
}

export function resolveActiveAuthorizedCostBudget(input: {
  runId: string;
  costGate: unknown;
  authorization: unknown;
  actualCostGateSha256: string;
}) {
  const costGate = CostGateReportSchema.parse(input.costGate);
  const authorization = ActiveCostBudgetAuthorizationSchema.parse(input.authorization);
  if (input.runId !== authorization.runId) throw new Error('cost continuation run mismatch');
  if (authorization.costGate.sha256 !== input.actualCostGateSha256) throw new Error('cost continuation cost-gate hash mismatch');
  if (authorization.previousMaxAgentTokens !== costGate.budget.maxAgentTokens) throw new Error('cost continuation previous token ceiling mismatch');
  if (authorization.maxAgentTokens <= costGate.usage.agentTokens) throw new Error('authorized token ceiling must exceed measured usage');
  return {
    authorizationKind: 'active' as const,
    authorization,
    budget: { ...costGate.budget, maxAgentTokens: authorization.maxAgentTokens },
  };
}

export function evaluateCostBudgetAuthorization(input: {
  state: { runId: string; stage: string };
  abandonment?: unknown;
  costGate?: unknown;
  authorization: unknown;
  actualAbandonmentSha256?: string;
  actualCostGateSha256?: string;
}) {
  const active = ActiveCostBudgetAuthorizationSchema.safeParse(input.authorization);
  if (active.success) {
    const stage = StageNameSchema.parse(input.state.stage);
    if (stage === 'ABANDONED' || stage === 'COMPLETED') throw new Error(`cost continuation cannot authorize terminal stage ${stage}`);
    if (!input.costGate || !input.actualCostGateSha256) throw new Error('active cost continuation requires a cost gate and hash');
    const result = resolveActiveAuthorizedCostBudget({
      runId: input.state.runId,
      costGate: input.costGate,
      authorization: active.data,
      actualCostGateSha256: input.actualCostGateSha256,
    });
    return { ...result, resumeStage: stage };
  }
  if (input.state.stage !== 'ABANDONED') throw new Error('cost continuation requires an ABANDONED run');
  if (!input.abandonment || !input.actualAbandonmentSha256) throw new Error('abandoned cost continuation requires an abandonment decision and hash');
  return resolveAuthorizedCostBudget({
    runId: input.state.runId,
    abandonment: input.abandonment,
    authorization: input.authorization,
    actualAbandonmentSha256: input.actualAbandonmentSha256,
  });
}
