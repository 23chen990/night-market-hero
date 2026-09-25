import { z } from 'zod';

const text = z.string().min(1);
const texts = z.array(text).min(1);
const product = z.object({
  id: z.enum(['fish', 'kelp', 'shrimp', 'crab']),
  saleReward: z.number().int().positive(),
  shelfCapacity: z.number().int().positive(),
  productionMode: text,
  productionCycleMs: z.number().int().nonnegative(),
  batchYield: z.number().int().positive(),
  sourceBufferCapacity: z.number().int().nonnegative(),
  carrierSlotsPerUnit: z.literal(1),
  unlockCost: z.number().int().nonnegative(),
  prerequisite: text,
}).strict();

export const BuilderInputSchema = z.object({
  schemaVersion: z.literal(1),
  role: z.literal('BuilderAgent'),
  status: z.literal('APPROVED_FOR_IMPLEMENTATION'),
  approval: z.object({ userText: text, interpretedDecision: text, approvedAt: text }).strict(),
  target: z.object({ runRoot: text, workspace: text, allowedWriteRoots: texts, forbiddenWriteRoots: texts }).strict(),
  sourceArtifacts: z.object({ openSourceResearch: text, blueprint: text, economy: text, styleLock: text, assetManifest: text, approvedDesignReview: text }).strict(),
  implementationScope: z.object({ required: texts, explicitlyOutOfScope: texts }).strict(),
  upgradeOwnership: z.object({ globalCarrierEntry: text, worldWorkshop: text, fishNet: text, shrimpTrap: text, crabPot: text }).strict(),
  products: z.array(product).length(4),
  facilityUpgrades: z.array(z.object({ id: text, cost: z.number().int().positive(), before: text, after: text, ownership: z.literal('facility-local') }).strict()).length(3),
  progression: z.object({ order: z.tuple([z.literal('fish'), z.literal('kelp'), z.literal('shrimp'), z.literal('crab')]), shrimpSalesGate: z.number().int().positive(), crabShrimpSalesGate: z.number().int().positive(), disclosureRules: texts }).strict(),
  customerRules: z.object({ demandAfterAllUnlock: z.object({ fish: z.number(), kelp: z.number(), shrimp: z.number(), crab: z.number() }).strict(), shrimpFallback: text, crabShortage: text, caps: texts }).strict(),
  persistence: z.object({ proposedVersion: z.literal(5), newSaveKey: text, migrationInputs: texts, mustPreserve: texts, defaults: texts }).strict(),
  uiRules: z.object({ upgradeIcon: texts, facilityPrompts: texts, portraitConstraints: texts, animationConstraints: texts }).strict(),
  testFirstContract: z.object({ redCommands: texts, requiredFailingBehaviors: texts, greenGates: texts, exactTestApi: z.tuple([z.literal('resetGame'), z.literal('getState'), z.literal('spawnCustomer'), z.literal('completeOrder'), z.literal('grantCurrency'), z.literal('upgradeStation'), z.literal('setRandomSeed')]) }).strict(),
  assetPolicy: z.object({ newFormalImages: z.literal(false), reuse: texts, placeholders: texts, transparencyRule: text }).strict(),
  deliverables: texts,
}).strict();

