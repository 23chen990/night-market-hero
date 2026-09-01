import { getProductionLineContract, type ProductionLine } from '../core/production-lines.js';
import {
  ProductionLinePlayEvidenceSchema,
  ProductionLinePlayEvaluationSchema,
  ProductionLinePlayPlanSchema,
  type ProductionLinePlayEvaluation,
  type ProductionLinePlayPlan,
} from '../schemas/production-line-qa.js';

export type ProductionLineQaMode = 'generic-idle' | 'line-specific-required';

/**
 * The generic browser runner only knows the idle-shop verbs.  Returning an
 * explicit mode prevents it from producing convincing but irrelevant idle
 * evidence for action, narrative or puzzle products.
 */
export function qaModeForProductionLine(lineValue: unknown): ProductionLineQaMode {
  return lineValue === 'idle-management' ? 'generic-idle' : 'line-specific-required';
}

/** Build the smallest natural-play journey that is meaningful for a line. */
export function buildProductionLinePlayPlan(lineValue: ProductionLine): ProductionLinePlayPlan {
  const contract = getProductionLineContract(lineValue);
  return ProductionLinePlayPlanSchema.parse({
    schemaVersion: 1,
    line: contract.line,
    profile: contract.primaryProfile,
    steps: contract.representativeFlow.map((label, index) => ({
      id: `${contract.line}:${index + 1}`,
      label,
      requiredEvidence: [contract.requiredEvidence[Math.min(index, contract.requiredEvidence.length - 1)] ?? 'natural input trace'],
      dimensionId: contract.acceptanceDimensions[index % contract.acceptanceDimensions.length],
      order: index + 1,
    })),
    requiredEvidence: contract.requiredEvidence,
    forbiddenOperations: ['loadScenario', 'setState', 'grantCurrency', 'teleport', 'direct-state-mutation'],
    generatedAt: new Date().toISOString(),
  });
}

export function evaluateProductionLinePlayEvidence(
  planValue: unknown,
  evidenceValue: unknown,
  options: { expectedBuildHash?: string } = {},
): ProductionLinePlayEvaluation {
  const plan = ProductionLinePlayPlanSchema.parse(planValue);
  const blockers: string[] = [];
  const parsed = ProductionLinePlayEvidenceSchema.safeParse(evidenceValue);
  if (!parsed.success) {
    return ProductionLinePlayEvaluationSchema.parse({
      schemaVersion: 1,
      line: plan.line,
      profile: plan.profile,
      passed: false,
      blockers: ['evidence-schema-invalid'],
      observedSteps: [],
      checkedAt: new Date().toISOString(),
    });
  }
  const evidence = parsed.data;
  if (evidence.line !== plan.line) blockers.push('line-mismatch');
  if (options.expectedBuildHash && evidence.buildHash !== options.expectedBuildHash) blockers.push('build-hash-mismatch');
  if (!evidence.naturalInput) blockers.push('natural-input-required');
  if (evidence.forbiddenOperations.length > 0) blockers.push('oracle-operation-used');

  const expectedIds = plan.steps.map((step) => step.id);
  const actualIds = evidence.steps.map((step) => step.id);
  if (new Set(actualIds).size !== actualIds.length) blockers.push('duplicate-step');
  for (const id of expectedIds) if (!actualIds.includes(id)) blockers.push(`missing-step:${id}`);
  for (const id of actualIds) if (!expectedIds.includes(id)) blockers.push(`unexpected-step:${id}`);
  for (const step of evidence.steps) {
    if (!step.passed) blockers.push(`failed-step:${step.id}`);
    const planStep = plan.steps.find((candidate) => candidate.id === step.id);
    if (planStep && planStep.requiredEvidence.some((required) => !step.evidence.some((item) => item.includes(required) || required.includes(item) || item.includes(step.id)))) {
      blockers.push(`missing-evidence:${step.id}`);
    }
  }

  return ProductionLinePlayEvaluationSchema.parse({
    schemaVersion: 1,
    line: plan.line,
    profile: plan.profile,
    buildHash: evidence.buildHash,
    passed: blockers.length === 0,
    blockers: [...new Set(blockers)],
    observedSteps: actualIds,
    checkedAt: new Date().toISOString(),
  });
}
