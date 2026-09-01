import { describe, expect, it } from 'vitest';
import { createArtifactLedger, recordArtifact, evaluateArtifactLedger, invalidateArtifacts } from '../../src/core/artifact-ledger.js';

const hash = (letter: string) => letter.repeat(64);

describe('artifact dependency ledger', () => {
  it('invalidates direct and transitive evidence when an approved input changes', () => {
    let ledger = createArtifactLedger();
    ledger = recordArtifact(ledger, { path: 'artifacts/experience-contract.json', sha256: hash('a'), producerStage: 'EXPERIENCE_CONTRACT', inputHashes: {} });
    ledger = recordArtifact(ledger, { path: 'artifacts/build-report.json', sha256: hash('b'), producerStage: 'FULL_BUILD', inputHashes: { 'artifacts/experience-contract.json': hash('a') } });
    ledger = recordArtifact(ledger, { path: 'artifacts/qa-report.json', sha256: hash('c'), producerStage: 'QA', inputHashes: { 'artifacts/build-report.json': hash('b') } });
    ledger = recordArtifact(ledger, { path: 'artifacts/experience-contract.json', sha256: hash('d'), producerStage: 'EXPERIENCE_CONTRACT', inputHashes: {} });
    expect(ledger.entries.find((entry) => entry.path === 'artifacts/build-report.json')?.status).toBe('INVALIDATED');
    expect(ledger.entries.find((entry) => entry.path === 'artifacts/qa-report.json')?.status).toBe('INVALIDATED');
    expect(evaluateArtifactLedger(ledger).passed).toBe(false);
  });

  it('accepts a stable graph with matching input hashes', () => {
    let ledger = createArtifactLedger();
    ledger = recordArtifact(ledger, { path: 'artifacts/a.json', sha256: hash('a'), producerStage: 'BLUEPRINT', inputHashes: {} });
    ledger = recordArtifact(ledger, { path: 'artifacts/b.json', sha256: hash('b'), producerStage: 'FULL_BUILD', inputHashes: { 'artifacts/a.json': hash('a') } });
    expect(evaluateArtifactLedger(ledger)).toMatchObject({ passed: true, blockers: [] });
  });

  it('invalidates explicitly retried outputs and their transitive dependents', () => {
    let ledger = createArtifactLedger();
    ledger = recordArtifact(ledger, { path: 'artifacts/blueprint.json', sha256: hash('a'), producerStage: 'BLUEPRINT', inputHashes: {} });
    ledger = recordArtifact(ledger, { path: 'artifacts/build-report.json', sha256: hash('b'), producerStage: 'FULL_BUILD', inputHashes: { 'artifacts/blueprint.json': hash('a') } });
    ledger = recordArtifact(ledger, { path: 'artifacts/qa-report.json', sha256: hash('c'), producerStage: 'QA', inputHashes: { 'artifacts/build-report.json': hash('b') } });

    const retried = invalidateArtifacts(ledger, ['artifacts/blueprint.json'], 'retry:BLUEPRINT');
    expect(retried.entries.find((entry) => entry.path === 'artifacts/blueprint.json')?.status).toBe('INVALIDATED');
    expect(retried.entries.find((entry) => entry.path === 'artifacts/build-report.json')?.status).toBe('INVALIDATED');
    expect(retried.entries.find((entry) => entry.path === 'artifacts/qa-report.json')?.status).toBe('INVALIDATED');
    expect(retried.entries.find((entry) => entry.path === 'artifacts/blueprint.json')?.invalidatedBy).toContain('retry:BLUEPRINT');
  });

  it('keeps an already-invalidated dependent invalid until its producer is rebuilt', () => {
    let ledger = createArtifactLedger();
    ledger = recordArtifact(ledger, { path: 'artifacts/spec.json', sha256: hash('a'), producerStage: 'EXPERIENCE_CONTRACT', inputHashes: {} });
    ledger = recordArtifact(ledger, { path: 'artifacts/build.json', sha256: hash('b'), producerStage: 'FULL_BUILD', inputHashes: { 'artifacts/spec.json': hash('a') } });
    ledger = invalidateArtifacts(ledger, ['artifacts/spec.json'], 'drift:spec');
    const rebuiltSpec = recordArtifact(ledger, { path: 'artifacts/spec.json', sha256: hash('c'), producerStage: 'EXPERIENCE_CONTRACT', inputHashes: {} });
    expect(rebuiltSpec.entries.find((entry) => entry.path === 'artifacts/build.json')?.status).toBe('INVALIDATED');
    expect(evaluateArtifactLedger(rebuiltSpec).passed).toBe(false);
  });
});
