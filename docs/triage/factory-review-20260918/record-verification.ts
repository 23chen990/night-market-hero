import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { sha256File } from '../../../src/core/files.js';
import { FactoryRepairResultSchema } from './coordination-schema.js';

const directory = 'docs/triage/factory-review-20260918';
const stamp = new Date().toISOString().replaceAll(/[:.]/gu, '-');
const logDirectory = `${directory}/verification-${stamp}`;
await mkdir(logDirectory, { recursive: true });
const testResults = `${logDirectory}/vitest-results.json`;
const commands = [
  { id: 'lint', args: ['lint'] },
  { id: 'typecheck', args: ['typecheck'] },
  { id: 'tests', args: ['test', '--reporter=json', '--outputFile', testResults] },
  { id: 'historical-regression', args: ['exec', 'tsx', `${directory}/verify-historical-evidence.ts`] },
];
const CommandResultSchema = z.object({
  command: z.string().min(1),
  exitCode: z.number().int(),
  durationMs: z.number().nonnegative(),
  log: z.string().min(1),
  sha256: z.string().length(64),
}).strict();
const results: z.infer<typeof CommandResultSchema>[] = [];
for (const command of commands) {
  const started = Date.now();
  console.log(`START pnpm ${command.args.join(' ')}`);
  const outcome = await new Promise<{ exitCode: number; output: string }>((resolve) => {
    const child = spawn('pnpm', command.args, { cwd: process.cwd(), env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (bytes: Buffer) => { output += bytes.toString(); });
    child.stderr.on('data', (bytes: Buffer) => { output += bytes.toString(); });
    child.on('error', (error) => resolve({ exitCode: 1, output: `${output}\n${error.message}` }));
    child.on('close', (code) => resolve({ exitCode: code ?? 1, output }));
  });
  const log = `${logDirectory}/${command.id}.log`;
  await writeFile(log, outcome.output);
  results.push(CommandResultSchema.parse({ command: `pnpm ${command.args.join(' ')}`, exitCode: outcome.exitCode, durationMs: Date.now() - started, log, sha256: await sha256File(log) }));
  console.log(`END ${command.id}: exit ${outcome.exitCode}, ${Date.now() - started} ms`);
}
const workerReports = await Promise.all(['luna-provider-result.json', 'luna-image-result.json', 'luna-profile-result.json', 'luna-bound-evidence-result.json'].map(async (name) => {
  const file = `${directory}/${name}`;
  const report = FactoryRepairResultSchema.parse(JSON.parse(await readFile(file, 'utf8')));
  return { taskId: report.taskId, status: report.status, path: file, sha256: await sha256File(file), filesChanged: report.filesChanged };
}));
const files = [...new Set(workerReports.flatMap((report) => report.filesChanged))].filter((file) => file.startsWith('src/') || file.startsWith('tests/'));
const sources = await Promise.all(files.sort().map(async (file) => ({ path: file, sha256: await sha256File(file) })));
let testSummary: { total: number; passed: number; failed: number; pending: number; success: boolean } | null = null;
try {
  const summary = z.object({ numTotalTests: z.number(), numPassedTests: z.number(), numFailedTests: z.number(), numPendingTests: z.number(), success: z.boolean() }).parse(JSON.parse(await readFile(testResults, 'utf8')));
  testSummary = { total: summary.numTotalTests, passed: summary.numPassedTests, failed: summary.numFailedTests, pending: summary.numPendingTests, success: summary.success };
} catch { /* The command exit code and log retain runner failures. */ }
const statePath = 'runs/20260918071718-974ee21f/state.json';
const state = z.object({ runId: z.string(), stage: z.string(), status: z.string(), failureReason: z.string().nullable() }).parse(JSON.parse(await readFile(statePath, 'utf8')));
const passed = results.every((result) => result.exitCode === 0) && testSummary?.success === true && workerReports.every((report) => report.status === 'IMPLEMENTED');
const report = z.object({
  schemaVersion: z.literal(1),
  scope: z.literal('shared-factory'),
  outcome: z.enum(['PASS', 'FAIL']),
  checkedAt: z.string().datetime(),
  commands: z.array(CommandResultSchema),
  testSummary: z.object({ total: z.number(), passed: z.number(), failed: z.number(), pending: z.number(), success: z.boolean() }).nullable(),
  workerReports: z.array(z.object({ taskId: z.string(), status: z.enum(['IMPLEMENTED', 'BLOCKED']), path: z.string(), sha256: z.string().length(64), filesChanged: z.array(z.string()) })),
  sources: z.array(z.object({ path: z.string(), sha256: z.string().length(64) })),
  historicalRegression: z.object({ path: z.string(), sha256: z.string().length(64) }),
  productionRun: z.object({ runId: z.string(), stage: z.string(), status: z.string(), failureReason: z.string().nullable(), statePath: z.string(), stateSha256: z.string().length(64), resumed: z.literal(false) }),
  gameQualityAccepted: z.literal(false),
  limitations: z.array(z.string()),
}).strict().parse({
  schemaVersion: 1,
  scope: 'shared-factory',
  outcome: passed ? 'PASS' : 'FAIL',
  checkedAt: new Date().toISOString(),
  commands: results,
  testSummary,
  workerReports,
  sources,
  historicalRegression: { path: `${directory}/historical-gate-verification.json`, sha256: await sha256File(`${directory}/historical-gate-verification.json`) },
  productionRun: { ...state, statePath, stateSha256: await sha256File(statePath), resumed: false },
  gameQualityAccepted: false,
  limitations: [
    'Factory integration uses explicit Mock providers and synthetic QA artifacts; it does not prove actual player experience.',
    'The production run was not resumed; its last stored failure is the BLUEPRINT provider usage limit.',
    'Real candidate natural input, visible failure/replay, independent perceptual review and live image alpha/compositing remain required.',
    'The six legacy action engineering metrics are not a complete cut/support/hazard gameplay acceptance suite; line-specific runtime QA remains required.',
    'This round does not establish WeChat, Douyin or TapTap package readiness.',
  ],
});
await writeFile(path.join(logDirectory, 'verification.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(`${directory}/verification.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ outcome: report.outcome, testSummary, reportPath: `${directory}/verification.json` }, null, 2));
if (!passed) process.exitCode = 1;
