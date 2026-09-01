import { z } from 'zod';

const Stage = z.string().trim().min(1);
export const PipelineModeSchema = z.enum(['fast-reskin', 'full-validation']);
export type PipelineMode = z.infer<typeof PipelineModeSchema>;

export const PipelinePlanSchema = z.object({
  schemaVersion: z.literal(1),
  mode: PipelineModeSchema,
  designMode: z.enum(['reference_reskin', 'prototype_tournament']),
  productionLine: z.string().trim().min(1),
  mandatoryStages: z.array(Stage).min(1),
  skippedStages: z.array(Stage),
  optionalStages: z.array(Stage).default([]),
  humanApprovalSessions: z.array(z.enum(['GO_NO_GO', 'CORE_DEMO', 'FINAL_RELEASE'])).length(3),
  releaseCriticalStages: z.array(Stage).min(1),
  rationale: z.string().trim().min(1),
}).strict().superRefine((plan, context) => {
  const mandatory = new Set(plan.mandatoryStages);
  const overlap = plan.skippedStages.find((stage) => mandatory.has(stage));
  if (overlap) context.addIssue({ code: 'custom', path: ['skippedStages'], message: `stage ${overlap} cannot be both mandatory and skipped` });
  const optionalOverlap = plan.optionalStages.find((stage) => mandatory.has(stage) || plan.skippedStages.includes(stage));
  if (optionalOverlap) context.addIssue({ code: 'custom', path: ['optionalStages'], message: `stage ${optionalOverlap} cannot be mandatory, skipped and optional at the same time` });
  for (const stage of plan.releaseCriticalStages) {
    if (!mandatory.has(stage)) context.addIssue({ code: 'custom', path: ['releaseCriticalStages'], message: `release-critical stage ${stage} must be mandatory` });
  }
});
export type PipelinePlan = z.infer<typeof PipelinePlanSchema>;
