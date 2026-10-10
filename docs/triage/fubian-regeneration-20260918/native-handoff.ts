import { z } from 'zod';
import { AgentPackageSchema } from '../../../src/agents/packages.js';

const Text = z.string().min(1);
export const NativeRequestSchema = z.object({
  schemaVersion: z.literal(1), requestId: Text, runId: Text,
  stage: z.enum(['REFERENCE_DEEP_RESEARCH', 'BLUEPRINT', 'FULL_BUILD', 'FIX']),
  model: z.literal('gpt-5.6-luna'), package: AgentPackageSchema,
  cwd: Text, runRoot: Text, outputPath: Text, receiptPath: Text,
  prompt: Text, outputSchema: z.unknown().optional(), resumeThreadId: Text.optional(),
  createdAt: z.iso.datetime(),
}).strict();
export const NativeReceiptSchema = z.object({
  schemaVersion: z.literal(1), requestId: Text, stage: Text,
  model: Text, agentId: Text, outputPath: Text,
  sha256: z.string().regex(/^[a-f0-9]{64}$/u), completedAt: z.iso.datetime(),
}).strict();

export function validateNativeReceipt(request: { requestId: string; stage: string; model: string }, value: unknown, outputSha256: string) {
  const receipt = NativeReceiptSchema.parse(value);
  if (receipt.requestId !== request.requestId || receipt.stage !== request.stage || receipt.model !== request.model) throw new Error('Native receipt request, stage or model mismatch');
  if (receipt.sha256 !== outputSha256) throw new Error('Native output hash mismatch');
  return receipt;
}
