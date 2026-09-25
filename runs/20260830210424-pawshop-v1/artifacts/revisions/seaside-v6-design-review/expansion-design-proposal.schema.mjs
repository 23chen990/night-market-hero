import { z } from 'zod';

const text = z.string().min(1);
const texts = z.array(text).min(1);
const ratioRange = z.object({ min: z.number().nonnegative(), max: z.number().positive(), unit: text, rationale: text }).strict();
const score = z.object({ score: z.number().int().min(1).max(5), note: text }).strict();

const graphNode = z.object({ id: text, label: text, layer: z.enum(['production', 'logistics', 'retail', 'customer', 'checkout', 'currency', 'upgrade']), currentState: text, evidence: texts }).strict();
const graphEdge = z.object({ from: text, to: text, relation: text, condition: text }).strict();

const product = z.object({
  id: z.enum(['fish', 'kelp', 'shrimp', 'crab']),
  displayName: text,
  role: text,
  frequency: z.enum(['high', 'medium', 'low']),
  progressionBand: text,
  productionFacility: text,
  productionPattern: text,
  suggestedWait: text,
  batchYield: text,
  carrierSlotsPerUnit: z.literal(1),
  shelfCapacity: text,
  customerEffect: text,
  differentiation: text,
}).strict();

const facility = z.object({
  id: text,
  displayName: text,
  owner: z.enum(['facility', 'player', 'shop']),
  entryLocation: text,
  upgradeAxis: text,
  promptRule: text,
  forbiddenMeaning: text,
}).strict();

const option = z.object({
  id: z.enum(['A', 'B']),
  name: text,
  complexity: z.enum(['low', 'medium']),
  summary: text,
  resourceBehaviors: texts,
  facilityBehaviors: texts,
  customerAndShelfRules: texts,
  unlockFlow: texts,
  logisticsRule: text,
  evaluation: z.object({
    playerComprehensionCost: score,
    novelty: score,
    implementationCost: score,
    testCost: score,
    saveMigrationRisk: score,
    mobileUiRisk: score,
    extensibility: score,
  }).strict(),
  mainRisks: texts,
  acceptanceSignals: texts,
}).strict();

const economyProduct = z.object({
  productId: z.enum(['fish', 'kelp', 'shrimp', 'crab']),
  productionCycleRelativeToFish: ratioRange,
  cycleMode: text,
  yieldPerCycle: text,
  salePriceRelativeToFish: ratioRange,
  shelfCapacity: text,
  unlockCostRelativeToCurrentKelpGate: ratioRange,
  facilityUpgradeCost: text,
  expectedPaybackMinutes: ratioRange,
}).strict();

export const ExpansionDesignProposalSchema = z.object({
  schemaVersion: z.literal(1),
  artifactId: z.literal('seaside-v6-design-review'),
  status: z.literal('PROPOSED_AWAITING_APPROVAL'),
  scope: z.object({ runPath: text, gameWorkspace: text, writeBoundary: text, forbiddenActions: texts }).strict(),
  evidenceReviewed: z.object({ demo: texts, sourceFiles: texts, tests: texts, runArtifacts: texts, qaBaseline: text }).strict(),
  currentSystemRelationshipGraph: z.object({ nodes: z.array(graphNode).min(7), edges: z.array(graphEdge).min(7), mermaid: text, diagnosisSummary: text }).strict(),
  floatingWorkshopDiagnosis: z.object({ observedName: text, internalSystem: text, actualBehavior: text, isFishNetUpgrade: z.literal(false), confusionCauses: texts, evidence: texts, requiredCorrection: texts }).strict(),
  userLockedDecisions: z.array(z.object({ id: text, decision: text, designConsequence: text }).strict()).min(4),
  productRelationshipTable: z.array(product).length(4),
  facilityUpgradeOwnership: z.array(facility).min(7),
  unlockDependencyGraph: z.object({ order: z.tuple([z.literal('fish'), z.literal('kelp'), z.literal('shrimp'), z.literal('crab')]), nodes: z.array(z.object({ id: text, prerequisite: text, visibleObjective: text, secondaryObjective: text, revealRule: text }).strict()).length(4), edges: z.array(graphEdge).min(3), objectiveDisplayRules: texts }).strict(),
  relativeEconomyRanges: z.object({ baselines: texts, products: z.array(economyProduct).length(4), globalUpgradeRanges: z.array(z.object({ id: text, costRange: text, paybackTarget: text, gate: text }).strict()).min(2), safetyChecks: texts }).strict(),
  first15MinutesPacing: z.array(z.object({ window: z.enum(['0-3m', '3-8m', '8-15m']), primaryExperience: text, mainGoal: text, secondaryGoal: text, expectedUnlocks: texts, failurePrevention: texts }).strict()).length(3),
  uiEntryAndPromptRules: z.object({ backpackEntry: z.object({ placement: text, appearance: text, redDotRule: text, interaction: text, safeAreaRule: text }).strict(), facilityPrompts: z.array(z.object({ facility: text, placement: text, visibleWhen: text, copyPattern: text }).strict()).min(3), lockedFacilityRule: text, informationBudget: texts, oneHandRule: text }).strict(),
  options: z.tuple([option, option]),
  recommendation: z.object({ optionId: z.literal('B'), name: text, reasons: texts, nonNegotiableConstraints: texts, phasedDelivery: texts }).strict(),
  saveMigrationImpact: z.object({ targetVersion: text, newAuthoritativeFields: texts, defaultsForLegacySave: texts, migrationRules: texts, compatibilityGuarantees: texts, riskLevel: z.enum(['low', 'medium', 'high']) }).strict(),
  risksAndTestPlan: z.object({ risks: z.array(z.object({ id: text, risk: text, likelihood: z.enum(['low', 'medium', 'high']), impact: z.enum(['low', 'medium', 'high']), mitigation: text }).strict()).min(5), tests: z.array(z.object({ category: text, redFirstCases: texts, evidenceRequired: texts }).strict()).min(6), requiredGates: texts }).strict(),
  pendingApprovalItems: z.array(z.object({ id: text, question: text, recommendedAnswer: text, impactIfChanged: text }).strict()).min(1).max(3),
  implementationGate: z.object({ approved: z.literal(false), requiredApprovalToken: z.literal('APPROVE'), statement: text }).strict(),
}).strict();

