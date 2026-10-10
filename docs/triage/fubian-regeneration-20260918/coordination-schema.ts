import { z } from 'zod';
import { AgentPackageSchema } from '../../../src/agents/packages.js';

const Text = z.string().trim().min(1);
const Artifact = z.object({ path: Text, schema: Text, sha256: z.string().regex(/^[a-f0-9]{64}$/u).optional() }).strict();
export const RunWorkerTaskSchema = z.object({
  schemaVersion: z.literal(1), taskId: Text, targetRunId: Text, targetGame: Text,
  workspace: Text, role: z.enum(['ResearchAgent', 'ProducerAgent', 'BuilderAgent', 'FixerAgent', 'QAAgent']),
  package: AgentPackageSchema, ownership: z.array(Text).min(1),
  inputs: z.array(Artifact).min(1), instructions: z.array(Text).min(1),
  acceptanceChecks: z.array(Text).min(1), omittedContext: z.array(Text), outputPath: Text,
}).strict();
export const RunWorkerResultSchema = z.object({
  schemaVersion: z.literal(1), taskId: Text, targetRunId: Text, targetGame: Text, workspace: Text,
  role: z.enum(['ResearchAgent', 'ProducerAgent', 'BuilderAgent', 'FixerAgent', 'QAAgent']),
  status: z.enum(['READY', 'BUILT', 'PASS', 'BLOCKED', 'FAILED']),
  route: z.enum(['read-only-review', 'factory-stage', 'direct-builder', 'formal-fixer']),
  routeReason: Text, artifacts: z.array(Artifact), filesChanged: z.array(Text),
  checks: z.array(z.object({ id: Text, passed: z.boolean(), evidence: Text }).strict()),
  blockers: z.array(Text), omittedContext: z.array(Text), nextAction: Text,
}).strict();
