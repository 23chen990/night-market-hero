import { z } from 'zod';

export const StageNameSchema = z.enum(['CREATED', 'BLUEPRINT', 'ART_DIRECTIONS', 'WAITING_FOR_ART_APPROVAL', 'STYLE_LOCK', 'ASSETS', 'BUILD', 'QA', 'FIX', 'RELEASE', 'COMPLETED', 'FAILED']);
export type StageName = z.infer<typeof StageNameSchema>;
export const ExecutionStatusSchema = z.enum(['pending', 'running', 'waiting', 'completed', 'failed']);

export const SeedSchema = z.object({
  title: z.string().min(1),
  theme: z.string().min(1),
  template: z.literal('idle-shop-v1'),
  preferences: z.record(z.string(), z.unknown()).default({}),
});
export type Seed = z.infer<typeof SeedSchema>;

export const GameBlueprintSchema = z.object({
  schemaVersion: z.literal(1), gameId: z.string(), title: z.string(), theme: z.string(), runtime: z.literal('web-lite'), template: z.literal('idle-shop-v1'),
  concept: z.string(), coreLoop: z.array(z.string()).min(4), content: z.object({ productName: z.string(), customerName: z.string(), currencyName: z.string() }),
  balance: z.object({ startingCurrency: z.number().int().nonnegative(), orderReward: z.number().int().positive(), baseUpgradeCost: z.number().int().positive() }),
  preferences: z.record(z.string(), z.unknown()),
});
export type GameBlueprint = z.infer<typeof GameBlueprintSchema>;

export const ArtDirectionSchema = z.object({
  id: z.string().regex(/^direction_[a-d]$/), name: z.string(), keywords: z.array(z.string()).min(1), palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(1),
  characterProportion: z.string(), uiStyle: z.string(), sceneStyle: z.string(), forbidden: z.array(z.string()), productionComplexity: z.enum(['low', 'medium', 'high']), imagePrompt: z.string(), previewPath: z.string().optional(),
});
export const ArtDirectionsSchema = z.object({ directions: z.array(ArtDirectionSchema).length(4).refine((items) => new Set(items.map((item) => item.id)).size === 4, 'direction ids must be unique') });
export type ArtDirections = z.infer<typeof ArtDirectionsSchema>;

export const ArtApprovalSchema = z.object({ selected_direction: z.string().regex(/^direction_[a-d]$/), keep: z.array(z.string()).default([]), change: z.array(z.string()).default([]), notes: z.array(z.string()).default([]) });
export type ArtApproval = z.infer<typeof ArtApprovalSchema>;
export const StyleLockSchema = z.object({ schemaVersion: z.literal(1), directionId: z.string(), direction: ArtDirectionSchema, kept: z.array(z.string()), changes: z.array(z.string()), notes: z.array(z.string()), lockedAt: z.string() });
export type StyleLock = z.infer<typeof StyleLockSchema>;

export const AssetItemSchema = z.object({ id: z.string(), kind: z.enum(['character', 'product', 'background', 'ui', 'marketing']), path: z.string(), prompt: z.string(), status: z.literal('generated'), sha256: z.string() });
export const AssetManifestSchema = z.object({ schemaVersion: z.literal(1), assets: z.array(AssetItemSchema).min(4), provider: z.string() });
export type AssetManifest = z.infer<typeof AssetManifestSchema>;

export const BuildReportSchema = z.object({ schemaVersion: z.literal(1), success: z.boolean(), runtime: z.literal('web-lite'), template: z.string(), codexThreadId: z.string().optional(), workspace: z.string(), webBuild: z.string(), files: z.array(z.string()), builtAt: z.string() });
export type BuildReport = z.infer<typeof BuildReportSchema>;
export const QaIssueSchema = z.object({ id: z.string(), severity: z.enum(['error', 'warning']), message: z.string(), evidence: z.string() });
export const QaReportSchema = z.object({ schemaVersion: z.literal(1), passed: z.boolean(), checks: z.array(z.object({ name: z.string(), passed: z.boolean(), evidence: z.string() })), issues: z.array(QaIssueSchema), screenshots: z.array(z.string()), consoleLog: z.string(), testedAt: z.string() });
export type QaReport = z.infer<typeof QaReportSchema>;
export const ReleaseManifestSchema = z.object({ schemaVersion: z.literal(1), name: z.string(), description: z.string(), entrypoint: z.string(), iconAndPromoAssets: z.array(z.string()), reports: z.array(z.string()), files: z.array(z.object({ path: z.string(), sha256: z.string() })), createdAt: z.string() });
export type ReleaseManifest = z.infer<typeof ReleaseManifestSchema>;

export const StageRecordSchema = z.object({ stage: StageNameSchema, status: ExecutionStatusSchema, startedAt: z.string().nullable(), finishedAt: z.string().nullable(), attempts: z.number().int().nonnegative(), inputArtifacts: z.array(z.string()), outputArtifacts: z.array(z.string()), errors: z.array(z.string()), evidence: z.array(z.string()) });
export type StageRecord = z.infer<typeof StageRecordSchema>;
export const RunStateSchema = z.object({ schemaVersion: z.literal(1), runId: z.string(), stage: StageNameSchema, status: ExecutionStatusSchema, createdAt: z.string(), updatedAt: z.string(), fixAttempts: z.number().int().nonnegative(), providerMode: z.enum(['mock', 'real']), codexThreadId: z.string().optional(), stages: z.record(z.string(), StageRecordSchema) });
export type RunState = z.infer<typeof RunStateSchema>;
