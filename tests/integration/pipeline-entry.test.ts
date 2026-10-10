import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { createFactory } from '../../src/factory.js';
import { PipelinePlanSchema, RunStateSchema } from '../../src/schemas/index.js';

it.each(['standard', 'full'] as const)('freezes %s rigor with the same plan used by the original entry route', async (rigor) => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-entry-'));
  const seedFile = path.join(root, 'seed.yaml');
  await writeFile(seedFile, 'title: Original shop\ntheme: shop\ntemplate: idle-shop-v1\n');
  const factory = createFactory({ root, mode: 'mock', qaMode: 'stub' });
  const route = factory.routeRequest({ request: '做一个原创小店游戏', rigor });
  const runId = await factory.newRun(seedFile, { rigor });
  const plan = PipelinePlanSchema.parse(await factory.pipelinePlan(runId));
  expect(plan).toMatchObject({ rigor, designMode: 'prototype_tournament' });
  expect(plan.mandatoryStages).toEqual(route.stages);
  const profile = JSON.parse(await readFile(path.join(root, 'runs', runId, 'artifacts/factory-profile.json'), 'utf8'));
  expect(profile.pipelineMode).toBe(plan.mode);
  expect((await factory.status(runId)).stage).toBe('CREATED');
});

it('rejects minimal original rigor before creating a partial run', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-entry-invalid-'));
  const seedFile = path.join(root, 'seed.yaml');
  await writeFile(seedFile, 'title: Original shop\ntheme: shop\ntemplate: idle-shop-v1\n');
  await mkdir(path.join(root, 'runs'));
  const factory = createFactory({ root, mode: 'mock', qaMode: 'stub' });
  await expect(factory.newRun(seedFile, { rigor: 'minimal' })).rejects.toThrow(/standard|full/i);
  expect(await readdir(path.join(root, 'runs'))).toEqual([]);
});

it('recovers an interrupted bootstrap using its saved rigor instead of current defaults', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-entry-recovery-'));
  const seedFile = path.join(root, 'seed.yaml');
  await writeFile(seedFile, 'title: Original shop\ntheme: shop\ntemplate: idle-shop-v1\n');
  const factory = createFactory({ root, mode: 'mock', qaMode: 'stub' });
  const runId = await factory.newRun(seedFile, { rigor: 'full' });
  const planFile = path.join(root, 'runs', runId, 'artifacts/pipeline-plan.json');
  const original = await readFile(planFile, 'utf8');
  await rm(planFile);
  await createFactory({ root, mode: 'mock', qaMode: 'stub' }).resume(runId);
  const plan = JSON.parse(await readFile(planFile, 'utf8'));
  expect(plan.rigor).toBe('full');
  expect(plan.mandatoryStages).toEqual(JSON.parse(original).mandatoryStages);
  await rm(planFile);
  await expect(factory.run(runId)).rejects.toThrow(/pipeline plan missing for a started run/u);
  await expect(readFile(planFile)).rejects.toMatchObject({ code: 'ENOENT' });
});

it('plans default original entry and configured governance consistently', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-entry-policy-'));
  const seedFile = path.join(root, 'seed.yaml');
  await writeFile(seedFile, 'title: Original shop\ntheme: shop\ntemplate: idle-shop-v1\n');
  const factory = createFactory({ root, mode: 'mock', qaMode: 'stub', operatingProfile: {
    pipelineMode: 'full-validation', presentationQualityRequired: true, supplyChainRequired: true, blindPlaytestRequired: true,
  } });
  const route = factory.routeRequest({ request: '做一个原创小店游戏' });
  const runId = await factory.newRun(seedFile);
  const plan = PipelinePlanSchema.parse(await factory.pipelinePlan(runId));
  expect(plan.mandatoryStages).toEqual(route.stages);
  expect(plan.mandatoryStages).toEqual(expect.arrayContaining(['PRESENTATION_QA', 'SUPPLY_CHAIN_QA', 'BLIND_PLAYTEST_QA']));
});


it('inspect shows the actual pending review and marks missing material without making a decision', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-entry-review-'));
  const runId = 'review-fixture';
  const runRoot = path.join(root, 'runs', runId);
  await mkdir(path.join(runRoot, 'human'), { recursive: true });
  await mkdir(path.join(runRoot, 'artifacts'));
  const state = RunStateSchema.parse({
    schemaVersion: 1, runId, stage: 'WAITING_FOR_REFERENCE_APPROVAL', status: 'waiting', readiness: 'WAITING',
    createdAt: '2026-10-08T00:00:00.000Z', updatedAt: '2026-10-08T00:00:00.000Z',
    fixAttempts: 0, providerMode: 'mock', stages: {},
  });
  const stateFile = path.join(runRoot, 'state.json');
  await writeFile(stateFile, JSON.stringify(state));
  await writeFile(path.join(runRoot, 'human/reference-mechanic-review.json'), JSON.stringify({ question: 'Review the mechanic relationships' }));
  const factory = createFactory({ root, mode: 'mock', qaMode: 'stub' });
  const inspected = await factory.inspect(runId);
  expect(inspected.reviewMaterials).toEqual([
    { path: path.join(runRoot, 'human/reference-mechanic-review.json'), available: true, content: { question: 'Review the mechanic relationships' } },
    { path: path.join(runRoot, 'artifacts/reference-mechanic-spec.json'), available: false },
  ]);
  expect(inspected.operator.nextAction).toBe('review reference mechanic lock');
  expect(await readFile(stateFile, 'utf8')).toBe(JSON.stringify(state));
  await expect(readFile(path.join(runRoot, 'human/reference-decision.yaml'))).rejects.toMatchObject({ code: 'ENOENT' });
});
