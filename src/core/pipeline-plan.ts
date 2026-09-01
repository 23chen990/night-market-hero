import { PipelineModeSchema, PipelinePlanSchema, type PipelineMode, type PipelinePlan } from '../schemas/pipeline-plan.js';
import { StageNameSchema, type StageName } from '../schemas/index.js';

export { PipelinePlanSchema, PipelineModeSchema } from '../schemas/pipeline-plan.js';

const PROFILE_STAGES: Record<string, string[]> = {
  ACTION_FEEL: ['EXPERIENCE_CONTRACT', 'FEEL_PROTOTYPE', 'NATURAL_PLAY_QA', 'EXPERIENCE_REVIEW'],
  NARRATIVE_AGENCY: ['NARRATIVE_CONTRACT', 'STORY_VERTICAL_SLICE', 'CHOICE_CONSEQUENCE_QA', 'NARRATIVE_REVIEW', 'REPLAY_VALUE_QA'],
  STRATEGIC_SYSTEM: ['SYSTEMS_CONTRACT', 'SYSTEMS_PROTOTYPE', 'STRATEGY_QA', 'PROGRESSION_REVIEW'],
  PUZZLE_CLARITY: ['PUZZLE_CONTRACT', 'PUZZLE_PROTOTYPE', 'PUZZLE_FAIRNESS_QA', 'PUZZLE_REVIEW'],
  SOCIAL_EMOTION: ['NARRATIVE_CONTRACT', 'STORY_VERTICAL_SLICE', 'CHOICE_CONSEQUENCE_QA', 'NARRATIVE_REVIEW'],
  EXPLORATION_DISCOVERY: ['EXPERIENCE_CONTRACT', 'FEEL_PROTOTYPE', 'NATURAL_PLAY_QA', 'EXPERIENCE_REVIEW'],
};

/** All stages that provide profile-specific experience evidence. Keeping this
 * list derived from the routing table gives the control plane one canonical
 * way to detect a full-validation plan that would otherwise jump from the
 * generic core lock straight to art/build work. */
const PROFILE_STAGE_SET = new Set(Object.values(PROFILE_STAGES).flat());

export function missingMandatoryProfileStages(planValue: PipelinePlan, completedStages: readonly string[]): StageName[] {
  const plan = PipelinePlanSchema.parse(planValue);
  const completed = new Set(completedStages);
  return plan.mandatoryStages
    .filter((stage) => PROFILE_STAGE_SET.has(stage) && !completed.has(stage))
    .map((stage) => StageNameSchema.parse(stage));
}

export type ConstitutionStageOptions = {
  includeRelease?: boolean;
  certificationRequired?: boolean;
  presentationQualityRequired?: boolean;
  supplyChainRequired?: boolean;
  blindPlaytestRequired?: boolean;
};

/** Return the governance stages that a policy explicitly promotes to hard
 * gates.  Keeping this list in one place lets bootstrap, constitution and
 * release validation agree when an old run is resumed under a stricter
 * production profile. */
export function requiredGovernanceStages(options: ConstitutionStageOptions = {}): StageName[] {
  return [
    ...(options.presentationQualityRequired ? ['PRESENTATION_QA' as const] : []),
    ...(options.supplyChainRequired ? ['SUPPLY_CHAIN_QA' as const] : []),
    ...(options.blindPlaytestRequired ? ['BLIND_PLAYTEST_QA' as const] : []),
    ...(options.certificationRequired ? ['CERTIFICATION' as const] : []),
  ];
}

/** Identify a stale plan instead of silently upgrading it in place. Stage
 * plans are frozen inputs; an operator must intentionally create/migrate a
 * run when the effective production policy becomes stricter. */
export function missingRequiredGovernanceStages(planValue: PipelinePlan, options: ConstitutionStageOptions = {}): StageName[] {
  const plan = PipelinePlanSchema.parse(planValue);
  return requiredGovernanceStages(options).filter((stage) => !plan.mandatoryStages.includes(stage));
}

const OPTIONAL_GOVERNANCE_STAGES = new Set<StageName>(['PRESENTATION_QA', 'SUPPLY_CHAIN_QA', 'BLIND_PLAYTEST_QA', 'CERTIFICATION']);
const NON_TERMINAL_CONTROL_STAGES = new Set<StageName>(['CREATED', 'FAILED', 'ABANDONED', 'COMPLETED', 'NOT_GREENLIT', 'NO_PROTOTYPE_WINNER', 'DESIGN_REJECTED', 'PROTOTYPE_REVISION_REQUESTED']);
const DEFAULT_CONSTITUTION_STAGES: StageName[] = ['QA', 'FINAL_PROFILE_QA', 'NORMAL_FLOW_QA', 'VISUAL_EVIDENCE_QA', 'CONTENT_VARIATION_QA', 'RELEASE_CANDIDATE'];

/**
 * Return the stage audits that a strict release must contain for this exact
 * plan.  The old control plane used a hand-maintained list, which meant a new
 * mandatory stage could run without ever being checked by the constitution.
 * Optional governance stages are included only when their profile switch is
 * enabled; release itself is checked in the post-release evaluation.
 */
export function requiredStageContractsForPlan(planValue: PipelinePlan, options: ConstitutionStageOptions = {}): StageName[] {
  const plan = PipelinePlanSchema.parse(planValue);
  const includeRelease = options.includeRelease === true;
  const enabled = new Set<StageName>(requiredGovernanceStages(options));
  const stages = plan.mandatoryStages
    .map((stage) => StageNameSchema.parse(stage))
    .filter((stage) => !NON_TERMINAL_CONTROL_STAGES.has(stage))
    .filter((stage) => includeRelease || stage !== 'RELEASE')
    .filter((stage) => !OPTIONAL_GOVERNANCE_STAGES.has(stage) || enabled.has(stage));
  // A legacy plan may not have a pipeline artifact yet. Keep a conservative
  // fallback for callers migrating old runs, while never inventing optional
  // gates or a release audit before the release step.
  if (stages.length > 0) return stages;
  return DEFAULT_CONSTITUTION_STAGES.filter((stage) => includeRelease || stage !== 'RELEASE');
}

const FAST_SKIPPED = [
  'COMPETITOR_RESEARCH', 'IDEA_GENERATION', 'LOW_COST_FILTER', 'PROTOTYPE_SELECTION',
  'BUILD_3_PROTOTYPES', 'PLAYTEST_TOURNAMENT', 'WINNER_SELECTION',
];

// These are the minimum evidence-producing stages for any release lane.  The
// five completion gates are deliberately explicit so a plan cannot describe a
// successful build while omitting normal-flow, visual, variation or human
// evidence.
const RELEASE_CRITICAL = ['BUSINESS_PREFLIGHT', 'PRODUCTION_LINE_REVIEW', 'FACTORY_EVAL', 'OPEN_SOURCE_RESEARCH', 'FULL_BUILD', 'QA', 'FINAL_PROFILE_QA', 'NORMAL_FLOW_QA', 'VISUAL_EVIDENCE_QA', 'CONTENT_VARIATION_QA', 'QUALITY_BASELINE_QA', 'ORIGINALITY_REVIEW', 'CERTIFICATION', 'COST_GATE', 'PLATFORM_ADAPTER_QA', 'TARGET_PLATFORM_QA', 'RELEASE_CANDIDATE', 'WAITING_FOR_HUMAN_PLAYTEST', 'RELEASE'];

/** Branch-independent order used for plan validation (the enum declaration is
 * intentionally grouped by feature and is not a workflow ordering). */
export const CANONICAL_STAGE_ORDER: StageName[] = [
  'CREATED', 'BUSINESS_PREFLIGHT', 'PRODUCTION_LINE_REVIEW', 'FACTORY_EVAL',
  'REFERENCE_DEEP_RESEARCH', 'REFERENCE_MECHANIC_LOCK', 'WAITING_FOR_REFERENCE_APPROVAL',
  'COMPETITOR_RESEARCH', 'IDEA_GENERATION', 'LOW_COST_FILTER', 'PROTOTYPE_SELECTION',
  'BUILD_3_PROTOTYPES', 'PLAYTEST_TOURNAMENT', 'WINNER_SELECTION', 'WAITING_FOR_PROTOTYPE_APPROVAL',
  'NO_PROTOTYPE_WINNER', 'PROTOTYPE_REVISION_REQUESTED', 'DESIGN_REJECTED',
  'ACTION_EXPERIMENT_SPEC', 'BUILD_ACTION_PROTOTYPES', 'PLAYTEST_ACTION_PROTOTYPES',
  'WAITING_FOR_ACTION_APPROVAL', 'ACTION_EXPERIMENT_APPROVED', 'ACTION_EXPERIMENT_REFACTOR',
  'ACTION_EXPERIMENT_KILLED', 'OPEN_SOURCE_RESEARCH', 'PRODUCTION_COST_REVIEW',
  'IAA_MONETIZATION_REVIEW', 'IAA_REVIEW', 'GREENLIGHT_GATE', 'NOT_GREENLIT', 'BLUEPRINT',
  'EXPERIENCE_CONTRACT', 'EXPERIENCE_HYPOTHESIS', 'GRAYBOX_CORE', 'CORE_SPEC_FROZEN',
  'FEEL_PROTOTYPE', 'NATURAL_PLAY_QA', 'EXPERIENCE_REVIEW', 'FEEL_REPAIR',
  'NARRATIVE_CONTRACT', 'STORY_VERTICAL_SLICE', 'CHOICE_CONSEQUENCE_QA', 'NARRATIVE_REVIEW',
  'REPLAY_VALUE_QA', 'SYSTEMS_CONTRACT', 'SYSTEMS_PROTOTYPE', 'STRATEGY_QA', 'PROGRESSION_REVIEW',
  'PUZZLE_CONTRACT', 'PUZZLE_PROTOTYPE', 'PUZZLE_FAIRNESS_QA', 'PUZZLE_REVIEW',
  'CONTENT_EXPANSION', 'UI_SKELETON', 'ART_DIRECTIONS', 'WAITING_FOR_CODEX_IMAGEGEN',
  'WAITING_FOR_ART_APPROVAL', 'STYLE_LOCK', 'ASSETS', 'POLISH_VERTICAL_SLICE', 'FULL_BUILD',
  'BUILD', 'QA', 'FIX', 'FINAL_PROFILE_QA', 'NORMAL_FLOW_QA', 'VISUAL_EVIDENCE_QA',
  'CONTENT_VARIATION_QA', 'QUALITY_BASELINE_QA', 'PRESENTATION_QA', 'SUPPLY_CHAIN_QA',
  'ORIGINALITY_REVIEW', 'CERTIFICATION', 'COST_GATE', 'PLATFORM_ADAPTER_QA', 'TARGET_PLATFORM_QA',
  'RELEASE_CANDIDATE', 'BLIND_PLAYTEST_QA', 'WAITING_FOR_HUMAN_PLAYTEST',
  'ACCEPTANCE_REVIEW',
  'RELEASE', 'LIVE_MONITORING', 'LIVE_VERIFIED', 'LAUNCH_METRICS', 'ABANDONED', 'COMPLETED', 'FAILED',
];

export function buildPipelinePlan(input: { mode?: PipelineMode; designMode: 'reference_reskin' | 'prototype_tournament'; productionLine: string; primaryProfile?: string; presentationQualityRequired?: boolean; supplyChainRequired?: boolean; blindPlaytestRequired?: boolean }): PipelinePlan {
  const mode = PipelineModeSchema.parse(input.mode ?? 'fast-reskin');
  const profileStages = PROFILE_STAGES[input.primaryProfile ?? ''] ?? [];
  // The fast lane relies on the validated mother-template contract; specialist
  // profile stages are still recorded as optional evidence and can be promoted
  // when the request or risk level warrants it. Full validation runs the whole
  // profile-specific chain.
  const profileMandatory = mode === 'full-validation' ? profileStages : [];
  const profileOptional = mode === 'fast-reskin' ? profileStages : [];
  const common = [
    'BUSINESS_PREFLIGHT',
    'PRODUCTION_LINE_REVIEW',
    'FACTORY_EVAL',
    ...(input.designMode === 'reference_reskin' ? ['REFERENCE_DEEP_RESEARCH', 'REFERENCE_MECHANIC_LOCK', 'WAITING_FOR_REFERENCE_APPROVAL'] : []),
    // `prototype_tournament` is an explicit legacy/experimental entry point.
    // It still executes its bounded tournament in the fast lane, so the plan
    // must describe those stages instead of claiming they were skipped.
    ...(input.designMode === 'prototype_tournament' ? ['COMPETITOR_RESEARCH', 'IDEA_GENERATION', 'LOW_COST_FILTER', 'PROTOTYPE_SELECTION', 'BUILD_3_PROTOTYPES', 'PLAYTEST_TOURNAMENT', 'WINNER_SELECTION', 'WAITING_FOR_PROTOTYPE_APPROVAL'] : []),
    'OPEN_SOURCE_RESEARCH',
    'IAA_REVIEW', 'BLUEPRINT', 'EXPERIENCE_CONTRACT', 'EXPERIENCE_HYPOTHESIS', 'CORE_SPEC_FROZEN', ...profileMandatory,
    'CONTENT_EXPANSION', 'UI_SKELETON', 'ART_DIRECTIONS', 'WAITING_FOR_ART_APPROVAL', 'STYLE_LOCK', 'ASSETS',
    'FULL_BUILD', 'QA', 'FINAL_PROFILE_QA', 'NORMAL_FLOW_QA', 'VISUAL_EVIDENCE_QA', 'CONTENT_VARIATION_QA', 'QUALITY_BASELINE_QA',
    ...(input.presentationQualityRequired ? ['PRESENTATION_QA'] : []),
    ...(input.supplyChainRequired ? ['SUPPLY_CHAIN_QA'] : []),
    'ORIGINALITY_REVIEW', 'CERTIFICATION', 'COST_GATE', 'PLATFORM_ADAPTER_QA', 'TARGET_PLATFORM_QA', 'RELEASE_CANDIDATE',
    ...(input.blindPlaytestRequired || process.env.FACTORY_BLIND_PLAYTEST_REQUIRED === '1' ? ['BLIND_PLAYTEST_QA'] : []),
    'WAITING_FOR_HUMAN_PLAYTEST', 'ACCEPTANCE_REVIEW', 'RELEASE',
  ];
  const mandatoryStages = [...new Set(common)];
  const skippedStages = mode === 'fast-reskin' ? FAST_SKIPPED.filter((stage) => !mandatoryStages.includes(stage)) : [];
  const optionalGovernance = [
    ...(input.presentationQualityRequired ? [] : ['PRESENTATION_QA']),
    ...(input.supplyChainRequired ? [] : ['SUPPLY_CHAIN_QA']),
    ...(input.blindPlaytestRequired || process.env.FACTORY_BLIND_PLAYTEST_REQUIRED === '1' ? [] : ['BLIND_PLAYTEST_QA']),
  ];
  return PipelinePlanSchema.parse({
    schemaVersion: 1,
    mode,
    designMode: input.designMode,
    productionLine: input.productionLine,
    mandatoryStages,
    skippedStages,
    optionalStages: [...new Set([...profileOptional, ...optionalGovernance])].filter((stage) => !mandatoryStages.includes(stage)),
    humanApprovalSessions: ['GO_NO_GO', 'CORE_DEMO', 'FINAL_RELEASE'],
    releaseCriticalStages: [...new Set([
      ...RELEASE_CRITICAL,
      ...(input.presentationQualityRequired ? ['PRESENTATION_QA'] : []),
      ...(input.supplyChainRequired ? ['SUPPLY_CHAIN_QA'] : []),
    ])],
    rationale: mode === 'fast-reskin'
      ? input.designMode === 'prototype_tournament'
        ? 'Use the explicitly requested bounded prototype tournament, then retain business, rights, build, five acceptance, platform and release gates.'
        : 'Use a validated mother template and skip exploratory ideation, while retaining business, rights, build, five acceptance, platform and release gates.'
      : 'Run the full evidence path, including independent idea and prototype comparison, before production.',
  });
}

/** Validate a plan before it can become the run's source of truth. */
export function validatePipelinePlan(value: unknown): PipelinePlan {
  const plan = PipelinePlanSchema.parse(value);
  const validateNames = (stages: string[], label: string) => {
    for (const stage of stages) {
      if (!StageNameSchema.safeParse(stage).success) throw new Error(`${label} contains unknown stage ${stage}`);
    }
    if (new Set(stages).size !== stages.length) throw new Error(`${label} contains duplicate stages`);
  };
  validateNames(plan.mandatoryStages, 'mandatoryStages');
  validateNames(plan.skippedStages, 'skippedStages');
  validateNames(plan.optionalStages, 'optionalStages');
  validateNames(plan.releaseCriticalStages, 'releaseCriticalStages');
  if (plan.mandatoryStages.length === 0) throw new Error('pipeline plan must have mandatory stages');
  const order = new Map(CANONICAL_STAGE_ORDER.map((stage, index) => [stage, index]));
  const canonicalMandatory = plan.mandatoryStages.map((stage) => StageNameSchema.parse(stage));
  const nonMonotonic = canonicalMandatory.some((stage, index) => index > 0 && (order.get(stage) ?? 0) < (order.get(canonicalMandatory[index - 1]!) ?? 0));
  if (nonMonotonic) throw new Error('mandatoryStages must follow the canonical stage order');
  for (const stage of plan.releaseCriticalStages) if (!plan.mandatoryStages.includes(stage)) throw new Error(`release-critical stage ${stage} must be mandatory`);
  return plan;
}

export function isStagePlanned(planValue: PipelinePlan, stageValue: StageName): 'mandatory' | 'optional' | 'skipped' | 'unlisted' {
  const plan = PipelinePlanSchema.parse(planValue); const stage = StageNameSchema.parse(stageValue);
  if (plan.mandatoryStages.includes(stage)) return 'mandatory';
  if (plan.optionalStages.includes(stage)) return 'optional';
  if (plan.skippedStages.includes(stage)) return 'skipped';
  return 'unlisted';
}

export function isStageMandatory(planValue: PipelinePlan, stage: string): boolean {
  const plan = PipelinePlanSchema.parse(planValue);
  return plan.mandatoryStages.includes(stage);
}

export type StageExecutionPolicy = {
  allowed: boolean;
  classification: 'mandatory' | 'optional' | 'skipped' | 'unlisted' | 'legacy';
};

/**
 * Decide whether a stage may execute under the frozen plan.  A stage that is
 * skipped or absent is a policy violation, rather than an invitation to run
 * an unplanned side path.  Runs created before pipeline-plan existed can opt
 * into the explicit legacy fallback so they remain resumable.
 */
export function stageExecutionPolicy(planValue: PipelinePlan | undefined, stageValue: StageName, options: { legacyPlan?: boolean } = {}): StageExecutionPolicy {
  const stage = StageNameSchema.parse(stageValue);
  if (!planValue) return options.legacyPlan ? { allowed: true, classification: 'legacy' } : { allowed: false, classification: 'unlisted' };
  const classification = isStagePlanned(planValue, stage);
  return { allowed: classification === 'mandatory' || classification === 'optional', classification };
}

export function assertStagePlannedOrLegacy(planValue: PipelinePlan | undefined, stageValue: StageName, options: { legacyPlan?: boolean } = {}): StageExecutionPolicy {
  const policy = stageExecutionPolicy(planValue, stageValue, options);
  if (!policy.allowed) throw new Error(`Stage ${stageValue} is ${policy.classification} in the frozen pipeline plan`);
  return policy;
}
