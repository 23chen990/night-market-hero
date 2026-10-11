import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { createDeliveryManifest, exportDelivery } from '../../src/core/delivery.js';
import { sha256File } from '../../src/core/files.js';

async function fixture() {
  const runRoot = await mkdtemp(path.join(tmpdir(), 'factory-delivery-'));
  await Promise.all([
    mkdir(path.join(runRoot, 'release-candidate/web'), { recursive: true }),
    mkdir(path.join(runRoot, 'workspace/game/src'), { recursive: true }),
    mkdir(path.join(runRoot, 'artifacts'), { recursive: true }),
    mkdir(path.join(runRoot, 'human'), { recursive: true }),
  ]);
  await writeFile(path.join(runRoot, 'release-candidate/web/index.html'), '<!doctype html><button>play</button>');
  await writeFile(path.join(runRoot, 'workspace/game/index.html'), '<!doctype html>');
  await writeFile(path.join(runRoot, 'workspace/game/package.json'), '{"scripts":{"build":"vite build"}}\n');
  await writeFile(path.join(runRoot, 'workspace/game/src/main.ts'), 'export const game = true;\n');
  const fileHash = await sha256File(path.join(runRoot, 'release-candidate/web/index.html'));
  const candidateHash = 'a'.repeat(64);
  await writeFile(path.join(runRoot, 'artifacts/release-candidate.json'), JSON.stringify({ schemaVersion: 1, gameId: 'delivery-test', coreHash: candidateHash, acceptanceArtifact: 'reports/qa-report.json', testedAt: new Date().toISOString(), status: 'READY', files: [{ path: 'web/index.html', sha256: fileHash }] }));
  await writeFile(path.join(runRoot, 'artifacts/game-blueprint.json'), JSON.stringify({ gameId: 'delivery-test' }));
  await writeFile(path.join(runRoot, 'artifacts/build-report.json'), JSON.stringify({ success: true }));
  await writeFile(path.join(runRoot, 'artifacts/qa-report.json'), JSON.stringify({ schemaVersion: 1, passed: true, checks: [], issues: [], screenshots: [], consoleLog: '', testedAt: new Date().toISOString(), apiKey: 'sk-test-secret-value', qaBinding: {
    taskId: 'qa-delivery-fixture', targetRunId: path.basename(runRoot), targetWorkspaceRelative: 'workspace/game', productionLine: 'idle-management', runtime: 'web-lite', taskKind: 'qa', candidateHash,
    recipeHash: 'b'.repeat(64), toolPolicyHash: 'c'.repeat(64), acceptanceHash: 'd'.repeat(64), promptBundleHash: 'e'.repeat(64), qaRunnerSourceHash: 'f'.repeat(64), testConfigHash: '1'.repeat(64),
  } }));
  return { runRoot, candidateHash };
}

it('issues a candidate handoff manifest while keeping a blocked web delivery explicit', async () => {
  const { runRoot, candidateHash } = await fixture();
  try {
    const handoff = await createDeliveryManifest(runRoot, 'run-1', candidateHash, 'CANDIDATE_HANDOFF');
    expect(handoff.status).toBe('READY');
    expect(handoff.manifest?.candidateId).toBe(candidateHash);
    const web = await createDeliveryManifest(runRoot, 'run-1', candidateHash, 'WEB_DELIVERY');
    expect(web.status).toBe('BLOCKED');
    expect(web.blockers).toContain('completion-gates-not-ready');
    expect(web.blockers).toContain('human-playtest-evidence-missing');
  } finally {
    await rm(runRoot, { recursive: true, force: true });
  }
});

it('exports a deterministic developer package and redacted private evidence', async () => {
  const { runRoot, candidateHash } = await fixture();
  try {
    const developer = await exportDelivery(runRoot, 'run-1', candidateHash, 'developer');
    expect(developer.status).toBe('READY');
    expect(developer.exportPath).toBeDefined();
    expect(await readFile(path.join(developer.exportPath!, 'source/src/main.ts'), 'utf8')).toContain('game');
    const repeated = await exportDelivery(runRoot, 'run-1', candidateHash, 'developer');
    expect(repeated.status).toBe('READY');
    expect(repeated.manifest?.payloadHash).toBe(developer.manifest?.payloadHash);
    await writeFile(path.join(developer.exportPath!, 'source/src/main.ts'), 'tampered export\n');
    await expect(exportDelivery(runRoot, 'run-1', candidateHash, 'developer')).rejects.toThrow(/payload|hash|tamper/i);
    const evidence = await exportDelivery(runRoot, 'run-1', candidateHash, 'private-evidence');
    expect(evidence.status).toBe('READY');
    expect(await readFile(path.join(evidence.exportPath!, 'EVIDENCE_README.md'), 'utf8')).toContain('脱敏');
    expect(await readFile(path.join(evidence.exportPath!, 'evidence/artifacts/qa-report.json'), 'utf8')).not.toContain('sk-test-secret-value');
  } finally {
    await rm(runRoot, { recursive: true, force: true });
  }
});

it('binds web delivery to the QA, completion and human-playtest candidate hash', async () => {
  const { runRoot, candidateHash } = await fixture();
  try {
    await writeFile(path.join(runRoot, 'artifacts/completion-gates.json'), JSON.stringify({
      schemaVersion: 1,
      gates: ['core', 'normalFlow', 'visualEvidence', 'levelDifference', 'humanPlaytest'].map((id) => ({ id, passed: true, evidence: [`${id}:evidence`], owner: id === 'core' ? 'BuilderAgent' : id === 'humanPlaytest' ? 'HumanReviewer' : 'QAAgent' })),
      implementationReady: true, candidateReady: true, releaseReady: true, blockers: [], candidateHash,
      candidateBinding: { passed: true, evidence: ['candidate:bound'], blockers: [] },
    }));
    await writeFile(path.join(runRoot, 'human/playtest-acceptance.json'), JSON.stringify({ schemaVersion: 1, passed: true, sessionId: 'human-1', buildHash: candidateHash, inputMode: 'touch', notes: ['played'], evidence: ['screenshots/final.png'], approvedAt: new Date().toISOString() }));
    const ready = await createDeliveryManifest(runRoot, 'run-1', candidateHash, 'WEB_DELIVERY');
    expect(ready.status).toBe('READY');
    const qa = JSON.parse(await readFile(path.join(runRoot, 'artifacts/qa-report.json'), 'utf8')) as { qaBinding: { candidateHash: string } };
    qa.qaBinding.candidateHash = 'f'.repeat(64);
    await writeFile(path.join(runRoot, 'artifacts/qa-report.json'), JSON.stringify({ ...qa, schemaVersion: 1, passed: true, checks: [], issues: [], screenshots: [], consoleLog: '', testedAt: new Date().toISOString() }));
    const stale = await createDeliveryManifest(runRoot, 'run-1', candidateHash, 'WEB_DELIVERY');
    expect(stale.status).toBe('BLOCKED');
    expect(stale.blockers).toContain('qa-binding-candidate-mismatch');
  } finally {
    await rm(runRoot, { recursive: true, force: true });
  }
});

it('blocks unknown developer source files and removes absolute paths from private evidence', async () => {
  const { runRoot, candidateHash } = await fixture();
  try {
    await writeFile(path.join(runRoot, 'workspace/game/private-notes.txt'), 'do not ship');
    await expect(exportDelivery(runRoot, 'run-1', candidateHash, 'developer')).rejects.toThrow(/allowlist/i);
    await rm(path.join(runRoot, 'workspace/game/private-notes.txt'));
    await rm(path.join(runRoot, 'artifacts/delivery-manifest.candidate_handoff.json'), { force: true });
    const qa = JSON.parse(await readFile(path.join(runRoot, 'artifacts/qa-report.json'), 'utf8')) as Record<string, unknown>;
    await writeFile(path.join(runRoot, 'artifacts/qa-report.json'), JSON.stringify({ ...qa, consoleLog: '/Users/kker/private/qa.log' }));
    const evidence = await exportDelivery(runRoot, 'run-1', candidateHash, 'private-evidence');
    expect(evidence.status).toBe('READY');
    const evidenceText = await readFile(path.join(evidence.exportPath!, 'evidence/artifacts/qa-report.json'), 'utf8');
    expect(evidenceText).not.toContain('/Users/kker');
  } finally {
    await rm(runRoot, { recursive: true, force: true });
  }
});

it('rejects a symlinked developer source root before copying', async () => {
  const { runRoot, candidateHash } = await fixture();
  try {
    await rm(path.join(runRoot, 'workspace/game'), { recursive: true, force: true });
    await symlink(path.join(runRoot, 'release-candidate/web'), path.join(runRoot, 'workspace/game'));
    await expect(exportDelivery(runRoot, 'run-1', candidateHash, 'developer')).rejects.toThrow(/symlink|real directory/i);
  } finally {
    await rm(runRoot, { recursive: true, force: true });
  }
});
