import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { reviewReferenceMediaIdentity } from '../../src/core/evidence-provenance.js';
import {
  discardReferenceCode,
  promoteReferenceCode,
  recordReferenceCodeAnalysis,
  referenceCodeResearchInput,
  verifyReferenceCodeAnalysis,
} from '../../src/core/reference-code.js';
import { REFERENCE_CODE_PACKAGE_INDEX_NAME } from '../../src/schemas/reference-code.js';
import { referenceCodeAnalysisFixture, referenceCodePackageFixture } from '../fixtures/reference-code.js';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const SCRIPT_PATH = 'reference-code/pkg/scripts/main/rules.lua';
const SCRIPT = Array.from({ length: 10 }, (_, index) => `local step${index} = true`).join('\n') + '\n';

async function draftPackage() {
  const root = await mkdtemp(path.join(tmpdir(), 'reference-code-analysis-'));
  roots.push(root);
  const runRoot = path.join(root, 'runs', 'run-1');
  const workspace = path.join(runRoot, 'workspace/game');
  await mkdir(workspace, { recursive: true });
  await mkdir(path.join(runRoot, 'reference-code/pkg/scripts/main'), { recursive: true });
  await mkdir(path.join(runRoot, 'reference-code/pkg/raw'), { recursive: true });
  await writeFile(path.join(runRoot, SCRIPT_PATH), SCRIPT);
  const raw = Buffer.from('archive data');
  await writeFile(path.join(runRoot, 'reference-code/pkg/raw/game.arcd'), raw);
  const pkg = referenceCodePackageFixture({
    workspace,
    downloads: [{ name: 'game.arcd', urls: ['https://cdn.example/build/archive/game0.arcd'], path: 'reference-code/pkg/raw/game.arcd', sha256: sha256(raw), bytes: raw.length }],
    scripts: [{ path: SCRIPT_PATH, originalName: 'main/rules.lua', sha256: sha256(SCRIPT), bytes: Buffer.byteLength(SCRIPT), lineCount: 10 }],
  });
  await writeFile(path.join(runRoot, 'reference-code/pkg', REFERENCE_CODE_PACKAGE_INDEX_NAME), `${JSON.stringify(pkg, null, 2)}\n`);
  return { runRoot, workspace, target: { runRoot, targetRunId: 'run-1', targetGame: 'beach-game', workspace } };
}

async function verifiedPackage() {
  const draft = await draftPackage();
  const promoted = await promoteReferenceCode({ runRoot: draft.runRoot, targetGame: 'beach-game', workspace: draft.workspace, packageId: 'pkg' });
  await reviewReferenceMediaIdentity({ runRoot: draft.runRoot, targetGame: 'beach-game', workspace: draft.workspace, id: promoted.id, expectedSha256: promoted.sha256, reviewer: 'factory-operator', basis: 'downloaded from the reference page' });
  const manifest = JSON.parse(await readFile(path.join(draft.runRoot, 'reference-evidence/manifest.json'), 'utf8')) as { entries: Array<{ id: string; storedPath: string; sha256: string }> };
  const entry = manifest.entries.find((candidate) => candidate.id === promoted.id)!;
  const analysis = referenceCodeAnalysisFixture({
    script: { path: SCRIPT_PATH, sha256: sha256(SCRIPT) },
    workspace: draft.workspace,
    packageRef: { evidenceId: entry.id, indexPath: entry.storedPath, sha256: entry.sha256 },
  });
  return { ...draft, promoted, analysis };
}

describe('reference code package promotion', () => {
  it('registers a READY package as pending code-reference evidence', async () => {
    const { runRoot, workspace } = await draftPackage();
    const promoted = await promoteReferenceCode({ runRoot, targetGame: 'beach-game', workspace, packageId: 'pkg' });
    const manifest = JSON.parse(await readFile(path.join(runRoot, 'reference-evidence/manifest.json'), 'utf8')) as { entries: Array<Record<string, unknown>> };
    expect(promoted.id).toBe('code-package-pkg');
    expect(manifest.entries).toEqual([expect.objectContaining({ id: 'code-package-pkg', purpose: 'code-reference', reviewStatus: 'PENDING', usableAsEvidence: false })]);
    expect(manifest.entries[0]).not.toHaveProperty('analysisTextPath');
  });

  it('refuses to promote a package whose files changed after capture', async () => {
    const { runRoot, workspace } = await draftPackage();
    await writeFile(path.join(runRoot, SCRIPT_PATH), `${SCRIPT}-- edited\n`);
    await expect(promoteReferenceCode({ runRoot, targetGame: 'beach-game', workspace, packageId: 'pkg' })).rejects.toThrow(/modified/i);
  });

  it('refuses to promote a package bound to another game', async () => {
    const { runRoot, workspace } = await draftPackage();
    await expect(promoteReferenceCode({ runRoot, targetGame: 'other-game', workspace, packageId: 'pkg' })).rejects.toThrow(/target mismatch/i);
  });

  it('discards an unpromoted draft but keeps a promoted package', async () => {
    const draft = await draftPackage();
    await promoteReferenceCode({ runRoot: draft.runRoot, targetGame: 'beach-game', workspace: draft.workspace, packageId: 'pkg' });
    await expect(discardReferenceCode({ runRoot: draft.runRoot, packageId: 'pkg' })).rejects.toThrow(/promoted/i);

    const other = await draftPackage();
    await expect(discardReferenceCode({ runRoot: other.runRoot, packageId: 'pkg' })).resolves.toMatchObject({ removed: true });
    await expect(readFile(path.join(other.runRoot, SCRIPT_PATH))).rejects.toThrow();
  });
});

describe('reference code analysis verification', () => {
  it('records an analysis whose citations match the verified package', async () => {
    const { target, runRoot, analysis } = await verifiedPackage();
    const recorded = await recordReferenceCodeAnalysis({ ...target, value: analysis });
    expect(recorded.artifactPath).toBe(path.join(runRoot, 'artifacts/reference-code-analysis.json'));
    expect(JSON.parse(await readFile(recorded.artifactPath, 'utf8'))).toMatchObject({ artifactType: 'reference-code-analysis', targetRunId: 'run-1' });
    await expect(referenceCodeResearchInput(target)).resolves.toMatchObject({ status: 'verified', path: 'artifacts/reference-code-analysis.json' });
  });

  it('blocks an analysis while the package is still pending identity review', async () => {
    const draft = await draftPackage();
    const promoted = await promoteReferenceCode({ runRoot: draft.runRoot, targetGame: 'beach-game', workspace: draft.workspace, packageId: 'pkg' });
    const analysis = referenceCodeAnalysisFixture({
      script: { path: SCRIPT_PATH, sha256: sha256(SCRIPT) },
      workspace: draft.workspace,
      packageRef: { evidenceId: promoted.id, indexPath: promoted.storedPath, sha256: promoted.sha256 },
    });
    const result = await verifyReferenceCodeAnalysis({ ...draft.target, value: analysis });
    expect(result.passed).toBe(false);
    expect(result.blockers).toContain('reference-code:package-not-verified');
  });

  it('blocks citations to scripts missing from the package or changed on disk', async () => {
    const { target, runRoot, analysis } = await verifiedPackage();
    const missing = structuredClone(analysis);
    missing.claims[0]!.codeRefs = [{ script: 'reference-code/pkg/scripts/main/other.lua', sha256: sha256(SCRIPT), startLine: 1, endLine: 2 }];
    expect((await verifyReferenceCodeAnalysis({ ...target, value: missing })).blockers).toContain('reference-code:script-not-in-package:reference-code/pkg/scripts/main/other.lua');

    await writeFile(path.join(runRoot, SCRIPT_PATH), `${SCRIPT}-- edited\n`);
    expect((await verifyReferenceCodeAnalysis({ ...target, value: analysis })).blockers).toContain(`reference-code:script-hash-mismatch:${SCRIPT_PATH}`);
  });

  it('blocks line ranges beyond the cited script', async () => {
    const { target, analysis } = await verifiedPackage();
    analysis.claims[0]!.codeRefs = [{ script: SCRIPT_PATH, sha256: sha256(SCRIPT), startLine: 9, endLine: 11 }];
    expect((await verifyReferenceCodeAnalysis({ ...target, value: analysis })).blockers).toContain('reference-code:line-range-outside-script:pay');
  });

  it('blocks an analysis bound to another run or game', async () => {
    const { target, analysis } = await verifiedPackage();
    const result = await verifyReferenceCodeAnalysis({ ...target, value: { ...analysis, targetRunId: 'run-2', targetGame: 'other-game' } });
    expect(result.blockers).toEqual(expect.arrayContaining(['reference-code:target-run-mismatch', 'reference-code:target-game-mismatch']));
  });

  it('refuses to record a blocked analysis', async () => {
    const { target, runRoot, analysis } = await verifiedPackage();
    await expect(recordReferenceCodeAnalysis({ ...target, value: { ...analysis, targetRunId: 'run-2' } })).rejects.toThrow(/target-run-mismatch/);
    await expect(readFile(path.join(runRoot, 'artifacts/reference-code-analysis.json'))).rejects.toThrow();
  });

  it('research input is absent without a package, blocked until analysis exists, and blocked after tampering', async () => {
    const draft = await draftPackage();
    await expect(referenceCodeResearchInput(draft.target)).resolves.toEqual({ status: 'absent' });

    const { target, runRoot, analysis } = await verifiedPackage();
    await expect(referenceCodeResearchInput(target)).resolves.toMatchObject({ status: 'blocked', blockers: ['reference-code:analysis-missing:code-package-pkg'] });
    await recordReferenceCodeAnalysis({ ...target, value: analysis });
    await writeFile(path.join(runRoot, SCRIPT_PATH), `${SCRIPT}-- edited\n`);
    await expect(referenceCodeResearchInput(target)).resolves.toMatchObject({ status: 'blocked', blockers: expect.arrayContaining([`reference-code:script-hash-mismatch:${SCRIPT_PATH}`]) });
  });
});
