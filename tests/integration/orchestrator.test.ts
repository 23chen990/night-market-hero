import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createFactory } from '../../src/factory.js';

const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-test-'));
  roots.push(root);
  const seed = path.join(root, 'seed.yaml');
  await writeFile(seed, 'title: 妖怪夜市\ntheme: 夜市妖怪\ntemplate: idle-shop-v1\npreferences:\n  tone: cozy\n');
  return { root, seed, factory: createFactory({ root, mode: 'mock', qaMode: 'stub' }) };
}
afterEach(async () => { const { rm } = await import('node:fs/promises'); await Promise.all(roots.splice(0).map((p) => rm(p, { recursive: true, force: true }))); });

describe('orchestrator integration', () => {
  it('pauses normally for art approval and resumes the same run', async () => {
    const { factory, seed, root } = await fixture();
    const runId = await factory.newRun(seed);
    const paused = await factory.run(runId);
    expect(paused.stage).toBe('WAITING_FOR_ART_APPROVAL');
    expect(paused.status).toBe('waiting');
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
    for (const stage of ['BLUEPRINT', 'ART_DIRECTIONS', 'STYLE_LOCK', 'ASSETS', 'BUILD', 'QA', 'RELEASE']) expect(state.stages[stage]?.status).toBe('completed');
    const releaseRoot = path.join(root, 'runs', runId, 'release-candidate');
    for (const file of ['release-manifest.json', 'web/index.html', 'reports/build-report.json', 'reports/qa-report.json']) await expect(readFile(path.join(releaseRoot, file), 'utf8')).resolves.toBeTruthy();
  });
});
