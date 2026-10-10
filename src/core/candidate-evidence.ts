import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { QaReportSchema } from '../schemas/index.js';
import { hashRunBuild } from './release.js';
import { RuntimeProductGateSchema, deriveRuntimeProductGate, verifyRuntimeWiredFiles } from './runtime-product-gates.js';

/** Verify current bytes and natural-play evidence before reporting a product candidate. */
export async function readRuntimeCandidateEvidence(runRoot: string) {
  const blockers: string[] = [];
  const evidence = ['artifacts/qa-report.json', 'artifacts/runtime-product-gates.json'];
  const read = async (name: string) => JSON.parse(await readFile(path.join(runRoot, 'artifacts', name), 'utf8')) as unknown;
  let buildHash: string | undefined;
  try { buildHash = await hashRunBuild(runRoot); } catch { blockers.push('current-build-missing-or-invalid'); }
  const runtime = RuntimeProductGateSchema.safeParse(await read('runtime-product-gates.json').catch(() => undefined));
  const qa = QaReportSchema.safeParse(await read('qa-report.json').catch(() => undefined));
  if (!runtime.success || !runtime.data.passed) blockers.push('runtime-product-missing-or-failed');
  if (runtime.success) {
    if (!buildHash || runtime.data.buildHash !== buildHash) blockers.push('runtime-product-build-mismatch');
    const wiring = await verifyRuntimeWiredFiles({ runRoot, files: runtime.data.runtimeWiredFiles });
    if (!wiring.passed) blockers.push(...wiring.blockers.map(item => `runtime-wiring:${item}`));
    const browser = await verifyRuntimeWiredFiles({ runRoot, files: runtime.data.browserEvidence });
    if (!browser.passed) blockers.push('runtime-browser-evidence-missing');
  }
  if (!qa.success || !qa.data.passed) blockers.push('qa-missing-or-failed');
  const natural = qa.success ? qa.data.naturalFlow : undefined;
  if (!natural?.passed || natural.blockers.length > 0) blockers.push('natural-flow-missing-or-failed');
  if (!buildHash || natural?.buildHash !== buildHash) blockers.push('natural-flow-build-mismatch');
  if (runtime.success && natural) {
    try {
      const current = deriveRuntimeProductGate({ naturalFlow: natural, runtimeWiredFiles: runtime.data.runtimeWiredFiles, browserEvidence: runtime.data.browserEvidence, currentBuildHash: buildHash });
      if (!current.passed) blockers.push('current-natural-journey-incomplete');
    } catch { blockers.push('current-natural-journey-invalid'); }
  }
  return { passed: blockers.length === 0, evidence, blockers, buildHash };
}
