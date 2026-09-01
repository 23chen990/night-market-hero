import { z } from 'zod';

const Text = z.string().trim().min(1);

/** Durable description of the read-only filesystem view handed to research. */
export const ResearchSandboxManifestSchema = z.object({
  schemaVersion: z.literal(1),
  stage: Text,
  mode: z.literal('sanitized-read-only'),
  rootRelative: Text,
  allowedFiles: z.array(Text),
  inputHashes: z.record(Text, z.string().regex(/^[a-f0-9]{64}$/iu)),
  createdAt: z.string().datetime(),
}).strict();
export type ResearchSandboxManifest = z.infer<typeof ResearchSandboxManifestSchema>;
