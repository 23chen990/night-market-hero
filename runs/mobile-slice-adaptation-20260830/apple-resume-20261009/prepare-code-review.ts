import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TaskSchema } from '../apple-coordination-20261008/audit-schema';
const root = resolve('runs/mobile-slice-adaptation-20260830'), out = resolve(root, 'apple-resume-20261009');
const workspace = resolve(root, 'workspace/prototype-a');
const task = TaskSchema.parse({ schemaVersion: 1, artifactType: 'apple-coordination-audit-task', taskId: 'attempt17-code-review', targetGame: 'mobile-slice-adaptation-20260830', workspace, role: 'ReadOnlyQAAgent',
  fileScope: ['src/main.ts', 'src/theme.ts', 'src/style.css', 'src/three-cut-visuals.ts', 'tests/apple-cleave.test.ts', 'tests/finish-transition-hud.test.ts'].map(p => resolve(root, 'workspace/apple-review-attempt17', p)).concat([resolve(out, 'human-motion-choice.json'), resolve(out, 'red-tests.log'), resolve(out, 'targeted-tests.log'), resolve(out, 'triage.json')]),
  questions: ['Read-only review of frozen attempt17 actual relative rotation telemetry and reward-pop/reward-flight origins: do they preserve user-approved reveal pose and center gate, and keep both reward labels outside apple reveal bounds at desktop/portrait/landscape? Check CSS animation path, top-edge fallback and existing test evidence. Identify actionable defects only.', 'Check causally connected changes only; no source writes. State natural/perceptual gaps. This is an independent code review, not completion.'],
  constraints: ['You are not alone; preserve others work. Read-only, no file writes or browser/server/build.', 'Return only ResultSchema validated JSON from apple-coordination-20261008/audit-schema.ts; parent persists outputPath.', 'Current canonical workspace may drift; inspect the frozen review paths in fileScope.'],
  outputPath: resolve(out, 'code-review-result.json'), acceptanceCriteria: ['Actual transforms versus sampler intent and both DOM reward origins reviewed.', 'File hashes and lines substantiate findings.', 'No completion from unit tests or fixtures.'] });
await writeFile(resolve(out, 'code-review-task.json'), JSON.stringify(task, null, 2) + '\n');
console.log(JSON.stringify({validated: true, taskId: task.taskId}));
