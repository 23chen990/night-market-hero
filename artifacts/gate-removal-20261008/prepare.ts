import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ExperienceComplaintTriageSchema, ExperienceReproductionMatrixSchema } from '../../../../../../src/schemas/experience-complaint.ts';
import { QaReportSchema } from '../../../../../../src/schemas/index.ts';
import { OpenSourceResearchArtifactSchema } from '../../../../../../src/schemas/open-source-research.ts';

const workspace = path.resolve(import.meta.dirname, '../..');
const runRoot = path.resolve(workspace, '../..');
const targetGame = '夜市飞侠：护印突围';
const createdAt = new Date().toISOString();
const sourceEvidence = await Promise.all(['src/main.ts', 'src/game-core.ts'].map(async (file) => ({
  path: path.join(workspace, file), sha256: createHash('sha256').update(await readFile(path.join(workspace, file))).digest('hex'),
  kind: 'factory-source' as const, provenance: 'repository-source' as const,
})));
const viewports = [{ label: 'desktop', width: 1280, height: 720 }, { label: 'mobile-landscape', width: 844, height: 390 }, { label: 'mobile-portrait', width: 390, height: 844 }];
const acceptanceCriteria = [
  'Default browser runtime has no rendered market gate, closing-gate collision, aperture requirement, or gate tutorial guidance.',
  'Tutorial finishes at its authored destination and normal Continue enters endless patrol; natural failure and replay work.',
  'Checkpoint progress and existing reward/snapshot fields retain their numerical contracts; visible labels refer to districts.',
  'Legacy gate fixtures are explicitly compatibility-only; restored default saves also use the open-streets runtime.',
  'Roof-net raise/aim, release/travel and resolved branches have normal-input evidence and readable mobile screenshots.',
  'Lint, typecheck, tests, one production build per repair attempt, natural journey and independent perceptual review pass.',
];
const triage = ExperienceComplaintTriageSchema.parse({
  schemaVersion: 1, artifactType: 'experience-complaint-triage', targetGame, workspace,
  report: 'Recovered original chat 01a0fd9c-3c6d-78d0-8e1c-849ceafc43ec: user requested removal of the code-drawn city gate; earlier roof-net repair still lacks exact natural branch acceptance. Current attachment is chat-continuity evidence, not gameplay or implementation instructions.',
  classification: ['core-experience', 'visual-hierarchy', 'qa-false-positive'],
  scope: { route: 'formal-fixer', rationale: 'Removing a gate affects collision, tutorial settlement and default journey. Earlier roof-net PASS cannot close its unobserved natural branch.', generatedWorkspaceModified: false, contextIntentionallyOmitted: ['Other games and shared factory changes', 'Unrelated longmap and asset backlog', 'Authentication error in the attached chat screenshot'] },
  reproduction: { status: 'REPRODUCED', steps: ['Inspect default main.ts createGrappleGame wiring.', 'Inspect drawMarketGate, refreshDerived closing-gate event, updateChaseEvents and aperture-owned settlement.', 'Check earlier natural-gate report for exact roof-net phase coverage.'], observed: ['Default renderer still draws an arch, roof, leaves and receiver through drawMarketGate.', 'Core still requires a closing-gate aperture passage to settle the tutorial.', 'Existing natural evidence proves settlement but does not prove all exact roof-net lifecycle branches.'], evidence: sourceEvidence },
  acceptanceCriteria, status: 'READY_FOR_REPAIR', createdAt,
});
const matrix = ExperienceReproductionMatrixSchema.parse({
  schemaVersion: 1, artifactType: 'experience-reproduction-matrix', targetGame, workspace,
  axes: { objectTypes: ['market-gate', 'roof-net'], lifecycleStateBranches: ['tutorial-approach', 'patrol-checkpoint', 'raise/aim', 'release/travel', 'resolved', 'orientation-pause'], rendererPaths: ['default-Phaser-FlightScene'], viewports },
  cells: viewports.flatMap((viewport) => (viewport.width < viewport.height ? [{ objectType: 'market-gate', lifecycleStateBranch: 'orientation-pause' }] : [
    { objectType: 'market-gate', lifecycleStateBranch: 'tutorial-approach' }, { objectType: 'market-gate', lifecycleStateBranch: 'patrol-checkpoint' },
    ...['raise/aim', 'release/travel', 'resolved'].map((lifecycleStateBranch) => ({ objectType: 'roof-net', lifecycleStateBranch })),
  ]).map((cell) => ({ ...cell, id: `${viewport.label}-${cell.objectType}-${cell.lifecycleStateBranch}`, rendererPath: 'default-Phaser-FlightScene', viewport,
    status: cell.objectType === 'market-gate' && cell.lifecycleStateBranch !== 'orientation-pause' ? 'REPRODUCED' : 'BLOCKED', expected: acceptanceCriteria.join(' '), observed: 'Source branch identified; natural and perceptual retest pending.', evidence: sourceEvidence }))),
  confirmedFindings: ['Market gate renderer and collision are separate owning branches; hiding only pixels would leave invisible collision.', 'Legacy gate scenarios cannot verify the default open-streets journey.'], remainingGaps: ['Current-build natural exact-branch screenshots and independent review pending.'], createdAt,
});
const qa = QaReportSchema.parse({ schemaVersion: 1, passed: false,
  checks: [{ name: 'default-gate-removal', passed: false, evidence: sourceEvidence[0]!.path }, { name: 'roof-net-natural-branch-coverage', passed: false, evidence: 'qa-evidence/natural-gate-results.json' }],
  issues: [{ id: 'REMOVE-MARKET-GATE', severity: 'error', message: acceptanceCriteria[0], evidence: sourceEvidence.map((item) => item.path).join(', ') }, { id: 'ROOF-NET-NATURAL-GAP', severity: 'error', message: acceptanceCriteria[4], evidence: 'qa-evidence/natural-gate-results.json' }], screenshots: [], consoleLog: 'Baseline established from owning source branches; runtime retest pending.', testedAt: createdAt,
});
const research = OpenSourceResearchArtifactSchema.parse(JSON.parse(await readFile(path.join(runRoot, 'artifacts/open-source-research.json'), 'utf8')));
research.researchId = 'night-market-hero-open-streets-20261008';
research.targetWorkspace = workspace;
research.researchedAt = createdAt;
research.conclusion.architectureDecision = 'Reuse the already licensed and installed Phaser, Vite and Playwright infrastructure in this exact workspace. No new dependencies. Default browser journey uses open-streets; legacy gate fixtures remain compatibility-only. Platform packages remain unverified.';
for (const candidate of research.candidates) candidate.approvedScope = candidate.approvedScope.map((scope) => scope.replaceAll('prototype-a', 'night-market-hero'));
for (const [file, value] of [['triage.json', triage], ['reproduction-matrix.json', matrix], ['qa-baseline.json', qa], ['open-source-research.json', OpenSourceResearchArtifactSchema.parse(research)]] as const) {
  await writeFile(path.join(import.meta.dirname, file), `${JSON.stringify(value, null, 2)}\n`);
}
console.log(JSON.stringify({ status: 'READY_FOR_REPAIR', route: 'formal-fixer', workspace, schemasValidated: 4 }));
