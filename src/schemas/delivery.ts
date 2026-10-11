import { z } from 'zod';

const Sha256 = z.string().regex(/^[a-f0-9]{64}$/iu);

/** The two delivery milestones intentionally stay separate from platform release. */
export const DeliveryKindSchema = z.enum(['CANDIDATE_HANDOFF', 'WEB_DELIVERY']);
export type DeliveryKind = z.infer<typeof DeliveryKindSchema>;

export const DeliveryAudienceSchema = z.enum(['player', 'developer', 'private-evidence']);
export type DeliveryAudience = z.infer<typeof DeliveryAudienceSchema>;

export const DeliveryFileSchema = z.object({ path: z.string().trim().min(1), sha256: Sha256 }).strict();

/** Hashes describe the payload and immutable evidence; manifest metadata is kept out of payloadHash. */
export const DeliveryManifestSchema = z.object({
  schemaVersion: z.literal(1),
  artifactKind: DeliveryKindSchema,
  audience: DeliveryAudienceSchema.optional(),
  gameId: z.string().trim().min(1),
  runId: z.string().trim().min(1),
  candidateId: Sha256,
  payloadRoot: z.string().trim().min(1),
  payloadFiles: z.array(DeliveryFileSchema).min(1),
  payloadHash: Sha256,
  manifestHash: Sha256,
  sourceHashes: z.record(z.string().trim().min(1), Sha256),
  qualityVerdictRefs: z.array(z.string().trim().min(1)),
  platformMatrix: z.string().trim().min(1).optional(),
  humanApprovalRefs: z.array(z.string().trim().min(1)),
  knownLimitations: z.array(z.string().trim().min(1)),
  startupInstructions: z.array(z.string().trim().min(1)).min(1),
  createdAt: z.string().datetime(),
}).strict();
export type DeliveryManifest = z.infer<typeof DeliveryManifestSchema>;
