import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createFactory } from '../../src/factory.js';
import { MockAgentProvider } from '../../src/providers/mock.js';

const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-test-'));
  roots.push(root);
  const seed = path.join(root, 'seed.yaml');
  await writeFile(seed, 'title: 妖怪夜市\ntheme: 夜市妖怪\ntemplate: idle-shop-v1\ndesignMode: prototype_tournament\npreferences:\n  tone: cozy\n');
  return { root, seed, factory: createFactory({ root, mode: 'mock', qaMode: 'stub' }) };
}
afterEach(async () => { const { rm } = await import('node:fs/promises'); await Promise.all(roots.splice(0).map((p) => rm(p, { recursive: true, force: true }))); });

describe('orchestrator integration', () => {
  it('locks a human-designated reference and never asks agents to invent or tournament-test game ideas', async () => {
    class NoIdeationProvider extends MockAgentProvider {
      override async generateCompetitorResearch(): Promise<never> { throw new Error('reference mode must not run competitor ideation'); }
      override async generateIdeas(): Promise<never> { throw new Error('reference mode must not generate ideas'); }
    }
    const root = await mkdtemp(path.join(tmpdir(), 'factory-reference-test-'));
    roots.push(root);
    const seed = path.join(root, 'reference-seed.yaml');
    await writeFile(seed, `title: 我要当美女
theme: 原创都市变美逆袭
template: idle-shop-v1
designMode: reference_reskin
referenceMechanics:
  schemaVersion: 1
  lockedBy: human
  source:
    name: Named benchmark
    url: https://example.com/reference
    researchFiles: [input/reference-report.txt]
  coreLoop: [持续执行当前动作, 获得资源, 升级动作效率, 解锁下一项可见目标]
  playerActions: [点击加速当前动作, 购买当前项目升级]
  progressionSystems: [动作效率升级, 人物外观阶段变化, 场景阶段变化]
  unlockRules: [下一目标始终可见但未满足条件时锁定]
  feedbackCadence:
    immediateSeconds: 1
    microGoalMinSeconds: 10
    microGoalMaxSeconds: 300
  mustPreserveMechanics: [持续动作与自动产出并存, 长期逆袭拆成连续的小目标]
  adaptableMechanics: [项目数量, 阶段数量, 题材映射]
  expressionIsolation:
    originalCode: true
    originalAssets: true
    originalNamesAndText: true
    originalUiLayout: true
    originalAudio: true
    originalTuningValues: true
`);
    const factory = createFactory({ root, mode: 'mock', qaMode: 'stub', agentProvider: new NoIdeationProvider() });
    const runId = await factory.newRun(seed);
    const paused = await factory.run(runId);

    expect(paused).toMatchObject({ stage: 'WAITING_FOR_REFERENCE_APPROVAL', status: 'waiting' });
    expect(paused.stages.REFERENCE_MECHANIC_LOCK?.status).toBe('completed');
    expect(paused.stages.REFERENCE_MECHANIC_LOCK?.evidence).toContain('mechanic-fidelity:maximum-core-mechanics');
    for (const forbidden of ['COMPETITOR_RESEARCH', 'IDEA_GENERATION', 'LOW_COST_FILTER', 'PROTOTYPE_SELECTION', 'BUILD_3_PROTOTYPES', 'PLAYTEST_TOURNAMENT', 'WINNER_SELECTION']) {
      expect(paused.stages[forbidden as keyof typeof paused.stages]).toBeUndefined();
    }
    const locked = JSON.parse(await readFile(path.join(root, 'runs', runId, 'artifacts/reference-mechanic-spec.json'), 'utf8')) as { lockedBy: string; source: { name: string }; fidelityPolicy: { level: string } };
    expect(locked).toMatchObject({ lockedBy: 'human', source: { name: 'Named benchmark' }, fidelityPolicy: { level: 'maximum_core_mechanics' } });

    await factory.approveReference(runId, { decision: 'APPROVE', notes: '机制关系确认，表现层全部原创。' });
    const artPaused = await factory.resume(runId);
    expect(artPaused.stage).toBe('WAITING_FOR_ART_APPROVAL');
    expect(artPaused.stages.OPEN_SOURCE_RESEARCH?.status).toBe('completed');
    expect(artPaused.stages.IAA_REVIEW?.status).toBe('completed');
    const blueprint = JSON.parse(await readFile(path.join(root, 'runs', runId, 'artifacts/game-blueprint.json'), 'utf8')) as { designMode: string; referenceMechanics: { lockedBy: string } };
    expect(blueprint).toMatchObject({ designMode: 'reference_reskin', referenceMechanics: { lockedBy: 'human' } });
  });

  it('builds and independently reviews three playable prototypes before any IAA or art work', async () => {
    const { factory, seed, root } = await fixture();
    const runId = await factory.newRun(seed);
    const paused = await factory.run(runId);
    expect(paused.stage).toBe('WAITING_FOR_PROTOTYPE_APPROVAL');
    for (const stage of ['COMPETITOR_RESEARCH', 'IDEA_GENERATION', 'LOW_COST_FILTER', 'PROTOTYPE_SELECTION', 'BUILD_3_PROTOTYPES', 'PLAYTEST_TOURNAMENT', 'WINNER_SELECTION']) {
      expect(paused.stages[stage]?.status).toBe('completed');
    }
    expect(paused.stages.IAA_REVIEW).toBeUndefined();
    expect(paused.stages.ART_DIRECTIONS).toBeUndefined();
    for (const file of ['idea-generation.batch-1.json', 'low-cost-filter.batch-1.json', 'prototype-selection.batch-1.json', 'prototype-build-report.batch-1.json', 'playtest-tournament.batch-1.json', 'winner-selection.batch-1.json']) {
      await expect(readFile(path.join(root, 'runs', runId, 'artifacts', file), 'utf8')).resolves.toBeTruthy();
    }
    const humanReview = JSON.parse(await readFile(path.join(root, 'runs', runId, 'human/prototype-review.json'), 'utf8')) as { prototypes: unknown[]; recommendation: string; rationale: string };
    expect(humanReview).toMatchObject({ recommendation: 'WINNER_A' });
    expect(humanReview.prototypes).toHaveLength(3);
    expect(humanReview.rationale).toBeTruthy();
    for (const slot of ['a', 'b', 'c']) await expect(readFile(path.join(root, 'runs', runId, `workspace/prototype-${slot}/dist/index.html`), 'utf8')).resolves.toContain('<!doctype html>');
  });

  it('accepts NONE and automatically tries only one additional batch', async () => {
    class NoWinnerAgentProvider extends MockAgentProvider {
      override async generateWinnerSelection(tournament: Parameters<MockAgentProvider['generateWinnerSelection']>[0]) { return { value: { schemaVersion: 1, batch: tournament.batch, decision: 'NONE', selectedIdeaId: null, rationale: 'Every prototype became rote after five inputs.' }, metrics: { provider: 'test', model: 'deterministic', calls: 0 } }; }
    }
    const { seed, root } = await fixture();
    const factory = createFactory({ root, mode: 'mock', qaMode: 'stub', agentProvider: new NoWinnerAgentProvider() });
    const runId = await factory.newRun(seed);
    const stopped = await factory.run(runId);
    expect(stopped).toMatchObject({ stage: 'NO_PROTOTYPE_WINNER', status: 'completed', prototypeBatch: 2 });
    expect(stopped.stages.WINNER_SELECTION).toMatchObject({ status: 'completed', attempts: 2, evidence: expect.arrayContaining(['decision:NONE']) });
    await expect(readFile(path.join(root, 'runs', runId, 'artifacts/game-blueprint.json'), 'utf8')).rejects.toThrow();
    const resumed = await factory.resume(runId);
    expect(resumed.stages.WINNER_SELECTION!.attempts).toBe(2);
  });

  it('pauses normally for art approval and resumes the same run', async () => {
    const { factory, seed, root } = await fixture();
    const runId = await factory.newRun(seed);
    const paused = await factory.run(runId);
    expect(paused.stage).toBe('WAITING_FOR_PROTOTYPE_APPROVAL');
    expect(paused.status).toBe('waiting');
    await factory.approvePrototype(runId, { decision: 'APPROVE', notes: '' });
    const artPaused = await factory.resume(runId);
    expect(artPaused.stage).toBe('WAITING_FOR_ART_APPROVAL');
    expect(artPaused.stages.OPEN_SOURCE_RESEARCH?.status).toBe('completed');
    expect(artPaused.stages.IAA_REVIEW?.status).toBe('completed');
    expect(Date.parse(artPaused.stages.OPEN_SOURCE_RESEARCH!.finishedAt!)).toBeLessThanOrEqual(Date.parse(artPaused.stages.IAA_REVIEW!.startedAt!));
    expect(artPaused.stages.IAA_REVIEW!.inputArtifacts).toContain('artifacts/open-source-research.json');
    await expect(readFile(path.join(root, 'runs', runId, 'artifacts/open-source-research.json'), 'utf8')).resolves.toBeTruthy();
    const blueprint = JSON.parse(await readFile(path.join(root, 'runs', runId, 'artifacts/game-blueprint.json'), 'utf8')) as { targetPlatforms: string[] };
    expect(blueprint.targetPlatforms).toEqual(['wechat-minigame', 'douyin-minigame', 'taptap-minigame']);
    await writeFile(path.join(root, 'runs', runId, 'human/art-approval.yaml'), 'selected_direction: direction_b\nkeep: [overall_palette]\nchange: [reduce_saturation]\nnotes: [UI要简洁]\n');
    const done = await factory.resume(runId);
    expect(done.status).toBe('completed');
    expect(done.stage).toBe('COMPLETED');
    expect(Date.parse(done.stages.WAITING_FOR_ART_APPROVAL!.finishedAt!)).toBeLessThanOrEqual(Date.parse(done.stages.STYLE_LOCK!.startedAt!));
  });

  it('is idempotent after completion', async () => {
    const { factory, seed, root } = await fixture();
    const runId = await factory.newRun(seed);
    await factory.run(runId);
    await factory.approvePrototype(runId, { decision: 'APPROVE', notes: '' });
    await factory.resume(runId);
    await writeFile(path.join(root, 'runs', runId, 'human/art-approval.yaml'), 'selected_direction: direction_a\n');
    const first = await factory.resume(runId);
    const attempts = first.stages.RELEASE!.attempts;
    const second = await factory.run(runId);
    expect(second.stages.RELEASE!.attempts).toBe(attempts);
  });

  it('retries a failed stage without erasing its attempt history', async () => {
    const { factory, seed, root } = await fixture();
    const runId = await factory.newRun(seed);
    await factory.run(runId);
    await factory.approvePrototype(runId, { decision: 'APPROVE', notes: '' });
    await factory.resume(runId);
    const approval = path.join(root, 'runs', runId, 'human/art-approval.yaml');
    await writeFile(approval, 'selected_direction: direction_z\n');
    await expect(factory.resume(runId)).rejects.toThrow();
    const failed = await factory.status(runId);
    expect(failed.stage).toBe('FAILED');
    expect(failed.stages.STYLE_LOCK).toMatchObject({ status: 'failed', attempts: 1 });

    await writeFile(approval, 'selected_direction: direction_a\n');
    const recovered = await factory.retry(runId, 'STYLE_LOCK');
    expect(recovered.status).toBe('completed');
    expect(recovered.stages.STYLE_LOCK).toMatchObject({ status: 'completed', attempts: 2 });
  });

  it('repeated resume after completion does not mutate state or release output', async () => {
    const { factory, seed, root } = await fixture();
    const runId = await factory.demo(seed);
    const runRoot = path.join(root, 'runs', runId);
    const digest = async (file: string) => createHash('sha256').update(await readFile(file)).digest('hex');
    const stateFile = path.join(runRoot, 'state.json');
    const releaseFile = path.join(runRoot, 'release-candidate/release-manifest.json');
    const before = [await digest(stateFile), await digest(releaseFile)];
    await factory.resume(runId);
    await factory.resume(runId);
    expect([await digest(stateFile), await digest(releaseFile)]).toEqual(before);
  });

  it('validates every mock agent artifact and packages a complete candidate', async () => {
    const { factory, seed, root } = await fixture();
    const runId = await factory.demo(seed);
    const state = await factory.status(runId);
    const productionLine = JSON.parse(await readFile(path.join(root, 'runs', runId, 'artifacts/production-line-contract.json'), 'utf8')) as { line: string; primaryProfile: string };
    expect(productionLine).toMatchObject({ line: 'idle-management', primaryProfile: 'STRATEGIC_SYSTEM' });
    for (const stage of ['COMPETITOR_RESEARCH', 'IDEA_GENERATION', 'LOW_COST_FILTER', 'PROTOTYPE_SELECTION', 'BUILD_3_PROTOTYPES', 'PLAYTEST_TOURNAMENT', 'WINNER_SELECTION', 'OPEN_SOURCE_RESEARCH', 'IAA_REVIEW', 'ART_DIRECTIONS', 'STYLE_LOCK', 'ASSETS', 'FULL_BUILD', 'QA', 'RELEASE']) expect(state.stages[stage]?.status).toBe('completed');
    const releaseRoot = path.join(root, 'runs', runId, 'release-candidate');
    const buildReport = JSON.parse(await readFile(path.join(root, 'runs', runId, 'artifacts/build-report.json'), 'utf8')) as { verification: string[] };
    expect(buildReport.verification).toEqual(expect.arrayContaining(['contract:test-api-7', 'save:versioned']));
    for (const file of ['release-manifest.json', 'web/index.html', 'reports/build-report.json', 'reports/qa-report.json']) await expect(readFile(path.join(releaseRoot, file), 'utf8')).resolves.toBeTruthy();
    const qualityMatrix = JSON.parse(await readFile(path.join(root, 'runs', runId, 'artifacts/quality-gate-matrix.json'), 'utf8')) as { dimensions?: unknown[]; passed?: boolean };
    expect(qualityMatrix.dimensions).toHaveLength(7);
    expect(typeof qualityMatrix.passed).toBe('boolean');
  });

  it('repackages downstream release artifacts when QA is explicitly retried', async () => {
    const { factory, seed } = await fixture();
    const runId = await factory.demo(seed);
    const before = await factory.status(runId);
    const releaseAttempts = before.stages.RELEASE!.attempts;

    const retried = await factory.retry(runId, 'QA');

    expect(retried).toMatchObject({ stage: 'COMPLETED', status: 'completed' });
    expect(retried.stages.QA!.attempts).toBe(before.stages.QA!.attempts + 1);
    expect(retried.stages.RELEASE!.attempts).toBe(releaseAttempts + 1);
  });
});
