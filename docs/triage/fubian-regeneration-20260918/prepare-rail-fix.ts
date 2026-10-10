import path from 'node:path';
import { readJson, writeJsonAtomic, sha256File } from '../../../src/core/files.js';
import { ExperienceComplaintTriageSchema, ExperienceReproductionMatrixSchema } from '../../../src/schemas/experience-complaint.js';
import { QaReportSchema } from '../../../src/schemas/index.js';
import { packageForStage } from '../../../src/agents/packages.js';
import { RunWorkerTaskSchema } from './coordination-schema.js';

const runId = '20260918104154-974ee21f';
const runRoot = path.resolve('runs', runId);
const workspace = path.join(runRoot, 'workspace/game');
const dir = path.join(runRoot, 'artifacts/regeneration-20260918');
const at = new Date().toISOString();
const evidence = await Promise.all(['workspace/game/builder-evidence/play-1100.png', 'workspace/game/builder-evidence/play-390.png', 'artifacts/regeneration-20260918/rail-runtime-observation.json'].map(async (file) => ({ path: file, sha256: await sha256File(path.join(runRoot, file)), kind: 'runtime-capture' as const, provenance: 'verified-run-artifact' as const })));
const triage = ExperienceComplaintTriageSchema.parse({
  schemaVersion: 1, artifactType: 'experience-complaint-triage', targetGame: '符刃夜行', workspace,
  report: 'Actual candidate has floating opening targets and no visible supporting rail under them.',
  classification: ['core-experience', 'reference-fidelity'],
  scope: { route: 'formal-fixer', rationale: 'Actual built candidate support topology affects the core loop; validated QA issue requires formal repair and natural/perceptual retest.', generatedWorkspaceModified: false, contextIntentionallyOmitted: ['Full conversation', 'Unrelated factory code', 'Other game source'] },
  reproduction: { status: 'REPRODUCED', steps: ['Fresh browser at http://127.0.0.1:5198/ on exact build b1d66e7d2bbc6e155fa71a4302af551cff805cea3790e4be030f74d81ebaa7d1.', 'Tap visible primary action once and capture after 2.2 seconds.', 'Read initial live support segments without modifying state.'], observed: ['Opening rail is x=230..300 while opening intact targets occupy x=520..1394; following rail begins at1770.', 'Desktop and mobile screenshots show intact opening targets floating over the background.', 'Initial platform branch exists; its presence cannot pass the missing opening rail branch.'], evidence },
  acceptanceCriteria: ['Every opening intact target has physical horizontal support under its full base.', 'A genuine bounded gap remains after the last opening round target and before the first post.', 'Renderer and collision use identical supportSegments.', 'New test must fail current geometry; natural fresh desktop/mobile screenshots must show grounded opening targets and real gap.', 'Independent QA must still exercise natural failure/settlement/replay; source fix or unit tests alone cannot close the issue.'],
  status: 'READY_FOR_REPAIR', createdAt: at,
});
const viewports = [{ label: 'desktop', width: 1100, height: 720 }, { label: 'mobile', width: 390, height: 844 }];
const matrix = ExperienceReproductionMatrixSchema.parse({
  schemaVersion: 1, artifactType: 'experience-reproduction-matrix', targetGame: '符刃夜行', workspace,
  axes: { objectTypes: ['opening cuttable targets + support-rail-01', 'support-initial-01', 'gap + support-post-a'], lifecycleStateBranches: ['intact ready opening', 'initial ready support', 'natural crossing'], rendererPaths: ['default projected canvas'], viewports },
  cells: viewports.flatMap((viewport, index) => [
    { id: `rail-opening-${viewport.label}`, objectType: 'opening cuttable targets + support-rail-01', lifecycleStateBranch: 'intact ready opening', rendererPath: 'default projected canvas', viewport, status: 'REPRODUCED', expected: 'Targets visibly and physically rest on the opening rail.', observed: 'Target base y aligns but x footprint lies entirely outside the actual opening support segment.', evidence: [evidence[index], evidence[2]] },
    { id: `rail-gap-${viewport.label}`, objectType: 'gap + support-post-a', lifecycleStateBranch: 'natural crossing', rendererPath: 'default projected canvas', viewport, status: 'BLOCKED', expected: 'A bounded actual gap separates opening rail from reachable post rail.', observed: 'Exact gap traversal not observed yet; cannot close from a synthetic landing test.', evidence: [] },
  ]), confirmedFindings: ['The first target branch is represented by the actual opening ready objects and missing physical support is reproduced.'], remainingGaps: ['Natural gap, terminal and replay retest pending.'], createdAt: at,
});
await writeJsonAtomic(path.join(dir, 'rail-triage.json'), triage);
await writeJsonAtomic(path.join(dir, 'rail-matrix.json'), matrix);
const report = QaReportSchema.parse({ schemaVersion: 1, passed: false, checks: [{ name: 'opening-target-support', passed: false, evidence: 'artifacts/regeneration-20260918/rail-matrix.json' }], issues: [{ id: 'opening-rail-truncated', severity: 'error', message: 'Opening support ends at300 while opening target bases extend from520 through1394; actual ready targets float and support topology is broken.', evidence: 'artifacts/regeneration-20260918/rail-triage.json' }], screenshots: evidence.slice(0, 2).map((item) => item.path), consoleLog: 'workspace/game/builder-evidence/initial-smoke.json', testedAt: at });
await writeJsonAtomic(path.join(dir, 'qa-rail-v1.json'), report);
const prior = await readJson(path.join(dir, 'course-support-task.json')) as { omittedContext: string[] };
const task = RunWorkerTaskSchema.parse({
  schemaVersion: 1, taskId: 'luna_fubian_formal_rail_fix_1', targetRunId: runId, targetGame: '符刃夜行', workspace, role: 'FixerAgent', package: packageForStage('FIX'),
  ownership: ['src/runtime-loader.ts', 'src/contract.test.ts', 'src/runtime-loader.test.ts'].map((p) => path.join(workspace, p)).concat(path.join(dir, 'rail-fix-1-result.json')),
  inputs: [{ path: path.join(dir, 'qa-rail-v1.json'), schema: 'QaReportSchema' }, { path: path.join(dir, 'rail-triage.json'), schema: 'ExperienceComplaintTriageSchema' }, { path: path.join(dir, 'rail-matrix.json'), schema: 'ExperienceReproductionMatrixSchema' }, { path: path.join(runRoot, 'artifacts/reference-failure-pressure-contract.json'), schema: 'ReferenceFailurePressureContractSchema' }],
  instructions: [
    'You are the stored Builder agent continuing now as FixerAgent for one formal QA issue. You are not alone; preserve parent integration and renderer peer edits. Read codex-game-repair skill. Only edit owned source/test files causally related to opening-rail-truncated.',
    'Your prior segment formula openingGapOffset=firstBar.x-rail.x-70 then openingEnd=firstBar.x-openingGapOffset algebraically always yields rail.x+70. Actual opening targets x520..1394 therefore have no rail. Fix endpoint using actual opening target bases and a bounded original gap before first post; no copied reference pixel tuning. Tests must assert full horizontal coverage beneath each intact opening target, exact no-support gap, and final segment coverage. Add failing regression first and record RED/GREEN output.',
    'Preserve immutable reference-level.json, all51 semantic objects, continuous motion and actual contact rules. Do not alter gameplay to fit expected checkpoints, simulate natural evidence, or erase failed evidence. Parent independently runs QA on immutable existing dist while you edit source. Do not build dist in this bounded patch task; parent as integrating Fixer will rebuild exactly once after existing QA completes and will record that same repair attempt.',
    'This is attempt1 in run-local formal repair ledger; existing factory fixAttempts remains0 because its native FULL_BUILD request timed out. Do not edit run-state or write a receipt to the expired native request. Original native agentId /root/luna_fubian_builder is preserved; no replacement thread.',
    'Run targeted tests, owned lint/typecheck. Output validated RunWorkerResultSchema with READY meaning code patch only, route formal-fixer. List files/hashes/tests and natural/perceptual retest gaps. Do not claim issue closed. Final communication only structured result pointer.',
  ],
  acceptanceChecks: triage.acceptanceCriteria, omittedContext: prior.omittedContext, outputPath: path.join(dir, 'rail-fix-1-result.json'),
});
await writeJsonAtomic(path.join(dir, 'rail-fix-1-task.json'), task);
await writeJsonAtomic(path.join(dir, 'repair-attempt-ledger.json'), { schemaVersion: 1, targetRunId: runId, workspace, factoryStage: 'FAILED', factoryFixAttempts: 0, agentId: '/root/luna_fubian_builder', attempts: [{ attempt: 1, issueIds: ['opening-rail-truncated'], status: 'IN_PROGRESS', hypothesis: 'Correct opening segment endpoint to cover the actual target bases before the intended gap.', startedAt: at, buildCount: 0, independentRetest: 'PENDING' }] });
console.log(JSON.stringify({ taskPath: path.join(dir, 'rail-fix-1-task.json') }));
