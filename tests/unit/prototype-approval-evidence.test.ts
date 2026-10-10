import { mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeJsonAtomic } from '../../src/core/files.js';
import {
  PrototypeApprovalEvidenceSchema,
  capturePrototypeApprovalEvidence,
  verifyPrototypeApprovalEvidence,
} from '../../src/core/prototype-approval-evidence.js';

const roots: string[] = [];

const slots = ['a', 'b', 'c'] as const;
type Slot = (typeof slots)[number];

function ideaId(slot: Slot) { return `idea_1_${slot}`; }

function idea(slot: Slot) {
  return {
    id: ideaId(slot),
    name: `Idea ${slot.toUpperCase()}`,
    coreAction: `Choose ${slot}`,
    decisionIntervalSeconds: 10,
    decision: `Choose ${slot}`,
    choiceDrivers: ['risk', 'reward'],
    pressure: 'A visible threat rises.',
    firstDelight: 'The first choice changes the state.',
    secondRunVariation: 'A seeded target changes on replay.',
    growthMechanic: 'A bounded upgrade changes the next choice.',
    randomVariation: 'The target varies by seed.',
    majorSystems: ['choice'],
    realDecision: true,
  };
}

function buildReport(batch = 1) {
  return {
    schemaVersion: 1,
    batch,
    prototypes: slots.map((slot) => ({
      slot,
      ideaId: ideaId(slot),
      workspace: `workspace/prototype-${slot}`,
      entrypoint: `workspace/prototype-${slot}/dist/index.html`,
      launchCommand: `pnpm factory preview run-${batch} prototype-${slot}`,
      placeholderArt: true,
      formalUi: false,
      iaaIncluded: false,
      majorSystems: ['choice'],
      verification: ['html:playable', 'test-api:available'],
      author: 'BuilderAgent',
    })),
  };
}

function criterion(score = 8) { return { score, evidence: 'The state changed immediately.' }; }

function tournamentReport(batch = 1) {
  return {
    schemaVersion: 1,
    batch,
    reviewer: 'QAAgent',
    prototypeAuthor: 'BuilderAgent',
    comparisons: slots.map((slot) => ({
      slot,
      ideaId: ideaId(slot),
      testedUrl: `http://127.0.0.1:5${slot === 'a' ? '001' : slot === 'b' ? '002' : '003'}/`,
      playtestActions: ['start', 'choice:0', 'choice:1', 'choice:0', 'choice:1'],
      tenSecondUnderstanding: criterion(),
      funWithinThirtySeconds: criterion(),
      realDecision: criterion(),
      mechanicalRepetition: criterion(),
      pressureOrFailure: criterion(),
      retryUrge: criterion(),
      variationAfterFiveRepeats: criterion(),
      extensibility: criterion(),
      screenshot: `screenshots/prototype-${slot}.png`,
      consoleLog: `logs/prototype-${slot}.log`,
    })),
  };
}

function winner(batch = 1) {
  return { schemaVersion: 1, batch, decision: 'WINNER_A', selectedIdeaId: ideaId('a'), rationale: 'A has the clearest first decision.' };
}

function review(batch = 1) {
  return {
    schemaVersion: 1,
    batch,
    prototypes: slots.map((slot) => ({ slot, name: idea(slot).name, coreAction: idea(slot).coreAction, decision: idea(slot).decision, entrypoint: `workspace/prototype-${slot}/dist/index.html`, launchCommand: `pnpm factory preview run-${batch} prototype-${slot}` })),
    recommendation: 'WINNER_A',
    rationale: 'A has the clearest first decision.',
  };
}

async function fixture({ screenshots = true } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'prototype-approval-evidence-'));
  roots.push(root);
  const extraIdeas = ['d', 'e', 'f'].map((suffix) => ({ ...idea('a'), id: `idea_1_${suffix}`, name: `Idea ${suffix.toUpperCase()}` }));
  await writeJsonAtomic(path.join(root, 'artifacts/idea-generation.batch-1.json'), { schemaVersion: 1, batch: 1, theme: 'test', ideas: [...slots.map(idea), ...extraIdeas] });
  await writeJsonAtomic(path.join(root, 'artifacts/prototype-selection.batch-1.json'), { schemaVersion: 1, batch: 1, decision: 'BUILD_3', selectedIdeaIds: slots.map(ideaId), rationale: 'Three bounded ideas.', constraints: ['one action'] });
  await writeJsonAtomic(path.join(root, 'artifacts/prototype-build-report.batch-1.json'), buildReport());
  await writeJsonAtomic(path.join(root, 'artifacts/playtest-tournament.batch-1.json'), tournamentReport());
  await writeJsonAtomic(path.join(root, 'artifacts/winner-selection.batch-1.json'), winner());
  await writeJsonAtomic(path.join(root, 'human/prototype-review.json'), review());
  await mkdir(path.join(root, 'screenshots'), { recursive: true });
  await mkdir(path.join(root, 'logs'), { recursive: true });
  for (const slot of slots) {
    const workspace = path.join(root, `workspace/prototype-${slot}/dist`);
    await mkdir(workspace, { recursive: true });
    await writeFile(path.join(workspace, 'index.html'), `<!doctype html><script>window.__PROTOTYPE_TEST__={}</script><button data-choice="safe">Safe</button>\n`);
    await writeFile(path.join(workspace, 'runtime.js'), `window.prototypeSlot='${slot}';\n`);
    if (screenshots) {
      await writeFile(path.join(root, `screenshots/prototype-${slot}.png`), `PNG fixture ${slot}`);
      await writeFile(path.join(root, `logs/prototype-${slot}.log`), `console fixture ${slot}\n`);
    }
  }
  return root;
}

afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe('prototype approval evidence', () => {
  it('captures and verifies a complete browser evidence snapshot', async () => {
    const root = await fixture();
    const captured = await capturePrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    expect(captured).toMatchObject({ passed: true, usableForProductAcceptance: true, synthetic: false });
    expect(captured.candidates).toHaveLength(3);
    await writeJsonAtomic(path.join(root, 'artifacts/prototype-approval-evidence.batch-1.json'), captured);

    const verified = await verifyPrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    expect(verified).toMatchObject({ passed: true, usableForProductAcceptance: true });
    expect(PrototypeApprovalEvidenceSchema.parse(verified)).toEqual(verified);
    await writeJsonAtomic(path.join(root, 'artifacts/prototype-approval-evidence.batch-1.json'), verified);
    await expect(verifyPrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false })).resolves.toEqual(verified);
  });

  it('rejects a dist byte change after capture', async () => {
    const root = await fixture();
    const captured = await capturePrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    await writeJsonAtomic(path.join(root, 'artifacts/prototype-approval-evidence.batch-1.json'), captured);
    await writeFile(path.join(root, 'workspace/prototype-b/dist/runtime.js'), 'tampered');

    const verified = await verifyPrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    expect(verified.passed).toBe(false);
    expect(verified.blockers).toContain('build:dist-hash-mismatch:b');
  });

  it('rejects a missing screenshot from a browser snapshot', async () => {
    const root = await fixture();
    const captured = await capturePrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    await writeJsonAtomic(path.join(root, 'artifacts/prototype-approval-evidence.batch-1.json'), captured);
    await unlink(path.join(root, 'screenshots/prototype-c.png'));

    const verified = await verifyPrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    expect(verified.passed).toBe(false);
    expect(verified.blockers).toContain('qa:screenshot-missing:c');
  });

  it('rejects a tournament candidate idea mismatch after capture', async () => {
    const root = await fixture();
    const captured = await capturePrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    await writeJsonAtomic(path.join(root, 'artifacts/prototype-approval-evidence.batch-1.json'), captured);
    const tournament = tournamentReport();
    tournament.comparisons[1]!.ideaId = ideaId('a');
    await writeJsonAtomic(path.join(root, 'artifacts/playtest-tournament.batch-1.json'), tournament);

    const verified = await verifyPrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    expect(verified.passed).toBe(false);
    expect(verified.blockers).toContain('source:tournament-hash-mismatch');
    expect(verified.blockers).toContain('candidate:tournament-idea-mismatch:b');
  });

  it('fails closed when the requested batch has no snapshot', async () => {
    const root = await fixture();
    const verified = await verifyPrototypeApprovalEvidence({ runRoot: root, batch: 2, synthetic: false });
    expect(verified.passed).toBe(false);
    expect(verified.blockers).toContain('evidence:snapshot-missing');
  });

  it('does not allow synthetic evidence under a real browser policy', async () => {
    const root = await fixture({ screenshots: false });
    const captured = await capturePrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: true });
    expect(captured.passed).toBe(true);
    expect(captured.usableForProductAcceptance).toBe(false);
    await writeJsonAtomic(path.join(root, 'artifacts/prototype-approval-evidence.batch-1.json'), captured);

    const verified = await verifyPrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    expect(verified.passed).toBe(false);
    expect(verified.blockers).toContain('policy:synthetic-evidence');
  });

  it('records unavailable captures under explicit synthetic policy without browser claims', async () => {
    const root = await fixture({ screenshots: false });
    const captured = await capturePrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: true });
    expect(captured).toMatchObject({ passed: true, usableForProductAcceptance: false, synthetic: true });
    expect(captured.evidence.some((item) => item.includes('synthetic'))).toBe(true);
    expect(captured.candidates.every((candidate) => candidate.screenshot.status === 'UNAVAILABLE')).toBe(true);
  });

  it('rejects passed snapshots with incomplete sources or candidate dist evidence', async () => {
    const root = await fixture();
    const captured = await capturePrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    const incompleteSource = { ...captured, sourceArtifacts: captured.sourceArtifacts.slice(0, 1) };
    expect(() => PrototypeApprovalEvidenceSchema.parse(incompleteSource)).toThrow();
    const incompleteCandidate = {
      ...captured,
      candidates: captured.candidates.map((candidate, index) => index === 0 ? { ...candidate, distFiles: [] } : candidate),
    };
    expect(() => PrototypeApprovalEvidenceSchema.parse(incompleteCandidate)).toThrow();
  });

  it('rejects wrong batch source paths and duplicate dist paths in snapshots', async () => {
    const root = await fixture();
    const captured = await capturePrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    const wrongSourcePath = {
      ...captured,
      sourceArtifacts: captured.sourceArtifacts.map((source, index) => index === 0 ? { ...source, path: 'artifacts/prototype-build-report.batch-2.json' } : source),
    };
    expect(() => PrototypeApprovalEvidenceSchema.parse(wrongSourcePath)).toThrow();
    const duplicateDistPath = {
      ...captured,
      candidates: captured.candidates.map((candidate, index) => index === 0 ? { ...candidate, distFiles: [...candidate.distFiles, { ...candidate.distFiles[0]! }] } : candidate),
    };
    expect(() => PrototypeApprovalEvidenceSchema.parse(duplicateDistPath)).toThrow();
  });

  it('returns diagnostic false for a malformed persisted snapshot', async () => {
    const root = await fixture();
    await writeFile(path.join(root, 'artifacts/prototype-approval-evidence.batch-1.json'), '{"schemaVersion":1,"artifactType":"prototype-approval-evidence"}');
    const verified = await verifyPrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    expect(verified.passed).toBe(false);
    expect(verified.blockers).toContain('evidence:snapshot-invalid');
  });

  it('rejects cross-candidate screenshot and console-log references', async () => {
    const root = await fixture();
    const tournament = tournamentReport();
    tournament.comparisons[1]!.screenshot = 'screenshots/prototype-a.png';
    tournament.comparisons[1]!.consoleLog = 'logs/prototype-a.log';
    await writeJsonAtomic(path.join(root, 'artifacts/playtest-tournament.batch-1.json'), tournament);
    const captured = await capturePrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    expect(captured.passed).toBe(false);
    expect(captured.blockers).toContain('candidate:screenshot-path-mismatch:b');
    expect(captured.blockers).toContain('candidate:console-log-path-mismatch:b');
  });

  it('rejects a selected prototype when its expected dist entrypoint is missing', async () => {
    const root = await fixture();
    const captured = await capturePrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    await writeJsonAtomic(path.join(root, 'artifacts/prototype-approval-evidence.batch-1.json'), captured);
    await unlink(path.join(root, 'workspace/prototype-a/dist/index.html'));
    const verified = await verifyPrototypeApprovalEvidence({ runRoot: root, batch: 1, synthetic: false });
    expect(verified.passed).toBe(false);
    expect(verified.blockers).toContain('build:dist-entrypoint-missing:a');
  });
});
