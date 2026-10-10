import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type APIRequestContext, type Response } from '@playwright/test';
import { z } from 'zod';
import { EvidenceProvenanceManifestSchema } from '../schemas/evidence-provenance.js';
import {
  REFERENCE_CODE_ANALYSIS_ARTIFACT,
  REFERENCE_CODE_PACKAGE_ID,
  REFERENCE_CODE_PACKAGE_INDEX_NAME,
  ReferenceCodeAnalysisSchema,
  ReferenceCodePackageSchema,
  referenceCodeEvidenceId,
  type ReferenceCodeAnalysis,
  type ReferenceCodePackage,
} from '../schemas/reference-code.js';
import { extractDefoldScripts } from './reference-code-defold.js';
import { ingestReferenceMedia, usableEvidenceEntries } from './evidence-provenance.js';
import { exists, writeJsonAtomic } from './files.js';

const DEFOLD_LISTING = 'archive_files.json';
const DEFOLD_REQUIRED = ['game.arci', 'game.arcd'] as const;
const DEFOLD_OPTIONAL = ['game.projectc'] as const;
const MAX_DOWNLOAD_BYTES = 256 * 1024 * 1024;
const SAFE_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;

const DefoldListingSchema = z.object({
  content: z.array(z.object({
    name: z.string().regex(SAFE_FILE_NAME),
    size: z.number().int().nonnegative().max(MAX_DOWNLOAD_BYTES),
    pieces: z.array(z.object({ name: z.string().regex(SAFE_FILE_NAME), offset: z.number().int().nonnegative() })).min(1).max(256),
  })).max(64),
});

function sha256(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

function lineCount(text: string) {
  if (!text) return 0;
  const lines = text.split('\n').length;
  return text.endsWith('\n') ? lines - 1 : lines;
}

function packagePaths(runRoot: string, packageId: string) {
  if (!REFERENCE_CODE_PACKAGE_ID.test(packageId)) throw new Error(`invalid reference code package id: ${packageId}`);
  const packageRel = `reference-code/${packageId}`;
  const packageDir = path.join(runRoot, packageRel);
  return { packageRel, packageDir, indexPath: path.join(packageDir, REFERENCE_CODE_PACKAGE_INDEX_NAME) };
}

function runLocalFile(runRoot: string, relativePath: string) {
  const absolute = path.resolve(runRoot, relativePath);
  const relative = path.relative(runRoot, absolute);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`path escapes the run root: ${relativePath}`);
  return absolute;
}

async function hashRunFile(runRoot: string, relativePath: string) {
  try { return sha256(await readFile(runLocalFile(runRoot, relativePath))); } catch { return undefined; }
}

async function verifyPackageFiles(runRoot: string, pkg: ReferenceCodePackage) {
  for (const file of [...pkg.downloads, ...pkg.scripts]) {
    if (await hashRunFile(runRoot, file.path) !== file.sha256) throw new Error('reference code package was modified after capture; use a new package id');
  }
}

async function readPackage(indexPath: string) {
  return ReferenceCodePackageSchema.parse(JSON.parse(await readFile(indexPath, 'utf8')));
}

async function readManifest(runRoot: string) {
  const manifestPath = path.join(runRoot, 'reference-evidence/manifest.json');
  if (!await exists(manifestPath)) return undefined;
  return JSON.parse(await readFile(manifestPath, 'utf8')) as unknown;
}

type DefoldListingHit = { url: string; body: Buffer; referer: string | undefined };

async function listingReferer(response: Response) {
  try { return response.request().frame().url(); } catch { /* service-worker requests have no frame */ }
  return (await response.request().allHeaders())['referer'];
}

function waitForDefoldListing(onResponse: (listener: (response: Response) => void) => void) {
  return new Promise<DefoldListingHit>((resolve) => {
    onResponse((response) => {
      let pathname: string;
      try { pathname = new URL(response.url()).pathname; } catch { return; }
      if (!pathname.endsWith(`/${DEFOLD_LISTING}`) || !response.ok()) return;
      void Promise.all([response.body(), listingReferer(response)])
        .then(([body, referer]) => resolve({ url: response.url(), body, referer }))
        .catch(() => undefined);
    });
  });
}

async function downloadDefoldFile(request: APIRequestContext, base: string, item: z.infer<typeof DefoldListingSchema>['content'][number], referer: string | undefined) {
  const assembled = Buffer.alloc(item.size);
  const urls: string[] = [];
  let expectedOffset = 0;
  for (const piece of [...item.pieces].sort((left, right) => left.offset - right.offset)) {
    const url = new URL(piece.name, base).href;
    const response = await request.get(url, { headers: referer ? { referer } : {}, failOnStatusCode: false });
    if (!response.ok()) return { ok: false, blocker: `reference-code:download-failed:${item.name}` } as const;
    const body = await response.body();
    if (piece.offset !== expectedOffset || piece.offset + body.length > item.size) return { ok: false, blocker: `reference-code:piece-size-mismatch:${item.name}` } as const;
    body.copy(assembled, piece.offset);
    expectedOffset += body.length;
    urls.push(url);
  }
  if (expectedOffset !== item.size) return { ok: false, blocker: `reference-code:piece-size-mismatch:${item.name}` } as const;
  return { ok: true, bytes: assembled, urls } as const;
}

/** Download a reference game's shipped build and extract its plain-text scripts
 * into a run-local draft. Drafts never touch the evidence manifest. */
export async function captureReferenceCode(input: {
  runRoot: string;
  targetGame: string;
  workspace: string;
  url: string;
  packageId: string;
  waitSeconds?: number;
}): Promise<{ package: ReferenceCodePackage; indexPath: string; reused: boolean }> {
  const runRoot = path.resolve(input.runRoot);
  const workspace = path.resolve(input.workspace);
  const paths = packagePaths(runRoot, input.packageId);
  const waitSeconds = input.waitSeconds ?? 90;
  if (!(waitSeconds > 0) || waitSeconds > 600) throw new Error('wait seconds must be in (0, 600]');
  if (!URL.canParse(input.url)) throw new Error(`invalid reference url: ${input.url}`);

  if (await exists(paths.indexPath)) {
    const existing = await readPackage(paths.indexPath);
    if (existing.requestedUrl !== input.url) throw new Error('reference code package id already used for a different url');
    if (existing.status === 'READY') {
      await verifyPackageFiles(runRoot, existing);
      return { package: existing, indexPath: paths.indexPath, reused: true };
    }
  }
  await rm(paths.packageDir, { recursive: true, force: true });
  await mkdir(paths.packageDir, { recursive: true });

  const blockers: string[] = [];
  const downloads: ReferenceCodePackage['downloads'] = [];
  const scripts: ReferenceCodePackage['scripts'] = [];
  let engine: ReferenceCodePackage['engine'] = null;
  let buildBaseUrl: string | null = null;
  let archive: ReferenceCodePackage['archive'] = null;
  let finalUrl = input.url;
  let pageTitle = '';

  const saveFile = async (relative: string, bytes: Buffer) => {
    const file = runLocalFile(runRoot, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  };
  const saveDownload = async (name: string, urls: string[], bytes: Buffer) => {
    const relative = `${paths.packageRel}/raw/${name}`;
    await saveFile(relative, bytes);
    downloads.push({ name, urls, path: relative, sha256: sha256(bytes), bytes: bytes.length });
  };

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 900, height: 900 } });
    const page = await context.newPage();
    const listing = waitForDefoldListing((listener) => page.on('response', listener));
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<undefined>((resolve) => { timer = setTimeout(() => resolve(undefined), waitSeconds * 1000); });
    await page.goto(input.url, { waitUntil: 'domcontentloaded', timeout: waitSeconds * 1000 }).catch(() => undefined);
    const hit = await Promise.race([listing, timeout]);
    clearTimeout(timer);
    finalUrl = page.url();
    pageTitle = await page.title().catch(() => '');

    if (!hit) blockers.push('reference-code:engine-not-detected');
    else {
      engine = 'defold';
      buildBaseUrl = new URL('.', hit.url).href;
      await saveDownload(DEFOLD_LISTING, [hit.url], hit.body);
      let parsed: z.infer<typeof DefoldListingSchema> | undefined;
      try { parsed = DefoldListingSchema.parse(JSON.parse(hit.body.toString('utf8'))); } catch { blockers.push('reference-code:archive-listing-invalid'); }
      const files = new Map<string, Buffer>();
      if (parsed) {
        for (const name of [...DEFOLD_REQUIRED, ...DEFOLD_OPTIONAL]) {
          const item = parsed.content.find((candidate) => candidate.name === name);
          if (!item) {
            if ((DEFOLD_REQUIRED as readonly string[]).includes(name)) blockers.push(`reference-code:archive-file-missing:${name}`);
            continue;
          }
          const result = await downloadDefoldFile(context.request, buildBaseUrl, item, hit.referer);
          if (!result.ok) { blockers.push(result.blocker); continue; }
          files.set(name, result.bytes);
          await saveDownload(name, result.urls, result.bytes);
        }
      }
      const arci = files.get('game.arci');
      const arcd = files.get('game.arcd');
      if (arci && arcd) {
        try {
          const extracted = extractDefoldScripts({ arci, arcd });
          for (const script of extracted.scripts) {
            const relative = `${paths.packageRel}/scripts/${script.name}`;
            await saveFile(relative, script.source);
            scripts.push({ path: relative, originalName: script.name, sha256: sha256(script.source), bytes: script.source.length, lineCount: lineCount(script.source.toString('utf8')) });
          }
          archive = { entryCount: extracted.entryCount, compressedCount: extracted.compressedCount, encryptedCount: extracted.encryptedCount, unsafeNameCount: extracted.unsafeNameCount, scriptCount: scripts.length };
          if (scripts.length === 0) blockers.push('reference-code:no-plain-text-scripts');
        } catch {
          blockers.push('reference-code:archive-unreadable');
        }
      }
    }
  } finally {
    await browser.close();
  }

  const pkg = ReferenceCodePackageSchema.parse({
    schemaVersion: 1,
    artifactType: 'reference-code-package',
    packageId: input.packageId,
    targetGame: input.targetGame,
    workspace,
    requestedUrl: input.url,
    finalUrl,
    pageTitle,
    engine,
    buildBaseUrl,
    downloads,
    archive,
    scripts,
    status: blockers.length === 0 ? 'READY' : 'BLOCKED',
    blockers,
    capturedAt: new Date().toISOString(),
  });
  await writeJsonAtomic(paths.indexPath, pkg);
  return { package: pkg, indexPath: paths.indexPath, reused: false };
}

/** Register one READY code package as PENDING code-reference evidence. */
export async function promoteReferenceCode(input: { runRoot: string; targetGame: string; workspace: string; packageId: string }) {
  const runRoot = path.resolve(input.runRoot);
  const workspace = path.resolve(input.workspace);
  const paths = packagePaths(runRoot, input.packageId);
  if (!await exists(paths.indexPath)) throw new Error(`reference code package not found: ${input.packageId}`);
  const pkg = await readPackage(paths.indexPath);
  if (pkg.status !== 'READY') throw new Error(`reference code package is not READY: ${input.packageId}`);
  if (pkg.targetGame !== input.targetGame || path.resolve(pkg.workspace) !== workspace) throw new Error(`reference code package target mismatch: ${input.packageId}`);
  await verifyPackageFiles(runRoot, pkg);
  return ingestReferenceMedia({ sourcePath: paths.indexPath, runRoot, targetGame: input.targetGame, workspace, id: referenceCodeEvidenceId(input.packageId), purpose: 'code-reference', analysisText: false });
}

/** Delete a package that was never promoted; promoted packages are hash-locked evidence. */
export async function discardReferenceCode(input: { runRoot: string; packageId: string }) {
  const runRoot = path.resolve(input.runRoot);
  const paths = packagePaths(runRoot, input.packageId);
  const manifest = await readManifest(runRoot);
  if (manifest !== undefined) {
    const parsed = EvidenceProvenanceManifestSchema.parse(manifest);
    if (parsed.entries.some((entry) => entry.id === referenceCodeEvidenceId(input.packageId))) throw new Error(`reference code package ${input.packageId} was promoted to evidence and cannot be discarded`);
  }
  if (!await exists(paths.packageDir)) throw new Error(`reference code package not found: ${input.packageId}`);
  await rm(paths.packageDir, { recursive: true, force: true });
  return { packageId: input.packageId, removed: true };
}

type CodeAnalysisTarget = { runRoot: string; targetRunId: string; targetGame: string; workspace: string };

/** Check that every citation points at a verified package script whose bytes are unchanged. */
export async function verifyReferenceCodeAnalysis(input: CodeAnalysisTarget & { value: unknown }): Promise<{ passed: boolean; blockers: string[]; issues: string[]; analysis?: ReferenceCodeAnalysis }> {
  const parsed = ReferenceCodeAnalysisSchema.safeParse(input.value);
  if (!parsed.success) return { passed: false, blockers: ['reference-code:analysis-schema-invalid'], issues: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) };
  const runRoot = path.resolve(input.runRoot);
  const workspace = path.resolve(input.workspace);
  const analysis = parsed.data;
  const blockers: string[] = [];
  if (analysis.targetRunId !== input.targetRunId) blockers.push('reference-code:target-run-mismatch');
  if (analysis.targetGame !== input.targetGame) blockers.push('reference-code:target-game-mismatch');
  if (path.resolve(analysis.workspace) !== workspace) blockers.push('reference-code:workspace-mismatch');

  const manifest = EvidenceProvenanceManifestSchema.safeParse(await readManifest(runRoot));
  const entry = manifest.success ? manifest.data.entries.find((candidate) => candidate.id === analysis.package.evidenceId) : undefined;
  if (!entry || entry.purpose !== 'code-reference') blockers.push('reference-code:package-evidence-missing');
  else {
    if (!entry.usableAsEvidence || entry.identityStatus !== 'VERIFIED_TARGET' || entry.reviewStatus !== 'VERIFIED') blockers.push('reference-code:package-not-verified');
    if (entry.targetGame !== input.targetGame || path.resolve(entry.workspace) !== workspace) blockers.push('reference-code:package-target-mismatch');
    if (entry.storedPath !== analysis.package.indexPath || entry.sha256 !== analysis.package.sha256) blockers.push('reference-code:package-reference-mismatch');
  }

  let pkg: ReferenceCodePackage | undefined;
  try {
    const bytes = await readFile(runLocalFile(runRoot, analysis.package.indexPath));
    if (sha256(bytes) !== analysis.package.sha256) blockers.push('reference-code:package-index-hash-mismatch');
    else pkg = ReferenceCodePackageSchema.parse(JSON.parse(bytes.toString('utf8')));
  } catch {
    blockers.push('reference-code:package-index-unavailable');
  }
  if (pkg) {
    if (pkg.targetGame !== input.targetGame || path.resolve(pkg.workspace) !== workspace) blockers.push('reference-code:package-target-mismatch');
    const scripts = new Map(pkg.scripts.map((script) => [script.path, script]));
    const actualHashes = new Map<string, string | undefined>();
    for (const claim of analysis.claims) {
      for (const ref of claim.codeRefs) {
        const script = scripts.get(ref.script);
        if (!script) { blockers.push(`reference-code:script-not-in-package:${ref.script}`); continue; }
        if (ref.sha256 !== script.sha256) blockers.push(`reference-code:citation-hash-mismatch:${claim.id}`);
        if (ref.endLine > script.lineCount) blockers.push(`reference-code:line-range-outside-script:${claim.id}`);
        if (!actualHashes.has(ref.script)) actualHashes.set(ref.script, await hashRunFile(runRoot, ref.script));
        if (actualHashes.get(ref.script) !== script.sha256) blockers.push(`reference-code:script-hash-mismatch:${ref.script}`);
      }
    }
  }
  const unique = [...new Set(blockers)];
  return { passed: unique.length === 0, blockers: unique, issues: [], analysis };
}

/** Persist a verified code analysis as the run's mechanic evidence artifact. */
export async function recordReferenceCodeAnalysis(input: CodeAnalysisTarget & { value: unknown }) {
  const result = await verifyReferenceCodeAnalysis(input);
  if (!result.passed || !result.analysis) throw new Error(`reference code analysis blocked: ${[...result.blockers, ...result.issues].join('; ')}`);
  const artifactPath = path.join(path.resolve(input.runRoot), 'artifacts', REFERENCE_CODE_ANALYSIS_ARTIFACT);
  await writeJsonAtomic(artifactPath, result.analysis);
  return { artifactPath, analysis: result.analysis };
}

export type ReferenceCodeResearchInput =
  | { status: 'absent' }
  | { status: 'verified'; path: string; analysis: ReferenceCodeAnalysis }
  | { status: 'blocked'; blockers: string[] };

/** Research-stage view: a verified code package obliges a verified analysis. */
export async function referenceCodeResearchInput(input: CodeAnalysisTarget): Promise<ReferenceCodeResearchInput> {
  const runRoot = path.resolve(input.runRoot);
  const artifactPath = path.join(runRoot, 'artifacts', REFERENCE_CODE_ANALYSIS_ARTIFACT);
  const manifest = await readManifest(runRoot);
  const packages = manifest === undefined ? [] : usableEvidenceEntries(manifest, { targetGame: input.targetGame, workspace: path.resolve(input.workspace) }, { purposes: ['code-reference'] });
  if (!await exists(artifactPath)) {
    if (packages.length === 0) return { status: 'absent' };
    return { status: 'blocked', blockers: packages.map((entry) => `reference-code:analysis-missing:${entry.id}`) };
  }
  let value: unknown;
  try { value = JSON.parse(await readFile(artifactPath, 'utf8')); } catch { return { status: 'blocked', blockers: ['reference-code:analysis-unreadable'] }; }
  const result = await verifyReferenceCodeAnalysis({ ...input, value });
  if (!result.passed || !result.analysis) return { status: 'blocked', blockers: result.blockers };
  return { status: 'verified', path: `artifacts/${REFERENCE_CODE_ANALYSIS_ARTIFACT}`, analysis: result.analysis };
}
