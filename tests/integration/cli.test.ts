import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import { referenceBehaviorChecks } from '../fixtures/reference-behavior.js';

const exec = promisify(execFile);
const hash = (character: string) => `sha256:${character.repeat(64)}`;

async function writeActionExperiment(file: string) {
  await writeFile(file, `${JSON.stringify({
    schemaVersion: 1,
    experimentId: 'cli-action-experiment',
    question: 'Which hold and release treatment has the clearest timing?',
    coreAction: 'hold to attach, release to preserve momentum',
    decisionIntervalMs: 900,
    sourceWorkspace: 'runs/mobile-chart-adaptation-20260830/workspace/prototype-a',
    sharedGeometryFixture: 'fixtures/lantern-action-course-v1.json',
    constraints: { greyboxOnly: true, chaseIncluded: false, formalUiIncluded: false, iaaIncluded: false },
    prototypes: ['A', 'B', 'C'].map((slot, index) => ({
      slot,
      name: `Treatment ${slot}`,
      workspace: `workspace/action-${slot.toLowerCase()}`,
      geometryFixtureHash: hash('a'),
      treatmentHash: hash(String.fromCharCode(98 + index)),
      hypothesis: `Treatment ${slot} is measurable`,
      treatment: [`treatment-${slot}`],
    })),
    automaticQaThresholds: {
      inputResponseMs: { max: 100 },
      releaseVelocityRetentionRatio: { min: 0.9 },
      wrongHookAttachments: { max: 0 },
      maxEventGapMs: { max: 1_000 },
      retryFrictionMs: { max: 500 },
      missedFinishDetections: { max: 0 },
    },
  }, null, 2)}\n`);
}

it('CLI validates a seed with a machine-readable success result', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-cli-'));
  const seed = path.join(root, 'seed.yaml');
  await writeFile(seed, 'title: Test\ntheme: spirits\ntemplate: idle-shop-v1\ndesignMode: prototype_tournament\n');
  const result = await exec('pnpm', ['factory', 'validate', seed], { cwd: process.cwd(), env: { ...process.env, FACTORY_ROOT: root } });
  expect(JSON.parse(result.stdout)).toMatchObject({ valid: true });
});

it('CLI creates a resumable action experiment run from a validated spec', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-cli-action-'));
  const spec = path.join(root, 'action-experiment.json');
  await writeActionExperiment(spec);
  const env = { ...process.env, FACTORY_ROOT: root };

  const created = await exec('pnpm', ['factory', 'new-action', spec], { cwd: process.cwd(), env });
  const runId = created.stdout.trim();
  const status = await exec('pnpm', ['factory', 'status', runId], { cwd: process.cwd(), env });

  expect(JSON.parse(status.stdout)).toMatchObject({ runId, runKind: 'action-experiment', stage: 'CREATED', status: 'pending' });
});

it('CLI approves a human-locked reference without auto-resuming the run', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-cli-reference-'));
  const env = { ...process.env, FACTORY_ROOT: root, FACTORY_MODE: 'mock' };
  const seed = path.join(root, 'reference-seed.yaml');
  const sourceSeed = path.join(process.cwd(), 'examples/seeds/relic-revival-workshop.yaml');
  await writeFile(seed, (await readFile(sourceSeed, 'utf8')).replace('researchFiles: []', 'researchFiles: [input/reference-report.txt]'));
  const created = await exec('pnpm', ['factory', 'new', seed], { cwd: process.cwd(), env });
  const runId = created.stdout.trim();
  await exec('pnpm', ['factory', 'run', runId], { cwd: process.cwd(), env });
  // Ingestion proves file identity; research must still supply behavior analysis.
  await writeFile(path.join(root, 'runs', runId, 'input/reference-report.txt'), 'Observed loop: act, earn, upgrade, unlock, retry.\n');
  await exec('pnpm', ['factory', 'run', runId], { cwd: process.cwd(), env });
  const packPath = path.join(root, 'runs', runId, 'artifacts/reference-evidence-pack.json');
  const pack = JSON.parse(await readFile(packPath, 'utf8'));
  pack.behaviorChecks = referenceBehaviorChecks(pack.sourceFiles[0]);
  await writeFile(packPath, JSON.stringify(pack));
  await exec('pnpm', ['factory', 'resume', runId], { cwd: process.cwd(), env });

  const waitingStatus = await exec('pnpm', ['factory', 'status', runId], { cwd: process.cwd(), env });
  expect(JSON.parse(waitingStatus.stdout).operator).toMatchObject({
    nextAction: 'review reference mechanic lock',
    nextCommand: `pnpm factory inspect ${runId}`,
    decisionCommandTemplate: expect.stringContaining('<APPROVE|REJECT>'),
  });

  const result = await exec('pnpm', ['factory', 'approve-reference', runId, '--decision', 'APPROVE', '--notes', 'mechanics locked'], { cwd: process.cwd(), env });

  expect(result.stdout).toContain(`pnpm factory resume ${runId}`);
  const status = await exec('pnpm', ['factory', 'status', runId], { cwd: process.cwd(), env });
  expect(JSON.parse(status.stdout)).toMatchObject({ stage: 'WAITING_FOR_REFERENCE_APPROVAL', status: 'waiting' });
});

it('CLI routes user input before factory execution', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-cli-route-'));
  const result = await exec('pnpm', ['factory', 'route', '调整激励广告频控', '--run', 'existing-run'], { cwd: process.cwd(), env: { ...process.env, FACTORY_ROOT: root } });

  expect(JSON.parse(result.stdout)).toMatchObject({
    requestType: 'MONETIZATION_REVISION',
    targetRunId: 'existing-run',
    stages: ['FULL_BUILD', 'QA'],
    fullGreenlight: false,
    reviewEscalations: [],
  });
});

it('CLI offers active run selection instead of leaking a targetRunId validation error', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-cli-run-selection-'));
  const seed = path.join(root, 'seed.yaml');
  await writeFile(seed, 'title: Selection\ntheme: spirits\ntemplate: idle-shop-v1\ndesignMode: prototype_tournament\n');
  const env = { ...process.env, FACTORY_ROOT: root, FACTORY_MODE: 'mock' };
  const created = await exec('pnpm', ['factory', 'new', seed], { cwd: process.cwd(), env });
  const runId = created.stdout.trim();

  const result = await exec('pnpm', ['factory', 'route', '把现有 demo 做成可发布版本'], { cwd: process.cwd(), env });
  const payload = JSON.parse(result.stdout);
  expect(payload).toMatchObject({ request: '把现有 demo 做成可发布版本', requiresRunSelection: true });
  expect(payload.candidates.map((item: { runId: string }) => item.runId)).toContain(runId);
  expect(payload.nextCommandTemplate).toContain('--run <run-id>');
});

it('CLI freezes explicit rigor in an original run created from a minimal seed', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-cli-rigor-'));
  const seed = path.join(root, 'seed.yaml');
  await writeFile(seed, 'title: Original Rigor\ntheme: small shop\ntemplate: idle-shop-v1\n');
  const env = { ...process.env, FACTORY_ROOT: root, FACTORY_MODE: 'mock' };
  const created = await exec('pnpm', ['factory', 'new', seed, '--rigor', 'full'], { cwd: process.cwd(), env });
  const runId = created.stdout.trim();
  const result = await exec('pnpm', ['factory', 'plan', runId], { cwd: process.cwd(), env });
  const plan = JSON.parse(result.stdout);
  expect(plan).toMatchObject({ mode: 'full-validation', designMode: 'prototype_tournament', rigor: 'full' });
  const route = await exec('pnpm', ['factory', 'route', '做一个小店经营游戏', '--rigor', 'full'], { cwd: process.cwd(), env });
  expect(JSON.parse(route.stdout).stages).toEqual(plan.mandatoryStages);
});

it('CLI audits a historical reference run without modifying its game workspace', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-cli-reference-audit-'));
  const runId = 'historical-reference';
  const runRoot = path.join(root, 'runs', runId);
  const workspace = path.join(runRoot, 'workspace/prototype-a');
  const workspaceSentinel = path.join(workspace, 'sentinel.txt');
  const evidenceFile = path.join(runRoot, 'reference-evidence/incoming/reference.txt');
  await mkdir(path.dirname(evidenceFile), { recursive: true });
  await mkdir(workspace, { recursive: true });
  await writeFile(workspaceSentinel, 'game workspace must remain unchanged');
  await writeFile(evidenceFile, 'reference behavior');
  const sha256 = createHash('sha256').update(await readFile(evidenceFile)).digest('hex');
  await writeFile(path.join(runRoot, 'reference-evidence/manifest.json'), JSON.stringify({
    schemaVersion: 1,
    targetGame: runId,
    workspace,
    entries: [{ id: 'reference', sourcePath: evidenceFile, storedPath: 'reference-evidence/incoming/reference.txt', purpose: 'gameplay-reference', sha256, targetGame: runId, workspace, identityStatus: 'VERIFIED_TARGET', reviewStatus: 'VERIFIED', usableAsEvidence: true }],
  }));

  const result = await exec('pnpm', ['factory', 'audit-reference', runId, '--workspace', workspace], { cwd: process.cwd(), env: { ...process.env, FACTORY_ROOT: root } });
  const report = JSON.parse(result.stdout) as { disposition: string; generatedWorkspaceModified: boolean };

  expect(report).toMatchObject({ disposition: 'REQUIRES_NEW_RUN_MIGRATION', generatedWorkspaceModified: false });
  expect(JSON.parse(await readFile(path.join(runRoot, 'artifacts/reference-quality-audit.json'), 'utf8'))).toMatchObject({ targetRunId: runId, disposition: 'REQUIRES_NEW_RUN_MIGRATION' });
  expect(await readFile(workspaceSentinel, 'utf8')).toBe('game workspace must remain unchanged');
});

it('CLI records a validated account portfolio without exposing credentials', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-cli-portfolio-'));
  const portfolioFile = path.join(root, 'portfolio.json');
  const updatedAt = new Date().toISOString();
  await writeFile(portfolioFile, JSON.stringify({
    schemaVersion: 1,
    updatedAt,
    entries: [{ gameId: 'one', platform: 'douyin-minigame', status: 'reserved', updatedAt }],
  }));
  const env = { ...process.env, FACTORY_ROOT: root, FACTORY_MODE: 'mock' };
  const result = await exec('pnpm', ['factory', 'set-portfolio', portfolioFile], { cwd: process.cwd(), env });
  const parsed = JSON.parse(result.stdout) as { snapshotHash: string; portfolio: { entries: unknown[] } };
  expect(parsed.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
  expect(parsed.portfolio.entries).toHaveLength(1);
  expect(await readFile(path.join(root, 'account-portfolio.json'), 'utf8')).not.toContain('apiKey');
});

it('CLI records project feedback and reusable design lessons in one command', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-cli-feedback-'));
  const seed = path.join(root, 'seed.yaml');
  await writeFile(seed, 'title: Test\ntheme: spirits\ntemplate: idle-shop-v1\ndesignMode: prototype_tournament\n');
  const env = { ...process.env, FACTORY_ROOT: root };
  const created = await exec('pnpm', ['factory', 'new', seed], { cwd: process.cwd(), env });
  const runId = created.stdout.trim();

  const result = await exec('pnpm', ['factory', 'feedback', runId, '当前玩法太重复。以后每个玩法方案都必须提供真实选择。'], { cwd: process.cwd(), env });

  expect(JSON.parse(result.stdout)).toMatchObject({
    runId,
    projectChanges: ['当前玩法太重复'],
    projectRoute: { requestType: 'GAMEPLAY_REVISION', stages: ['FULL_BUILD', 'QA'] },
    reusableLessons: [{ text: '以后每个玩法方案都必须提供真实选择' }],
  });
});

it('CLI records and reconciles an external side effect through the durable journal', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-cli-side-effect-'));
  const seed = path.join(root, 'seed.yaml');
  await writeFile(seed, 'title: Side Effect Test\ntheme: spirits\ntemplate: idle-shop-v1\ndesignMode: prototype_tournament\n');
  const env = { ...process.env, FACTORY_ROOT: root, FACTORY_MODE: 'mock' };
  const created = await exec('pnpm', ['factory', 'new', seed], { cwd: process.cwd(), env });
  const runId = created.stdout.trim();
  const commandFile = path.join(root, 'side-effect.json');
  await writeFile(commandFile, JSON.stringify({ schemaVersion: 1, action: 'begin', effectId: 'publish-1', operation: 'submit', idempotencyKey: `${runId}:submit`, maxAttempts: 1 }));
  await exec('pnpm', ['factory', 'record-side-effect', runId, commandFile], { cwd: process.cwd(), env });
  await writeFile(commandFile, JSON.stringify({ schemaVersion: 1, action: 'fail', effectId: 'publish-1', operation: 'submit', idempotencyKey: `${runId}:submit`, error: 'remote status unavailable', reconciliationRequired: true }));
  await exec('pnpm', ['factory', 'record-side-effect', runId, commandFile], { cwd: process.cwd(), env });
  await writeFile(commandFile, JSON.stringify({ schemaVersion: 1, action: 'reconcile', effectId: 'publish-1', operation: 'submit', idempotencyKey: `${runId}:submit`, result: { remoteId: 'accepted' } }));
  const result = await exec('pnpm', ['factory', 'record-side-effect', runId, commandFile], { cwd: process.cwd(), env });
  expect(JSON.parse(result.stdout)).toMatchObject({ journal: { records: [{ status: 'SUCCEEDED' }] } });
});
