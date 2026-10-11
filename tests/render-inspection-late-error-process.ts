import { writeFile } from 'node:fs/promises';
import { collectCaseEvidence, collectionOutcome, type Telemetry } from './render-inspection-browser.ts';

const kind = process.env.LATE_ERROR_KIND === 'page' ? 'page' : process.env.LATE_ERROR_KIND === 'none' ? 'none' : 'console';
const reportPath = process.env.NEGATIVE_REPORT_PATH ?? `/tmp/render-inspection-late-${kind}.json`;
const telemetry: Telemetry = {
  artifactType: 'render-inspection-snapshot',
  seed: 20260919,
  mode: 'default',
  checkpoint: 'market-to-rooftops',
  checkpointLabel: 'market-to-rooftops',
  boundaryX: 8_000,
  camera: { left: 7_164, right: 8_836, panOffset: 0 },
  chunks: [],
  nightCity: {},
  components: {},
  requestedTextureKeys: [],
  loadedTextureKeys: [],
  loadFailures: [],
  v36Requested: { status: 'MEASURED', value: false },
  v36Visible: { status: 'NOT_MEASURED' },
  v36Drawn: { status: 'NOT_MEASURED' },
};
const consoleErrors: string[] = [];
const pageErrors: string[] = [];
const result = await collectCaseEvidence({
  mode: 'default',
  viewport: { id: '1280x720', width: 1_280, height: 720 },
  checkpoint: { id: 'market-to-rooftops' },
  telemetry,
  consoleErrors,
  pageErrors,
  capture: async () => {
    if (kind === 'console') consoleErrors.push('injected late console error');
    if (kind === 'page') pageErrors.push('injected late page error');
    return { screenshot: { path: '/tmp/fake.png', sha256: 'test-only' } };
  },
});
const outcome = collectionOutcome(result.errors);
const report = {
  schemaVersion: 1,
  artifactType: 'render-inspection-negative-timing-test',
  faultInjection: kind,
  phase: 'after telemetry, during bounded capture callback',
  caseErrors: result.evidence.collectionErrors,
  consoleErrors: result.evidence.consoleErrors,
  pageErrors: result.evidence.pageErrors,
  status: outcome.status,
  processExitCode: outcome.exitCode,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ reportPath, ...report }, null, 2));
process.exitCode = outcome.exitCode;
