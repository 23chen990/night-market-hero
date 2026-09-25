import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const requireFromFactory = createRequire(new URL('../../../../../package.json', import.meta.url));
const { z } = requireFromFactory('zod');

const nonEmpty = z.string().trim().min(1);
const urlOrNull = z.union([z.url(), z.null()]);
const source = z.object({
  id: nonEmpty,
  kind: z.enum(['official_game_page', 'developer_interview', 'academic_repository', 'user_supplied_report', 'local_deterministic_research']),
  url: urlOrNull,
  localPath: z.union([nonEmpty, z.null()]),
  accessedAt: z.string().datetime({ offset: true }),
  confidence: z.enum(['high', 'medium', 'low']),
  observations: z.array(nonEmpty).min(2),
  reuseBoundary: nonEmpty,
}).strict().superRefine((value, context) => {
  if (value.url === null && value.localPath === null) context.addIssue({ code: 'custom', message: 'source requires url or localPath' });
});
const infrastructure = z.object({
  name: nonEmpty,
  version: nonEmpty,
  repositoryUrl: z.url(),
  immutableRevision: nonEmpty.refine((value) => !['main', 'master', 'latest', 'head'].includes(value.toLowerCase())),
  licenseSpdx: nonEmpty,
  directLicenseEvidence: z.url(),
  decision: z.enum(['REUSE', 'REFERENCE_ONLY', 'REJECT']),
  approvedScope: z.array(nonEmpty),
  platformFit: nonEmpty,
  attribution: nonEmpty,
}).strict().superRefine((value, context) => {
  if (value.decision === 'REUSE' && value.approvedScope.length === 0) context.addIssue({ code: 'custom', message: 'REUSE requires approvedScope' });
  if (value.decision !== 'REUSE' && value.approvedScope.length > 0) context.addIssue({ code: 'custom', message: 'non-REUSE cannot approve scope' });
});
const recommendation = z.object({
  id: nonEmpty,
  name: nonEmpty,
  decision: z.enum(['BUILDER_OPTIONAL', 'DEFER']),
  playerValue: nonEmpty,
  implementationCost: nonEmpty,
  testMethod: nonEmpty,
  notAdoptingReasons: z.array(nonEmpty).min(1),
}).strict();
const schema = z.object({
  schemaVersion: z.literal(1),
  artifactType: z.literal('monkey_mart_generic_mechanics_research'),
  status: z.literal('READ_ONLY_RESEARCH'),
  target: z.object({ runId: nonEmpty, workspace: nonEmpty, revision: nonEmpty, gameTitle: nonEmpty }).strict(),
  scope: z.object({ benchmark: z.literal('Monkey Mart'), purpose: nonEmpty, workspaceWriteAllowed: z.literal(false), newGameAllowed: z.literal(false) }).strict(),
  sources: z.array(source).min(4),
  genericMechanicRelationships: z.array(z.object({ input: nonEmpty, stateTransition: nonEmpty, downstreamPressure: nonEmpty, playerDecision: nonEmpty, satisfaction: nonEmpty, id: nonEmpty }).strict()).min(4),
  satisfactionCadence: z.array(z.object({ band: z.enum(['immediate', 'short_loop', 'first_complete_loop', 'meaningful_upgrade']), minSeconds: z.number().nonnegative(), maxSeconds: z.number().positive(), feedback: z.array(nonEmpty).min(2), sourceIds: z.array(nonEmpty).min(1) }).strict()).length(4),
  originalAdaptationPoints: z.array(nonEmpty).min(4),
  expressionBoundaries: z.object({ genericAllowed: z.array(nonEmpty).min(3), mustNotCopy: z.array(nonEmpty).min(4) }).strict(),
  openSourceInfrastructure: z.array(infrastructure).min(1),
  featureRecommendations: z.array(recommendation).max(3),
  conclusion: z.object({ lockedInsight: nonEmpty, implementationDecision: nonEmpty, platformClaim: nonEmpty }).strict(),
}).strict().superRefine((value, context) => {
  const ids = new Set(value.sources.map(({ id }) => id));
  for (const cadence of value.satisfactionCadence) {
    if (cadence.minSeconds > cadence.maxSeconds) context.addIssue({ code: 'custom', message: `invalid cadence ${cadence.band}` });
    for (const id of cadence.sourceIds) if (!ids.has(id)) context.addIssue({ code: 'custom', message: `unknown source ${id}` });
  }
  const recommendationIds = value.featureRecommendations.map(({ id }) => id);
  if (new Set(recommendationIds).size !== recommendationIds.length) context.addIssue({ code: 'custom', message: 'duplicate recommendation id' });
});

const artifactUrl = new URL('./monkey-mart-generic-research.json', import.meta.url);
schema.parse(JSON.parse(await readFile(artifactUrl, 'utf8')));
console.log('monkey-mart-generic-research:ok');
