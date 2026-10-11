import { copyFile, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DeliveryAudienceSchema, DeliveryKindSchema, DeliveryManifestSchema, type DeliveryAudience, type DeliveryKind, type DeliveryManifest } from '../schemas/delivery.js';
import { CompletionGateReportSchema } from './completion-gates.js';
import { HumanPlaytestAcceptanceSchema, ReleaseCandidateSchema } from '../schemas/factory-operating.js';
import { QaReportSchema } from '../schemas/index.js';
import { ensureDir, listFiles, sha256File, sha256Text, writeJsonAtomic } from './files.js';
import { redactValue } from './redaction.js';
import { verifyFrozenCandidate } from './release.js';

type DeliveryResult = {
  status: 'READY' | 'BLOCKED';
  runId: string;
  candidateId: string;
  blockers: string[];
  nextActions: string[];
  evidencePaths: string[];
  manifest?: DeliveryManifest;
  manifestPath?: string;
};

type ExportResult = DeliveryResult & { audience: DeliveryAudience; exportPath?: string };

function within(parent: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function assertRealTree(root: string, directory: string, skipDirectories = new Set<string>()): Promise<void> {
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('delivery run root must be a real directory');
  const directoryStat = await lstat(directory);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw new Error('delivery source root must be a real directory, not a symlink');
  const resolvedRoot = await realpath(root);
  const resolvedDirectory = await realpath(directory);
  if (!within(resolvedRoot, resolvedDirectory)) throw new Error('delivery source escapes the run root');
  const walk = async (current: string): Promise<void> => {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (skipDirectories.has(entry.name)) continue;
      const file = path.join(current, entry.name);
      const info = await lstat(file);
      if (info.isSymbolicLink()) throw new Error(`delivery source contains a symlink: ${path.relative(root, file)}`);
      const resolved = await realpath(file);
      if (!within(resolvedRoot, resolved)) throw new Error(`delivery source escapes the run root: ${path.relative(root, file)}`);
      if (info.isDirectory()) await walk(file);
      else if (!info.isFile()) throw new Error(`delivery source contains a non-regular entry: ${path.relative(root, file)}`);
    }
  };
  await walk(directory);
}

async function copySafeTree(runRoot: string, source: string, destination: string, skipDirectories = new Set<string>()): Promise<void> {
  await assertRealTree(runRoot, source, skipDirectories);
  await ensureDir(destination);
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (skipDirectories.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    const info = await lstat(from);
    if (info.isSymbolicLink()) throw new Error(`delivery source contains a symlink: ${path.relative(runRoot, from)}`);
    if (info.isDirectory()) await copySafeTree(runRoot, from, to, skipDirectories);
    else if (info.isFile()) { await ensureDir(path.dirname(to)); await copyFile(from, to); }
    else throw new Error(`delivery source contains a non-regular entry: ${path.relative(runRoot, from)}`);
  }
}

async function readJson(runRoot: string, relative: string): Promise<unknown | undefined> {
  try { return JSON.parse(await readFile(path.join(runRoot, relative), 'utf8')) as unknown; } catch { return undefined; }
}

async function existingFile(runRoot: string, relative: string): Promise<boolean> {
  try { const info = await lstat(path.join(runRoot, relative)); return info.isFile() && !info.isSymbolicLink(); } catch { return false; }
}

async function payloadFiles(directory: string): Promise<Array<{ path: string; sha256: string }>> {
  const files = await listFiles(directory);
  return Promise.all(files.map(async (relative) => ({ path: relative.replaceAll(path.sep, '/'), sha256: await sha256File(path.join(directory, relative)) })));
}

function payloadHash(files: Array<{ path: string; sha256: string }>): string {
  return sha256Text(files.map((file) => `${file.path}:${file.sha256}`).join('\n'));
}

function deliveryKind(value: string): DeliveryKind {
  const normalized = value.trim().replaceAll('-', '_').toUpperCase();
  if (normalized === 'WEB' || normalized === 'PLAYER') return 'WEB_DELIVERY';
  if (normalized === 'CANDIDATE' || normalized === 'HANDOFF') return 'CANDIDATE_HANDOFF';
  return DeliveryKindSchema.parse(normalized);
}

function hashManifestBody(value: Omit<DeliveryManifest, 'manifestHash' | 'createdAt'>): string {
  return sha256Text(JSON.stringify(value));
}

function manifestBody(value: DeliveryManifest): Omit<DeliveryManifest, 'manifestHash' | 'createdAt'> {
  const body = { ...value } as Record<string, unknown>;
  delete body.manifestHash;
  delete body.createdAt;
  return body as Omit<DeliveryManifest, 'manifestHash' | 'createdAt'>;
}

async function copyRedactedJson(runRoot: string, relative: string, destination: string): Promise<boolean> {
  const value = await readJson(runRoot, relative);
  if (value === undefined) return false;
  const redacted = redactValue(redactPrivateValue(value, runRoot));
  await writeJsonAtomic(destination, redacted);
  return true;
}

function secretLike(file: string, content: Buffer): boolean {
  if (/(?:^|\/)(?:\.env(?:\.|$)|\.npmrc$|.*(?:credential|secret|private-key|auth|token).*)/iu.test(file)) return true;
  const text = content.toString('utf8');
  return /(?:api[_-]?key|access[_-]?token|auth(?:entication)?[_-]?token|secret(?:[_-]?key)?|password|passwd|private[_-]?key|github[_-]?token|aws[_-]?access[_-]?key)\s*[:=]\s*["']?[^\s"']{8,}["']?/iu.test(text)
    || /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_-]{16,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{16,})\b/u.test(text)
    || /\bauthorization\s*:\s*bearer\s+[A-Za-z0-9._~+/-]{8,}/iu.test(text);
}

async function assertPublicPayload(directory: string): Promise<void> {
  for (const relative of await listFiles(directory)) {
    const bytes = await readFile(path.join(directory, relative));
    if (secretLike(relative, bytes)) throw new Error(`export payload contains a secret-like file or value: ${relative}`);
  }
}

function redactPrivateString(value: string, runRoot: string): string {
  const replaced = value.replaceAll(runRoot, '$RUN_ROOT').replaceAll(path.resolve(runRoot, '..'), '$RUNS_ROOT');
  return replaced.replace(/\/(?:Users|private|var|tmp)\/[^\s"'\\,}\]]+/gu, '[REDACTED_PATH]');
}

function redactPrivateValue(value: unknown, runRoot: string): unknown {
  if (typeof value === 'string') return redactPrivateString(value, runRoot);
  if (Array.isArray(value)) return value.map((item) => redactPrivateValue(item, runRoot));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactPrivateValue(item, runRoot)]));
  return value;
}

async function assertPrivatePayload(directory: string): Promise<void> {
  await assertPublicPayload(directory);
  for (const relative of await listFiles(directory)) {
    const text = (await readFile(path.join(directory, relative))).toString('utf8');
    if (/\/(?:Users|private|var|tmp)\/[^\s"'\\,}\]]+/u.test(text)) throw new Error(`private evidence contains an absolute path: ${relative}`);
  }
}

const developerSourceRoots = new Set(['src', 'public', 'tests', 'test', 'assets', 'scripts']);
const developerRootFiles = /^(?:index\.html|package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|tsconfig(?:\.[^/]+)?\.json|vite\.config\.[cm]?[jt]s|eslint\.config\.[cm]?[jt]s|README(?:\.[^/]+)?|LICENSE(?:\.[^/]+)?|\.gitignore)$/iu;

async function assertDeveloperSourceAllowlist(source: string): Promise<void> {
  for (const relative of await listFiles(source)) {
    const normalized = relative.replaceAll(path.sep, '/');
    const [top] = normalized.split('/');
    if (!top || (!developerSourceRoots.has(top) && !developerRootFiles.test(normalized))) {
      throw new Error(`developer source contains a file outside the export allowlist: ${normalized}`);
    }
  }
}

async function verifyExistingExport(runRoot: string, exportRoot: string, manifest: DeliveryManifest): Promise<void> {
  await assertRealTree(runRoot, exportRoot);
  const actual = (await payloadFiles(exportRoot)).filter((file) => file.path !== 'delivery-manifest.json');
  const expected = [...manifest.payloadFiles].sort((a, b) => a.path.localeCompare(b.path));
  if (actual.length !== expected.length || actual.some((file, index) => file.path !== expected[index]!.path || file.sha256 !== expected[index]!.sha256)) {
    throw new Error('export payload hash mismatch; the existing export was modified or is incomplete');
  }
  if (payloadHash(actual) !== manifest.payloadHash) throw new Error('export payload hash mismatch');
}

async function candidateFor(runRoot: string, candidateId: string) {
  const raw = await readJson(runRoot, 'artifacts/release-candidate.json');
  if (raw === undefined) throw new Error('immutable release candidate is missing');
  const candidate = ReleaseCandidateSchema.parse(raw);
  const requested = candidateId === 'current' ? candidate.coreHash : candidateId;
  if (requested !== candidate.coreHash) throw new Error('candidate id does not match the frozen candidate');
  const seen = new Set<string>();
  for (const file of candidate.files) {
    const normalized = file.path.replaceAll('\\', '/');
    if (path.isAbsolute(normalized) || normalized.split('/').some((part) => part === '..' || part === '.') || seen.has(normalized)) throw new Error('candidate contains an unsafe or duplicate payload path');
    seen.add(normalized);
  }
  await verifyFrozenCandidate(runRoot, candidate, candidate.coreHash);
  return candidate;
}

async function sourceHashes(runRoot: string, relatives: string[]): Promise<Record<string, string>> {
  const output: Record<string, string> = {};
  for (const relative of relatives) if (await existingFile(runRoot, relative)) output[relative] = await sha256File(path.join(runRoot, relative));
  return output;
}

async function gateFor(runRoot: string, kind: DeliveryKind, candidateId: string): Promise<{ blockers: string[]; evidencePaths: string[]; gameId: string; limitations: string[]; qualityRefs: string[]; humanRefs: string[]; platformMatrix?: string }> {
  const blueprintRaw = await readJson(runRoot, 'artifacts/game-blueprint.json');
  const gameId = blueprintRaw && typeof blueprintRaw === 'object' && typeof (blueprintRaw as { gameId?: unknown }).gameId === 'string' ? (blueprintRaw as { gameId: string }).gameId : 'unknown-game';
  const evidencePaths = ['artifacts/release-candidate.json', 'artifacts/build-report.json', 'artifacts/qa-report.json'];
  const blockers: string[] = [];
  const limitations: string[] = [];
  const qualityRefs = ['artifacts/qa-report.json'];
  const humanRefs: string[] = [];
  const qaRaw = await readJson(runRoot, 'artifacts/qa-report.json');
  const qa = QaReportSchema.safeParse(qaRaw);
  if (!qa.success || !qa.data.passed) blockers.push('qa-report-not-passed');
  if (!qa.success || !qa.data.qaBinding) blockers.push('qa-binding-missing');
  else if (qa.data.qaBinding.candidateHash !== candidateId) blockers.push('qa-binding-candidate-mismatch');
  const candidateRaw = await readJson(runRoot, 'artifacts/release-candidate.json');
  const candidate = ReleaseCandidateSchema.safeParse(candidateRaw);
  if (!candidate.success || candidate.data.status !== 'READY' || candidate.data.coreHash !== candidateId) blockers.push('candidate-not-ready');
  const completionRaw = await readJson(runRoot, 'artifacts/completion-gates.json');
  const completion = CompletionGateReportSchema.safeParse(completionRaw);
  if (kind === 'WEB_DELIVERY') {
    evidencePaths.push('artifacts/completion-gates.json');
    if (!completion.success || !completion.data.releaseReady) {
      blockers.push(...(completion.success ? completion.data.blockers.map((item) => `completion:${item}`) : ['completion-gates-not-ready']));
    }
    if (!completion.success || completion.data.candidateHash !== candidateId || completion.data.candidateBinding?.passed !== true) blockers.push('completion-candidate-binding-mismatch');
    const humanRaw = await readJson(runRoot, 'human/playtest-acceptance.json');
    const human = HumanPlaytestAcceptanceSchema.safeParse(humanRaw);
    if (!human.success || human.data.passed !== true || human.data.buildHash !== candidateId) {
      blockers.push(humanRaw === undefined ? 'human-playtest-evidence-missing' : !human.success ? 'human-playtest-evidence-invalid' : human.data.buildHash !== candidateId ? 'human-playtest-candidate-mismatch' : 'human-playtest-not-passed');
    } else humanRefs.push('human/playtest-acceptance.json');
    limitations.push('Web delivery does not certify WeChat, Douyin or TapTap package publication.');
  } else {
    if (!completion.success || !completion.data.candidateReady) limitations.push(...(completion.success ? completion.data.blockers.map((item) => `candidate-gate:${item}`) : ['candidate-gates-unavailable']));
    limitations.push('Candidate handoff remains subject to final human acceptance and platform evidence.');
  }
  const matrix = await readJson(runRoot, 'artifacts/platform-release-matrix.json');
  const platformMatrix = matrix !== undefined ? 'artifacts/platform-release-matrix.json' : undefined;
  if (platformMatrix) evidencePaths.push(platformMatrix);
  if (await existingFile(runRoot, 'artifacts/quality-gate-matrix.json')) { qualityRefs.push('artifacts/quality-gate-matrix.json'); evidencePaths.push('artifacts/quality-gate-matrix.json'); }
  if (await existingFile(runRoot, 'human/playtest-acceptance.json') && !humanRefs.includes('human/playtest-acceptance.json')) humanRefs.push('human/playtest-acceptance.json');
  return { blockers: [...new Set(blockers)], evidencePaths: [...new Set(evidencePaths)], gameId, limitations: [...new Set(limitations)], qualityRefs: [...new Set(qualityRefs)], humanRefs, ...(platformMatrix ? { platformMatrix } : {}) };
}

export async function createDeliveryManifest(runRoot: string, runId: string, candidateIdInput: string, kindInput: string): Promise<DeliveryResult> {
  const kind = deliveryKind(kindInput);
  const candidate = await candidateFor(runRoot, candidateIdInput);
  const candidateId = candidate.coreHash;
  const gates = await gateFor(runRoot, kind, candidateId);
  const manifestPath = path.join(runRoot, `artifacts/delivery-manifest.${kind.toLowerCase()}.json`);
  if (gates.blockers.length > 0) return { status: 'BLOCKED', runId, candidateId, blockers: gates.blockers, nextActions: ['resolve the listed gates and resume the run', `retry factory delivery ${runId} --candidate ${candidateId} --kind ${kind}`], evidencePaths: gates.evidencePaths, manifestPath };
  const release = path.join(runRoot, 'release-candidate');
  const files = candidate.files;
  const body = {
    schemaVersion: 1 as const,
    artifactKind: kind,
    gameId: gates.gameId,
    runId,
    candidateId,
    payloadRoot: 'release-candidate/',
    payloadFiles: files,
    payloadHash: payloadHash(files),
    sourceHashes: await sourceHashes(runRoot, ['artifacts/game-blueprint.json', 'artifacts/build-report.json', 'artifacts/qa-report.json', 'artifacts/completion-gates.json', 'artifacts/platform-release-matrix.json', 'artifacts/quality-gate-matrix.json']),
    qualityVerdictRefs: gates.qualityRefs,
    ...(gates.platformMatrix ? { platformMatrix: gates.platformMatrix } : {}),
    humanApprovalRefs: gates.humanRefs,
    knownLimitations: gates.limitations,
    startupInstructions: ['Serve release-candidate/web/ from a local static HTTP server; do not open the management API origin.', 'Start from a clean browser context and use natural input through settlement/failure and replay.'],
  };
  const existing = await readJson(runRoot, `artifacts/delivery-manifest.${kind.toLowerCase()}.json`);
  if (existing !== undefined) {
    const parsed = DeliveryManifestSchema.parse(existing);
    if (parsed.candidateId !== candidateId || parsed.artifactKind !== kind) throw new Error('existing delivery manifest is bound to a different candidate');
    if (parsed.runId !== runId || parsed.manifestHash !== hashManifestBody(manifestBody(parsed)) || parsed.payloadHash !== payloadHash([...parsed.payloadFiles].sort((a, b) => a.path.localeCompare(b.path))) || JSON.stringify(manifestBody(parsed)) !== JSON.stringify(body)) {
      throw new Error('existing delivery manifest integrity hash mismatch');
    }
    const expectedFiles = [...candidate.files].sort((a, b) => a.path.localeCompare(b.path));
    const actualFiles = [...parsed.payloadFiles].sort((a, b) => a.path.localeCompare(b.path));
    if (expectedFiles.length !== actualFiles.length || expectedFiles.some((file, index) => file.path !== actualFiles[index]!.path || file.sha256 !== actualFiles[index]!.sha256)) {
      throw new Error('existing delivery manifest payload does not match the frozen candidate');
    }
    return { status: 'READY', runId, candidateId, blockers: [], nextActions: [], evidencePaths: gates.evidencePaths, manifest: parsed, manifestPath };
  }
  const manifest = DeliveryManifestSchema.parse({ ...body, manifestHash: hashManifestBody(body), createdAt: new Date().toISOString() });
  await writeJsonAtomic(manifestPath, manifest);
  await writeJsonAtomic(path.join(release, `delivery-manifest.${kind.toLowerCase()}.json`), manifest);
  return { status: 'READY', runId, candidateId, blockers: [], nextActions: [], evidencePaths: [...gates.evidencePaths, path.relative(runRoot, manifestPath)], manifest, manifestPath };
}

function audienceSource(kind: DeliveryKind, audience: DeliveryAudience): string {
  if (audience === 'player') return 'WEB_DELIVERY';
  return kind;
}

export async function exportDelivery(runRoot: string, runId: string, candidateIdInput: string, audienceInput: string): Promise<ExportResult> {
  const audience = DeliveryAudienceSchema.parse(audienceInput.trim().toLowerCase());
  const candidate = await candidateFor(runRoot, candidateIdInput);
  const candidateId = candidate.coreHash;
  const preferredKind = audienceSource('CANDIDATE_HANDOFF', audience);
  const manifestResult = await createDeliveryManifest(runRoot, runId, candidateId, preferredKind);
  if (manifestResult.status === 'BLOCKED') return { ...manifestResult, audience };
  const manifest = manifestResult.manifest!;
  if (audience === 'player' && manifest.artifactKind !== 'WEB_DELIVERY') {
    return { status: 'BLOCKED', runId, candidateId, audience, blockers: ['web-delivery-gate-required'], nextActions: [`run factory delivery ${runId} --candidate ${candidateId} --kind WEB_DELIVERY`], evidencePaths: manifestResult.evidencePaths };
  }
  const exportRoot = path.join(runRoot, 'exports', candidateId, audience);
  const outputManifestPath = path.join(exportRoot, 'delivery-manifest.json');
  if (await existingFile(runRoot, path.relative(runRoot, outputManifestPath))) {
    const existing = DeliveryManifestSchema.parse(JSON.parse(await readFile(outputManifestPath, 'utf8')));
    await verifyExistingExport(runRoot, exportRoot, existing);
    return { status: 'READY', runId, candidateId, audience, blockers: [], nextActions: [], evidencePaths: manifestResult.evidencePaths, manifest: existing, manifestPath: outputManifestPath, exportPath: exportRoot };
  }
  await rm(exportRoot, { recursive: true, force: true });
  await mkdir(exportRoot, { recursive: true });
  const release = path.join(runRoot, 'release-candidate');
  if (audience === 'player') {
    await copySafeTree(runRoot, path.join(release, 'web'), path.join(exportRoot, 'web'));
    if (await existingFile(runRoot, 'release-candidate/marketing/promo.svg')) await copyFile(path.join(release, 'marketing/promo.svg'), path.join(exportRoot, 'promo.svg'));
    await writeFile(path.join(exportRoot, 'PLAYER_README.md'), '启动：在本目录运行任意本地静态 HTTP 服务器后打开 web/index.html。\n范围：浏览器 Web 候选；三平台发布仍需独立适配器和真机证据。\n');
    await assertPublicPayload(exportRoot);
  } else if (audience === 'developer') {
    await assertDeveloperSourceAllowlist(path.join(runRoot, 'workspace/game'));
    await copySafeTree(runRoot, path.join(runRoot, 'workspace/game'), path.join(exportRoot, 'source'), new Set(['node_modules', 'dist']));
    await copySafeTree(runRoot, path.join(release, 'web'), path.join(exportRoot, 'dist'));
    await writeFile(path.join(exportRoot, 'DEVELOPER_README.md'), '在 source/ 下运行 pnpm install、pnpm test、pnpm build；dist/ 是已验证 Web 构建。源码包不包含工厂日志或私有输入。\n');
    await assertPublicPayload(exportRoot);
  } else {
    const selected = ['state.json', 'artifacts/game-blueprint.json', 'artifacts/build-report.json', 'artifacts/qa-report.json', 'artifacts/completion-gates.json', 'artifacts/quality-gate-matrix.json', 'artifacts/platform-release-matrix.json', 'artifacts/release-candidate.json', 'logs/agent-packages/QA.attempt-1.json', 'logs/agent-packages/FULL_BUILD.attempt-1.json'];
    for (const relative of selected) if (await existingFile(runRoot, relative)) await copyRedactedJson(runRoot, relative, path.join(exportRoot, 'evidence', relative));
    await writeFile(path.join(exportRoot, 'EVIDENCE_README.md'), '此包只含脱敏的任务、构建、QA 和门禁摘要；未导出私有录屏、原始聊天、凭据或完整运行目录。\n');
    await assertPrivatePayload(exportRoot);
  }
  const files = await payloadFiles(exportRoot);
  const exportBody = {
    ...manifest,
    audience,
    artifactKind: manifest.artifactKind,
    payloadRoot: path.relative(runRoot, exportRoot).replaceAll(path.sep, '/') + '/',
    payloadFiles: files,
    payloadHash: payloadHash(files),
    knownLimitations: [...manifest.knownLimitations, ...(audience === 'developer' ? ['Clean-room dependency installation and rebuild must be repeated by the recipient.'] : [])],
  };
  const exported = DeliveryManifestSchema.parse({ ...exportBody, manifestHash: hashManifestBody(exportBody), createdAt: new Date().toISOString() });
  await writeJsonAtomic(outputManifestPath, exported);
  await writeJsonAtomic(path.join(runRoot, `artifacts/export-${audience}-${candidateId.slice(0, 12)}.json`), { schemaVersion: 1, runId, candidateId, audience, manifestPath: path.relative(runRoot, outputManifestPath), manifestHash: exported.manifestHash, payloadHash: exported.payloadHash, exportedAt: new Date().toISOString() });
  return { status: 'READY', runId, candidateId, audience, blockers: [], nextActions: [], evidencePaths: [...manifestResult.evidencePaths, path.relative(runRoot, outputManifestPath)], manifest: exported, manifestPath: outputManifestPath, exportPath: exportRoot };
}
