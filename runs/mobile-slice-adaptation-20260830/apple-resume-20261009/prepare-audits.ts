import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TaskSchema } from '../apple-coordination-20261008/audit-schema';
const root = resolve('runs/mobile-slice-adaptation-20260830');
const workspace = resolve(root, 'workspace/prototype-a');
const out = resolve(root, 'apple-resume-20261009');
const common = {
  schemaVersion: 1, artifactType: 'apple-coordination-audit-task',
  targetGame: 'mobile-slice-adaptation-20260830', workspace, role: 'ReadOnlyQAAgent',
  constraints: [
    'Read-only audit: do not write any file, modify game code/tests, rebuild, launch browser/server, or message another chat. You are not alone; preserve other work.',
    'Exchange only structured artifacts. Return the JSON validated by ResultSchema from apple-coordination-20261008/audit-schema.ts in your final response; the parent persists it to outputPath.',
    'Do not claim completion or combine historical and current build evidence. Inspect actual geometry/transforms and distinguish them from nominal telemetry.',
  ],
};
const tasks = [
  {
    ...common, taskId: 'resume-motion',
    fileScope: [
      resolve(workspace, 'src/three-cut-visuals.ts'), resolve(workspace, 'src/food-cleave.ts'),
      resolve(workspace, 'tests/apple-cleave.test.ts'), resolve(workspace, 'tests/slice-alignment.test.ts'),
      resolve(root, 'apple-cut-refinement-20261003/prompt-draft-v2.md'),
      resolve(workspace, 'artifacts/apple-fix-20261008/triage.json'),
      resolve(root, 'apple-motion-audit-20261008/attempt16-motion-audit-report.json'),
    ],
    questions: [
      'Measure current default revealCaps actual settled relative quaternion angle and half displacement projected onto cut normal, diameter-normalized gap, and floor contact for the EXACT level1-reward-token (also compare rune-7 and gallery). Run an in-memory tsx probe if useful; no file writes.',
      'Is it geometrically possible to meet stored relative roll 6–14 degrees and cut-normal gap8–16%D while preserving current requirement that both opposing caps face the player? Identify conflicts that require a human preference; do not supersede the stored contract.',
      'Recommend minimal causally connected patch options with exact tests for honest actual-transform telemetry. Confirm raw-delta clock fix retained. Do not implement.',
    ],
    outputPath: resolve(out, 'motion-audit-result.json'),
    acceptanceCriteria: ['Use precise file/line and SHA256 evidence.', 'Distinguish gallery and exact default instance/state branches.', 'Return validated structured findings, recommendations and limitations.'],
  },
  {
    ...common, taskId: 'resume-capture',
    fileScope: [
      resolve(workspace, 'artifacts/apple-fix-20261008/qa-natural.ts'),
      resolve(root, 'apple-landscape-capture-20261008'), resolve(root, 'apple-input-search-20261008'),
      resolve(root, 'apple-independent-qa-20261008/attempt16-default-perceptual.json'),
      resolve(root, 'apple-coordination-20261008/evidence-binding-result.json'),
      resolve(workspace, 'scripts/qa-all-food-melon.ts'), resolve(workspace, 'src/three-world-renderer.ts'),
      resolve(workspace, 'src/main.ts'), resolve(workspace, 'src/renderer.ts'),
    ],
    questions: [
      'Identify best existing natural-input capture strategy for exact level1-reward-token intact→opening→settled→terminal→replay at1180x720,390x844,844x390. Give replayable normal-input schedule and which capture tool to reuse; no state injection allowed. Distinguish screenshot-time/state-sample binding from sibling fruit coverage.',
      'Locate player-visible +4 reward overlay owning code and minimal tested layout fix to avoid occluding apple opening on landscape. Propose exact viewport test and pixel acceptance, without implementation.',
      'Identify existing validated QA schemas, immutable build binding, trace frame recovery and default runtime entrypoints to reuse for independent perceptual handoff.',
    ],
    outputPath: resolve(out, 'capture-audit-result.json'),
    acceptanceCriteria: ['Evidence must identify exact target instance, renderer and viewport, with SHA256.', 'Recommendations must support natural inputs and same-build evidence.', 'Return validated structured findings, recommendations and limitations.'],
  },
];
for (const task of tasks) {
  const validated = TaskSchema.parse(task);
  const path = resolve(out, `${task.taskId}-task.json`);
  await writeFile(path, JSON.stringify(validated, null, 2) + '\n');
  TaskSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  console.log(JSON.stringify({path, zodValidated: true}));
}
