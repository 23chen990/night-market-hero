import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { createFactory } from '../../src/factory.js';

const roots: string[] = [];
async function waitingRun() {
  const root = await mkdtemp(path.join(tmpdir(), 'prototype-approval-gate-'));
  roots.push(root);
  const seed = path.join(root, 'seed.yaml');
  await writeFile(seed, 'title: Original shop\ntheme: shop\ntemplate: idle-shop-v1\n');
  const factory = createFactory({ root, mode: 'mock', qaMode: 'stub' });
  const runId = await factory.newRun(seed);
  expect((await factory.run(runId)).stage).toBe('WAITING_FOR_PROTOTYPE_APPROVAL');
  return { factory, runId, runRoot: path.join(root, 'runs', runId) };
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

it('exposes batch evidence and labels synthetic evidence without claiming product acceptance', async () => {
  const { factory, runId, runRoot } = await waitingRun();
  const snapshot = JSON.parse(await readFile(path.join(runRoot, 'artifacts/prototype-approval-evidence.batch-1.json'), 'utf8'));
  expect(snapshot).toMatchObject({ passed: true, synthetic: true, usableForProductAcceptance: false });
  const inspected = await factory.inspect(runId);
  expect(inspected.operator.reviewArtifacts).toEqual(expect.arrayContaining([
    'artifacts/prototype-build-report.batch-1.json', 'artifacts/playtest-tournament.batch-1.json',
    'artifacts/winner-selection.batch-1.json', 'artifacts/prototype-approval-evidence.batch-1.json',
  ]));
  await factory.approvePrototype(runId, { decision: 'PREFER_B', notes: 'Fixture decision' });
});

it('blocks a positive approval when the snapshot is missing while preserving rejection', async () => {
  const { factory, runId, runRoot } = await waitingRun();
  await rm(path.join(runRoot, 'artifacts/prototype-approval-evidence.batch-1.json'), { force: true });
  await expect(factory.approvePrototype(runId, { decision: 'APPROVE', notes: '' })).rejects.toThrow(/prototype.*evidence/iu);
  await expect(readFile(path.join(runRoot, 'human/prototype-decision.yaml'))).rejects.toMatchObject({ code: 'ENOENT' });
  await factory.approvePrototype(runId, { decision: 'REJECT', notes: 'Missing review evidence' });
  expect((await factory.resume(runId)).stage).toBe('DESIGN_REJECTED');
});

it('rechecks approved build bytes on resume before selecting a prototype', async () => {
  const { factory, runId, runRoot } = await waitingRun();
  await factory.approvePrototype(runId, { decision: 'APPROVE', notes: '' });
  await writeFile(path.join(runRoot, 'workspace/prototype-a/dist/index.html'), '<p>Changed after QA</p>');
  const state = await factory.resume(runId);
  expect(state).toMatchObject({ stage: 'WAITING_FOR_PROTOTYPE_APPROVAL', status: 'waiting' });
  expect(state.stages.WAITING_FOR_PROTOTYPE_APPROVAL?.evidence.some(item => item.includes('hash-mismatch'))).toBe(true);
  await expect(readFile(path.join(runRoot, 'artifacts/selected-prototype.json'))).rejects.toMatchObject({ code: 'ENOENT' });
});
