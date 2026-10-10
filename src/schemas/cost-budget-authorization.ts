import { z } from 'zod';

const Sha256 = z.string().regex(/^[a-f0-9]{64}$/u);

const sharedAuthorizationShape = {
  schemaVersion: z.literal(1),
  runId: z.string().trim().min(1),
  scope: z.literal('agent-token-cap'),
  previousMaxAgentTokens: z.number().int().positive(),
  maxAgentTokens: z.number().int().positive(),
  authorizedBy: z.literal('human'),
  rationale: z.string().trim().min(1),
  authorizedAt: z.string().datetime(),
};

function requireCeilingIncrease(
  value: { previousMaxAgentTokens: number; maxAgentTokens: number },
  context: z.RefinementCtx,
) {
  if (value.maxAgentTokens <= value.previousMaxAgentTokens) {
    context.addIssue({ code: 'custom', path: ['maxAgentTokens'], message: 'authorized token ceiling must increase the previous ceiling' });
  }
}

/** Human authorization for reopening one run stopped only by its token cap.
 * It cannot relax money, time, asset, build, or repair ceilings. */
export const CostBudgetAuthorizationSchema = z.object({
  ...sharedAuthorizationShape,
  abandonmentDecision: z.object({
    path: z.literal('artifacts/abandonment-decision.json'),
    sha256: Sha256,
  }).strict(),
}).strict().superRefine(requireCeilingIncrease);

/** Human authorization to raise the token ceiling before an active run hits it.
 * The authorization is hash-bound to the last generated cost gate and is
 * persisted against an immutable snapshot after validation. */
export const ActiveCostBudgetAuthorizationSchema = z.object({
  ...sharedAuthorizationShape,
  costGate: z.object({
    path: z.enum(['artifacts/cost-gate.json', 'artifacts/cost-budget-authorization-basis.json']),
    sha256: Sha256,
  }).strict(),
}).strict().superRefine(requireCeilingIncrease);

export const AnyCostBudgetAuthorizationSchema = z.union([
  CostBudgetAuthorizationSchema,
  ActiveCostBudgetAuthorizationSchema,
]);

export type CostBudgetAuthorization = z.infer<typeof CostBudgetAuthorizationSchema>;
export type ActiveCostBudgetAuthorization = z.infer<typeof ActiveCostBudgetAuthorizationSchema>;
export type AnyCostBudgetAuthorization = z.infer<typeof AnyCostBudgetAuthorizationSchema>;
