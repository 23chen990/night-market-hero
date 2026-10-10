import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { sha256File } from '../../../src/core/files.js';
import { hashActionFeelCandidateBuild, verifyActionFeelPlayerEvidence } from '../../../src/core/action-feel-evidence.js';
import { buildActionFeelExperienceReview } from '../../../src/core/action-feel-stage.js';
import { ActionPlaytestReportSchema } from '../../../src/schemas/action-mechanic-experiment.js';
import { ExperienceReviewReportSchema } from '../../../src/schemas/experience-contract.js';
import { NaturalFlowEvidenceSchema } from '../../../src/schemas/natural-flow.js';

const runId = '20260918050528-974ee21f';
const runRoot = path.resolve('runs', runId);
const workspace = path.join(runRoot, 'workspace/feel-prototype-a');
const evidenceRoot = 'artifacts/factory-review-20260918';
const readJson = async (name: string): Promise<unknown> => JSON.parse(await readFile(path.join(runRoot, name), 'utf8'));
const reproduction = z.object({ htmlSha256: z.string().length(64) }).parse(await readJson(`${evidenceRoot}/natural-reproduction.json`));
const playtest = ActionPlaytestReportSchema.parse(await readJson('artifacts/action-feel-natural-play-qa.json'));
const oldReview = ExperienceReviewReportSchema.parse(await readJson('artifacts/experience-review.json'));
const trace = NaturalFlowEvidenceSchema.parse(await readJson(`${evidenceRoot}/natural-trace.json`));
const candidate = { slot: 'A' as const, workspace, targetRunId: runId, targetGame: '符刃夜行', experimentId: playtest.experimentId };
const screenshots = await Promise.all(trace.screenshots.map(async (file) => ({ path: file, sha256: await sha256File(path.join(runRoot, file)) })));
// This wrapper binds existing failed observations for verifier regression only.
// It is kept in memory and never becomes a production QA approval artifact.
const verified = await verifyActionFeelPlayerEvidence({
  runRoot,
  candidate,
  naturalReport: {
    schemaVersion: 1,
    targetRunId: runId,
    targetGame: candidate.targetGame,
    targetWorkspace: workspace,
    experimentId: candidate.experimentId,
    slot: candidate.slot,
    buildHash: await hashActionFeelCandidateBuild(workspace),
    trace: { path: `${evidenceRoot}/natural-trace.json`, sha256: await sha256File(path.join(runRoot, evidenceRoot, 'natural-trace.json')) },
    screenshots,
  },
});
const review = buildActionFeelExperienceReview({
  contractId: oldReview.contractId,
  playtest,
  selectedCandidate: candidate,
  naturalPlayEvidence: verified.naturalPlay,
  visualEvidence: verified.naturalPlay,
  perceptualEvidence: verified.perceptual,
});
const result = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal('historical-false-approval-regression'),
  targetRunId: z.string(),
  targetWorkspace: z.string(),
  historicalDecision: z.literal('APPROVED'),
  currentDecision: z.literal('FEEL_REPAIR_REQUIRED'),
  naturalPassed: z.literal(false),
  perceptualPassed: z.literal(false),
  blankCapturesRejected: z.literal(true),
  originalWorkspaceHtmlUnchanged: z.literal(true),
  gameAcceptance: z.literal('BLOCKED'),
  blockers: z.array(z.string()).min(1),
  screenshots: z.array(z.object({ path: z.string(), sha256: z.string().length(64) })),
  checkedAt: z.string().datetime(),
}).strict().parse({
  schemaVersion: 1,
  kind: 'historical-false-approval-regression',
  targetRunId: runId,
  targetWorkspace: workspace,
  historicalDecision: oldReview.decision,
  currentDecision: review.decision,
  naturalPassed: verified.naturalPlay.passed,
  perceptualPassed: verified.perceptual.passed,
  blankCapturesRejected: verified.naturalPlay.blockers.includes('natural:visual-evidence-gate'),
  originalWorkspaceHtmlUnchanged: reproduction.htmlSha256 === await sha256File(path.join(workspace, 'dist/index.html')),
  gameAcceptance: 'BLOCKED',
  blockers: [...verified.naturalPlay.blockers, ...verified.perceptual.blockers],
  screenshots,
  checkedAt: new Date().toISOString(),
});
await writeFile('docs/triage/factory-review-20260918/historical-gate-verification.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
