import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { reviewReferenceMediaIdentity } from '../../src/core/evidence-provenance.js';
import { createFactory } from '../../src/factory.js';
import { MockAgentProvider } from '../../src/providers/mock.js';
import type { AgentExecutionContext } from '../../src/providers/interfaces.js';
import { REFERENCE_CODE_PACKAGE_INDEX_NAME } from '../../src/schemas/reference-code.js';
import { ReferenceBehaviorAnalysisSchema } from '../../src/schemas/reference-evidence.js';
import { referenceCodeAnalysisFixture, referenceCodePackageFixture } from '../fixtures/reference-code.js';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const SCRIPT_PATH = 'reference-code/pkg/scripts/main/rules.lua';
const SCRIPT = Array.from({ length: 10 }, (_, index) => `local rule${index} = true`).join('\n') + '\n';

class CapturingProvider extends MockAgentProvider {
  researchContexts: AgentExecutionContext[] = [];
  markCodeBasis = true;
  override async analyzeReferenceEvidence(...args: Parameters<MockAgentProvider['analyzeReferenceEvidence']>) {
    if (args[1]) this.researchContexts.push(args[1]);
    const result = await super.analyzeReferenceEvidence(...args);
    if (!this.markCodeBasis) return result;
    const analysis = ReferenceBehaviorAnalysisSchema.parse(result.value);
    return { ...result, value: { ...analysis,
      behaviorChecks: analysis.behaviorChecks.map(check => ({ ...check, evidenceBasis: 'code-analysis', viewportBasis: 'qa-target' })),
      evidenceLimitations: ['Synthetic orchestration fixture; not runtime or perceptual evidence.'],
    } };
  }
}

async function referenceRun() {
  const root = await mkdtemp(path.join(tmpdir(), 'reference-code-research-'));
  roots.push(root);
  const seed = path.join(root, 'seed.yaml');
  await writeFile(seed, `title: Code Reference Shop
theme: original seaside stall
template: idle-shop-v1
designMode: reference_reskin
referenceMechanics:
  schemaVersion: 1
  lockedBy: human
  source:
    name: Named benchmark
    url: https://example.com/reference
    researchFiles: [input/reference-report.txt]
  coreLoop: [pay into a build site, carry goods to a shelf, serve customers, reinvest coins]
  playerActions: [walk between stations]
  progressionSystems: [new stations unlock in order]
  unlockRules: [the next site appears after the previous one is paid]
  feedbackCadence:
    immediateSeconds: 1
    microGoalMinSeconds: 10
    microGoalMaxSeconds: 300
  mustPreserveMechanics: [proportional payment while standing still]
  adaptableMechanics: [station count, goods types]
  expressionIsolation:
    originalCode: true
    originalAssets: true
    originalNamesAndText: true
    originalUiLayout: true
    originalAudio: true
    originalTuningValues: true
`);
  const provider = new CapturingProvider();
  const factory = createFactory({ root, mode: 'mock', qaMode: 'stub', agentProvider: provider });
  const runId = await factory.newRun(seed);
  const runRoot = path.join(root, 'runs', runId);
  const workspace = path.join(runRoot, 'workspace/game');
  await writeFile(path.join(runRoot, 'input/reference-report.txt'), 'Observed loop: pay, carry, serve, reinvest.\n');
  const identity = JSON.parse(await readFile(path.join(runRoot, 'artifacts/game-run-identity.json'), 'utf8')) as { canonicalGameId: string };
  const targetGame = identity.canonicalGameId;

  await mkdir(path.join(runRoot, 'reference-code/pkg/scripts/main'), { recursive: true });
  await mkdir(path.join(runRoot, 'reference-code/pkg/raw'), { recursive: true });
  await writeFile(path.join(runRoot, SCRIPT_PATH), SCRIPT);
  const raw = Buffer.from('archive data');
  await writeFile(path.join(runRoot, 'reference-code/pkg/raw/game.arcd'), raw);
  await writeFile(path.join(runRoot, 'reference-code/pkg', REFERENCE_CODE_PACKAGE_INDEX_NAME), `${JSON.stringify(referenceCodePackageFixture({
    targetGame,
    workspace,
    downloads: [{ name: 'game.arcd', urls: ['https://cdn.example/build/archive/game0.arcd'], path: 'reference-code/pkg/raw/game.arcd', sha256: sha256(raw), bytes: raw.length }],
    scripts: [{ path: SCRIPT_PATH, originalName: 'main/rules.lua', sha256: sha256(SCRIPT), bytes: Buffer.byteLength(SCRIPT), lineCount: 10 }],
  }), null, 2)}\n`);
  return { root, factory, provider, runId, runRoot, workspace, targetGame };
}

describe('reference code analysis in the research stage', () => {
  it.each([true, false])('requires verified code analysis and explicit source basis (marked=%s)', async (markCodeBasis) => {
    const { factory, provider, runId, runRoot, workspace, targetGame } = await referenceRun();
    provider.markCodeBasis = markCodeBasis;

    const promoted = await factory.promoteReferenceCode(runId, 'pkg');
    expect(promoted.id).toBe('code-package-pkg');
    const reviewed = await reviewReferenceMediaIdentity({ runRoot, targetGame, workspace, id: promoted.id, expectedSha256: promoted.sha256, reviewer: 'factory-operator', basis: 'downloaded from the reference page' });
    expect(reviewed.entry).toMatchObject({ reviewStatus: 'VERIFIED', targetGame });

    const waiting = await factory.run(runId);
    expect(waiting).toMatchObject({ stage: 'REFERENCE_DEEP_RESEARCH', status: 'waiting' });
    expect(waiting.stages.REFERENCE_DEEP_RESEARCH?.evidence).toContain('blocked:reference-code:analysis-missing:code-package-pkg');
    expect(provider.researchContexts).toHaveLength(0);

    const manifest = JSON.parse(await readFile(path.join(runRoot, 'reference-evidence/manifest.json'), 'utf8')) as { entries: Array<{ id: string; storedPath: string; sha256: string }> };
    const entry = manifest.entries.find((candidate) => candidate.id === promoted.id)!;
    const analysisFile = path.join(runRoot, 'input/code-analysis.json');
    await writeFile(analysisFile, JSON.stringify(referenceCodeAnalysisFixture({
      script: { path: SCRIPT_PATH, sha256: sha256(SCRIPT) },
      targetRunId: runId,
      targetGame,
      workspace,
      packageRef: { evidenceId: entry.id, indexPath: entry.storedPath, sha256: entry.sha256 },
    })));
    await factory.recordReferenceCodeAnalysis(runId, analysisFile);

    const paused = await factory.resume(runId);
    expect(paused).toMatchObject({ stage: markCodeBasis ? 'WAITING_FOR_REFERENCE_APPROVAL' : 'REFERENCE_DEEP_RESEARCH', status: 'waiting' });
    if (!markCodeBasis) expect(paused.stages.REFERENCE_DEEP_RESEARCH?.evidence.join(' ')).toContain('reference-code:behavior-basis-missing');
    const context = provider.researchContexts.at(-1)!;
    expect(context.inputPaths).toContain('artifacts/reference-code-analysis.json');
    expect(JSON.stringify(context.contextPacket)).toContain('authoritative mechanic evidence');
    const pack = JSON.parse(await readFile(path.join(runRoot, 'artifacts/reference-evidence-pack.json'), 'utf8')) as { sourceFiles: Array<{ path: string }> };
    expect(pack.sourceFiles.map((source) => source.path)).toContain(entry.storedPath);

  });

  it('blocks research when the recorded code analysis no longer matches its scripts', async () => {
    const { factory, provider, runId, runRoot, workspace, targetGame } = await referenceRun();
    const promoted = await factory.promoteReferenceCode(runId, 'pkg');
    await reviewReferenceMediaIdentity({ runRoot, targetGame, workspace, id: promoted.id, expectedSha256: promoted.sha256, reviewer: 'factory-operator', basis: 'downloaded from the reference page' });
    const manifest = JSON.parse(await readFile(path.join(runRoot, 'reference-evidence/manifest.json'), 'utf8')) as { entries: Array<{ id: string; storedPath: string; sha256: string }> };
    const entry = manifest.entries.find((candidate) => candidate.id === promoted.id)!;
    const analysisFile = path.join(runRoot, 'input/code-analysis.json');
    await writeFile(analysisFile, JSON.stringify(referenceCodeAnalysisFixture({
      script: { path: SCRIPT_PATH, sha256: sha256(SCRIPT) }, targetRunId: runId, targetGame, workspace,
      packageRef: { evidenceId: entry.id, indexPath: entry.storedPath, sha256: entry.sha256 },
    })));
    await factory.recordReferenceCodeAnalysis(runId, analysisFile);
    await writeFile(path.join(runRoot, SCRIPT_PATH), `${SCRIPT}-- edited\n`);

    const waiting = await factory.run(runId);
    expect(waiting).toMatchObject({ stage: 'REFERENCE_DEEP_RESEARCH', status: 'waiting' });
    expect(waiting.stages.REFERENCE_DEEP_RESEARCH?.evidence).toContain(`blocked:reference-code:script-hash-mismatch:${SCRIPT_PATH}`);
    expect(provider.researchContexts).toHaveLength(0);
  });
});
