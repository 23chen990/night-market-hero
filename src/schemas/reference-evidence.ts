import { z } from 'zod';

const Text = z.string().trim().min(1);
const Sha256 = z.string().regex(/^[a-f0-9]{64}$/iu);
const EvidenceClaimRefSchema = z.object({
  id: Text,
  statement: Text,
  status: z.enum(['OBSERVED', 'INFERRED', 'UNKNOWN']),
  sourceRefs: z.array(Text),
  sourceHashes: z.array(Sha256),
  confidence: z.number().min(0).max(1),
  evidence: z.array(Text),
  createdAt: z.string().datetime(),
}).strict();

export const ReferenceEvidencePackSchema = z.object({
  schemaVersion: z.literal(1),
  targetRunId: Text,
  benchmark: z.object({ name: Text, url: z.url() }).strict(),
  sourceFiles: z.array(z.object({ path: Text, sha256: Sha256, observations: z.array(Text) }).strict()),
  observations: z.array(Text),
  inferences: z.array(Text),
  unknowns: z.array(Text),
  mechanicMap: z.object({ coreLoop: z.array(Text).min(4), playerActions: z.array(Text).min(1), progressionSystems: z.array(Text).min(1), unlockRules: z.array(Text).min(1), feedbackCadence: z.object({ immediateSeconds: z.number().positive(), microGoalMinSeconds: z.number().positive(), microGoalMaxSeconds: z.number().positive() }).strict() }).strict(),
  expressionBoundary: z.object({ allowed: z.array(Text).min(1), forbidden: z.array(Text).min(6) }).strict(),
  similarityRedFlags: z.array(Text),
  evidenceQuality: z.enum(['supplemented', 'human-lock-only']),
  status: z.enum(['READY', 'BLOCKED']),
  /** Claim-level provenance is optional for legacy packs and required by new research runs. */
  claims: z.array(EvidenceClaimRefSchema).default([]),
  researchedAt: z.string().datetime(),
}).strict().superRefine((pack, context) => {
  const all = [...pack.observations, ...pack.inferences, ...pack.unknowns];
  if (new Set(all).size !== all.length) context.addIssue({ code: 'custom', message: 'observation, inference and unknown entries must be unique' });
  if (pack.status === 'READY' && pack.unknowns.length > 0) context.addIssue({ code: 'custom', path: ['status'], message: 'READY evidence cannot retain unknowns' });
  if (pack.status === 'BLOCKED' && pack.unknowns.length === 0 && pack.similarityRedFlags.length === 0) context.addIssue({ code: 'custom', path: ['status'], message: 'BLOCKED evidence requires an unknown or similarity red flag' });
});
export type ReferenceEvidencePack = z.infer<typeof ReferenceEvidencePackSchema>;
