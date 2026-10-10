const SCRIPT_PATH = 'reference-code/pkg/scripts/main/rules.lua';

export function referenceCodePackageFixture(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    artifactType: 'reference-code-package',
    packageId: 'pkg',
    targetGame: 'beach-game',
    workspace: '/tmp/run/workspace/game',
    requestedUrl: 'https://portal.example/game',
    finalUrl: 'https://portal.example/game',
    pageTitle: 'Reference portal',
    engine: 'defold',
    buildBaseUrl: 'https://cdn.example/build/archive/',
    downloads: [{ name: 'game.arcd', urls: ['https://cdn.example/build/archive/game.arcd0'], path: 'reference-code/pkg/raw/game.arcd', sha256: 'a'.repeat(64), bytes: 10 }],
    archive: { entryCount: 3, compressedCount: 1, encryptedCount: 0, unsafeNameCount: 0, scriptCount: 1 },
    scripts: [{ path: SCRIPT_PATH, originalName: 'main/rules.lua', sha256: 'b'.repeat(64), bytes: 20, lineCount: 10 }],
    status: 'READY',
    blockers: [],
    capturedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

export type CodeRefTarget = { path: string; sha256: string };

export function referenceCodeAnalysisFixture(input: {
  script?: CodeRefTarget;
  targetRunId?: string;
  targetGame?: string;
  workspace?: string;
  packageRef?: { evidenceId: string; indexPath: string; sha256: string };
} = {}) {
  const script = input.script ?? { path: SCRIPT_PATH, sha256: 'b'.repeat(64) };
  const ref = (startLine: number, endLine: number) => ({ script: script.path, sha256: script.sha256, startLine, endLine });
  return {
    schemaVersion: 1,
    artifactType: 'reference-code-analysis',
    targetRunId: input.targetRunId ?? 'run-1',
    targetGame: input.targetGame ?? 'beach-game',
    workspace: input.workspace ?? '/tmp/run/workspace/game',
    package: input.packageRef ?? { evidenceId: 'code-package-pkg', indexPath: 'reference-evidence/verified/code-package-pkg.json', sha256: 'c'.repeat(64) },
    coreLoop: [
      { step: 'Pay into a build site while standing still', claimIds: ['pay'] },
      { step: 'Carry goods from a producer to a shelf', claimIds: ['stock'] },
      { step: 'Collect coins from the checkout counter', claimIds: ['checkout'] },
    ],
    claims: [
      { id: 'pay', dimension: 'input_state', status: 'OBSERVED', statement: 'Standing still beside an unpaid site transfers a fraction of the remaining price on each tick.', codeRefs: [ref(1, 2)] },
      { id: 'stock', dimension: 'spatial_relation', status: 'OBSERVED', statement: 'Walking over a shelf moves carried goods onto it until it is full.', codeRefs: [ref(3, 4)] },
      { id: 'fail', dimension: 'failure_recovery', status: 'OBSERVED', statement: 'No failure state exists; an empty shelf only makes customers wait.', codeRefs: [ref(5, 6)] },
      { id: 'checkout', dimension: 'feedback_sequence', status: 'OBSERVED', statement: 'Coins stack at the counter after a customer is served.', codeRefs: [ref(7, 8)] },
      { id: 'end', dimension: 'terminal_replay', status: 'INFERRED', statement: 'Buying the final site opens the next store instead of ending the run.', codeRefs: [ref(9, 10)] },
    ],
    reuseBoundary: { mechanicsOnly: true, noCodeCopied: true, noAssetsCopied: true, noNamesOrUiCopied: true, noTuningValuesCopied: true },
    analyst: 'codex-main',
    analyzedAt: new Date(0).toISOString(),
  };
}
