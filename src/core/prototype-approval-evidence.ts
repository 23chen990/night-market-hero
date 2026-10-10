import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { ArtifactLedgerSchema } from '../schemas/artifact-ledger.js';
import {
  IdeaGenerationSchema,
  PlaytestTournamentSchema,
  PrototypeBuildReportSchema,
  PrototypeHumanReviewSchema,
  WinnerSelectionSchema,
  type PlaytestTournament,
  type PrototypeBuildReport,
} from '../schemas/gameplay-experiment.js';
import { reconcileArtifactLedger } from './artifact-ledger.js';
import { sha256File } from './files.js';

const Text = z.string().trim().min(1);
const Sha256 = z.string().regex(/^[a-f0-9]{64}$/iu, 'expected a SHA-256 hex digest');
const SlotSchema = z.enum(['a', 'b', 'c']);
const FileStatusSchema = z.enum(['AVAILABLE', 'UNAVAILABLE']);

function expectedSourcePaths(batch: number) {
  return {
    build: `artifacts/prototype-build-report.batch-${batch}.json`,
    tournament: `artifacts/playtest-tournament.batch-${batch}.json`,
  };
}

function expectedCandidatePaths(slot: string) {
  const workspace = `workspace/prototype-${slot}`;
  return {
    workspace,
    entrypoint: `${workspace}/dist/index.html`,
    screenshot: `screenshots/prototype-${slot}.png`,
    consoleLog: `logs/prototype-${slot}.log`,
    distPrefix: `${workspace}/dist/`,
  };
}

/** A run-local file snapshot.  Unavailable captures intentionally have no hash. */
export const PrototypeApprovalFileSnapshotSchema = z.object({
  path: Text,
  status: FileStatusSchema,
  sha256: Sha256.optional(),
}).strict().superRefine((value, context) => {
  if (value.status === 'AVAILABLE' && value.sha256 === undefined) context.addIssue({ code: 'custom', path: ['sha256'], message: 'available evidence must carry a hash' });
  if (value.status === 'UNAVAILABLE' && value.sha256 !== undefined) context.addIssue({ code: 'custom', path: ['sha256'], message: 'unavailable evidence cannot carry a hash' });
});
export type PrototypeApprovalFileSnapshot = z.infer<typeof PrototypeApprovalFileSnapshotSchema>;

export const PrototypeApprovalCandidateEvidenceSchema = z.object({
  slot: SlotSchema,
  ideaId: Text,
  workspace: Text,
  entrypoint: Text,
  distFiles: z.array(PrototypeApprovalFileSnapshotSchema),
  screenshot: PrototypeApprovalFileSnapshotSchema,
  consoleLog: PrototypeApprovalFileSnapshotSchema,
}).strict().superRefine((value, context) => {
  const distPaths = value.distFiles.map((file) => file.path);
  if (new Set(distPaths).size !== distPaths.length) context.addIssue({ code: 'custom', path: ['distFiles'], message: 'dist file paths must be unique' });
});
export type PrototypeApprovalCandidateEvidence = z.infer<typeof PrototypeApprovalCandidateEvidenceSchema>;

/**
 * Durable evidence emitted after prototype tournament QA.  `synthetic` is a
 * policy assertion, not a claim that a fixture was browser-played.
 */
export const PrototypeApprovalEvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  artifactType: z.literal('prototype-approval-evidence'),
  batch: z.number().int().min(1).max(2),
  synthetic: z.boolean(),
  passed: z.boolean(),
  usableForProductAcceptance: z.boolean(),
  sourceArtifacts: z.array(PrototypeApprovalFileSnapshotSchema),
  candidates: z.array(PrototypeApprovalCandidateEvidenceSchema),
  evidence: z.array(Text).min(1),
  blockers: z.array(Text),
  capturedAt: z.string().datetime(),
  verifiedAt: z.string().datetime().optional(),
}).strict().superRefine((value, context) => {
  const sourcePaths = value.sourceArtifacts.map((item) => item.path);
  if (new Set(sourcePaths).size !== sourcePaths.length) context.addIssue({ code: 'custom', path: ['sourceArtifacts'], message: 'source artifact paths must be unique' });
  const expectedSources = Object.values(expectedSourcePaths(value.batch));
  if (sourcePaths.length > 0 && (sourcePaths.length !== expectedSources.length || expectedSources.some((expected) => !sourcePaths.includes(expected)))) {
    context.addIssue({ code: 'custom', path: ['sourceArtifacts'], message: 'source artifacts must use the requested batch paths' });
  }
  const slots = value.candidates.map((item) => item.slot);
  if (new Set(slots).size !== slots.length) context.addIssue({ code: 'custom', path: ['candidates'], message: 'candidate slots must be unique' });
  if (value.passed && value.blockers.length > 0) context.addIssue({ code: 'custom', path: ['blockers'], message: 'a passed evidence report cannot contain blockers' });
  if (value.passed) {
    if (value.sourceArtifacts.length !== expectedSources.length || value.sourceArtifacts.some((item) => item.status !== 'AVAILABLE')) {
      context.addIssue({ code: 'custom', path: ['sourceArtifacts'], message: 'a passed report requires both available batch source artifacts' });
    }
    if (value.candidates.length !== 3) context.addIssue({ code: 'custom', path: ['candidates'], message: 'a passed report requires all three candidate snapshots' });
    for (const candidate of value.candidates) {
      const expected = expectedCandidatePaths(candidate.slot);
      if (candidate.workspace !== expected.workspace) context.addIssue({ code: 'custom', path: ['candidates'], message: `candidate ${candidate.slot} workspace is not bound to its slot` });
      if (candidate.entrypoint !== expected.entrypoint) context.addIssue({ code: 'custom', path: ['candidates'], message: `candidate ${candidate.slot} entrypoint is not bound to its slot` });
      if (candidate.screenshot.path !== expected.screenshot) context.addIssue({ code: 'custom', path: ['candidates'], message: `candidate ${candidate.slot} screenshot is not slot-specific` });
      if (candidate.consoleLog.path !== expected.consoleLog) context.addIssue({ code: 'custom', path: ['candidates'], message: `candidate ${candidate.slot} console log is not slot-specific` });
      if (candidate.distFiles.length === 0 || candidate.distFiles.some((file) => file.status !== 'AVAILABLE' || !file.path.startsWith(expected.distPrefix))) {
        context.addIssue({ code: 'custom', path: ['candidates'], message: `candidate ${candidate.slot} dist snapshot is incomplete or cross-bound` });
      }
      if (!candidate.distFiles.some((file) => file.path === expected.entrypoint && file.status === 'AVAILABLE')) {
        context.addIssue({ code: 'custom', path: ['candidates'], message: `candidate ${candidate.slot} dist entrypoint is missing` });
      }
      if (!value.synthetic && (candidate.screenshot.status !== 'AVAILABLE' || candidate.consoleLog.status !== 'AVAILABLE')) {
        context.addIssue({ code: 'custom', path: ['candidates'], message: `candidate ${candidate.slot} browser captures are incomplete` });
      }
    }
  }
  if (value.usableForProductAcceptance && (value.synthetic || !value.passed || value.candidates.length !== 3)) {
    context.addIssue({ code: 'custom', path: ['usableForProductAcceptance'], message: 'product-acceptance evidence must be complete non-synthetic evidence' });
  }
});
export type PrototypeApprovalEvidence = z.infer<typeof PrototypeApprovalEvidenceSchema>;

export type PrototypeApprovalEvidenceInput = {
  runRoot: string;
  batch: number;
  synthetic: boolean;
};

type FileInspection = {
  binding: PrototypeApprovalFileSnapshot;
  absolute?: string;
  reason?: 'missing' | 'path-invalid' | 'symlink' | 'regular-file' | 'unsafe-root';
};

type CollectedEvidence = {
  report: PrototypeApprovalEvidence;
  build?: PrototypeBuildReport;
  tournament?: PlaytestTournament;
};

const SOURCE_PATHS = expectedSourcePaths;

function unique(values: string[]) { return [...new Set(values.filter((value) => value.trim().length > 0))]; }

function isChildPath(parent: string, child: string) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative.length > 0 && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function normalizedRelativePath(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replaceAll('\\', '/').trim();
  if (!normalized || normalized.startsWith('/') || /^[a-z]:\//iu.test(normalized)) return undefined;
  if (normalized.split('/').some((part) => part === '..')) return undefined;
  const canonical = path.posix.normalize(normalized);
  if (!canonical || canonical === '.' || canonical === '..' || canonical.startsWith('../') || canonical.includes('/../')) return undefined;
  return canonical;
}

function displayPath(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function unavailable(value: unknown, fallback: string, reason: FileInspection['reason']): FileInspection {
  return { binding: { path: displayPath(value, fallback), status: 'UNAVAILABLE' }, reason };
}

async function inspectFile(runRoot: string, value: unknown, fallback: string): Promise<FileInspection> {
  const normalized = normalizedRelativePath(value);
  if (!normalized) return unavailable(value, fallback, 'path-invalid');
  const root = path.resolve(runRoot);
  const absolute = path.resolve(root, normalized);
  if (!isChildPath(root, absolute)) return unavailable(normalized, fallback, 'path-invalid');
  try {
    const rootStat = await lstat(root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) return unavailable(normalized, fallback, 'unsafe-root');
    let current = root;
    for (const component of normalized.split('/')) {
      current = path.join(current, component);
      const stat = await lstat(current);
      if (stat.isSymbolicLink()) return unavailable(normalized, fallback, 'symlink');
      if (current !== absolute && !stat.isDirectory()) return unavailable(normalized, fallback, 'regular-file');
    }
    const stat = await lstat(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) return unavailable(normalized, fallback, stat.isSymbolicLink() ? 'symlink' : 'regular-file');
    const [realRoot, realFile] = await Promise.all([realpath(root), realpath(absolute)]);
    if (!isChildPath(realRoot, realFile)) return unavailable(normalized, fallback, 'path-invalid');
    return { binding: { path: normalized, status: 'AVAILABLE', sha256: await sha256File(absolute) }, absolute };
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code) : '';
    return unavailable(normalized, fallback, code === 'ENOENT' ? 'missing' : 'regular-file');
  }
}

async function listRegularFiles(runRoot: string, relativeDirectory: string): Promise<{ files: string[]; reason?: FileInspection['reason'] }> {
  const normalized = normalizedRelativePath(relativeDirectory);
  if (!normalized) return { files: [], reason: 'path-invalid' };
  const root = path.resolve(runRoot);
  const directory = path.resolve(root, normalized);
  if (!isChildPath(root, directory)) return { files: [], reason: 'path-invalid' };
  try {
    const rootStat = await lstat(root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) return { files: [], reason: 'unsafe-root' };
    // Check every directory component before walking.  lstat(directory) alone
    // would miss a symlink in an intermediate component (for example, a
    // symlinked workspace directory) and could make the walk enumerate files
    // outside this run before the per-file checks reject their hashes.
    let currentDirectory = root;
    for (const component of normalized.split('/')) {
      currentDirectory = path.join(currentDirectory, component);
      const stat = await lstat(currentDirectory);
      if (stat.isSymbolicLink()) return { files: [], reason: 'symlink' };
      if (!stat.isDirectory()) return { files: [], reason: 'regular-file' };
    }
    const [realRoot, realDirectory] = await Promise.all([realpath(root), realpath(directory)]);
    if (!isChildPath(realRoot, realDirectory)) return { files: [], reason: 'unsafe-root' };
    const walk = async (current: string): Promise<string[]> => {
      const stat = await lstat(current);
      if (stat.isSymbolicLink()) throw new Error('symlink');
      if (!stat.isDirectory()) throw new Error('regular-file');
      const files: string[] = [];
      for (const entry of await readdir(current, { withFileTypes: true })) {
        const child = path.join(current, entry.name);
        if (entry.isSymbolicLink()) throw new Error('symlink');
        if (entry.isDirectory()) files.push(...await walk(child));
        else if (entry.isFile()) files.push(path.relative(root, child).replaceAll(path.sep, '/'));
        else throw new Error('regular-file');
      }
      return files;
    };
    return { files: (await walk(directory)).sort() };
  } catch (error) {
    const reason = error instanceof Error && error.message === 'symlink' ? 'symlink' : error instanceof Error && error.message === 'regular-file' ? 'regular-file' : 'missing';
    return { files: [], reason };
  }
}

async function parseJsonFile<T>(inspection: FileInspection, schema: z.ZodType<T>) {
  if (inspection.binding.status !== 'AVAILABLE' || inspection.absolute === undefined) return undefined;
  try { return schema.parse(JSON.parse(await readFile(inspection.absolute, 'utf8'))); } catch { return undefined; }
}

function captureBlocker(kind: 'screenshot' | 'console-log', slot: string, inspection: FileInspection) {
  if (inspection.reason === 'missing') return `qa:${kind}-missing:${slot}`;
  return `qa:${kind}-path-invalid:${slot}`;
}

function compareSnapshotFiles(
  snapshot: PrototypeApprovalFileSnapshot | undefined,
  current: PrototypeApprovalFileSnapshot | undefined,
  label: string,
  blockers: string[],
) {
  if (!snapshot) { blockers.push(`${label}:snapshot-missing`); return; }
  if (!current) { blockers.push(`${label}:current-missing`); return; }
  if (snapshot.path !== current.path) blockers.push(`${label}:path-mismatch`);
  if (snapshot.status !== current.status) blockers.push(`${label}:status-mismatch`);
  if (snapshot.status === 'AVAILABLE' && current.status === 'AVAILABLE' && snapshot.sha256 !== current.sha256) blockers.push(`${label}:hash-mismatch`);
}

function compareCandidateSnapshots(snapshot: PrototypeApprovalCandidateEvidence | undefined, current: PrototypeApprovalCandidateEvidence | undefined, blockers: string[]) {
  if (!snapshot || !current) { blockers.push('candidate:snapshot-missing'); return; }
  if (snapshot.ideaId !== current.ideaId) blockers.push(`candidate:idea-mismatch:${current.slot}`);
  if (snapshot.workspace !== current.workspace) blockers.push(`candidate:workspace-mismatch:${current.slot}`);
  if (snapshot.entrypoint !== current.entrypoint) blockers.push(`candidate:entrypoint-mismatch:${current.slot}`);
  const snapshotDist = new Map(snapshot.distFiles.map((file) => [file.path, file]));
  const currentDist = new Map(current.distFiles.map((file) => [file.path, file]));
  const paths = new Set([...snapshotDist.keys(), ...currentDist.keys()]);
  for (const file of paths) {
    const snapshotFile = snapshotDist.get(file);
    const currentFile = currentDist.get(file);
    if (!snapshotFile || !currentFile) { blockers.push(`build:dist-missing:${current.slot}`); continue; }
    if (snapshotFile.path !== currentFile.path || snapshotFile.status !== currentFile.status) { blockers.push(`build:dist-status-mismatch:${current.slot}`); continue; }
    if (snapshotFile.status === 'AVAILABLE' && currentFile.status === 'AVAILABLE' && snapshotFile.sha256 !== currentFile.sha256) blockers.push(`build:dist-hash-mismatch:${current.slot}`);
  }
  compareSnapshotFiles(snapshot.screenshot, current.screenshot, `qa:screenshot:${current.slot}`, blockers);
  compareSnapshotFiles(snapshot.consoleLog, current.consoleLog, `qa:console-log:${current.slot}`, blockers);
}

function makeReport(input: {
  batch: number;
  synthetic: boolean;
  sourceArtifacts: PrototypeApprovalFileSnapshot[];
  candidates: PrototypeApprovalCandidateEvidence[];
  evidence: string[];
  blockers: string[];
  capturedAt?: string;
  verifiedAt?: string;
}) {
  const blockers = unique(input.blockers);
  const evidence = unique(input.evidence.length > 0 ? input.evidence : ['prototype:evidence-evaluated']);
  const sourcesAvailable = input.sourceArtifacts.length === 2 && input.sourceArtifacts.every((item) => item.status === 'AVAILABLE');
  const candidatesComplete = input.candidates.length === 3 && input.candidates.every((candidate) => candidate.distFiles.length > 0 && candidate.distFiles.every((item) => item.status === 'AVAILABLE'));
  const capturesAvailable = input.candidates.length === 3 && input.candidates.every((candidate) => candidate.screenshot.status === 'AVAILABLE' && candidate.consoleLog.status === 'AVAILABLE');
  const passed = blockers.length === 0 && sourcesAvailable && candidatesComplete;
  return PrototypeApprovalEvidenceSchema.parse({
    schemaVersion: 1,
    artifactType: 'prototype-approval-evidence',
    batch: input.batch,
    synthetic: input.synthetic,
    passed,
    usableForProductAcceptance: passed && !input.synthetic && capturesAvailable,
    sourceArtifacts: input.sourceArtifacts,
    candidates: input.candidates,
    evidence,
    blockers,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    ...(input.verifiedAt ? { verifiedAt: input.verifiedAt } : {}),
  });
}

async function collectEvidence({ runRoot, batch, synthetic }: PrototypeApprovalEvidenceInput): Promise<CollectedEvidence> {
  const sourcePaths = SOURCE_PATHS(batch);
  const buildFile = await inspectFile(runRoot, sourcePaths.build, sourcePaths.build);
  const tournamentFile = await inspectFile(runRoot, sourcePaths.tournament, sourcePaths.tournament);
  const build = await parseJsonFile(buildFile, PrototypeBuildReportSchema);
  const tournament = await parseJsonFile(tournamentFile, PlaytestTournamentSchema);
  const sourceArtifacts = [buildFile.binding, tournamentFile.binding];
  const blockers: string[] = [];
  const evidence: string[] = [];
  if (buildFile.binding.status !== 'AVAILABLE') blockers.push('source:build-report-missing');
  else if (!build) blockers.push('source:build-report-schema-invalid');
  if (tournamentFile.binding.status !== 'AVAILABLE') blockers.push('source:tournament-report-missing');
  else if (!tournament) blockers.push('source:tournament-report-schema-invalid');
  if (build?.batch !== batch) blockers.push('source:build-batch-mismatch');
  if (tournament?.batch !== batch) blockers.push('source:tournament-batch-mismatch');
  if (buildFile.binding.status === 'AVAILABLE') evidence.push('source:build-report-hash');
  if (tournamentFile.binding.status === 'AVAILABLE') evidence.push('source:tournament-report-hash');

  const tournamentBySlot = new Map(tournament?.comparisons.map((comparison) => [comparison.slot, comparison]) ?? []);
  const candidates: PrototypeApprovalCandidateEvidence[] = [];
  for (const prototype of build?.prototypes ?? []) {
    const slot = prototype.slot;
    const expectedWorkspace = `workspace/prototype-${slot}`;
    const expectedEntrypoint = `${expectedWorkspace}/dist/index.html`;
    if (prototype.workspace !== expectedWorkspace) blockers.push(`candidate:workspace-mismatch:${slot}`);
    if (prototype.entrypoint !== expectedEntrypoint) blockers.push(`candidate:entrypoint-mismatch:${slot}`);
    const distDirectory = `${expectedWorkspace}/dist`;
    const listed = await listRegularFiles(runRoot, distDirectory);
    if (listed.files.length === 0) blockers.push(`build:dist-missing:${slot}`);
    if (!listed.files.includes(`${distDirectory}/index.html`)) blockers.push(`build:dist-entrypoint-missing:${slot}`);
    if (listed.reason && listed.reason !== 'missing') blockers.push(`build:dist-path-invalid:${slot}`);
    const distFiles: PrototypeApprovalFileSnapshot[] = [];
    for (const file of listed.files) {
      const inspected = await inspectFile(runRoot, file, file);
      distFiles.push(inspected.binding);
      if (inspected.binding.status !== 'AVAILABLE') blockers.push(`build:dist-file-invalid:${slot}`);
    }
    const comparison = tournamentBySlot.get(slot);
    if (!comparison) blockers.push(`candidate:tournament-slot-missing:${slot}`);
    else {
      if (comparison.ideaId !== prototype.ideaId) blockers.push(`candidate:tournament-idea-mismatch:${slot}`);
      try {
        const testedUrl = new URL(comparison.testedUrl);
        if (testedUrl.protocol === 'file:' && comparison.testedUrl !== `file://${prototype.entrypoint}`) blockers.push(`candidate:test-url-mismatch:${slot}`);
      } catch { blockers.push(`candidate:test-url-invalid:${slot}`); }
    }
    const expectedPaths = expectedCandidatePaths(slot);
    if (comparison && comparison.screenshot !== expectedPaths.screenshot) blockers.push(`candidate:screenshot-path-mismatch:${slot}`);
    if (comparison && comparison.consoleLog !== expectedPaths.consoleLog) blockers.push(`candidate:console-log-path-mismatch:${slot}`);
    // The runtime QA writer emits these exact slot-specific paths.  Resolve
    // and hash those paths even when a tournament report points at another
    // regular file, so a cross-candidate capture can never be accepted.
    const screenshotPath = expectedPaths.screenshot;
    const consoleLogPath = expectedPaths.consoleLog;
    const screenshot = await inspectFile(runRoot, screenshotPath, `screenshots/prototype-${slot}.png`);
    const consoleLog = await inspectFile(runRoot, consoleLogPath, `logs/prototype-${slot}.log`);
    if (screenshot.binding.status !== 'AVAILABLE') {
      if (synthetic) evidence.push(`synthetic:qa-screenshot-unavailable:${slot}`);
      else blockers.push(captureBlocker('screenshot', slot, screenshot));
    } else if (!synthetic) evidence.push(`browser:qa-screenshot:${slot}`);
    if (consoleLog.binding.status !== 'AVAILABLE') {
      if (synthetic) evidence.push(`synthetic:qa-console-log-unavailable:${slot}`);
      else blockers.push(captureBlocker('console-log', slot, consoleLog));
    } else if (!synthetic) evidence.push(`browser:qa-console-log:${slot}`);
    candidates.push({ slot, ideaId: prototype.ideaId, workspace: prototype.workspace, entrypoint: prototype.entrypoint, distFiles, screenshot: screenshot.binding, consoleLog: consoleLog.binding });
  }
  if (candidates.length !== 3) blockers.push('candidate:three-slots-required');
  return {
    report: makeReport({ batch, synthetic, sourceArtifacts, candidates, evidence, blockers }),
    ...(build ? { build } : {}),
    ...(tournament ? { tournament } : {}),
  };
}

async function readWinnerAndReview(runRoot: string, batch: number, build: PrototypeBuildReport | undefined, tournament: PlaytestTournament | undefined, blockers: string[], evidence: string[]) {
  const winnerPath = `artifacts/winner-selection.batch-${batch}.json`;
  const reviewPath = 'human/prototype-review.json';
  const ideasPath = `artifacts/idea-generation.batch-${batch}.json`;
  const winnerFile = await inspectFile(runRoot, winnerPath, winnerPath);
  const reviewFile = await inspectFile(runRoot, reviewPath, reviewPath);
  const ideasFile = await inspectFile(runRoot, ideasPath, ideasPath);
  const winner = await parseJsonFile(winnerFile, WinnerSelectionSchema);
  const review = await parseJsonFile(reviewFile, PrototypeHumanReviewSchema);
  const ideas = await parseJsonFile(ideasFile, IdeaGenerationSchema);
  if (winnerFile.binding.status !== 'AVAILABLE' || !winner) blockers.push('winner:missing-or-invalid');
  if (reviewFile.binding.status !== 'AVAILABLE' || !review) blockers.push('review:missing-or-invalid');
  if (ideasFile.binding.status === 'AVAILABLE' && !ideas) blockers.push('source:ideas-invalid');
  if (ideasFile.binding.status !== 'AVAILABLE') evidence.push('review:idea-source-untracked');
  if (winner?.batch !== batch) blockers.push('winner:batch-mismatch');
  if (review?.batch !== batch) blockers.push('review:batch-mismatch');
  if (ideas?.batch !== batch) blockers.push('source:ideas-batch-mismatch');
  if (winnerFile.binding.status === 'AVAILABLE') evidence.push('winner:current-file-read');
  if (reviewFile.binding.status === 'AVAILABLE') evidence.push('review:current-file-read');

  const buildBySlot = new Map(build?.prototypes.map((prototype) => [prototype.slot, prototype]) ?? []);
  const tournamentBySlot = new Map(tournament?.comparisons.map((comparison) => [comparison.slot, comparison]) ?? []);
  if (winner && winner.decision === 'NONE') blockers.push('winner:none');
  if (winner && winner.decision !== 'NONE') {
    const slot = winner.decision.at(-1)?.toLowerCase();
    const prototype = slot === 'a' || slot === 'b' || slot === 'c' ? buildBySlot.get(slot) : undefined;
    const comparison = slot === 'a' || slot === 'b' || slot === 'c' ? tournamentBySlot.get(slot) : undefined;
    if (!prototype || !comparison) blockers.push('winner:selected-slot-missing');
    if (prototype && winner.selectedIdeaId !== prototype.ideaId) blockers.push('winner:selected-idea-mismatch');
    if (comparison && winner.selectedIdeaId !== comparison.ideaId) blockers.push('winner:tournament-idea-mismatch');
  }
  if (winner && review && review.recommendation !== winner.decision) blockers.push('review:recommendation-mismatch');
  if (review) {
    const reviewSlots = review.prototypes.map((prototype) => prototype.slot);
    if (new Set(reviewSlots).size !== reviewSlots.length) blockers.push('review:duplicate-slots');
    const ideasById = new Map(ideas?.ideas.map((idea) => [idea.id, idea]) ?? []);
    for (const item of review.prototypes) {
      const prototype = buildBySlot.get(item.slot);
      if (!prototype) { blockers.push(`review:slot-missing:${item.slot}`); continue; }
      if (item.entrypoint !== prototype.entrypoint) blockers.push(`review:entrypoint-mismatch:${item.slot}`);
      if (item.launchCommand !== prototype.launchCommand) blockers.push(`review:launch-command-mismatch:${item.slot}`);
      const idea = ideasById.get(prototype.ideaId);
      if (!idea) { blockers.push(`review:idea-missing:${item.slot}`); continue; }
      if (item.name !== idea.name || item.coreAction !== idea.coreAction || item.decision !== idea.decision) blockers.push(`review:idea-metadata-mismatch:${item.slot}`);
    }
  }
  const ledgerPath = 'artifacts/artifact-ledger.json';
  const ledgerFile = await inspectFile(runRoot, ledgerPath, ledgerPath);
  if (ledgerFile.binding.status !== 'AVAILABLE' || ledgerFile.absolute === undefined) {
    evidence.push('ledger:winner-untracked');
  } else {
    try {
      const ledger = ArtifactLedgerSchema.parse(JSON.parse(await readFile(ledgerFile.absolute, 'utf8')));
      const reconciliation = await reconcileArtifactLedger(ledger, runRoot);
      const entry = ledger.entries.find((candidate) => candidate.path === winnerPath);
      if (!entry) evidence.push('ledger:winner-untracked');
      else if (entry.status !== 'VALID' || reconciliation.changed.includes(winnerPath) || reconciliation.missing.includes(winnerPath) || reconciliation.blockers.some((item) => item.includes(winnerPath))) blockers.push('ledger:winner-invalid');
      else evidence.push('ledger:winner-valid');
    } catch {
      blockers.push('ledger:invalid');
    }
  }
}

function fallbackReport(batch: number, synthetic: boolean, blockers: string[]) {
  return makeReport({ batch, synthetic, sourceArtifacts: [], candidates: [], evidence: ['evidence:snapshot-unreadable'], blockers });
}

export async function capturePrototypeApprovalEvidence(input: PrototypeApprovalEvidenceInput): Promise<PrototypeApprovalEvidence> {
  const batch = Number.isInteger(input.batch) ? input.batch : 0;
  if (batch < 1 || batch > 2) return fallbackReport(1, input.synthetic === true, ['source:batch-invalid']);
  try { return (await collectEvidence({ ...input, batch })).report; } catch { return fallbackReport(batch, input.synthetic === true, ['evidence:capture-failed']); }
}

export async function verifyPrototypeApprovalEvidence(input: PrototypeApprovalEvidenceInput): Promise<PrototypeApprovalEvidence> {
  const batch = Number.isInteger(input.batch) ? input.batch : 0;
  if (batch < 1 || batch > 2) return fallbackReport(1, input.synthetic === true, ['source:batch-invalid']);
  const snapshotPath = `artifacts/prototype-approval-evidence.batch-${batch}.json`;
  const snapshotFile = await inspectFile(input.runRoot, snapshotPath, snapshotPath);
  if (snapshotFile.binding.status !== 'AVAILABLE' || snapshotFile.absolute === undefined) return fallbackReport(batch, input.synthetic === true, ['evidence:snapshot-missing']);
  let snapshot: PrototypeApprovalEvidence;
  try { snapshot = PrototypeApprovalEvidenceSchema.parse(JSON.parse(await readFile(snapshotFile.absolute, 'utf8'))); }
  catch { return fallbackReport(batch, input.synthetic === true, ['evidence:snapshot-invalid']); }
  const blockers: string[] = [];
  const evidence = [...snapshot.evidence, 'evidence:snapshot-read'];
  if (snapshot.batch !== batch) blockers.push('evidence:snapshot-batch-mismatch');
  if (snapshot.synthetic !== input.synthetic) blockers.push('policy:synthetic-evidence');
  if (!snapshot.passed) blockers.push(...snapshot.blockers.map((blocker) => `snapshot:${blocker}`));
  const current = await collectEvidence(input);
  blockers.push(...current.report.blockers);
  const currentSources = new Map(current.report.sourceArtifacts.map((item) => [item.path, item]));
  for (const source of snapshot.sourceArtifacts) {
    const sourceName = source.path.includes('build-report') ? 'build' : 'tournament';
    const currentSource = currentSources.get(source.path);
    if (!currentSource) { blockers.push(`source:${sourceName}-missing`); continue; }
    if (source.status !== currentSource.status || (source.status === 'AVAILABLE' && source.sha256 !== currentSource.sha256)) blockers.push(`source:${sourceName}-hash-mismatch`);
  }
  const currentCandidates = new Map(current.report.candidates.map((candidate) => [candidate.slot, candidate]));
  for (const candidate of snapshot.candidates) compareCandidateSnapshots(candidate, currentCandidates.get(candidate.slot), blockers);
  await readWinnerAndReview(input.runRoot, batch, current.build, current.tournament, blockers, evidence);
  // Preserve an existing verification timestamp when a caller persists the
  // returned report and verifies the same batch again.  Repeated verification
  // remains read-only and stable instead of turning a valid resume into a new
  // artifact mutation solely because the clock advanced.
  return makeReport({ batch, synthetic: input.synthetic, sourceArtifacts: snapshot.sourceArtifacts, candidates: snapshot.candidates, evidence, blockers, capturedAt: snapshot.capturedAt, verifiedAt: snapshot.verifiedAt ?? new Date().toISOString() });
}
