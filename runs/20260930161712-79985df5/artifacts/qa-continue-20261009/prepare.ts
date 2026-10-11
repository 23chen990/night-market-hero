import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import { ExperienceComplaintTriageSchema, ExperienceReproductionMatrixSchema } from '../../../../src/schemas/experience-complaint.ts';

const run = path.resolve('runs/20260930161712-79985df5');
const out = path.join(run, 'artifacts/qa-continue-20261009');
const workspace = path.join(run, 'workspace/game');
const prior = path.join(run, 'artifacts/qa-retest-20261008/attempt-8/natural-540x960-keyboard-root-resume9/natural.json');
const hash = (p: string) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
fs.mkdirSync(out, { recursive: true });
const evidence = { path: prior, sha256: hash(prior), kind: 'qa-artifact' as const, provenance: 'verified-run-artifact' as const };
const triage = ExperienceComplaintTriageSchema.parse({
  schemaVersion: 1, artifactType: 'experience-complaint-triage', targetGame: '海滩渔货铺', workspace,
  report: 'Continue attempt-8 independent QA: natural keyboard journey reaches Coral but twelve fixed fish/smoked stocking cycles do not reach its goal; UI remains smoke orders 0/2 with cargo 2. Determine harness routing versus a product defect before further repair.',
  classification: ['core-experience', 'qa-false-positive'],
  scope: { route: 'formal-fixer', rationale: 'Existing formal repair and natural product gate; investigation only until owning state branch is confirmed.', generatedWorkspaceModified: false, contextIntentionallyOmitted: ['Other games and shared factory dirty edits', 'Full prior conversation and unrelated output', 'Unverified reference media'] },
  reproduction: { status: 'PARTIALLY_REPRODUCED', steps: ['Fresh browser natural base sale, expansion, processing, staff and same-target gull recovery.', 'Normal marker entry to Coral; repeat net → fish shelf → smokehouse → smoked shelf → checkout twelve times.'], observed: ['Prior report has 13 passing checks before Coral own-settlement fails.', 'Coral UI goal remains 0/2; smoked shelf 0, cargo 2; no browser console/page errors.', 'Product cause is not yet established; fixed scripting may fail to supply processing input.'], evidence: [evidence] },
  acceptanceCriteria: ['Identify the exact carried-goods and processor lifecycle branch from bound traces and source.', 'Fresh normal-input Coral and Moon both reach authored goals; smokehouse input/output and visible feedback are captured.', 'Retain five-viewport default journey, exact gull recovery, funded staff, terminal/replay/reload/restart and perceptual checks.', 'Do not alter production or increment repair attempt for a harness-only correction.'],
  status: 'OPEN', createdAt: new Date().toISOString(),
});
fs.writeFileSync(path.join(out, 'triage.json'), JSON.stringify(triage, null, 2) + '\n');
const viewports = [[360,800],[390,844],[430,932],[540,960],[844,390]].map(([width,height]) => ({ label: `${width}x${height}`, width, height }));
const matrix = ExperienceReproductionMatrixSchema.parse({
  schemaVersion: 1, artifactType: 'experience-reproduction-matrix', targetGame: '海滩渔货铺', workspace,
  axes: { objectTypes: ['carried-goods', 'smokehouse', 'market-goal'], lifecycleStateBranches: ['raw-fish-remains-in-cargo', 'processor-starved', 'processor-making-ready-harvested', 'coral-own-settlement', 'moon-own-settlement'], rendererPaths: ['simulation-nearest-station', 'Phaser-canvas-and-visible-DOM'], viewports },
  cells: viewports.flatMap(viewport => ['coral-own-settlement', 'moon-own-settlement', 'processor-starved', 'processor-making-ready-harvested', 'raw-fish-remains-in-cargo'].map(lifecycleStateBranch => ({
    id: `${viewport.label}-${lifecycleStateBranch}`, objectType: lifecycleStateBranch.includes('settlement') ? 'market-goal' : lifecycleStateBranch.includes('cargo') ? 'carried-goods' : 'smokehouse', lifecycleStateBranch,
    rendererPath: 'Phaser-canvas-and-visible-DOM', viewport,
    status: viewport.width === 540 && lifecycleStateBranch === 'coral-own-settlement' ? 'REPRODUCED' : 'BLOCKED',
    expected: 'Normal stocking and processing can satisfy the actual market objective with visible attributable feedback.',
    observed: viewport.width === 540 && lifecycleStateBranch === 'coral-own-settlement' ? 'Prior natural report stalled at 0/2; production versus harness cause unresolved.' : 'Exact current branch requires new natural evidence.',
    evidence: viewport.width === 540 ? [evidence] : [],
  }))), confirmedFindings: ['A fixed natural QA route stalled; fixture market completion cannot close the branch.'], remainingGaps: ['Root cause and other viewports remain unconfirmed.'], createdAt: new Date().toISOString(),
});
fs.writeFileSync(path.join(out, 'reproduction-matrix.json'), JSON.stringify(matrix, null, 2) + '\n');
const TaskSchema = z.object({ schemaVersion: z.literal(1), role: z.literal('QAAgent'), targetGame: z.literal('海滩渔货铺'), workspace: z.string(), ownership: z.array(z.string()), inputs: z.array(z.string()), instructions: z.array(z.string()), acceptance: z.array(z.string()), outputSchema: z.string() }).strict();
const task = TaskSchema.parse({
  schemaVersion: 1, role: 'QAAgent', targetGame: '海滩渔货铺', workspace,
  ownership: ['Read-only audit of simulation.ts, revision.ts and source-corresponding QA trace. No writes, builds, browser runs or report edits.'],
  inputs: [path.join(out,'triage.json'),path.join(out,'reproduction-matrix.json'),prior,path.join(workspace,'src/simulation.ts'),path.join(workspace,'src/revision.ts'),path.join(run,'artifacts/qa-retest-20261008/natural-attempt8-resume-20261009.mjs')],
  instructions: ['You are not alone in the codebase. Do not modify or revert any file. Do not load the full conversation or unrelated factory code.', 'Inspect processor input consumption, carried mixed product deposit, nearest station, orders and the failing Coral trace. Distinguish confirmed source behavior from inference. Assess whether the fixed natural script supplies processing input; recommend one minimal next natural route or formal repair if necessary.', 'Read only relevant source ranges and compact parsed trace fields, not the entire megabyte JSON output. Return JSON only, following outputSchema; do not free-chat.'],
  acceptance: ['Cite immutable current-source path/line and prior trace phase for each claim.', 'Recommend one evidence-backed next action; preserve all acceptance gates.', 'No game workspace or build mutation.'],
  outputSchema: '{schemaVersion:1,role:"QAAgent",targetGame:"海滩渔货铺",workspace:string,sourceEvidence:[{path:string,line:number,finding:string}],traceEvidence:[{phase:string,finding:string}],classification:"harness-route"|"product-defect"|"unresolved",hypothesis:string,nextAction:string,acceptanceChecks:string[]}',
});
fs.writeFileSync(path.join(out,'task-code-audit.json'), JSON.stringify(task,null,2)+'\n');
console.log(JSON.stringify({triage:'VALID',matrix:'VALID',task:'VALID',path:path.join(out,'task-code-audit.json')}));
