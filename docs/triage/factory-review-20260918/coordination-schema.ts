import { z } from 'zod';

const Text = z.string().trim().min(1);
export const FactoryRepairTaskSchema = z.object({
  schemaVersion: z.literal(1),
  taskId: Text,
  role: z.literal('FactoryMaintainer'),
  route: z.literal('shared-factory'),
  repository: Text,
  ownership: z.array(Text).min(1),
  triagePath: Text,
  reproductionMatrixPath: Text,
  findings: z.array(Text).min(1),
  instructions: z.array(Text).min(1),
  acceptanceChecks: z.array(Text).min(1),
  omittedContext: z.array(Text),
  outputPath: Text,
}).strict();

export const FactoryRepairResultSchema = z.object({
  schemaVersion: z.literal(1),
  taskId: Text,
  route: z.literal('shared-factory'),
  routeReason: Text,
  status: z.enum(['IMPLEMENTED', 'BLOCKED']),
  filesChanged: z.array(Text),
  omittedContext: z.array(Text),
  tests: z.array(z.object({ command: Text, phase: z.enum(['RED', 'GREEN', 'VERIFY']), exitCode: z.number().int(), summary: Text }).strict()),
  remainingGaps: z.array(Text),
}).strict();
