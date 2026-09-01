import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { NarrativeLifePrototypeSchema, type NarrativeLifePrototype } from '../../src/schemas/index.js';

type AuditModule = typeof import('../../src/schemas/narrative-choice-audit.js');

const prototypePath = path.resolve('runs/20260831-010324-village-south-text-v1/artifacts/narrative-life-prototype.json');
let prototype: NarrativeLifePrototype;

async function loadAudit(): Promise<AuditModule | null> {
  return import('../../src/schemas/narrative-choice-audit.js').catch(() => null);
}

beforeAll(async () => {
  prototype = NarrativeLifePrototypeSchema.parse(JSON.parse(await readFile(prototypePath, 'utf8')));
});

describe('narrative choice audit', () => {
  it('produces a deterministic, Zod-validated 24-card audit without copying plot bodies', async () => {
    const module = await loadAudit();
    expect(module).not.toBeNull();
    if (!module) return;
    const first = module.auditNarrativeChoices(prototype, { sampleRuns: 1024, seed: 1978 });
    const second = module.auditNarrativeChoices(prototype, { sampleRuns: 1024, seed: 1978 });
    expect(module.NarrativeChoiceAuditSchema.parse(first)).toEqual(second);
    expect(first.events).toHaveLength(24);
    expect(first.events.every((event) => !Reflect.has(event, 'body') && !Reflect.has(event, 'resultText'))).toBe(true);
    expect(first.simulation.endingRates.reduce((total, ending) => total + ending.rate, 0)).toBeCloseTo(1, 6);
  });

  it('reports availability evidence for every state-gated choice', async () => {
    const module = await loadAudit();
    expect(module).not.toBeNull();
    if (!module) return;
    const report = module.auditNarrativeChoices(prototype, { sampleRuns: 2048, seed: 1992 });
    const expectedGatedIds = prototype.events.flatMap(({ choices }) => choices).filter(({ requirements }) => requirements).map(({ id }) => id).sort();
    expect(report.simulation.gatedChoiceAvailability.map(({ choiceId }) => choiceId).sort()).toEqual(expectedGatedIds);
    expect(report.simulation.gatedChoiceAvailability.every(({ attempted, availableRate }) => attempted > 0 && availableRate >= 0 && availableRate <= 1)).toBe(true);
  });

  it('marks a numerically dominant option as a major issue', async () => {
    const module = await loadAudit();
    expect(module).not.toBeNull();
    if (!module) return;
    const value = structuredClone(prototype);
    const [choiceA, choiceB] = value.events[0]!.choices;
    choiceA!.immediateEffects = { economy: 4, skill: 2 };
    choiceA!.delayedEcho.effects = { economy: 2 };
    choiceB!.immediateEffects = { economy: 1 };
    choiceB!.delayedEcho.effects = {};
    const report = module.auditNarrativeChoices(value, { sampleRuns: 256, seed: 1 });
    expect(report.events[0]!.issues).toContainEqual(expect.objectContaining({ code: 'NUMERIC_DOMINANCE', priority: 'P1' }));
    expect(report.events[0]!.status).toBe('RED');
  });

  it('flags prose that is too long for the one-card mobile decision', async () => {
    const module = await loadAudit();
    expect(module).not.toBeNull();
    if (!module) return;
    const value = structuredClone(prototype);
    value.strings[value.events[0]!.bodyTextId] = '长'.repeat(121);
    const report = module.auditNarrativeChoices(NarrativeLifePrototypeSchema.parse(value), { sampleRuns: 256, seed: 2 });
    expect(report.events[0]!.issues).toContainEqual(expect.objectContaining({ code: 'BODY_TOO_LONG' }));
  });

  it('passes with notes when only low-priority observations remain', async () => {
    const module = await loadAudit();
    expect(module).not.toBeNull();
    if (!module) return;
    const value = structuredClone(prototype);
    value.events[9]!.choices[0]!.requirements = { stats: { bonds: { min: 14 } } };
    const report = module.auditNarrativeChoices(value, { sampleRuns: 1024, seed: 1978 });
    expect(report.summary.p1Issues).toBe(0);
    expect(report.summary.p2Issues).toBe(0);
    expect(report.summary.p3Issues).toBeGreaterThan(0);
    expect(report.summary.recommendation).toBe('PASS');
  });
});
