import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TaskSchema } from '../apple-coordination-20261008/audit-schema';
const root = resolve('runs/mobile-slice-adaptation-20260830');
const out = resolve(root, 'apple-resume-20261009');
const prior = JSON.parse(await readFile(resolve(out, 'code-review-task.json'), 'utf8'));
const task = TaskSchema.parse({ ...prior, taskId: 'attempt18-frozen-code-review',
  fileScope: ['src/theme.ts', 'src/main.ts', 'src/style.css', 'tests/finish-transition-hud.test.ts'].map(p => resolve(root, 'workspace/apple-review-attempt18', p)).concat([resolve(out, 'attempt18-build-binding.json'), resolve(out, 'attempt18-triage.json')]),
  questions: ['Review only frozen attempt18 feedback changes. Does nearby anchor avoidance cover cap reveal? Check pop animation from below-fruit fallback, complete reward flight path/opacity and typography bounds, and danger tutorial safe dock. Identify evidence-backed causally connected defects and actual supported counterexamples. Default apple motion choice is settled: retain cap-reveal.', 'Return structured review only. Source reasoning and unit fixtures cannot certify natural/perceptual completion.'],
  outputPath: resolve(out, 'attempt18-code-review-result.json'),
  acceptanceCriteria: ['Exact frozen hashes and lines support all findings.', 'Source animation trajectories including fallback are reviewed.', 'No production, build, server, browser, or file writes. Return ResultSchema JSON only.'] });
await writeFile(resolve(out, 'attempt18-code-review-task.json'), JSON.stringify(task, null, 2) + '\n');
console.log(JSON.stringify({ validated: true, path: resolve(out, 'attempt18-code-review-task.json') }));
