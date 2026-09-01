import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { sha256File } from './files.js';
import { sanitizeUntrustedText } from './security-boundary.js';
import { isInstructionShapedResearchText, isResearchHostAllowed, isSafeExternalResearchUrl } from './research-evidence.js';
import { ReferenceEvidencePackSchema, type ReferenceEvidencePack } from '../schemas/reference-evidence.js';
import { ReferenceMechanicSpecSchema, type ReferenceMechanicSpec } from '../schemas/reference-mechanic.js';
import { buildEvidenceClaimSet } from './evidence-claims.js';

/**
 * Resolve a research source without following a symlink.  Research inputs are
 * untrusted: a lexical `../` check alone is not sufficient because a file (or
 * one of its parent directories) can point outside the run after validation.
 * We walk every component, reject links/non-regular files, and verify the
 * final real path remains below the real run root before the caller reads it.
 */
async function safeRunFile(runRoot: string, relative: string): Promise<string> {
  const normalized = String(relative).replaceAll('\\', '/').trim();
  const root = path.resolve(runRoot);
  const resolved = path.resolve(root, normalized);
  const rel = path.relative(root, resolved);
  if (!normalized || !rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new Error(`reference source path escapes run root: ${relative}`);
  }
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error(`reference run root is unsafe: ${runRoot}`);
  const realRoot = await realpath(root);
  let current = root;
  for (const component of normalized.split('/')) {
    if (!component || component === '.') continue;
    current = path.join(current, component);
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) throw new Error(`reference source path is a symlink: ${relative}`);
    if (current !== resolved && !stat.isDirectory()) throw new Error(`reference source parent is not a directory: ${relative}`);
  }
  const finalStat = await lstat(resolved);
  if (!finalStat.isFile() || finalStat.isSymbolicLink()) throw new Error(`reference source is not a regular file: ${relative}`);
  const realFile = await realpath(resolved);
  const realRelative = path.relative(realRoot, realFile);
  if (!realRelative || realRelative === '..' || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
    throw new Error(`reference source path resolves outside run root: ${relative}`);
  }
  return realFile;
}

export type ReferenceEvidenceOptions = {
  requireSupplemental?: boolean;
  requireHostAllowlist?: boolean;
  allowedHosts?: readonly string[];
};

export async function buildReferenceEvidencePack(input: { targetRunId: string; reference: ReferenceMechanicSpec; runRoot: string } & ReferenceEvidenceOptions): Promise<ReferenceEvidencePack> {
  const reference = ReferenceMechanicSpecSchema.parse(input.reference);
  const sourceFiles: ReferenceEvidencePack['sourceFiles'] = []; const observations: string[] = []; const unknowns: string[] = [];
  if (!isSafeExternalResearchUrl(reference.source.url)) unknowns.push('benchmark-source-url-unsafe');
  if (isInstructionShapedResearchText(reference.source.name) || isInstructionShapedResearchText(reference.source.url)) unknowns.push('benchmark-source-instruction-shaped');
  if (input.requireHostAllowlist && !isResearchHostAllowed(reference.source.url, input.allowedHosts ?? [])) unknowns.push('benchmark-source-host-not-allowlisted');
  for (const relative of reference.source.researchFiles) {
    let file: string;
    try {
      file = await safeRunFile(input.runRoot, relative);
      const content = sanitizeUntrustedText(await readFile(file, 'utf8'), 4_000);
      const extracted = content.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).slice(0, 12);
      sourceFiles.push({ path: relative, sha256: await sha256File(file), observations: extracted.length ? extracted : ['source-file-contained-no-readable-observation'] });
      observations.push(...extracted.map((line) => `source:${relative}:${line}`));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') unknowns.push(`source-file-missing:${relative}`);
      else if (error instanceof Error && /reference source path|reference run root|reference source parent|reference source is not/iu.test(error.message)) unknowns.push(`source-file-unsafe:${relative}`);
      else throw error;
    }
  }
  const supplemental = sourceFiles.length > 0;
  if (input.requireSupplemental && !supplemental) unknowns.push('supplemental-reference-evidence-required');
  const inferences = [
    'The locked core-loop order is the reusable mechanic relationship; all expression must be authored independently.',
    'Declared adaptable mechanics may vary only after the human mechanic lock and must keep the same causal topology.',
  ];
  const pack = {
    schemaVersion: 1 as const,
    targetRunId: input.targetRunId,
    benchmark: { name: reference.source.name, url: reference.source.url },
    sourceFiles,
    observations: [...new Set([...observations, ...reference.coreLoop.map((item) => `human-lock:${item}`)])],
    inferences,
    unknowns: [...new Set(unknowns)],
    mechanicMap: { coreLoop: reference.coreLoop, playerActions: reference.playerActions, progressionSystems: reference.progressionSystems, unlockRules: reference.unlockRules, feedbackCadence: reference.feedbackCadence },
    expressionBoundary: { allowed: ['generic mechanic relationships', 'causal order and state transitions', 'human-approved adaptable mechanic slots'], forbidden: ['third-party code', 'third-party assets', 'names and logos', 'UI layout', 'text and dialogue', 'audio', 'raw tuning values'] },
    similarityRedFlags: [],
    evidenceQuality: supplemental ? 'supplemented' as const : 'human-lock-only' as const,
    status: unknowns.length === 0 ? 'READY' as const : 'BLOCKED' as const,
    claims: buildEvidenceClaimSet({ source: reference.source.url, observations: [...new Set(observations)], inferences, unknowns }).claims,
    researchedAt: new Date().toISOString(),
  };
  return ReferenceEvidencePackSchema.parse(pack);
}

export function referenceBlockersRequirePause(blockers: readonly string[]): boolean {
  return blockers.some((blocker) => /benchmark-source-(?:url-unsafe|host-not-allowlisted|instruction-shaped)/u.test(blocker) || /reference:benchmark-source-/u.test(blocker));
}

export function evaluateReferenceEvidence(value: unknown, options: ReferenceEvidenceOptions = {}) {
  const pack = ReferenceEvidencePackSchema.parse(value);
  const blockers = [...pack.unknowns.map((item) => `unknown:${item}`), ...pack.similarityRedFlags.map((item) => `similarity:${item}`)];
  if (!isSafeExternalResearchUrl(pack.benchmark.url)) blockers.push('reference:benchmark-source-url-unsafe');
  if (isInstructionShapedResearchText(pack.benchmark.name) || isInstructionShapedResearchText(pack.benchmark.url)) blockers.push('reference:benchmark-source-instruction-shaped');
  if (options.requireHostAllowlist && !isResearchHostAllowed(pack.benchmark.url, options.allowedHosts ?? [])) blockers.push('reference:benchmark-source-host-not-allowlisted');
  return { passed: blockers.length === 0 && pack.status === 'READY', blockers: [...new Set(blockers)], pack };
}
