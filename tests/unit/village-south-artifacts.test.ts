import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CompetitorResearchSchema,
  IaaMonetizationReviewSchema,
  NarrativeChoiceAuditSchema,
  NarrativeLifePrototypeSchema,
  ProductionCostReviewSchema,
  RunStateSchema,
  resolveNarrativeEnding,
} from '../../src/schemas/index.js';
import { OpenSourceResearchArtifactSchema } from '../../src/schemas/open-source-research.js';

const runRoot = path.resolve('runs/20260831-010324-village-south-text-v1');

async function json(name: string) {
  return JSON.parse(await readFile(path.join(runRoot, name), 'utf8')) as unknown;
}

describe('村口向南 text prototype artifacts', () => {
  it('keeps the run paused at human approval with the generated workspace untouched', async () => {
    const state = RunStateSchema.parse(await json('state.json'));
    expect(state.stage).toBe('WAITING_FOR_PROTOTYPE_APPROVAL');
    expect(state.status).toBe('waiting');
  });

  it('validates all research and review handoff artifacts', async () => {
    CompetitorResearchSchema.parse(await json('artifacts/competitor-research.json'));
    OpenSourceResearchArtifactSchema.parse(await json('artifacts/open-source-research.json'));
    ProductionCostReviewSchema.parse(await json('artifacts/production-cost-review.json'));
    IaaMonetizationReviewSchema.parse(await json('artifacts/iaa-monetization-review.json'));
  });

  it('locks the approved first-ending IAA cadence before BuilderAgent runs', async () => {
    const review = IaaMonetizationReviewSchema.parse(await json('artifacts/iaa-monetization-review.json'));
    expect(Reflect.get(review, 'deliveryRules')).toEqual({
      firstRun: 'ENDING_ONLY',
      endingAdPolicy: 'REWARDED_OR_INTERSTITIAL',
      minMinutesBetweenAds: 6,
      maxAdsPerRun: 2,
      maxAdsPerSession: 3,
      targetImpressionsPerCompletedLife: { min: 0.8, max: 1.3 },
    });
  });

  it('resolves all 12 supplied paths without flattening stats against their ceilings', async () => {
    const prototype = NarrativeLifePrototypeSchema.parse(await json('artifacts/narrative-life-prototype.json'));
    const maxByStat = new Map<string, number>(prototype.stats.map(({ id, max }) => [id, max]));
    const healthValues: number[] = [];
    const profiles = prototype.reachability.map((pathEvidence) => {
      const result = resolveNarrativeEnding(prototype, pathEvidence.choiceIds);
      expect(result.ending.id).toBe(pathEvidence.endingId);
      for (const [statId, value] of Object.entries(result.stats)) expect(value).toBeLessThan(maxByStat.get(statId)!);
      healthValues.push(result.stats.health!);
      return JSON.stringify(result.stats);
    });
    expect(new Set(profiles).size).toBeGreaterThanOrEqual(10);
    expect(Math.min(...healthValues)).toBeGreaterThanOrEqual(5);
    expect(Math.max(...healthValues) - Math.min(...healthValues)).toBeGreaterThanOrEqual(4);
  });

  it('keeps mobile choice cards compact while all four systems gate real decisions', async () => {
    const prototype = NarrativeLifePrototypeSchema.parse(await json('artifacts/narrative-life-prototype.json'));
    expect(prototype.stats.map(({ id }) => id)).toEqual(['economy', 'skill', 'health', 'bonds']);
    expect(prototype.events.every(({ choices }) => choices.length === 2)).toBe(true);
    expect(prototype.events.every(({ choices }) => choices.some(({ requirements }) => requirements === undefined))).toBe(true);
    const conditionalChoices = prototype.events.flatMap(({ choices }) => choices).filter(({ requirements }) => requirements !== undefined);
    expect(conditionalChoices).toHaveLength(7);
    const gatingStats = new Set(conditionalChoices.flatMap(({ requirements }) => Object.keys(requirements?.stats ?? {})));
    expect([...gatingStats].sort()).toEqual(['bonds', 'economy', 'health', 'skill']);
  });

  it('provides a plotless choice audit and one-page approval summary', async () => {
    const audit = NarrativeChoiceAuditSchema.parse(await json('artifacts/narrative-choice-audit.json'));
    const summary = await readFile(path.join(runRoot, 'human/choice-audit-summary.md'), 'utf8');
    expect(audit.events).toHaveLength(24);
    expect(audit.method.plotlessReview).toBe(true);
    expect(audit.events.every((event) => !Reflect.has(event, 'body') && !Reflect.has(event, 'resultText'))).toBe(true);
    expect(audit.simulation.sampleRuns).toBe(4096);
    expect(audit.simulation.endingRates.reduce((total, ending) => total + ending.rate, 0)).toBeCloseTo(1, 6);
    expect(summary).toContain('红灯事件');
    expect(summary).toContain('突破型：8');
    expect(summary).toContain('经营主导者：6');
    expect(summary).not.toContain('县里贴出恢复招生考试的消息');
  });

  it('keeps every gated choice meaningfully reachable instead of using decorative locks', async () => {
    const audit = NarrativeChoiceAuditSchema.parse(await json('artifacts/narrative-choice-audit.json'));
    const rates = audit.simulation.gatedChoiceAvailability;
    expect(rates).toHaveLength(7);
    expect(rates.every(({ attempted }) => attempted > 0)).toBe(true);
    expect(rates.every(({ availableRate }) => (
      availableRate >= audit.thresholds.rareGateRate
      && availableRate <= audit.thresholds.trivialGateRate
    ))).toBe(true);
    expect(audit.events.flatMap(({ issues }) => issues).some(({ code }) => code.includes('GATE_'))).toBe(false);
  });

  it('uses the reform era for a broad outcome spectrum with real breakout lives', async () => {
    const prototype = NarrativeLifePrototypeSchema.parse(await json('artifacts/narrative-life-prototype.json'));
    const profiles = prototype.endings.map((ending) => Reflect.get(ending, 'outcomeProfile') as {
      trajectory?: string;
      economicAgency?: string;
      geographicReach?: string;
      riskLevel?: string;
    } | undefined);
    expect(profiles.filter((profile) => profile?.trajectory === 'BREAKOUT').length).toBeGreaterThanOrEqual(6);
    expect(profiles.filter((profile) => profile?.economicAgency === 'OWNER').length).toBeGreaterThanOrEqual(5);
    expect(profiles.filter((profile) => profile?.geographicReach === 'CROSS_PROVINCE').length).toBeGreaterThanOrEqual(2);
    expect(profiles.some((profile) => profile?.trajectory === 'RECOVERY')).toBe(true);
    expect(profiles.some((profile) => profile?.trajectory === 'ROOTED')).toBe(true);

    const breakoutLanguage = prototype.endings.filter((ending) => {
      const text = `${prototype.strings[ending.titleTextId]}${prototype.strings[ending.summaryTextId]}`;
      return /老板|厂长|承包|批发商|车队|厂主|创办|大户/.test(text);
    });
    expect(breakoutLanguage.length).toBeGreaterThanOrEqual(6);
  });
});
