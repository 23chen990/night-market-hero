import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { sha256Text } from '../../src/core/files.js';
import { buildCompletionGateReport } from '../../src/qa/experience-gates.js';
import { FileRunStore } from '../../src/core/run-store.js';
import { RunStateSchema } from '../../src/schemas/index.js';
import { promoteReleaseLifecycleThrough } from '../../src/core/release-lifecycle.js';
import { evaluateCompletionGates } from '../../src/core/completion-gates.js';

it.each(['valid', 'stale-runtime', 'failed-natural', 'missing-natural', 'missing-runtime', 'invalid-reset', 'missing-replay'] as const)('binds candidate normal-flow evidence for %s', async (branch) => {
  const root = await mkdtemp(path.join(tmpdir(), 'runtime-completion-'));
  const runRoot = path.join(root, 'runs', 'fixture');
  await mkdir(path.join(runRoot, 'artifacts'), { recursive: true });
  await mkdir(path.join(runRoot, 'workspace/game/dist'), { recursive: true });
  await mkdir(path.join(runRoot, 'screenshots'));
  await writeFile(path.join(runRoot, 'workspace/game/dist/index.html'), 'tested bytes');
  await writeFile(path.join(runRoot, 'screenshots/natural.png'), 'fixture browser evidence');
  const buildHash = sha256Text(`index.html:${sha256Text('tested bytes')}`);
  const naturalFlow = { schemaVersion: 1, startedFromReset: branch !== 'invalid-reset', actions: ['tap', 'retry'], transitions: [{ name: 'collect', changed: true, evidence: 'score changed' }], completion: 'settlement', replayObserved: branch !== 'missing-replay', forbiddenOperations: [], screenshots: ['screenshots/natural.png'], passed: branch !== 'failed-natural', blockers: branch === 'failed-natural' ? ['player-feedback-failed'] : [], runner: 'trusted-qa-runner', buildHash, observedAt: new Date().toISOString() };
  await writeFile(path.join(runRoot, 'artifacts/build-report.json'), JSON.stringify({ success: true, runtime: 'web-lite', webBuild: 'workspace/game/dist' }));
  await writeFile(path.join(runRoot, 'artifacts/qa-report.json'), JSON.stringify({ schemaVersion: 1, passed: true, checks: [], issues: [], screenshots: ['screenshots/natural.png'], consoleLog: 'logs/console.log', testedAt: new Date().toISOString(), ...(branch === 'missing-natural' ? {} : { naturalFlow }) }));
  if (branch !== 'missing-runtime') await writeFile(path.join(runRoot, 'artifacts/runtime-product-gates.json'), JSON.stringify({ schemaVersion: 1, buildHash: branch === 'stale-runtime' ? '0'.repeat(64) : buildHash, entrypoint: 'workspace/game/dist/index.html', defaultMode: 'default', journey: ['startup', 'collect', 'settlement', 'replay'], coreLoop: ['collect'], terminal: ['settlement'], replay: ['replay'], runtimeWiredFiles: ['workspace/game/dist/index.html'], legacyBehavior: { status: 'REMOVED_FROM_DEFAULT_PATH', evidence: ['fixture'] }, browserEvidence: ['screenshots/natural.png'], passed: true }));
  const report = await buildCompletionGateReport({ runRoot, corePassed: true, normalFlowPassed: true, screenshots: [] });
  expect(report.gates.find(gate => gate.id === 'normalFlow')?.passed).toBe(branch === 'valid');
  if (branch === 'valid') {
    const store = new FileRunStore(root);
    await mkdir(path.join(runRoot, 'release-candidate/web'), { recursive: true });
    await writeFile(path.join(runRoot, 'release-candidate/web/index.html'), 'tested bytes');
    await store.writeArtifact('fixture', 'release-candidate.json', { schemaVersion: 1, gameId: 'fixture', coreHash: buildHash, acceptanceArtifact: 'human/playtest-acceptance.json', testedAt: new Date().toISOString(), status: 'READY', files: [{ path: 'web/index.html', sha256: sha256Text('tested bytes') }] });
    const gate = { passed: true, evidence: ['fixture-evidence'] };
    await store.writeArtifact('fixture', 'completion-gates.json', evaluateCompletionGates({ core: gate, normalFlow: gate, visualEvidence: gate, levelDifference: gate, humanPlaytest: { ...gate, passed: false } }, { candidateHash: buildHash, candidateBinding: { passed: false, evidence: ['human-pending'], blockers: ['human-pending'] } }));
    const built = { ...store.record('FULL_BUILD'), status: 'completed' };
    const state = RunStateSchema.parse({ schemaVersion: 1, runId: 'fixture', stage: 'COMPLETED', status: 'completed', readiness: 'CANDIDATE_READY', providerMode: 'mock', fixAttempts: 0, stages: { FULL_BUILD: built }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    await writeFile(path.join(runRoot, 'state.json'), JSON.stringify(state));
    await store.writeArtifact('fixture', 'release-lifecycle.json', promoteReleaseLifecycleThrough(undefined, { gameId: 'fixture', releaseHash: buildHash, to: 'CANDIDATE_READY' }));
    expect((await store.load('fixture')).readiness).toBe('CANDIDATE_READY');
    await writeFile(path.join(runRoot, 'workspace/game/dist/index.html'), 'changed bytes');
    expect((await store.load('fixture')).readiness).toBe('IMPLEMENTATION_READY');
    await writeFile(path.join(runRoot, 'workspace/game/dist/index.html'), 'tested bytes');
    await writeFile(path.join(runRoot, 'release-candidate/web/index.html'), 'changed package');
    expect((await store.load('fixture')).readiness).toBe('IMPLEMENTATION_READY');
    await store.save(state);
    const lifecycle = JSON.parse(await readFile(path.join(runRoot, 'artifacts/release-lifecycle.json'), 'utf8'));
    expect(lifecycle.status).toBe('PAUSED');
    expect(lifecycle.history.at(-1)).toMatchObject({ from: 'CANDIDATE_READY', to: 'PAUSED' });
  }
});

it('downgrades a persisted candidate-ready claim when its evidence is absent without rewriting state', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'readiness-evidence-'));
  const runRoot = path.join(root, 'runs', 'legacy');
  await mkdir(runRoot, { recursive: true });
  const state = RunStateSchema.parse({ schemaVersion: 1, runId: 'legacy', stage: 'COMPLETED', status: 'completed', readiness: 'CANDIDATE_READY', providerMode: 'mock', fixAttempts: 0, stages: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await writeFile(path.join(runRoot, 'state.json'), JSON.stringify(state));
  expect((await new FileRunStore(root).load('legacy')).readiness).toBe('WAITING');
});
