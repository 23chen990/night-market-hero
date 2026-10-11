import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { z } from 'zod';
import { ExperienceComplaintTriageSchema, ExperienceReproductionMatrixSchema } from '../../../src/schemas/experience-complaint';
import { OpenSourceResearchArtifactSchema } from '../../../src/schemas/open-source-research';
import { ResultSchema } from '../apple-coordination-20261008/audit-schema';
const root = resolve('runs/mobile-slice-adaptation-20260830');
const workspace = resolve(root, 'workspace/prototype-a');
const out = resolve(root, 'apple-resume-20261009');
const bind = async (path: string) => ({ path, sha256: createHash('sha256').update(await readFile(path)).digest('hex') });
const researchPath = resolve(workspace, 'artifacts/apple-fix-20261008/open-source-research.json');
const research = OpenSourceResearchArtifactSchema.parse(JSON.parse(await readFile(researchPath, 'utf8')));
await writeFile(resolve(out, 'open-source-research.json'), JSON.stringify(research, null, 2) + '\n');
const choice = z.object({
  schemaVersion: z.literal(1), artifactType: z.literal('apple-human-motion-choice'),
  targetGame: z.literal('mobile-slice-adaptation-20260830'), workspace: z.literal(workspace),
  source: z.literal('current-user-question-reply'), answer: z.literal('保留新版，优先让两半切面清楚可见（推荐）'),
  adoptedBehavior: z.string(), supersededDefaultConstraints: z.array(z.string()),
  retainedConstraints: z.array(z.string()), selectedAt: z.string().datetime(),
}).strict().parse({
  schemaVersion: 1, artifactType: 'apple-human-motion-choice', targetGame: 'mobile-slice-adaptation-20260830', workspace,
  source: 'current-user-question-reply', answer: '保留新版，优先让两半切面清楚可见（推荐）',
  adoptedBehavior: 'Preserve the current default cap-reveal pose: both real sealed flesh caps face the player, thick hemispheres separate across the screen continuously after blade center crossing. Gallery keeps its existing authored camera/pose through the shared geometry and cut owner; report the presentation branches explicitly.',
  supersededDefaultConstraints: ['6–14 degree TOTAL relative rotation', '8–16%D cut-normal separation and no world-X separation'],
  retainedConstraints: ['Center crossing before split', 'Continuous 0.35–0.60 second motion and uncapped real animation time', 'Actual sealed cap geometry, crown ownership, hemisphere thickness', 'Both default caps readable without overlap/feedback occlusion', 'Grounding without hover/penetration and clean replay', 'Measured actual transforms; nominal sampler roll must not certify default motion', 'Existing gallery acceptance and shared source geometry/material/cut owner'],
  selectedAt: new Date().toISOString(),
});
await writeFile(resolve(out, 'human-motion-choice.json'), JSON.stringify(choice, null, 2) + '\n');
const motion = ResultSchema.parse({
  schemaVersion: 1, artifactType: 'apple-coordination-audit-result', taskId: 'resume-motion', targetGame: 'mobile-slice-adaptation-20260830', workspace, status: 'FAIL',
  findings: [
    { claim: 'Exact level1-reward-token and rune-7 engineering probes measured settled relative quaternion rotation 158.80567791591054 degrees; opening at0.24s already79.64610554580457 degrees. Existing roll reports nominal6degrees/half while default never applies frame.roll.', implication: 'Default telemetry is misleading; the human now approves the large cap-reveal pose, and actual relative quaternion angle must be reported.', evidence: [{ ...(await bind(resolve(workspace, 'src/three-cut-visuals.ts'))), line: 978 }] },
    { claim: 'Default root normal separation0.406135D, projected body X clearance0.037369D, and added geometry-center separation along cut normal0 are different quantities. Gallery settled quaternion relative angle12degrees; root-normal translation0.15D but actual normal surface clearance0.047529D.', implication: 'Report gap metric and branch explicitly; do not use default X clearance as the old normal-translation metric.', evidence: [{ ...(await bind(resolve(workspace, 'src/three-cut-visuals.ts'))), line: 1010 }] },
    { claim: 'Both opposing caps signed-facing score>0.65 requires relative rigid rotation>81.083degrees; no6–14degree pose can satisfy it. Reward-token fixture half minima4.34 equal shelf contact4.34; gallery minima0.25 equal table. Raw-delta clocks are retained; scoped16tests passed.', implication: 'Human preference resolves the art conflict; fixture contact and tests do not close natural/perceptual gates.', evidence: [{ ...(await bind(resolve(workspace, 'tests/apple-cleave.test.ts'))), line: 116 }, { ...(await bind(resolve(workspace, 'src/food-cleave.ts'))), line: 18 }] },
  ],
  recommendations: ['Keep approved revealCaps poses and expose measured relativeRotation and explicit gap metric/motion mode.', 'Test measurements against actual world quaternions for exact reward-token, rune-7 and gallery.', 'Retest normal input and pixels for exact reward-token at all three viewports; preserve existing attempt16 history.'],
  limitations: ['Condensed parent-persisted summary of the completed independent explorer JSON audit.', 'Engineering fixtures only; no browser/device/pixel proof. No source or files were changed by the auditor.'],
});
await writeFile(resolve(out, 'motion-audit-result.json'), JSON.stringify(motion, null, 2) + '\n');
const oldTriage = ExperienceComplaintTriageSchema.parse(JSON.parse(await readFile(resolve(root, 'apple-coordination-20261008/integration-triage.json'), 'utf8')));
const triage = ExperienceComplaintTriageSchema.parse({ ...oldTriage, report: 'Resume approved default apple cap-reveal presentation; repair actual-motion telemetry and move reward feedback away from the exact apple opening, then capture one coherent build at all three viewports.',
  scope: { ...oldTriage.scope, rationale: 'Existing validated apple QA issue and attempt16 remain open. User explicitly chose the current cap-reveal behavior; current chat is the serial Fixer owner. Minimal geometry-neutral telemetry/UI repair followed by exact-object natural/perceptual QA.', generatedWorkspaceModified: false },
  acceptanceCriteria: [...choice.retainedConstraints, 'All default screenshots and reports bind to one immutable current build; no old-build or sibling-object substitution.', 'Lint, typecheck, full tests and targeted Playwright checks pass.'], status: 'READY_FOR_REPAIR', createdAt: new Date().toISOString(),
  reproduction: { ...oldTriage.reproduction, evidence: [...oldTriage.reproduction.evidence, { ...(await bind(resolve(out, 'human-motion-choice.json'))), kind: 'user-report', provenance: 'verified-run-artifact' }] },
});
await writeFile(resolve(out, 'triage.json'), JSON.stringify(triage, null, 2) + '\n');
const oldMatrix = ExperienceReproductionMatrixSchema.parse(JSON.parse(await readFile(resolve(root, 'apple-coordination-20261008/integration-reproduction-matrix.json'), 'utf8')));
await writeFile(resolve(out, 'reproduction-matrix.json'), JSON.stringify(ExperienceReproductionMatrixSchema.parse({ ...oldMatrix, confirmedFindings: [...oldMatrix.confirmedFindings, 'Current user explicitly approved the large cap-reveal pose; the old default small-roll/gap limits are superseded only for that presentation branch.'], remainingGaps: triage.acceptanceCriteria, createdAt: new Date().toISOString() }), null, 2) + '\n');
const previous = JSON.parse(await readFile(resolve(workspace, 'artifacts/apple-fix-20261008/repair-state.json'), 'utf8'));
await writeFile(resolve(out, 'previous-repair-state.json'), JSON.stringify(previous, null, 2) + '\n');
const sources = ['src/three-cut-visuals.ts', 'src/food-cleave.ts', 'src/main.ts', 'src/theme.ts', 'src/style.css', 'tests/apple-cleave.test.ts', 'tests/finish-transition-hud.test.ts', 'dist/index.html', 'experiments/food-cleave/dist/index.html'];
const baseline = [];
for (const relative of sources) {
  const destination = resolve(out, 'baseline', relative); await mkdir(resolve(destination, '..'), { recursive: true });
  await copyFile(resolve(workspace, relative), destination); baseline.push({ relative, ...(await bind(destination)) });
}
const state = z.object({ schemaVersion: z.literal(1), targetGame: z.literal('mobile-slice-adaptation-20260830'), workspace: z.string(), role: z.literal('FixerAgent'), route: z.literal('formal-fixer'), attempt: z.number().int().positive(), previousAttempt: z.number().int().positive(), buildCount: z.number().int().nonnegative(), galleryBuildCount: z.number().int().nonnegative(), status: z.string(), predecessorThreadIds: z.array(z.string()), threadContinuity: z.string(), triagePath: z.string(), baseline: z.array(z.object({ relative: z.string(), path: z.string(), sha256: z.string() })), updatedAt: z.string().datetime() }).strict().parse({
  schemaVersion: 1, targetGame: 'mobile-slice-adaptation-20260830', workspace, role: 'FixerAgent', route: 'formal-fixer', attempt: previous.attempt + 1, previousAttempt: previous.attempt, buildCount: 0, galleryBuildCount: 0, status: 'TEST_FIRST', predecessorThreadIds: [previous.threadId, '01a11aaf-9004-74c3-933f-905ed71e0bf7'], threadContinuity: 'User explicitly requested continuation of referenced apple chat in current chat; its stored repair state is preserved, no separate user chat was created or messaged.', triagePath: resolve(out, 'triage.json'), baseline, updatedAt: new Date().toISOString(),
});
await writeFile(resolve(out, 'repair-state.json'), JSON.stringify(state, null, 2) + '\n');
console.log(JSON.stringify({ attempt: state.attempt, previousAttempt: state.previousAttempt, sources: sources.length, choice: 'cap-reveal', zodValidated: true }));
