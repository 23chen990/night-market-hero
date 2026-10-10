import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { BuilderAgent } from '../../../src/agents/index.js';
import { CodexCliProvider } from '../../../src/providers/codex-cli.js';
import { WebLiteRuntimeAdapter } from '../../../src/adapters/web-lite.js';
import { readJson, writeJsonAtomic, sha256File, sha256Text, listFiles, exists } from '../../../src/core/files.js';
import { RunWorkerResultSchema, RunWorkerTaskSchema } from './coordination-schema.js';

const runId = '20260918104154-974ee21f';
const root = process.cwd();
const runRoot = path.join(root, 'runs', runId);
const dir = path.join(runRoot, 'artifacts/regeneration-20260918');
const workspace = path.join(runRoot, 'workspace/game');
// Captures are immutable and can be reviewed while the next candidate builds.
// Their existence is capture completion, never a claim of independent QA approval.
const qaPath = path.join(dir, 'independent-qa/actual-qa-v1-result.json');
if (await exists(qaPath)) {
  const qa = RunWorkerResultSchema.parse(await readJson(qaPath));
  if (qa.targetRunId !== runId || qa.workspace !== workspace) throw new Error('QA target mismatch');
}
const snapshot = await readJson(path.join(dir, 'build-v1-snapshot.json')) as { buildHash: string; snapshotHash: string };
if (snapshot.snapshotHash !== snapshot.buildHash) throw new Error('Prior build is not preserved');
const capturePaths = [
  'replay/desktop-1100x720/case-report.json',
  'replay/mobile-390x844/case-report.json',
  'successful-course/mobile-430x932/case-report.json',
  'successful-course/mobile-landscape-844x390/case-report.json',
].map((file) => path.join(dir, 'independent-qa/actual-v1', file));
for (const capture of capturePaths) await readJson(capture);
await writeJsonAtomic(path.join(dir, 'qa-v1-capture-boundary.json'), { schemaVersion: 1, targetRunId: runId, buildHash: snapshot.buildHash, capturePaths, capturedBeforePreviewChangeAt: new Date().toISOString(), independentReview: 'report pending; use archived captures, never the upcoming candidate' });
const repair = RunWorkerResultSchema.parse(await readJson(path.join(dir, 'rail-fix-1-result.json')));
if (repair.status !== 'READY' || repair.targetRunId !== runId || repair.workspace !== workspace) throw new Error('Repair is not source-ready');
for (const artifact of repair.artifacts) {
  if (artifact.sha256 && await sha256File(path.resolve(runRoot, artifact.path)) !== artifact.sha256) throw new Error(`Repair hash mismatch: ${artifact.path}`);
}
const ledgerFile = path.join(dir, 'repair-attempt-ledger.json');
const ledger = await readJson(ledgerFile) as { attempts: Array<{ attempt: number; status: string; buildCount: number; independentRetest: string; buildHash?: string; builtAt?: string; error?: string }> };
const attempt = ledger.attempts.at(-1);
if (!attempt || attempt.attempt !== 1 || attempt.buildCount !== 0) throw new Error('Repair attempt 1 must have no prior rebuild');
const run = promisify(execFile);
const lint = await run(path.join(root, 'node_modules/.bin/eslint'), ['--no-ignore', 'src'], { cwd: workspace });
await writeJsonAtomic(path.join(dir, 'repair-1-lint-execution.json'), { command: 'eslint --no-ignore src', cwd: workspace, exitCode: 0, stdout: lint.stdout, stderr: lint.stderr, executedAt: new Date().toISOString() });
attempt.status = 'BUILDING';
attempt.buildCount = 1;
await writeJsonAtomic(ledgerFile, ledger);
try {
  // verifyExisting never invokes the provider; only the native agent authored the patch.
  const builder = new BuilderAgent(new CodexCliProvider(), new WebLiteRuntimeAdapter(root));
  const { report } = await builder.verifyExisting(workspace, 'cut-stack-dodge-v1', '/root/luna_fubian_builder', 'full');
  await writeJsonAtomic(path.join(dir, 'candidate-build-report-v2.json'), report);
  const dist = path.join(workspace, 'dist');
  const files = await listFiles(dist);
  const fileHashes = await Promise.all(files.map(async (file) => ({ path: file, sha256: await sha256File(path.join(dist, file)) })));
  const buildHash = sha256Text(fileHashes.map((file) => `${file.path}:${file.sha256}`).join('\n'));
  await writeJsonAtomic(path.join(dir, 'build-v2.json'), { targetRunId: runId, workspace, previewUrl: 'http://127.0.0.1:5198/', buildHash, files: fileHashes, builtAt: report.builtAt, factoryHandoffStatus: 'previous-native-request-timed-out; no stale completion receipt written', independentQaStatus: 'PENDING' });
  attempt.status = 'AWAITING_QA';
  attempt.buildHash = buildHash;
  attempt.builtAt = report.builtAt;
  await writeJsonAtomic(ledgerFile, ledger);
  const base = RunWorkerTaskSchema.parse(await readJson(path.join(dir, 'actual-qa-v1-task.json')));
  const task = RunWorkerTaskSchema.parse({ ...base, taskId: 'luna_fubian_actual_qa_v2',
    inputs: [...base.inputs, { path: path.join(dir, 'build-v2.json'), schema: 'actual-build-manifest' }, { path: path.join(dir, 'qa-rail-v1.json'), schema: 'QaReportSchema' }, { path: path.join(dir, 'rail-matrix.json'), schema: 'ExperienceReproductionMatrixSchema' }, { path: path.join(dir, 'rail-fix-1-result.json'), schema: 'RunWorkerResultSchema' }],
    instructions: [
      'You remain independent QAAgent. You are not alone; modify only your QA evidence directory, never game/shared source. Reuse your already inspected contracts and reference evidence.',
      `Repair attempt1 has rebuilt exactly once. Actual v2 at http://127.0.0.1:5198/ has build hash ${buildHash}. Verify hash, fresh browser and normal input only. Old v1 evidence remains preserved; do not relabel it as v2.`,
      'Retest opening support and bounded gap with natural screenshots at1100x720 and390x844. Observe exact intact target branch, physical gap crossing, failure cause, successful course, settlement and one-input replay. Use your existing normal-input harness/read-only observation tools; no state injection, virtual time, test-hook actions or internal events.',
      'Cover360x800,430x932 and844x390 input/readability with concise fresh normal-input sessions. Capture actual cut-contact/aftermath frames if possible; unobserved exact branches stay BLOCKED. Do not run redundant large matrices once a blocker is proven; report it with evidence. Screenshot sampling can be tightened around observed live events, but never create expected observations.',
      'Inspect actual captured pixels with view_image, including desktop and mobile rail/gap and branch evidence. Produce validated RunWorkerResultSchema, ReferenceFidelityReviewSchema and ExperienceReproductionMatrixSchema in a new actual-v2 directory, plus a QaReportSchema with confirmed error issues. You may close only the exact opening-rail-truncated issue if natural/perceptual evidence demonstrates it. All remaining fidelity/core blockers must be explicit.',
      'Write a conservative runtime-product gate listing actual wired entrypoints. The basic journey can be observed while product acceptance remains BLOCKED by exact branch/perceptual gaps. Human play approval remains pending. Do not claim completed factory FULL_BUILD/FIX or platform readiness: its initial native request timed out, and no fake receipt is allowed.',
      'Keep this retest bounded to the repaired candidate and produce the result after captured attempts. Final communication only structured artifact pointers.',
    ], outputPath: path.join(dir, 'independent-qa/actual-qa-v2-result.json'),
  });
  await writeJsonAtomic(path.join(dir, 'actual-qa-v2-task.json'), task);
  console.log(JSON.stringify({ buildHash, reportPath: path.join(dir, 'candidate-build-report-v2.json'), taskPath: path.join(dir, 'actual-qa-v2-task.json') }));
} catch (error) {
  attempt.status = 'BUILD_FAILED';
  attempt.error = String(error);
  await writeJsonAtomic(ledgerFile, ledger);
  throw error;
}
