import { readFileSync } from 'node:fs';
import { z } from 'zod';

const nonnegativeInt = z.number().int().nonnegative();
const checkpointSchema = z.object({
  schemaVersion: z.literal(1),
  checkpointId: z.string().min(1),
  targetGame: z.literal('海滩渔货铺'),
  targetWorkspace: z.literal('runs/20260830210424-pawshop-v1/workspace/game'),
  status: z.literal('green'),
  createdAt: z.string().min(1),
  baseline: z.object({
    unit: z.object({ command: z.string(), testFiles: z.literal(6), tests: z.literal(42), failed: z.literal(0) }),
    staticChecks: z.object({ lint: z.literal(0), typecheck: z.literal(0), build: z.literal(0) }),
    browser: z.object({
      engine: z.string(),
      viewports: z.array(z.enum(['360x800', '390x844', '430x932'])).length(3),
      blackBlockCount: z.literal(0),
      textureUploadWarningCount: z.literal(0),
      consoleErrorCount: z.literal(0),
      pageErrorCount: z.literal(0),
      completeBusinessLoop: z.literal(true),
      fullShelfBoundary: z.literal(true),
      legacyMigration: z.literal(true),
      refreshRecovery: z.literal(true),
      meaningfulAlphaComposites: z.literal(true)
    })
  }),
  evidence: z.record(z.string(), z.string().min(1)),
  criticalHashes: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)).refine((value) => Object.keys(value).length >= 9),
  authorizedIncrement: z.object({
    selected: z.literal('8-frame character movement animation'),
    excluded: z.array(z.string()).min(5),
    rollbackOnRegression: z.literal(true)
  })
});

const checkpoint = JSON.parse(readFileSync(new URL('./checkpoint.green-baseline.json', import.meta.url), 'utf8'));
checkpointSchema.parse(checkpoint);
console.log(JSON.stringify({ valid: true, checkpointId: checkpoint.checkpointId, tests: checkpoint.baseline.unit.tests }));
