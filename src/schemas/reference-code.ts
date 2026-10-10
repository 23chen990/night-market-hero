import { z } from 'zod';
import { REFERENCE_BEHAVIOR_DIMENSIONS } from './reference-fidelity.js';

const Text = z.string().trim().min(1);
const Sha256 = z.string().regex(/^[a-f0-9]{64}$/iu);
const AbsolutePath = Text.refine((value) => value.startsWith('/'), 'path must be absolute');
const ParsableUrl = Text.refine((value) => { try { new URL(value); return true; } catch { return false; } }, 'must be a parsable URL');
const Count = z.number().int().nonnegative();
const Line = z.number().int().positive();
const RunRelativePath = Text.refine((value) => !value.startsWith('/') && !value.split(/[\\/]/u).includes('..'), 'path must stay relative to the owning run');

export const REFERENCE_CODE_PACKAGE_INDEX_NAME = 'reference-code-package.json';
export const REFERENCE_CODE_ANALYSIS_ARTIFACT = 'reference-code-analysis.json';
export const REFERENCE_CODE_PACKAGE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/u;
export const referenceCodeEvidenceId = (packageId: string) => `code-package-${packageId}`;

export const ReferenceCodeEngineSchema = z.enum(['defold']);

export const ReferenceCodePackageSchema = z.object({
  schemaVersion: z.literal(1),
  artifactType: z.literal('reference-code-package'),
  packageId: z.string().regex(REFERENCE_CODE_PACKAGE_ID),
  targetGame: Text,
  workspace: AbsolutePath,
  requestedUrl: ParsableUrl,
  finalUrl: Text,
  pageTitle: z.string(),
  engine: ReferenceCodeEngineSchema.nullable(),
  buildBaseUrl: ParsableUrl.nullable(),
  downloads: z.array(z.object({
    name: Text,
    urls: z.array(ParsableUrl).min(1),
    path: RunRelativePath,
    sha256: Sha256,
    bytes: Count,
  }).strict()).max(32),
  archive: z.object({
    entryCount: Count,
    compressedCount: Count,
    encryptedCount: Count,
    unsafeNameCount: Count,
    scriptCount: Count,
  }).strict().nullable(),
  scripts: z.array(z.object({
    path: RunRelativePath,
    originalName: Text,
    sha256: Sha256,
    bytes: Count,
    lineCount: Count,
  }).strict()).max(5_000),
  status: z.enum(['READY', 'BLOCKED']),
  blockers: z.array(Text),
  capturedAt: z.string().datetime(),
}).strict().superRefine((pkg, context) => {
  const prefix = `reference-code/${pkg.packageId}/`;
  const seen = new Set<string>();
  const files = [...pkg.downloads.map((file, index) => ({ file, at: ['downloads', index, 'path'] })), ...pkg.scripts.map((file, index) => ({ file, at: ['scripts', index, 'path'] }))];
  for (const { file, at } of files) {
    if (!file.path.startsWith(prefix)) context.addIssue({ code: 'custom', path: at, message: `files must stay under ${prefix}` });
    if (seen.has(file.path)) context.addIssue({ code: 'custom', path: at, message: 'file paths must be unique' });
    seen.add(file.path);
  }
  if (pkg.archive && pkg.archive.scriptCount !== pkg.scripts.length) context.addIssue({ code: 'custom', path: ['archive', 'scriptCount'], message: 'scriptCount must match the listed scripts' });
  if (pkg.status === 'READY' && (!pkg.engine || !pkg.archive || pkg.scripts.length === 0 || pkg.blockers.length > 0)) context.addIssue({ code: 'custom', path: ['status'], message: 'READY packages require an engine, an archive summary, scripts and no blockers' });
  if (pkg.status === 'BLOCKED' && pkg.blockers.length === 0) context.addIssue({ code: 'custom', path: ['blockers'], message: 'BLOCKED packages require blockers' });
});
export type ReferenceCodePackage = z.infer<typeof ReferenceCodePackageSchema>;

export const REFERENCE_CODE_CLAIM_DIMENSIONS = [...REFERENCE_BEHAVIOR_DIMENSIONS, 'core_loop', 'progression'] as const;

const CodeRefSchema = z.object({
  script: RunRelativePath.refine((value) => value.startsWith('reference-code/'), 'code references must point at extracted reference scripts'),
  sha256: Sha256,
  startLine: Line,
  endLine: Line,
}).strict().refine((ref) => ref.endLine >= ref.startLine, { message: 'endLine must not precede startLine', path: ['endLine'] });

/** Mechanic relationships read from verified reference scripts. Statements
 * describe causal rules only; numeric tuning stays in the cited code. */
export const ReferenceCodeAnalysisSchema = z.object({
  schemaVersion: z.literal(1),
  artifactType: z.literal('reference-code-analysis'),
  targetRunId: Text,
  targetGame: Text,
  workspace: AbsolutePath,
  package: z.object({ evidenceId: Text, indexPath: RunRelativePath, sha256: Sha256 }).strict(),
  coreLoop: z.array(z.object({ step: Text, claimIds: z.array(Text).min(1) }).strict()).min(3),
  claims: z.array(z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/u),
    dimension: z.enum(REFERENCE_CODE_CLAIM_DIMENSIONS),
    status: z.enum(['OBSERVED', 'INFERRED', 'UNKNOWN']),
    statement: Text.refine((value) => !/\d/u.test(value), 'statements must not carry tuning values; cite the code instead'),
    codeRefs: z.array(CodeRefSchema).max(20),
  }).strict()).min(1),
  reuseBoundary: z.object({
    mechanicsOnly: z.literal(true),
    noCodeCopied: z.literal(true),
    noAssetsCopied: z.literal(true),
    noNamesOrUiCopied: z.literal(true),
    noTuningValuesCopied: z.literal(true),
  }).strict(),
  analyst: Text,
  analyzedAt: z.string().datetime(),
}).strict().superRefine((analysis, context) => {
  const ids = new Set<string>();
  for (const [index, claim] of analysis.claims.entries()) {
    if (ids.has(claim.id)) context.addIssue({ code: 'custom', path: ['claims', index, 'id'], message: 'claim ids must be unique' });
    ids.add(claim.id);
    if (claim.status === 'OBSERVED' && claim.codeRefs.length === 0) context.addIssue({ code: 'custom', path: ['claims', index, 'codeRefs'], message: 'OBSERVED claims require code references' });
  }
  for (const [index, step] of analysis.coreLoop.entries()) {
    for (const id of step.claimIds) if (!ids.has(id)) context.addIssue({ code: 'custom', path: ['coreLoop', index, 'claimIds'], message: `unknown claim id: ${id}` });
  }
  const covered = new Set(analysis.claims.map((claim) => claim.dimension));
  for (const dimension of REFERENCE_BEHAVIOR_DIMENSIONS) {
    if (!covered.has(dimension)) context.addIssue({ code: 'custom', path: ['claims'], message: `behavior dimension is not covered: ${dimension}` });
  }
});
export type ReferenceCodeAnalysis = z.infer<typeof ReferenceCodeAnalysisSchema>;
