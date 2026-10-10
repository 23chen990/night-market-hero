/** Run-local operator bridge. All stage, artifact, runtime and QA checks stay in createFactory. */
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { createFactory } from '../../../src/factory.js';
import { CodexAccountProvider, type CodexExecutor } from '../../../src/providers/codex-account.js';
import { CodexCliProvider, assertCodexWorkingDirectory } from '../../../src/providers/codex-cli.js';
import { packageForStage } from '../../../src/agents/packages.js';
import { ReferenceBehaviorAnalysisSchema } from '../../../src/schemas/reference-evidence.js';
import { resolveReferenceResearchForImplementation } from '../../../src/core/reference-resolution.js';
import { NativeRequestSchema, NativeReceiptSchema, validateNativeReceipt } from './native-handoff.js';

const runId = '20260918104154-974ee21f';
const root = process.cwd();
const runRoot = path.join(root, 'runs', runId);
const handoffDir = path.join(runRoot, 'artifacts/regeneration-20260918/handoffs');
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const json = async (file: string) => JSON.parse(await readFile(file, 'utf8')) as unknown;
const inRun = (file: string) => {
  const full = path.resolve(runRoot, file);
  const relative = path.relative(runRoot, full);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Path outside target run: ${file}`);
  return full;
};
const cli = new CodexCliProvider();
const executor: CodexExecutor = {
  assertChatGptLogin: () => cli.assertChatGptLogin(),
  async execute(request) {
    assertCodexWorkingDirectory(request);
    if (path.resolve(request.runRoot ?? '') !== runRoot) throw new Error('Foreign run request');
    await mkdir(handoffDir, { recursive: true });
    const requestId = `${request.stage}-${randomUUID()}`;
    const requestFile = path.join(handoffDir, `${requestId}.request.json`);
    const receiptPath = path.join(handoffDir, `${requestId}.receipt.json`);
    const ticket = NativeRequestSchema.parse({ schemaVersion: 1, requestId, runId, stage: request.stage, model: request.model,
      package: packageForStage(request.stage!), cwd: request.cwd, runRoot, outputPath: request.outputPath,
      receiptPath, prompt: request.prompt, ...(request.outputSchema ? { outputSchema: request.outputSchema } : {}),
      ...(request.resumeThreadId ? { resumeThreadId: request.resumeThreadId } : {}), createdAt: new Date().toISOString() });
    await writeFile(requestFile, `${JSON.stringify(ticket, null, 2)}\n`, { flag: 'wx' });
    console.log(JSON.stringify({ event: 'native-handoff-requested', requestPath: requestFile, stage: ticket.stage }));
    const deadline = Date.now() + 1_800_000;
    while (Date.now() < deadline) {
      const stat = await lstat(receiptPath).catch(() => undefined);
      if (stat) {
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Receipt must be a regular file');
        const raw = NativeReceiptSchema.parse(await json(receiptPath));
        const outputFile = inRun(raw.outputPath);
        const outputStat = await lstat(outputFile);
        if (!outputStat.isFile() || outputStat.isSymbolicLink()) throw new Error('Native output must be a regular file');
        const bytes = await readFile(outputFile, 'utf8');
        const receipt = validateNativeReceipt(ticket, raw, hash(bytes));
        const output = JSON.parse(bytes) as unknown;
        await writeFile(inRun(request.outputPath), bytes);
        const event = { type: 'native.subagent.completed', requestId, stage: ticket.stage, agentId: receipt.agentId, model: receipt.model, outputSha256: receipt.sha256, usageAvailable: false };
        await writeFile(path.join(handoffDir, `${requestId}.completion.json`), `${JSON.stringify(event, null, 2)}\n`);
        // CodexExecutor requires a usage-shaped transport field. The provider
        // wrapper below removes it, since native token usage is unavailable.
        return { output, threadId: receipt.agentId, attempts: 1, completed: true, failed: false, events: [event], errors: [], usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, stdout: JSON.stringify(event), stderr: '' };
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Native handoff timed out: ${requestId}`);
  },
};

const account = new CodexAccountProvider(executor);
const provider = new Proxy(account, {
  get(target, key, receiver) {
    const member = Reflect.get(target, key, receiver) as unknown;
    if (typeof member !== 'function') return member;
    return async (...args: unknown[]) => {
      const result = await Reflect.apply(member, target, args);
      if (result?.metrics) {
        result.metrics = { provider: 'codex-native-subagent', model: 'gpt-5.6-luna', calls: result.metrics.calls };
      }
      if (key === 'analyzeReferenceEvidence') {
        const analysis = ReferenceBehaviorAnalysisSchema.parse(result.value);
        const rawPath = 'artifacts/reference-behavior-analysis.raw.json';
        await writeFile(inRun(rawPath), `${JSON.stringify(analysis, null, 2)}\n`);
        const manifestPath = 'artifacts/reference-frame-manifest.json';
        const seedPath = 'input/seed.yaml';
        const seed = parseYaml(await readFile(inRun(seedPath), 'utf8'));
        const resolved = resolveReferenceResearchForImplementation({ analysis, reference: seed.referenceMechanics,
          frameManifest: await json(inRun(manifestPath)), frameManifestSource: { path: manifestPath, sha256: hash(await readFile(inRun(manifestPath))) },
          sourceAnalysis: { path: rawPath, sha256: hash(await readFile(inRun(rawPath))) },
          humanLock: { path: seedPath, sha256: hash(await readFile(inRun(seedPath))) } });
        await writeFile(inRun('artifacts/reference-research-resolution.json'), `${JSON.stringify(resolved.resolution, null, 2)}\n`);
        result.value = resolved.analysis;
      }
      return result;
    };
  },
});

const factory = createFactory({ root, repositoryRoot: root, mode: 'codex-account', validationMode: 'production',
  codexExecutor: executor, agentProvider: provider, codexProvider: provider });
const state = await factory.resume(runId);
console.log(JSON.stringify({ event: 'factory-native-returned', stage: state.stage, status: state.status, failureReason: state.failureReason }));
