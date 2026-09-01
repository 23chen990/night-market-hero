import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createFactory } from '../../src/factory.js';
import { HumanActionMechanicDecisionSchema } from '../../src/schemas/action-mechanic-experiment.js';

const roots: string[] = [];
const digest = (character: string) => `sha256:${character.repeat(64)}`;

async function actionSpec(root: string) {
  const file = path.join(root, 'action-experiment.json');
  await writeFile(file, `${JSON.stringify({
    schemaVersion: 1,
    experimentId: 'action_swing_release_01',
    sourceWorkspace: 'runs/mobile-chart-adaptation-20260830/workspace/prototype-a',
    question: 'Is holding and releasing intrinsically satisfying without chase, art, or progression?',
    coreAction: 'hold to hook and release to preserve momentum',
    decisionIntervalMs: 900,
    sharedGeometryFixture: 'fixtures/action-course-v1.json',
    constraints: { greyboxOnly: true, chaseIncluded: false, formalUiIncluded: false, iaaIncluded: false },
    prototypes: [
      { slot: 'A', name: 'baseline', workspace: 'workspace/action-a', hypothesis: 'control', treatment: ['keep current handling'], geometryFixtureHash: digest('a'), treatmentHash: digest('b') },
      { slot: 'B', name: 'precision', workspace: 'workspace/action-b', hypothesis: 'intent is clearer', treatment: ['weight hooks by direction'], geometryFixtureHash: digest('a'), treatmentHash: digest('c') },
      { slot: 'C', name: 'forgiving', workspace: 'workspace/action-c', hypothesis: 'recovery is clearer', treatment: ['buffer hook input'], geometryFixtureHash: digest('a'), treatmentHash: digest('d') },
    ],
    automaticQaThresholds: {
      inputResponseMs: { max: 100 },
      releaseVelocityRetentionRatio: { min: 0.9 },
      wrongHookAttachments: { max: 0 },
      maxEventGapMs: { max: 2_000 },
      retryFrictionMs: { max: 500 },
      missedFinishDetections: { max: 0 },
    },
  }, null, 2)}\n`);
  return file;
}

afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe('action mechanic experiment orchestration', () => {
  it('builds three isolated action variants, records independent QA, and pauses for a human decision', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'factory-action-experiment-'));
    roots.push(root);
    const factory = createFactory({ root, repositoryRoot: process.cwd(), mode: 'mock', qaMode: 'stub' });
    const runId = await factory.newActionExperiment(await actionSpec(root));

    const waiting = await factory.run(runId);

    expect(waiting).toMatchObject({ runKind: 'action-experiment', stage: 'WAITING_FOR_ACTION_APPROVAL', status: 'waiting' });
    for (const stage of ['ACTION_EXPERIMENT_SPEC', 'BUILD_ACTION_PROTOTYPES', 'PLAYTEST_ACTION_PROTOTYPES']) {
      expect(waiting.stages[stage]?.status).toBe('completed');
    }
    const runRoot = path.join(root, 'runs', runId);
    expect(JSON.parse(await readFile(path.join(runRoot, 'artifacts/action-prototype-build-report.json'), 'utf8')).prototypes).toHaveLength(3);
    expect(JSON.parse(await readFile(path.join(runRoot, 'artifacts/action-playtest-report.json'), 'utf8'))).toMatchObject({ reviewer: 'QAAgent', prototypeAuthor: 'BuilderAgent' });
    expect(await readFile(path.join(runRoot, 'human/action-mechanic-decision.example.yaml'), 'utf8')).toContain('decision: KEEP');
  });

  it('resumes idempotently from a validated KEEP decision without entering production automatically', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'factory-action-approval-'));
    roots.push(root);
    const factory = createFactory({ root, repositoryRoot: process.cwd(), mode: 'mock', qaMode: 'stub' });
    const runId = await factory.newActionExperiment(await actionSpec(root));
    await factory.run(runId);

    const approval = await factory.approveActionExperiment(runId, {
      decision: 'KEEP', selectedSlot: 'B', rationale: 'Release timing is readable.', requiredChanges: [],
    });
    const parsed = HumanActionMechanicDecisionSchema.parse(parse(await readFile(approval.file, 'utf8')));
    expect(parsed).toMatchObject({ decision: 'KEEP', selectedSlot: 'B' });

    const completed = await factory.resume(runId);
    expect(completed).toMatchObject({ stage: 'ACTION_EXPERIMENT_APPROVED', status: 'completed' });
    expect(await factory.resume(runId)).toEqual(completed);
    expect(completed.stages.FULL_BUILD).toBeUndefined();
  });
});
