import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { CompletionGateReportSchema, evaluateCompletionGates, type CandidateBinding, type CompletionGateReport } from '../core/completion-gates.js';
import { HumanPlaytestAcceptanceSchema } from '../schemas/factory-operating.js';

async function existingFiles(runRoot: string, files: string[]) {
  const found: string[] = [];
  for (const file of files) {
    try { await access(path.join(runRoot, file)); found.push(file); } catch { /* evidence is missing */ }
  }
  return found;
}

export async function runVisualEvidenceGate(runRoot: string, screenshots: string[]) {
  const evidence = await existingFiles(runRoot, screenshots);
  return { passed: evidence.length >= 2, evidence: evidence.length ? evidence : ['screenshots:missing'] };
}

export async function runLevelDifferenceGate(runRoot: string) {
  const file = path.join(runRoot, 'artifacts/level-difference.json');
  try {
    const value = JSON.parse(await readFile(file, 'utf8')) as { passed?: unknown };
    return { passed: value.passed === true, evidence: ['artifacts/level-difference.json'] };
  } catch { return { passed: false, evidence: ['artifacts/level-difference.json:missing'] }; }
}

export async function readHumanPlaytestGate(runRoot: string, expectedCandidateHash?: string) {
  const file = path.join(runRoot, 'human/playtest-acceptance.json');
  try {
    const raw = JSON.parse(await readFile(file, 'utf8')) as unknown;
    const parsed = HumanPlaytestAcceptanceSchema.safeParse(raw);
    const value = raw && typeof raw === 'object' ? raw as { passed?: unknown; buildHash?: unknown } : {};
    const evidence = ['human/playtest-acceptance.json'];
    if (!parsed.success && expectedCandidateHash) evidence.push('human/playtest-acceptance.json:invalid-or-legacy');
    const passed = value.passed === true && (expectedCandidateHash === undefined || (parsed.success && parsed.data.buildHash === expectedCandidateHash));
    if (expectedCandidateHash !== undefined && (!parsed.success || parsed.data.buildHash !== expectedCandidateHash)) evidence.push('human/playtest-acceptance.json:candidate-hash-mismatch');
    return { passed, evidence, parsed: parsed.success ? parsed.data : undefined };
  } catch { return { passed: false, evidence: ['human/playtest-acceptance.json:missing'], parsed: undefined }; }
}

export async function buildCompletionGateReport(input: { runRoot: string; corePassed: boolean; normalFlowPassed: boolean; screenshots: string[]; candidateHash?: string; requireCandidateBinding?: boolean }): Promise<CompletionGateReport> {
  if (input.requireCandidateBinding && input.candidateHash === undefined) {
    throw new Error('candidate binding requires candidateHash');
  }
  const human = await readHumanPlaytestGate(input.runRoot, input.candidateHash);
  const candidateBinding: CandidateBinding | undefined = input.candidateHash === undefined && !input.requireCandidateBinding
    ? undefined
    : {
      passed: input.candidateHash !== undefined && human.passed && human.parsed?.buildHash === input.candidateHash,
      evidence: human.evidence,
      blockers: input.candidateHash === undefined
        ? ['candidate-binding-missing']
        : human.passed && human.parsed?.buildHash === input.candidateHash ? [] : ['candidate-hash-mismatch'],
    };
  return CompletionGateReportSchema.parse(evaluateCompletionGates({
    core: { passed: input.corePassed, evidence: ['artifacts/build-report.json'] },
    normalFlow: { passed: input.normalFlowPassed, evidence: ['artifacts/qa-report.json'] },
    visualEvidence: await runVisualEvidenceGate(input.runRoot, input.screenshots),
    levelDifference: await runLevelDifferenceGate(input.runRoot),
    humanPlaytest: { passed: human.passed, evidence: human.evidence },
  }, {
    ...(input.candidateHash ? { candidateHash: input.candidateHash } : {}),
    ...(candidateBinding ? { candidateBinding } : {}),
  }));
}
