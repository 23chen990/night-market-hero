import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { ExperienceComplaintTriageSchema, ExperienceReproductionMatrixSchema } from '../../../src/schemas/experience-complaint';
const root = resolve('runs/mobile-slice-adaptation-20260830'), out = resolve(root, 'apple-resume-20261009');
const old = JSON.parse(await readFile(resolve(out, 'repair-state.json'), 'utf8'));
await mkdir(resolve(out, 'attempt17'), { recursive: true });
await writeFile(resolve(out, 'attempt17/repair-state.json'), JSON.stringify({ ...old, status: 'QA_BLOCKED', remainingBlockers: ['Landscape anchor feedback and center danger tutorial overlap exact apple late-opening/settled pixels.', 'Desktop input path did not exercise target center.', 'Six unrelated baseline physics/level tests fail.'] }, null, 2) + '\n');
const bind = async (path: string) => ({ path, sha256: createHash('sha256').update(await readFile(path)).digest('hex'), kind: 'runtime-capture' as const, provenance: 'verified-run-artifact' as const });
const triage = ExperienceComplaintTriageSchema.parse(JSON.parse(await readFile(resolve(out, 'triage.json'), 'utf8')));
const evidence = [await bind(resolve(out, 'qa/capture1/landscape/apple-settled.png')), await bind(resolve(out, 'qa/capture1/landscape/continuous-frames/frame-10.png'))];
const next = ExperienceComplaintTriageSchema.parse({ ...triage, report: 'Exact landscape reward-token cap reveal is still obscured by anchor feedback and the large center tutorial; keep approved geometry/rotation and move those visual messages outside gameplay.',
  reproduction: { status: 'REPRODUCED', steps: ['Play fixed attempt17 default using normal touchscreen at844x390.', 'Inspect continuous late-opening frame10 and settled screenshot.'], observed: ['Reward+4 is clear of target; anchored message follows the blade onto the cap.', 'Center danger tutorial covers both exact reward-token halves at their first settled frame.'], evidence },
  acceptanceCriteria: [...triage.acceptanceCriteria, 'Anchor feedback at the apple shelf cannot cover the opening cap; tutorial stays readable in a safe viewport edge region without covering the exact target.'], createdAt: new Date().toISOString(), status: 'READY_FOR_REPAIR' });
await writeFile(resolve(out, 'attempt18-triage.json'), JSON.stringify(next, null, 2) + '\n');
const matrix = ExperienceReproductionMatrixSchema.parse(JSON.parse(await readFile(resolve(out, 'reproduction-matrix.json'), 'utf8')));
await writeFile(resolve(out, 'attempt18-reproduction-matrix.json'), JSON.stringify(ExperienceReproductionMatrixSchema.parse({ ...matrix, cells: matrix.cells.map(c => ({ ...c, status: c.viewport.label === 'landscape' && ['opening', 'settled'].includes(c.lifecycleStateBranch) ? 'REPRODUCED' : 'BLOCKED', observed: c.viewport.label === 'landscape' ? 'Attempt17 exact-object natural frames confirm anchor/tutorial occlusion; reward+4 alone is fixed.' : 'New same-build natural/perceptual evidence required.', evidence: c.viewport.label === 'landscape' ? evidence : [] })), remainingGaps: next.acceptanceCriteria, createdAt: new Date().toISOString() }), null, 2) + '\n');
await writeFile(resolve(out, 'repair-state.json'), JSON.stringify({ ...old, attempt: 18, previousAttempt: 17, buildCount: 0, galleryBuildCount: 0, status: 'TEST_FIRST', triagePath: resolve(out, 'attempt18-triage.json'), distinctHypothesis: 'Move incidental anchor labels off nearby apple projection and dock tutorial at the lower viewport edge; no geometry or gameplay change.' }, null, 2) + '\n');
console.log(JSON.stringify({ attempt: 18, previousAttempt: 17, evidencePreserved: true }));
