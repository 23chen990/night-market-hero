import { describe, expect, it } from 'vitest';
import { ReferenceCodeAnalysisSchema, ReferenceCodePackageSchema } from '../../src/schemas/reference-code.js';
import { referenceCodeAnalysisFixture, referenceCodePackageFixture } from '../fixtures/reference-code.js';

describe('reference code package schema', () => {
  it('accepts a READY package whose files stay inside its own package directory', () => {
    expect(ReferenceCodePackageSchema.parse(referenceCodePackageFixture()).status).toBe('READY');
  });

  it('rejects files outside the package directory', () => {
    const escaped = referenceCodePackageFixture({ scripts: [{ path: 'reference-code/other/scripts/a.lua', originalName: 'a.lua', sha256: 'b'.repeat(64), bytes: 1, lineCount: 1 }] });
    expect(ReferenceCodePackageSchema.safeParse(escaped).success).toBe(false);
  });

  it('rejects a READY package without an engine, archive summary or scripts', () => {
    expect(ReferenceCodePackageSchema.safeParse(referenceCodePackageFixture({ scripts: [] })).success).toBe(false);
    expect(ReferenceCodePackageSchema.safeParse(referenceCodePackageFixture({ engine: null })).success).toBe(false);
    expect(ReferenceCodePackageSchema.safeParse(referenceCodePackageFixture({ archive: null })).success).toBe(false);
  });

  it('requires blockers on a BLOCKED package', () => {
    const blocked = referenceCodePackageFixture({ status: 'BLOCKED', engine: null, buildBaseUrl: null, archive: null, scripts: [], downloads: [] });
    expect(ReferenceCodePackageSchema.safeParse(blocked).success).toBe(false);
    expect(ReferenceCodePackageSchema.parse({ ...blocked, blockers: ['engine-not-detected'] }).status).toBe('BLOCKED');
  });

  it('rejects package ids that are not safe directory names', () => {
    expect(ReferenceCodePackageSchema.safeParse(referenceCodePackageFixture({ packageId: '../pkg' })).success).toBe(false);
  });
});

describe('reference code analysis schema', () => {
  it('accepts claims that cite script hashes and line ranges for every behavior dimension', () => {
    expect(ReferenceCodeAnalysisSchema.parse(referenceCodeAnalysisFixture()).claims).toHaveLength(5);
  });

  it('keeps tuning values out of claim statements', () => {
    const analysis = referenceCodeAnalysisFixture();
    analysis.claims[0]!.statement = 'Standing still transfers 20 percent of the remaining price.';
    expect(ReferenceCodeAnalysisSchema.safeParse(analysis).success).toBe(false);
  });

  it('requires code references on OBSERVED claims', () => {
    const analysis = referenceCodeAnalysisFixture();
    analysis.claims[0]!.codeRefs = [];
    expect(ReferenceCodeAnalysisSchema.safeParse(analysis).success).toBe(false);
  });

  it('allows UNKNOWN claims to declare a gap without code references', () => {
    const analysis = referenceCodeAnalysisFixture();
    analysis.claims[4] = { id: 'end', dimension: 'terminal_replay', status: 'UNKNOWN', statement: 'The ending of the final store was not found in the scripts.', codeRefs: [] };
    expect(ReferenceCodeAnalysisSchema.safeParse(analysis).success).toBe(true);
  });

  it('requires every reference behavior dimension to be covered', () => {
    const analysis = referenceCodeAnalysisFixture();
    analysis.claims = analysis.claims.filter((claim) => claim.dimension !== 'terminal_replay');
    expect(ReferenceCodeAnalysisSchema.safeParse(analysis).success).toBe(false);
  });

  it('rejects core loop steps that cite unknown claims and duplicate claim ids', () => {
    const unknownClaim = referenceCodeAnalysisFixture();
    unknownClaim.coreLoop[0]!.claimIds = ['missing'];
    expect(ReferenceCodeAnalysisSchema.safeParse(unknownClaim).success).toBe(false);
    const duplicate = referenceCodeAnalysisFixture();
    duplicate.claims[1]!.id = 'pay';
    expect(ReferenceCodeAnalysisSchema.safeParse(duplicate).success).toBe(false);
  });

  it('rejects inverted line ranges and scripts outside reference-code', () => {
    const inverted = referenceCodeAnalysisFixture();
    inverted.claims[0]!.codeRefs = [{ script: 'reference-code/pkg/scripts/main/rules.lua', sha256: 'b'.repeat(64), startLine: 4, endLine: 2 }];
    expect(ReferenceCodeAnalysisSchema.safeParse(inverted).success).toBe(false);
    const outside = referenceCodeAnalysisFixture({ script: { path: 'workspace/game/src/main.ts', sha256: 'b'.repeat(64) } });
    expect(ReferenceCodeAnalysisSchema.safeParse(outside).success).toBe(false);
  });

  it('requires the reuse boundary to be affirmed', () => {
    const analysis = { ...referenceCodeAnalysisFixture(), reuseBoundary: { mechanicsOnly: true, noCodeCopied: false, noAssetsCopied: true, noNamesOrUiCopied: true, noTuningValuesCopied: true } };
    expect(ReferenceCodeAnalysisSchema.safeParse(analysis).success).toBe(false);
  });
});
