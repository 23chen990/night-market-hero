import { appendFile, lstat, mkdir, readFile, realpath, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { ArtDirectorAgent, AssetProducerAgent, BuilderAgent, CompetitorResearchAgent, FixerAgent, GreenlightAgent, IaaMonetizationReviewerAgent, OpenSourceResearchAgent, ProducerAgent, ProductionCostReviewerAgent, QAAgent, ReleaseAgent, StyleLockAgent } from './agents/index.js';
import { createArtReview } from './core/art-review.js';
import { exists, listFiles, sha256File, sha256Text, writeJsonAtomic } from './core/files.js';
import { redactText, redactValue } from './core/redaction.js';
import { RequestRouter } from './core/request-router.js';
import { FeedbackLessonsLoop } from './core/feedback-lessons.js';
import { FileRunStore } from './core/run-store.js';
import { MAX_FIX_ATTEMPTS } from './core/state-machine.js';
import { buildContextPacket, buildHandoffPacket } from './core/context-budget.js';
import { classifyModelFailure, executionPolicyForAttempt, executionPolicyForStage, modelPolicySignature } from './core/model-policy.js';
import { sanitizeUntrustedText } from './core/security-boundary.js';
import { assertExecutionContext, assertSafeContextInputPath } from './core/execution-boundary.js';
import { inferProductionLineDecisionFromText, inferProductionLineFromText, lockProductionLine, ProductionLineContractSchema } from './core/production-lines.js';
import { mergeOperatingProfile } from './core/operating-profile.js';
import { buildBusinessPreflightTemplate, evaluateOperatingGates } from './core/operating-gates.js';
import { buildPlatformReleaseMatrix, evaluateCostGate, evaluatePlatformQa, evaluatePlatformReleaseMatrix, makeFailureReport, makeGrowthExperiment, decideGrowthExperiment } from './core/factory-operating.js';
import { buildFeedbackRegressionSignature, collectFactorySourceEntries, defaultFactoryEvalCases, FACTORY_EVAL_SOURCE_PATHS, FACTORY_EVAL_SUITE_VERSION, buildFactorySourceSignature, feedbackRegressionEvalCases, mergeFactoryEvalCases, parseFactoryEvalCasesFile, runFactoryEvalSuite } from './core/factory-eval.js';
import { assertStagePlannedOrLegacy, buildPipelinePlan, CANONICAL_STAGE_ORDER, missingMandatoryProfileStages, missingRequiredGovernanceStages, requiredStageContractsForPlan } from './core/pipeline-plan.js';
import { validatePipelinePlan } from './core/pipeline-plan.js';
import { buildOriginalityTemplate, evaluateOriginality } from './core/originality.js';
import { evaluateQualityBaseline, QUALITY_BASELINE_CHECKS } from './core/quality-baseline.js';
import { buildCertificationChecklist, evaluateCertificationChecklist, decideLaunchDisposition, evaluateAbandonment } from './core/launch-operations.js';
import { buildPlatformSpineContract, evaluatePlatformSpine } from './core/platform-spine.js';
import { auditAssetFiles, evaluateArtQualityGate } from './core/art-quality.js';
import { buildReferenceEvidencePack, evaluateReferenceEvidence, referenceBlockersRequirePause } from './core/reference-evidence.js';
import { snapshotModelPolicy, buildModelRouteDecision } from './core/model-policy-artifact.js';
import { assertPermissionOperation, buildPermissionManifestBundle, evaluatePermissionManifest, evaluatePermissionManifestBundle } from './core/permission-manifest.js';
import { buildRandomnessPolicy } from './core/randomness-policy.js';
import { createArtifactLedger, recordArtifact, evaluateArtifactLedger, invalidateArtifacts, reconcileArtifactLedger } from './core/artifact-ledger.js';
import { buildArtifactMetadata } from './core/artifact-metadata.js';
import { buildHumanApprovalLedger, buildHumanApprovalPlan, buildScheduledApprovalRecord, evaluateHumanApprovalLedgerArtifact, evaluateHumanApprovalRecords } from './core/human-approval.js';
import { promoteReleaseLifecycle, promoteReleaseLifecycleThrough } from './core/release-lifecycle.js';
import { buildIaaContract, evaluateIaaContract } from './core/iaa-contract.js';
import { buildDifferentiationContract, evaluateDifferentiationContract } from './core/differentiation.js';
import { getStageContract, evaluateStageContract, evaluateStageSideEffects, contractPathMatches, validateStageModelTier, evaluateStageContractRegistry } from './core/stage-contracts.js';
import { buildCompletionGateReport } from './qa/experience-gates.js';
import { bindReleaseCandidateAcceptance, packageReleaseCandidate, verifyFrozenCandidate } from './core/release.js';
import { bindNaturalFlowEvidence, bindQaEvidence } from './core/qa-evidence.js';
import { buildUnknownRegister, evaluateUnknownRegister } from './core/unknowns.js';
import { buildPlatformPackageSet, evaluatePlatformPackageSet, markPlatformPackageReady, verifyPlatformPackageArtifact } from './core/platform-packaging.js';
import { buildPresentationQualityTemplate, evaluatePresentationQuality } from './core/presentation-evidence.js';
import { buildBuildProvenance, buildDependencyManifest, buildSbom, buildSupplyChainManifest, evaluateSupplyChainManifest, hashSupplyChainArtifact } from './core/supply-chain.js';
import { buildDependencyPolicy, evaluateDependencyPolicy } from './core/dependency-policy.js';
import { buildPortfolioStrategy, evaluatePortfolioGate, updatePortfolioStrategy } from './core/portfolio-strategy.js';
import { beginSideEffect, buildSideEffectJournal, buildSideEffectJournalEvaluation, completeSideEffect, failSideEffect, reconcileSideEffect } from './core/side-effect-journal.js';
import { evaluateBlindPlaytest } from './core/blind-playtest.js';
import { buildExperienceHypothesis, freezeCoreSpec } from './core/experience-hypothesis.js';
import { buildControlStageAudit } from './core/control-stage-audit.js';
import { evaluateTransitionHistory } from './core/state-machine.js';
import { buildContentExpansionPlan, buildUiSkeleton } from './core/experience-production.js';
import { buildBusinessStrategy } from './core/business-strategy.js';
import { buildLiveVerification, evaluateLiveVerification } from './core/live-verification.js';
import { buildProfileQaReport, canonicalProfileDimension, profileDimensionForEvidence, profileForBlueprint } from './core/profile-qa.js';
import { buildProductionLinePlayPlan, evaluateProductionLinePlayEvidence } from './qa/production-line-qa.js';
import { buildPlatformPolicyEvaluation, buildPlatformPolicyTemplate, platformPolicyHash } from './core/platform-policy.js';
import { ProductionLinePlayEvidenceSchema, ProductionLinePlayEvaluationSchema } from './schemas/production-line-qa.js';
import { buildVariationCoverageObservation, buildVariationCoveragePlan, evaluateVariationCoverage } from './core/variation-coverage.js';
import { accountPortfolioHash, buildAccountCapacityPlan, canonicalAccountPortfolio, deriveActiveCountsFromPortfolio, evaluateAccountCapacity, evaluateAccountCapacityPortfolioBinding } from './core/account-capacity.js';
import { costRateCardFromEnv, deriveCostUsage, evaluateCostPreflight, projectStageUsage, reserveForStage } from './core/cost-accounting.js';
import { routeFailureClassFromMessage, routeFailureToEarliestStage } from './core/failure-routing.js';
import { buildProfileExperienceBundle, evaluateProfileExperienceBundle } from './core/profile-contract.js';
import { evaluateProductionLineCapability } from './core/production-line-capability.js';
import { FACTORY_CONSTITUTION, evaluateFactoryConstitution } from './core/factory-constitution.js';
import { buildQualityGateMatrix, profileQaSignal } from './core/quality-gates.js';
import { evaluateCompetitorResearchEvidence, researchBlockersRequirePause } from './core/research-evidence.js';
import { buildNaturalInputPolicy, evaluateNaturalFlowAgainstPolicy } from './core/natural-input-policy.js';
import { getDownstreamArtifactPaths, getDownstreamStages } from './core/downstream-stages.js';
import { RuntimeProductGateSchema, deriveRuntimeProductGate, verifyRuntimeWiredFiles } from './core/runtime-product-gates.js';
import { CoreSpecLockSchema, ExperienceHypothesisSchema } from './schemas/experience-hypothesis.js';
import { InteractionContinuityContractSchema } from './schemas/interaction-continuity.js';
import { AccountCapacityPlanSchema, BlindPlaytestSchema, ContentExpansionPlanSchema, DependencyPolicySchema, PlatformPackageSetSchema, PortfolioGateEvaluationSchema, PortfolioStrategySchema, PresentationQualityReportSchema, ProductionLineDecisionSchema, ProfileExperienceBundleSchema, SideEffectCommandSchema, SideEffectJournalSchema, SupplyChainManifestSchema, UiSkeletonSchema, UnknownRegisterSchema, StageNameSchema, PlatformPolicySnapshotSchema } from './schemas/index.js';
import { MockAgentProvider, MockCodexProvider, MockImageProvider } from './providers/mock.js';
import type { AgentProvider, AgentCallMetrics, CodexProvider, ImageProvider } from './providers/interfaces.js';
import { OpenAIAgentProvider, OpenAIImageProvider, ProviderOutputError } from './providers/real.js';
import { CodexAccountProvider, type CodexExecutor } from './providers/codex-account.js';
import { CodexCliProvider, parseCodexJsonl } from './providers/codex-cli.js';
import { CodexImagegenPendingError, CodexImagegenProvider } from './providers/codex-imagegen.js';
import { LocalRuntimeProvider, MockQAProvider, PlaywrightQAProvider } from './providers/runtime-qa.js';
import { AccountPortfolioSchema, ArtApprovalSchema, ArtDirectionsSchema, ArtPreviewManifestSchema, AssetManifestSchema, BusinessPreflightSchema, CompetitorResearchSchema, ContentVariationReportSchema, CostAdjustmentEntrySchema, CostAdjustmentLedgerSchema, CostBudgetSchema, CostRateCardSchema, FormalPrototypeBuildReportSchema, FormalPrototypeFollowupConstraintsSchema, GameBlueprintSchema, GameplayRevisionLockSchema, HumanPlaytestAcceptanceSchema, HumanReferenceDecisionSchema, IaaContractSchema, OpenSourceResearchArtifactSchema, OpenSourceResearchSchema, PlatformQaSubmissionSchema, PlatformReleaseMatrixSchema, QaReportSchema, ReferenceMechanicSpecSchema, ReleaseCandidateSchema, StateTransitionRecordSchema, StateTransitionReportSchema, StyleLockSchema, QualityBaselineReportSchema, OriginalityDeclarationSchema, CertificationChecklistSchema, LaunchMetricSnapshotSchema, PlatformSpineContractSchema, PermissionManifestBundleSchema, PermissionManifestSchema, ReleaseLifecycleSchema, ReleaseLifecycleStatusSchema, ExperienceReviewReportSchema, type CompetitorResearch, type GameBlueprint, type GameplayRevisionLock, type ReferenceMechanicSpec, type RunState, type StageName, type StageRecord } from './schemas/index.js';
import type { FactoryOperatingProfile } from './schemas/operating-profile.js';
import { StructuredFeedbackSchema } from './schemas/feedback.js';
import { HumanApprovalLedgerSchema, HumanApprovalRecordSchema } from './schemas/human-approval.js';
import { ActionMechanicExperimentBundleSchema, ActionMechanicExperimentSpecSchema, ActionPlaytestReportSchema, ActionPrototypeBuildReportSchema, HumanActionMechanicDecisionSchema } from './schemas/action-mechanic-experiment.js';
import { HumanPrototypeDecisionSchema, IdeaGenerationSchema, LowCostFilterSchema, PlaytestTournamentSchema, PrototypeBuildReportSchema, PrototypeHumanReviewSchema, PrototypeSelectionSchema, WinnerSelectionSchema, type GameplayIdea } from './schemas/gameplay-experiment.js';

export type FactoryMode = 'mock' | 'live-art' | 'codex-account';
export type FactoryValidationMode = 'fast' | 'production';
export type FactoryOptions = { root?: string; repositoryRoot?: string; mode?: FactoryMode; qaMode?: 'stub' | 'playwright'; validationMode?: FactoryValidationMode; enforcePlayerAcceptance?: boolean; enforceOperatingGates?: boolean; enforceStageContracts?: boolean; enforceExplicitStageContracts?: boolean; operatingProfile?: Partial<FactoryOperatingProfile>; agentProvider?: AgentProvider; previewImageProvider?: ImageProvider; assetImageProvider?: ImageProvider; codexProvider?: CodexProvider; codexExecutor?: CodexExecutor };

// Provider usage is a rolling audit summary, not an immutable stage output.
// Keep it out of drift-triggered rewinds while retaining the file for cost and
// observability reports.
// These files are intentionally mutable operational projections.  They are
// useful audit outputs, but their contents change as a run is promoted,
// resumed, or measured after launch.  Treating them as immutable build inputs
// would create false drift and reopen an otherwise completed run.
const VOLATILE_LEDGER_ARTIFACTS = ['artifacts/provider-usage.json', 'artifacts/release-lifecycle.json', 'artifacts/side-effect-evaluation.json'] as const;

/** Internal control-flow signal: a cost guard has already persisted a safe
 * terminal/waiting state, so the public run/resume API should return that state
 * instead of surfacing an implementation exception. */
class CostGateStopSignal extends Error {
  constructor(readonly state: RunState, readonly reportPath = 'artifacts/cost-preflight.json') {
    super('factory run stopped by cost preflight');
    this.name = 'CostGateStopSignal';
  }
}

function isStrictChildPath(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative.length > 0 && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

export async function loadGameplayRevisionForBuild(runRoot: string, blueprint: GameBlueprint): Promise<GameplayRevisionLock | undefined> {
  const parsedBlueprint = GameBlueprintSchema.parse(blueprint);
  const reference = parsedBlueprint.gameplayRevision;
  if (!reference) return undefined;

  const resolvedRunRoot = path.resolve(runRoot);
  const actualRunId = path.basename(resolvedRunRoot);
  if (reference.targetRunId !== actualRunId) {
    throw new Error(`Gameplay revision targetRunId ${reference.targetRunId} does not match target run ${actualRunId}`);
  }

  const artifactsRoot = path.resolve(resolvedRunRoot, 'artifacts');
  const artifactFile = path.resolve(resolvedRunRoot, reference.artifactPath);
  if (!isStrictChildPath(artifactsRoot, artifactFile)) {
    throw new Error(`Gameplay revision artifact must stay inside the target run artifacts directory: ${reference.artifactPath}`);
  }

  const artifactsStat = await lstat(artifactsRoot);
  if (!artifactsStat.isDirectory() || artifactsStat.isSymbolicLink()) {
    throw new Error('Gameplay revision artifacts directory must be a real directory, not a symlink');
  }
  const artifactStat = await lstat(artifactFile);
  if (!artifactStat.isFile() || artifactStat.isSymbolicLink()) {
    throw new Error('Gameplay revision artifact must be a regular JSON file, not a symlink');
  }

  const [realArtifactsRoot, realArtifactFile] = await Promise.all([realpath(artifactsRoot), realpath(artifactFile)]);
  if (!isStrictChildPath(realArtifactsRoot, realArtifactFile)) {
    throw new Error('Gameplay revision artifact resolved outside the target run artifacts directory');
  }

  const revision = GameplayRevisionLockSchema.parse(JSON.parse(await readFile(realArtifactFile, 'utf8')));
  for (const field of ['revisionId', 'targetRunId', 'title'] as const) {
    if (revision[field] !== reference[field]) {
      throw new Error(`Gameplay revision ${field} ${revision[field]} does not match blueprint reference ${reference[field]}`);
    }
  }
  if (revision.title !== parsedBlueprint.title) {
    throw new Error(`Gameplay revision title ${revision.title} does not match blueprint title ${parsedBlueprint.title}`);
  }
  return revision;
}

export function createFactory(options: FactoryOptions = {}) {
  const repositoryRoot = options.repositoryRoot ?? process.cwd(); const root = options.root ?? repositoryRoot; const configuredMode = options.mode ?? process.env.FACTORY_MODE ?? 'mock';
  if (configuredMode !== 'mock' && configuredMode !== 'live-art' && configuredMode !== 'codex-account') throw new Error(`Unsupported FACTORY_MODE: ${configuredMode}`);
  const mode: FactoryMode = configuredMode;
  const qaMode = options.qaMode ?? 'playwright';
  const configuredValidationMode = options.validationMode ?? process.env.FACTORY_VALIDATION_MODE;
  if (configuredValidationMode !== undefined && configuredValidationMode !== 'fast' && configuredValidationMode !== 'production') throw new Error(`Unsupported FACTORY_VALIDATION_MODE: ${configuredValidationMode}`);
  // Mock/stub runs are intentionally cheap fixtures.  A real browser run is a
  // production candidate by default, so it cannot accidentally skip the
  // operating, stage-contract and human-acceptance gates.  Every flag remains
  // explicitly overridable for local diagnostics and migration of old runs.
  const validationMode: FactoryValidationMode = configuredValidationMode ?? (mode === 'mock' || qaMode === 'stub' ? 'fast' : 'production');
  const enforcePlayerAcceptance = options.enforcePlayerAcceptance ?? (process.env.FACTORY_ENFORCE_ACCEPTANCE !== undefined ? process.env.FACTORY_ENFORCE_ACCEPTANCE === '1' : validationMode === 'production');
  const enforceOperatingGates = options.enforceOperatingGates ?? (process.env.FACTORY_ENFORCE_OPERATING_GATES !== undefined ? process.env.FACTORY_ENFORCE_OPERATING_GATES === '1' : validationMode === 'production');
  const enforceStageContracts = options.enforceStageContracts ?? (process.env.FACTORY_ENFORCE_STAGE_CONTRACTS !== undefined ? process.env.FACTORY_ENFORCE_STAGE_CONTRACTS === '1' : validationMode === 'production');
  const enforceExplicitStageContracts = options.enforceExplicitStageContracts ?? (process.env.FACTORY_ENFORCE_EXPLICIT_STAGE_CONTRACTS !== undefined ? process.env.FACTORY_ENFORCE_EXPLICIT_STAGE_CONTRACTS === '1' : validationMode === 'production');
  const operatingProfile = mergeOperatingProfile(options.operatingProfile ?? {});
  const store = new FileRunStore(root);
  // Set only while a run is executing; begin() uses this frozen plan to stop
  // accidental legacy side paths. A missing plan is tolerated for old runs,
  // but is recorded as an explicit legacy fallback.
  let activePipelinePlan: ReturnType<typeof validatePipelinePlan> | undefined;
  let activePlanIsLegacy = false;
  const requestRouter = new RequestRouter();
  const feedbackLessons = new FeedbackLessonsLoop(root, store, requestRouter);
  const codexExecutor = mode === 'codex-account' ? options.codexExecutor ?? new CodexCliProvider() : undefined;
  const codexAccount = codexExecutor ? new CodexAccountProvider(codexExecutor) : undefined;
  const artMode = process.env.ART_PROVIDER ?? (mode === 'codex-account' ? 'codex-imagegen' : 'mock');
  if (artMode !== 'mock' && artMode !== 'codex-imagegen') throw new Error(`Unsupported ART_PROVIDER: ${artMode}`);
  if (mode === 'codex-account' && artMode === 'mock' && !options.previewImageProvider) throw new Error('FACTORY_MODE=codex-account cannot silently use ART_PROVIDER=mock; use ART_PROVIDER=codex-imagegen');
  const agents = options.agentProvider ?? (mode === 'live-art' ? new OpenAIAgentProvider() : mode === 'codex-account' ? codexAccount! : new MockAgentProvider());
  const previewImages = options.previewImageProvider ?? (mode === 'live-art' ? new OpenAIImageProvider() : artMode === 'codex-imagegen' ? new CodexImagegenProvider() : new MockImageProvider());
  const assetImages = options.assetImageProvider ?? (artMode === 'codex-imagegen' ? new CodexImagegenProvider() : new MockImageProvider());
  const codex = options.codexProvider ?? (mode === 'codex-account' ? codexAccount! : new MockCodexProvider());
  const runtimeProvider = new LocalRuntimeProvider(repositoryRoot);
  const webRuntime = runtimeProvider.runtime('web-lite');
  let runtime = webRuntime;
  let selectedRuntimeName: 'web-lite' | 'cocos-3d' = 'web-lite';
  const qaProvider = qaMode === 'playwright' ? new PlaywrightQAProvider() : new MockQAProvider();
  const competitorResearchAgent = new CompetitorResearchAgent(agents); const openSourceResearchAgent = new OpenSourceResearchAgent(agents); const productionCostReviewerAgent = new ProductionCostReviewerAgent(agents); const iaaMonetizationReviewerAgent = new IaaMonetizationReviewerAgent(agents); const greenlightAgent = new GreenlightAgent(agents); const producerAgent = new ProducerAgent(agents); const artDirectorAgent = new ArtDirectorAgent(agents); const styleLockAgent = new StyleLockAgent(agents); const assetProducerAgent = new AssetProducerAgent(assetImages); let builderAgent = new BuilderAgent(codex, runtime); let qaAgent = new QAAgent(qaProvider, runtime); let fixerAgent = new FixerAgent(codex, runtime); const releaseAgent = new ReleaseAgent();

  /** Select the runtime declared by the seed before touching a generated game. */
  function selectRuntime(name: 'web-lite' | 'cocos-3d') {
    if (selectedRuntimeName === name) return;
    runtime = name === 'cocos-3d' ? runtimeProvider.runtime('cocos-3d') : webRuntime;
    selectedRuntimeName = name;
    builderAgent = new BuilderAgent(codex, runtime);
    qaAgent = new QAAgent(qaProvider, runtime);
    fixerAgent = new FixerAgent(codex, runtime);
  }

  /** Build a bounded, sanitized handoff packet. Providers must never receive a raw transcript. */
  async function contextFor(stage: StageName, runRoot: string, outputPath: string, inputPaths: string[], summary: string) {
    // `begin()` persists the incremented attempt before a provider is called.
    // Read that small state record here so retries use the same model route that
    // is written to the audit artifact. We intentionally pass only the failure
    // class, never the raw previous error, into the provider context.
    let attempt = 1;
    let failureKind: Parameters<typeof executionPolicyForAttempt>[2] = 'CAPABILITY_ERROR';
    let previousStage = 'CREATED';
    try {
      const persisted = JSON.parse(await readFile(path.join(runRoot, 'state.json'), 'utf8')) as { stages?: Record<string, { attempts?: number; errors?: string[] }>; transitionHistory?: Array<{ from?: unknown; to?: unknown }> };
      const record = persisted.stages?.[stage];
      attempt = Math.max(1, Math.trunc(record?.attempts ?? 1));
      const previousError = record?.errors?.at(-1);
      if (previousError) failureKind = classifyModelFailure(previousError);
      const transition = persisted.transitionHistory?.at(-1);
      if (transition && transition.to === stage && typeof transition.from === 'string' && transition.from.trim()) previousStage = transition.from;
    } catch { /* legacy/incomplete state uses the declared first-attempt route */ }
    const routeContract = getStageContract(stage);
    const policy = executionPolicyForAttempt(stage, attempt, failureKind, routeContract.allowedModelTiers);
    const routeCheck = validateStageModelTier(routeContract, policy.tier);
    if (!routeCheck.passed && (enforceStageContracts || enforceOperatingGates)) {
      throw new Error(`model route for ${stage} is outside its stage contract: ${routeCheck.blockers.join(', ')}`);
    }
    const safeInputPaths = inputPaths.map((inputPath) => assertSafeContextInputPath(inputPath));
    const manifestBundle = await store.readArtifact(path.basename(runRoot), 'permission-manifest.json').catch(() => undefined);
    // A manifest is a closed-world capability inventory, not an optional
    // hint. Validate the complete inventory on every provider boundary so a
    // deleted or partially-written entry can never become an implicit allow
    // on the cheap lane. Research host allow-lists are checked below for the
    // selected stage; validating the inventory itself without that requirement
    // keeps local/mock runs usable while network operations still fail closed.
    const bundleCheck = evaluatePermissionManifestBundle(manifestBundle, {
      requiredStages: StageNameSchema.options,
      requireResearchAllowlist: false,
    });
    if (!bundleCheck.passed) throw new Error(`permission manifest bundle rejected: ${bundleCheck.blockers.join(', ')}`);
    const checkedBundle = PermissionManifestBundleSchema.parse(manifestBundle);
    const stageManifest = checkedBundle.manifests.find((item) => item.stage === stage);
    if (!stageManifest) throw new Error(`permission manifest missing for ${stage}`);
    const manifestCheck = evaluatePermissionManifest(stageManifest, {
      // A production run may inspect arbitrary external references only
      // through an explicit host allow-list. Fast/mock fixtures retain the
      // ability to use local evidence, but actual network operations still
      // fail closed at assertPermissionOperation.
      requireResearchAllowlist: validationMode === 'production' || process.env.FACTORY_REQUIRE_RESEARCH_ALLOWLIST === '1',
    });
    if (!manifestCheck.passed) throw new Error(`permission manifest rejected for ${stage}: ${manifestCheck.blockers.join(', ')}`);
    const checkedManifest = PermissionManifestSchema.parse(manifestCheck.manifest);
    if (checkedManifest.stage !== stage || checkedManifest.role !== policy.role || checkedManifest.sandbox !== policy.sandbox) {
      throw new Error(`permission manifest identity mismatch for ${stage}`);
    }
    for (const inputPath of safeInputPaths) assertPermissionOperation(checkedManifest, { kind: 'read', path: inputPath });
    const repositorySharedPath = (inputPath: string) => /^(?:src|templates|\.agents|examples)\//u.test(inputPath) || /^(?:package\.json|pnpm-lock\.yaml|tsconfig\.json|vitest\.config\.[cm]?[jt]s|eslint\.config\.[cm]?[jt]s|\.env\.example)$/u.test(inputPath);
    const inputs = await Promise.all(safeInputPaths.map(async (inputPath) => {
      // Run-local artifacts always win.  Repository fallback is restricted to
      // an explicit shared-factory allow-list; a missing run artifact must not
      // accidentally pull a same-named file from the host repository.
      const candidates = [path.resolve(runRoot, inputPath), ...(repositorySharedPath(inputPath) ? [path.resolve(repositoryRoot, inputPath)] : [])];
      for (const candidate of candidates) {
        try {
          const stat = await lstat(candidate);
          if (!stat.isFile() || stat.isSymbolicLink()) continue;
          const content = await readFile(candidate, 'utf8');
          return { path: inputPath, content: sanitizeUntrustedText(content, policy.handoffMaxChars), priority: inputPath.includes('qa-report') || inputPath.includes('blueprint') || inputPath.includes('style-lock') ? 'required' as const : 'important' as const };
        } catch { /* try the repository-relative candidate, then retain a pointer */ }
      }
      return { path: inputPath, content: `[artifact pointer only: ${inputPath}]`, priority: 'required' as const };
    }));
    const sanitizedSummary = sanitizeUntrustedText(summary, 2_000);
    const contextPacket = buildContextPacket({ stage, summary: sanitizedSummary, inputs, maxChars: policy.handoffMaxChars });
    // Persist the exact bounded handoff before invoking the provider. This is
    // the durable bridge between stages: it contains hashes and pointers, not
    // raw transcripts, and is uniquely addressable by stage attempt so a retry
    // cannot overwrite the evidence for an earlier model call.
    const handoff = buildHandoffPacket({
      fromStage: previousStage,
      toStage: stage,
      summary: sanitizedSummary,
      artifacts: inputs,
      changedFiles: [],
      commandsRun: [],
      contextPacketHash: contextPacket.integrityHash,
      maxChars: policy.handoffMaxChars,
    });
    const handoffRelative = `logs/handoffs/${stage}.attempt-${attempt}.json`;
    await writeJsonAtomic(path.join(runRoot, handoffRelative), handoff);
    await store.log(path.basename(runRoot), 'context.handoff.persisted', { stage, attempt, path: handoffRelative, estimatedChars: handoff.estimatedChars, estimatedTokens: handoff.estimatedTokens });
    return assertExecutionContext({ runRoot, outputPath, logDir: path.join(runRoot, 'logs/codex'), inputPaths: safeInputPaths, stage, model: policy.model, reasoning: policy.reasoning, sandbox: policy.sandbox, contextPacket, enforceBoundary: true });
  }

  async function setWaiting(state: RunState, stage: StageName, inputArtifacts: string[], outputArtifacts: string[], evidence: string[]) {
    const now = new Date().toISOString();
    const previous = state.stages[stage];
    state.stage = stage;
    state.status = 'waiting';
    state.stages[stage] = { stage, status: 'waiting', startedAt: previous?.startedAt ?? now, finishedAt: null, attempts: previous?.attempts ?? 1, inputArtifacts, outputArtifacts, errors: previous?.errors ?? [], evidence, providerCalls: previous?.providerCalls ?? { agent: 0, image: 0 }, tokenUsage: previous?.tokenUsage ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
    // Every pause is an auditable, incomplete stage transition.  Persisting
    // this here covers provider failures and human gates that do not have a
    // bespoke call site; explicit callers may subsequently enrich the same
    // audit with stricter artifact-count checks.
    await persistControlStageAudit(state, stage, 'waiting', inputArtifacts, outputArtifacts, evidence);
    await store.save(state);
    await store.log(state.runId, 'run.waiting', { stage, evidence });
    return state;
  }

  async function hashBuildDirectory(directory: string) {
    const files = await listFiles(directory);
    const entries = await Promise.all(files.map(async (file) => `${file}:${await sha256File(path.join(directory, file))}`));
    return sha256Text(entries.join('\n'));
  }

  /** Capability checks include a timestamp for human audit, but their stable
   * decision must not churn on every resume and invalidate the ledger. */
  async function writeCapabilityIfChanged(runId: string, capability: ReturnType<typeof evaluateProductionLineCapability>) {
    const current = await store.readArtifact(runId, 'production-line-capability.json').catch(() => undefined) as { passed?: unknown; blockers?: unknown; line?: unknown; template?: unknown; runtime?: unknown; expectedTemplates?: unknown; implementedTemplates?: unknown } | undefined;
    const same = current
      && current.passed === capability.passed
      && JSON.stringify(current.blockers) === JSON.stringify(capability.blockers)
      && current.line === capability.line
      && current.template === capability.template
      && current.runtime === capability.runtime
      && JSON.stringify(current.expectedTemplates) === JSON.stringify(capability.expectedTemplates)
      && JSON.stringify(current.implementedTemplates) === JSON.stringify(capability.implementedTemplates);
    if (!same) await store.writeArtifact(runId, 'production-line-capability.json', capability);
  }

  async function refreshAcceptanceArtifacts(runRoot: string, buildPassed: boolean, qaPassed: boolean, screenshots: string[], candidateHash?: string) {
    const report = await buildCompletionGateReport({ runRoot, corePassed: buildPassed, normalFlowPassed: qaPassed, screenshots, ...(candidateHash ? { candidateHash, requireCandidateBinding: true } : {}) });
    await writeJsonAtomic(path.join(runRoot, 'artifacts/completion-gates.json'), report);
    return report;
  }

  /** Convert the trusted browser trace into the canonical production-line
   * evidence consumed by FINAL_PROFILE_QA.  Keeping this conversion in the
   * control plane prevents a provider from inventing a passing line report and
   * gives the idle mother template a real, hash-bound representative journey. */
  async function persistNaturalLineEvidence(runId: string, report: ReturnType<typeof QaReportSchema.parse>, buildHash: string) {
    const lineValue = await store.readArtifact(runId, 'production-line-contract.json').catch(() => undefined) as { line?: unknown } | undefined;
    if (lineValue?.line !== 'idle-management' || !report.naturalFlow) return undefined;
    const plan = buildProductionLinePlayPlan('idle-management');
    const transitionPassed = (name: string) => report.naturalFlow!.transitions.some((transition) => transition.name === name && transition.changed);
    const evidenceFor = (stepIndex: number, detail: string) => [
      ...plan.requiredEvidence,
      `natural-flow:${detail}`,
      `step:${plan.steps[stepIndex]?.id ?? stepIndex + 1}`,
    ];
    const steps = plan.steps.map((step, index) => {
      const passed = index === 0
        ? report.naturalFlow!.startedFromReset
        : index === 1
          ? transitionPassed('produce') || transitionPassed('automatic-progress')
          : index === 2
            ? report.naturalFlow!.completion === 'settlement'
            : index === 3
              ? transitionPassed('upgrade')
              : report.naturalFlow!.replayObserved;
      const detail = index === 0 ? 'reset'
        : index === 1 ? 'produce'
          : index === 2 ? 'deliver-settlement'
            : index === 3 ? 'upgrade-trade-off'
              : 'refresh-recovery';
      return { id: step.id, passed, evidence: evidenceFor(index, detail) };
    });
    const evidence = ProductionLinePlayEvidenceSchema.parse({
      schemaVersion: 1,
      line: 'idle-management',
      buildHash,
      naturalInput: report.naturalFlow.forbiddenOperations.length === 0,
      steps,
      forbiddenOperations: report.naturalFlow.forbiddenOperations,
    });
    await store.writeArtifact(runId, 'production-line-play-evidence.json', evidence);
    return evidence;
  }

  async function readBuildSuccess(runRoot: string): Promise<boolean> {
    try {
      const value = JSON.parse(await readFile(path.join(runRoot, 'artifacts/build-report.json'), 'utf8')) as { success?: unknown };
      return value.success === true;
    } catch { return false; }
  }

  async function ensureFinalProfileQa(state: RunState, blueprint: GameBlueprint, qaReport: ReturnType<typeof QaReportSchema.parse>, completionVisualPass: boolean, buildHash?: string): Promise<boolean> {
    if (done(state, 'FINAL_PROFILE_QA')) {
      try {
        const final = await store.readArtifact(state.runId, 'final-profile-qa.json') as { decision?: unknown };
        const profile = await store.readArtifact(state.runId, 'profile-qa-evidence.json').catch(() => undefined) as { passed?: unknown } | undefined;
        if ((enforceOperatingGates || enforcePlayerAcceptance) && profile?.passed !== true) return false;
        return final.decision === 'APPROVED';
      } catch { return false; }
    }
    const inputs = ['artifacts/game-blueprint.json', 'artifacts/build-report.json'];
    const record = await begin(state, 'FINAL_PROFILE_QA', inputs);
    const oracleDetected = Boolean(qaReport.evidence?.some((evidence) => evidence.mode === 'NATURAL_E2E' && evidence.forbiddenOperations.length > 0));
    const profile = profileForBlueprint(blueprint);
    const boundBuildHash = buildHash ?? qaReport.evidence?.find((item) => item.buildHash)?.buildHash ?? sha256Text(JSON.stringify(qaReport));
    const strictProfile = enforceOperatingGates || enforcePlayerAcceptance;
    const lineValue = await store.readArtifact(state.runId, 'production-line-contract.json').catch(() => undefined) as { line?: unknown } | undefined;
    const line = typeof lineValue?.line === 'string' && ['single-finger-action', 'cut-stack-dodge', 'idle-management', 'choice-life', 'rule-puzzle'].includes(lineValue.line)
      ? lineValue.line as 'single-finger-action' | 'cut-stack-dodge' | 'idle-management' | 'choice-life' | 'rule-puzzle'
      : undefined;
    let linePlan: ReturnType<typeof buildProductionLinePlayPlan> | undefined;
    let lineEvaluation: ReturnType<typeof evaluateProductionLinePlayEvidence> | undefined;
    let lineEvidence: ReturnType<typeof ProductionLinePlayEvidenceSchema.parse> | undefined;
    if (line) {
      linePlan = buildProductionLinePlayPlan(line);
      await store.writeArtifact(state.runId, 'production-line-play-plan.json', linePlan);
      const lineEvidenceFile = path.join(store.runRoot(state.runId), 'artifacts/production-line-play-evidence.json');
      if (await exists(lineEvidenceFile)) {
        try {
          lineEvidence = ProductionLinePlayEvidenceSchema.parse(await store.readArtifact(state.runId, 'production-line-play-evidence.json'));
          lineEvaluation = evaluateProductionLinePlayEvidence(linePlan, lineEvidence, boundBuildHash ? { expectedBuildHash: boundBuildHash } : {});
        } catch {
          lineEvaluation = ProductionLinePlayEvaluationSchema.parse({ schemaVersion: 1, line, profile: linePlan.profile, passed: false, blockers: ['evidence-schema-invalid'], observedSteps: [], checkedAt: new Date().toISOString() });
        }
      } else {
        lineEvaluation = ProductionLinePlayEvaluationSchema.parse({ schemaVersion: 1, line, profile: linePlan.profile, ...(boundBuildHash ? { buildHash: boundBuildHash } : {}), passed: false, blockers: ['representative-play-evidence-missing'], observedSteps: [], checkedAt: new Date().toISOString() });
        const exampleFile = path.join(store.runRoot(state.runId), 'human/production-line-play-evidence.example.json');
        if (!await exists(exampleFile)) await writeJsonAtomic(exampleFile, { schemaVersion: 1, line, buildHash: boundBuildHash ?? '0'.repeat(64), naturalInput: true, steps: linePlan.steps.map((step) => ({ id: step.id, passed: true, evidence: [`record:${step.id}`] })), forbiddenOperations: [] });
      }
      await store.writeArtifact(state.runId, 'production-line-play-evaluation.json', lineEvaluation);
    }
    const profileChecks = qaReport.checks.map((check) => {
      const dimension = profileDimensionForEvidence(profile, `${check.name} ${check.evidence}`);
      return { id: check.name, passed: check.passed, evidence: check.evidence, ...(dimension ? { dimensionId: dimension } : {}) };
    });
    // A line-specific play trace is the authoritative evidence family for
    // non-idle products. Bind each observed step to the canonical profile
    // dimension declared by the plan, preserving the actual step evidence.
    if (line && linePlan && lineEvidence) {
      for (const step of linePlan.steps) {
        const observed = lineEvidence.steps.find((item) => item.id === step.id);
        const dimension = canonicalProfileDimension(profile, step.dimensionId) ?? profileDimensionForEvidence(profile, `${step.label} ${step.requiredEvidence.join(' ')}`);
        if (!observed || !dimension || profileChecks.some((item) => item.dimensionId === dimension)) continue;
        profileChecks.push({ id: `line:${step.id}`, passed: observed.passed, evidence: observed.evidence.join('; '), dimensionId: dimension });
      }
    }
    const profileEvidence = buildProfileQaReport({ gameId: blueprint.gameId, buildHash: boundBuildHash, profile, productionLine: line, linePlanPath: line ? 'artifacts/production-line-play-plan.json' : undefined, lineEvaluationPath: line ? 'artifacts/production-line-play-evaluation.json' : undefined, qaPassed: qaReport.passed && !oracleDetected, checks: profileChecks, requireExplicitDimensions: strictProfile });
    await store.writeArtifact(state.runId, 'profile-qa-evidence.json', profileEvidence);
    const mechanicsPassed = qaReport.passed && !oracleDetected && (!strictProfile || (profileEvidence.passed && (lineEvaluation?.passed ?? true)));
    const profileBlockers = [...profileEvidence.blockers, ...(lineEvaluation && !lineEvaluation.passed ? lineEvaluation.blockers.map((item) => `line:${item}`) : [])];
    const profileReport = ExperienceReviewReportSchema.parse({
      schemaVersion: 1,
      contractId: `${blueprint.gameId}:final-profile`,
      statuses: { mechanics: mechanicsPassed ? 'PASS' : 'FAIL', feel: mechanicsPassed ? 'PASS' : 'FAIL', naturalPlay: mechanicsPassed ? 'PASS' : 'FAIL', presentation: completionVisualPass ? 'PASS' : 'PARTIAL' },
      oracleDetected,
      issues: mechanicsPassed ? [] : [{ id: 'FINAL_PROFILE_QA', severity: 'blocker', category: oracleDetected ? 'oracle' : 'natural-play', evidence: profileBlockers.length > 0 ? profileBlockers.join(', ') : 'qa-report.json did not prove the locked profile on the final build' }],
      decision: mechanicsPassed ? 'APPROVED' : 'FEEL_REPAIR_REQUIRED',
    });
    await store.writeArtifact(state.runId, 'final-profile-qa.json', profileReport);
    await complete(state, record, ['artifacts/final-profile-qa.json', 'artifacts/profile-qa-evidence.json', ...(line ? ['artifacts/production-line-play-plan.json', 'artifacts/production-line-play-evaluation.json'] : [])], ['profile:final-build', `profile:${profile}`, ...(line ? [`line:${line}`, `line-play-passed:${lineEvaluation?.passed === true}`] : []), `profile-passed:${profileEvidence.passed}`, `decision:${profileReport.decision}`]);
    return profileReport.decision === 'APPROVED';
  }

  /** Freeze the exact build that QA observed. A later release must reuse it. */
  async function ensureReleaseCandidate(state: RunState, blueprint: GameBlueprint, options: { operating: boolean; buildPath: string }) {
    const runId = state.runId;
    if (done(state, 'RELEASE_CANDIDATE')) {
      try {
        const existing = ReleaseCandidateSchema.parse(await store.readArtifact(runId, 'release-candidate.json'));
        const buildDirectory = path.resolve(store.runRoot(runId), options.buildPath);
        const currentBuildHash = await hashBuildDirectory(buildDirectory);
        await verifyFrozenCandidate(store.runRoot(runId), existing, currentBuildHash);
        return existing;
      } catch (error) {
        // A completed state is not proof that the package is still intact. A
        // changed dist or deleted package file must reopen the freeze stage so
        // the next release cannot reuse stale bytes.
        invalidateDownstream(state, 'RELEASE_CANDIDATE');
        await store.log(runId, 'release-candidate.invalidated', { reason: error instanceof Error ? error.message : String(error) });
      }
    }
    const inputs = ['artifacts/build-report.json', 'artifacts/quality-gate-matrix.json', options.buildPath, 'workspace/game/dist/'];
    const record = await begin(state, 'RELEASE_CANDIDATE', inputs);
    try {
      const frozen = await packageReleaseCandidate(store.runRoot(runId), blueprint, { enforceOperatingGates: options.operating });
      await store.writeArtifact(runId, 'release-candidate.json', frozen.candidate);
      const lifecycleValue = await store.readArtifact(runId, 'release-lifecycle.json').catch(() => undefined);
      if (lifecycleValue) {
        const lifecycle = ReleaseLifecycleSchema.parse(lifecycleValue);
        if (lifecycle.status === 'IMPLEMENTATION_READY' || lifecycle.status === 'PAUSED') {
          await store.writeArtifact(runId, 'release-lifecycle.json', promoteReleaseLifecycle(lifecycle, { gameId: blueprint.gameId, releaseHash: frozen.candidate.coreHash, from: lifecycle.status, to: 'CANDIDATE_READY' }));
        }
      }
      await complete(state, record, ['artifacts/release-candidate.json', 'artifacts/quality-gate-matrix.json', 'release-candidate/'], ['candidate:hash-frozen', 'candidate:quality-matrix-bound', `candidate:core-hash:${frozen.candidate.coreHash}`, 'candidate:human-playtest-version', 'release:no-rebuild-after-freeze']);
      return frozen.candidate;
    } catch (error) { return fail(state, record, error); }
  }

  async function syncPlayerAcceptance(runRoot: string, completion: ReturnType<typeof buildCompletionGateReport> extends Promise<infer T> ? T : never) {
    const qaFile = path.join(runRoot, 'artifacts/qa-report.json');
    const raw = JSON.parse(await readFile(qaFile, 'utf8')) as Record<string, unknown>;
    const byId = new Map(completion.gates.map((gate) => [gate.id, gate]));
    const dimension = (id: 'core' | 'normalFlow' | 'visualEvidence' | 'levelDifference' | 'humanPlaytest') => ({
      passed: byId.get(id)?.passed === true,
      evidence: byId.get(id)?.evidence.join('; ') || `completion-gates:${id}`,
    });
    raw.acceptance = { schemaVersion: 1, core: dimension('core'), normalFlow: dimension('normalFlow'), visualEvidence: dimension('visualEvidence'), levelDifference: dimension('levelDifference'), humanPlaytest: dimension('humanPlaytest'), releaseReady: completion.releaseReady, ...(completion.candidateHash ? { candidateHash: completion.candidateHash } : {}) };
    await writeFile(qaFile, `${JSON.stringify(QaReportSchema.parse(raw), null, 2)}\n`);
  }

  async function ensureUnknownRegister(runId: string) {
    const file = path.join(store.runRoot(runId), 'artifacts/unknown-register.json');
    if (!await exists(file)) await store.writeArtifact(runId, 'unknown-register.json', buildUnknownRegister({ runId }));
    return UnknownRegisterSchema.parse(await store.readArtifact(runId, 'unknown-register.json'));
  }

  /** Keep business unknowns visible in the common register without copying raw text. */
  async function syncBusinessUnknowns(runId: string) {
    const register = await ensureUnknownRegister(runId);
    const preflight = await store.readArtifact(runId, 'business-preflight.json').catch(() => undefined) as { unknowns?: unknown[] } | undefined;
    if (!preflight || !Array.isArray(preflight.unknowns)) return register;
    const existing = new Map(register.items.map((item) => [item.id, item]));
    const now = new Date().toISOString();
    for (const raw of preflight.unknowns) {
      if (typeof raw !== 'string' || !raw.trim() || existing.has(`business:${raw}`)) continue;
      existing.set(`business:${raw}`, { id: `business:${raw}`, class: /rights|license/iu.test(raw) ? 'license' : /payout/iu.test(raw) ? 'operational' : 'platform', description: `Business preflight unknown: ${raw}`, blocking: true, owner: 'HumanReviewer', dueStage: 'BUSINESS_PREFLIGHT', status: 'OPEN', evidence: [], createdAt: now, updatedAt: now });
    }
    const next = UnknownRegisterSchema.parse({ ...register, items: [...existing.values()], updatedAt: now });
    await store.writeArtifact(runId, 'unknown-register.json', next);
    return next;
  }

  async function ensurePlatformPackageSet(runId: string, blueprint: GameBlueprint, coreHash: string) {
    const file = path.join(store.runRoot(runId), 'artifacts/platform-package-set.json');
    if (await exists(file)) return PlatformPackageSetSchema.parse(await store.readArtifact(runId, 'platform-package-set.json'));
    const packages = buildPlatformPackageSet({
      gameId: blueprint.gameId,
      coreHash,
      requiredTargets: operatingProfile.requiredTargets,
      optionalTargets: operatingProfile.optionalTargets,
    });
    await store.writeArtifact(runId, 'platform-package-set.json', packages);
    return packages;
  }

  async function ensureSupplyChainArtifact(runId: string, blueprint: GameBlueprint, buildHash: string) {
    const file = path.join(store.runRoot(runId), 'artifacts/supply-chain.json');
    if (await exists(file)) return SupplyChainManifestSchema.parse(await store.readArtifact(runId, 'supply-chain.json'));
    const lockHash = await sha256File(path.join(repositoryRoot, 'pnpm-lock.yaml')).catch(() => sha256Text('lockfile-unavailable'));
    const packageJson = await readFile(path.join(repositoryRoot, 'package.json'), 'utf8').catch(() => '{}');
    const parsedPackage = JSON.parse(packageJson) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const dependencies = Object.entries({ ...(parsedPackage.dependencies ?? {}), ...(parsedPackage.devDependencies ?? {}) }).slice(0, 200).map(([name, version]) => ({ name, version, source: 'package-lock:pnpm-lock.yaml', license: 'UNKNOWN', sha256: sha256Text(`${name}@${version}`) }));
    const dependencyManifest = buildDependencyManifest({ gameId: blueprint.gameId, lockfileHash: lockHash, dependencies });
    const sbom = buildSbom({ gameId: blueprint.gameId, lockfileHash: lockHash, dependencies });
    const sourceCommit = sha256Text(`${blueprint.gameId}:${buildHash}`);
    const build = { sourceCommit, builder: 'BuilderAgent', command: 'pnpm build', outputHash: buildHash };
    const provenance = buildBuildProvenance({ gameId: blueprint.gameId, ...build, lockfileHash: lockHash, sbom, dependencyManifest });
    const manifest = buildSupplyChainManifest({
      gameId: blueprint.gameId,
      lockfileHash: lockHash,
      dependencies,
      build,
      sbomHash: hashSupplyChainArtifact(sbom),
      dependencyManifestHash: hashSupplyChainArtifact(dependencyManifest),
      provenanceHash: hashSupplyChainArtifact(provenance),
      dependencyManifestPath: 'artifacts/dependency-manifest.json',
      sbomPath: 'artifacts/sbom.json',
      provenancePath: 'artifacts/build-provenance.json',
    });
    await store.writeArtifact(runId, 'dependency-manifest.json', dependencyManifest);
    await store.writeArtifact(runId, 'sbom.json', sbom);
    await store.writeArtifact(runId, 'build-provenance.json', provenance);
    await store.writeArtifact(runId, 'supply-chain.json', manifest);
    return manifest;
  }

  function dependencyAllowlistRequired(): boolean {
    return (operatingProfile.dependencyAllowlistRequired
      || (validationMode === 'production' && process.env.FACTORY_DISABLE_DEPENDENCY_ALLOWLIST !== '1'))
      || process.env.FACTORY_ENFORCE_DEPENDENCY_ALLOWLIST === '1'
      || (process.env.FACTORY_ENFORCE_SUPPLY_CHAIN === '1' && process.env.FACTORY_REQUIRE_DEPENDENCY_ALLOWLIST === '1');
  }

  function portfolioGateRequired(): boolean {
    return (operatingProfile.portfolioGateRequired
      || (validationMode === 'production' && process.env.FACTORY_DISABLE_FIRST_GAME_GATE !== '1'))
      || process.env.FACTORY_REQUIRE_FIRST_GAME_GATE === '1';
  }

  function platformPolicyRequired(): boolean {
    return (operatingProfile.platformPolicyRequired
      || (validationMode === 'production' && process.env.FACTORY_DISABLE_PLATFORM_POLICY !== '1'))
      || process.env.FACTORY_ENFORCE_PLATFORM_POLICY === '1';
  }

  /**
   * Production is the publishable lane, so the gates that protect a real
   * submission must be enabled even when an old/local profile was created
   * with the optional flags left at their fast-lane defaults.  The
   * `FACTORY_DISABLE_*` switches are intentionally diagnostic escape hatches
   * for migrating legacy runs; the effective policy is persisted and exposed
   * in `operating-status` so an operator cannot mistake a bypass for a clean
   * release.
   */
  function productionGate(configured: boolean, disableEnv: string): boolean {
    return configured || (validationMode === 'production' && process.env[disableEnv] !== '1');
  }

  function certificationRequired(): boolean {
    return productionGate(operatingProfile.certificationRequired, 'FACTORY_DISABLE_CERTIFICATION')
      || process.env.FACTORY_ENFORCE_CERTIFICATION === '1';
  }

  function presentationQualityRequired(): boolean {
    return productionGate(operatingProfile.presentationQualityRequired, 'FACTORY_DISABLE_PRESENTATION_QA')
      || process.env.FACTORY_ENFORCE_PRESENTATION_QA === '1';
  }

  function blindPlaytestRequired(): boolean {
    return productionGate(operatingProfile.blindPlaytestRequired, 'FACTORY_DISABLE_BLIND_PLAYTEST')
      || process.env.FACTORY_ENFORCE_BLIND_PLAYTEST === '1';
  }

  function supplyChainRequired(): boolean {
    return productionGate(operatingProfile.supplyChainRequired, 'FACTORY_DISABLE_SUPPLY_CHAIN')
      || dependencyAllowlistRequired()
      || process.env.FACTORY_ENFORCE_SUPPLY_CHAIN === '1';
  }

  function artQualityRequired(): boolean {
    return productionGate(operatingProfile.artQualityRequired, 'FACTORY_DISABLE_ART_GATE')
      || process.env.FACTORY_ENFORCE_ART_GATE === '1';
  }

  function platformQaRequired(): boolean {
    return productionGate(operatingProfile.platformQaRequired, 'FACTORY_DISABLE_PLATFORM_QA');
  }

  /** The persisted profile must describe the *effective* production policy,
   * including safeguards implied by validation mode, rather than claiming a
   * gate is disabled merely because the user did not repeat an environment
   * flag. The base profile object remains immutable for strategy defaults. */
  function effectiveOperatingProfile(): FactoryOperatingProfile {
    return {
      ...operatingProfile,
      certificationRequired: certificationRequired(),
      platformQaRequired: platformQaRequired(),
      presentationQualityRequired: presentationQualityRequired(),
      blindPlaytestRequired: blindPlaytestRequired(),
      supplyChainRequired: supplyChainRequired(),
      artQualityRequired: artQualityRequired(),
      dependencyAllowlistRequired: dependencyAllowlistRequired(),
      portfolioGateRequired: portfolioGateRequired(),
      platformPolicyRequired: platformPolicyRequired(),
    };
  }

  async function ensurePortfolioStrategyArtifact(runId: string) {
    const globalFile = path.join(root, 'portfolio-strategy.json');
    let strategy: ReturnType<typeof PortfolioStrategySchema.parse>;
    if (await exists(globalFile)) {
      const stat = await lstat(globalFile);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('portfolio-strategy.json must be a regular file');
      strategy = PortfolioStrategySchema.parse(JSON.parse(await readFile(globalFile, 'utf8')));
    } else {
      strategy = buildPortfolioStrategy({ maxTitlesInFlight: 1, requireFirstGameValidation: true });
      await writeJsonAtomic(globalFile, strategy);
    }
    await store.writeArtifact(runId, 'portfolio-strategy.json', strategy);
    if (!await exists(path.join(store.runRoot(runId), 'human/portfolio-strategy.example.json'))) {
      await writeJsonAtomic(path.join(store.runRoot(runId), 'human/portfolio-strategy.example.json'), strategy);
    }
    return strategy;
  }

  async function ensureSideEffectJournalArtifact(runId: string) {
    const file = path.join(store.runRoot(runId), 'artifacts/side-effect-journal.json');
    if (!await exists(file)) {
      const journal = buildSideEffectJournal(runId);
      await store.writeArtifact(runId, 'side-effect-journal.json', journal);
      await writeSideEffectEvaluation(runId, journal);
      return journal;
    }
    const journal = SideEffectJournalSchema.parse(await store.readArtifact(runId, 'side-effect-journal.json'));
    if (journal.runId !== runId) throw new Error(`side-effect journal runId ${journal.runId} does not match ${runId}`);
    await writeSideEffectEvaluation(runId, journal);
    return journal;
  }

  async function writeSideEffectEvaluation(runId: string, journal: ReturnType<typeof SideEffectJournalSchema.parse>) {
    const report = buildSideEffectJournalEvaluation(journal);
    await store.writeArtifact(runId, 'side-effect-evaluation.json', report);
    return report;
  }

  /**
   * Load the operator's current platform-rules snapshot, or create a truthful
   * placeholder that explicitly pauses production.  Platform policies change
   * outside the repository; the factory must never infer account, filing,
   * review, ad or payout rules from model memory.
   */
  async function ensurePlatformPolicyArtifact(runId: string) {
    const artifactFile = path.join(store.runRoot(runId), 'artifacts/platform-policy.json');
    let policy: ReturnType<typeof PlatformPolicySnapshotSchema.parse>;
    if (await exists(artifactFile)) {
      policy = PlatformPolicySnapshotSchema.parse(await store.readArtifact(runId, 'platform-policy.json'));
    } else {
      const configuredPath = process.env.FACTORY_PLATFORM_POLICY_PATH?.trim();
      const globalPath = configuredPath
        ? (path.isAbsolute(configuredPath) ? configuredPath : path.resolve(repositoryRoot, configuredPath))
        : path.join(root, 'platform-policy.json');
      if (await exists(globalPath)) {
        const stat = await lstat(globalPath);
        if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('platform policy must be a regular file');
        policy = PlatformPolicySnapshotSchema.parse(JSON.parse(await readFile(globalPath, 'utf8')));
      } else {
        policy = buildPlatformPolicyTemplate({ targets: operatingProfile.requiredTargets, optionalTargets: operatingProfile.optionalTargets });
        const examplePath = path.join(store.runRoot(runId), 'human/platform-policy.example.json');
        if (!await exists(examplePath)) await writeJsonAtomic(examplePath, policy);
      }
      await store.writeArtifact(runId, 'platform-policy.json', policy);
    }
    const evaluation = buildPlatformPolicyEvaluation(policy, {
      requiredPlatforms: operatingProfile.requiredTargets,
      optionalPlatforms: operatingProfile.optionalTargets,
      requireVerified: platformPolicyRequired(),
    });
    await store.writeArtifact(runId, 'platform-policy-evaluation.json', evaluation);
    return { policy, evaluation };
  }

  /** Read the operator-maintained cross-run account snapshot without ever
   * following a symlink.  Account capacity is a release input, not model
   * output; a malformed or replaced snapshot must be visible to the gate. */
  function accountPortfolioFilePath(): string {
    const configuredPath = process.env.FACTORY_ACCOUNT_PORTFOLIO_PATH?.trim();
    return configuredPath
      ? (path.isAbsolute(configuredPath) ? configuredPath : path.resolve(repositoryRoot, configuredPath))
      : path.join(root, 'account-portfolio.json');
  }

  async function readAccountPortfolioSnapshot(): Promise<ReturnType<typeof AccountPortfolioSchema.parse> | undefined> {
    const file = accountPortfolioFilePath();
    if (!await exists(file)) return undefined;
    const stat = await lstat(file);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('account portfolio snapshot must be a regular file');
    return canonicalAccountPortfolio(JSON.parse(await readFile(file, 'utf8')));
  }

  /**
   * Import an operator-reviewed dependency policy without allowing a Builder
   * or an external document to widen it.  The policy is copied into the run so
   * the exact decision is hashable and survives later changes to the global
   * allowlist.  Missing policy is represented by a human example and a
   * blocking evaluation when the production flag is enabled.
   */
  async function ensureDependencyPolicyArtifact(runId: string, manifest: ReturnType<typeof SupplyChainManifestSchema.parse>) {
    const artifactFile = path.join(store.runRoot(runId), 'artifacts/dependency-policy.json');
    if (await exists(artifactFile)) return DependencyPolicySchema.parse(await store.readArtifact(runId, 'dependency-policy.json'));
    const configuredPath = process.env.FACTORY_DEPENDENCY_POLICY_PATH?.trim();
    const globalPath = configuredPath
      ? (path.isAbsolute(configuredPath) ? configuredPath : path.resolve(repositoryRoot, configuredPath))
      : path.join(root, 'dependency-allowlist.json');
    if (await exists(globalPath)) {
      const stat = await lstat(globalPath);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('dependency policy must be a regular file');
      const policy = DependencyPolicySchema.parse(JSON.parse(await readFile(globalPath, 'utf8')));
      await store.writeArtifact(runId, 'dependency-policy.json', policy);
      return policy;
    }
    const examplePath = path.join(store.runRoot(runId), 'human/dependency-policy.example.json');
    if (!await exists(examplePath)) {
      const example = buildDependencyPolicy({
        policyId: 'replace-with-reviewed-policy',
        entries: manifest.dependencies.map((dependency) => ({
          name: dependency.name,
          version: dependency.version,
          source: dependency.source,
          license: dependency.license,
          licenseEvidence: dependency.licenseEvidence ?? 'replace-with-direct-license-evidence',
          sha256: dependency.sha256,
          notes: ['Human must verify the exact license and package/archive digest before enabling the allowlist.'],
        })),
      });
      await writeJsonAtomic(examplePath, example);
    }
    return undefined;
  }

  /** Persist the immutable factory constitution in every run. */
  async function ensureConstitutionArtifact(runId: string) {
    const file = path.join(store.runRoot(runId), 'artifacts/factory-constitution.json');
    if (!await exists(file)) {
      await store.writeArtifact(runId, 'factory-constitution.json', FACTORY_CONSTITUTION);
      return FACTORY_CONSTITUTION;
    }
    const existing = await store.readArtifact(runId, 'factory-constitution.json');
    if (JSON.stringify(existing) !== JSON.stringify(FACTORY_CONSTITUTION)) throw new Error('factory constitution is immutable and does not match the current factory version');
    return FACTORY_CONSTITUTION;
  }

  const FACTORY_PROMPT_SIGNATURE = 'factory-prompts-v2';

  /** Resolve all inputs that can change a factory-eval result.  Keeping this
   * in one helper prevents the CLI/manual eval path from silently using a
   * different dataset or source snapshot than a production run. */
  async function factoryEvalInputs() {
    const modelSignature = modelPolicySignature();
    const promptSignature = FACTORY_PROMPT_SIGNATURE;
    const sourceEntries = await collectFactorySourceEntries(repositoryRoot, FACTORY_EVAL_SOURCE_PATHS);
    const factorySignature = buildFactorySourceSignature(sourceEntries);
    const corpusPath = path.join(repositoryRoot, 'factory-eval/cases.json');
    let corpusCases: ReturnType<typeof defaultFactoryEvalCases> = [];
    if (await exists(corpusPath)) {
      // A checked-in corpus is a factory input, not optional model context. An
      // invalid or mismatched corpus must stop evaluation rather than silently
      // falling back to stale in-code examples.
      try { corpusCases = parseFactoryEvalCasesFile(JSON.parse(await readFile(corpusPath, 'utf8'))); }
      catch (error) { throw new Error(`factory eval corpus is invalid: ${error instanceof Error ? error.message : String(error)}`); }
    }
    const feedbackPath = path.join(root, 'factory-eval/feedback-regressions.json');
    let feedbackRegressionIds: string[] = [];
    let feedbackRegressionSignature = sha256Text('feedback-regressions:none');
    let feedbackCases: ReturnType<typeof buildFeedbackRegressionSignature>['cases'] = [];
    if (await exists(feedbackPath)) {
      try {
        const feedback = buildFeedbackRegressionSignature(JSON.parse(await readFile(feedbackPath, 'utf8')));
        feedbackRegressionIds = feedback.ids;
        feedbackRegressionSignature = feedback.signature;
        feedbackCases = feedback.cases;
      } catch (error) {
        if (enforceOperatingGates) throw new Error(`feedback regression ledger is invalid: ${error instanceof Error ? error.message : String(error)}`);
        feedbackRegressionIds = ['invalid-feedback-ledger'];
        feedbackRegressionSignature = sha256Text(await readFile(feedbackPath, 'utf8').catch(() => 'invalid-feedback-ledger'));
      }
    }
    const feedbackEval = feedbackRegressionEvalCases(feedbackCases);
    const factoryCases = mergeFactoryEvalCases(defaultFactoryEvalCases(), corpusCases, feedbackEval);
    return {
      modelSignature,
      promptSignature,
      factorySignature,
      feedbackRegressionIds,
      feedbackRegressionSignature,
      feedbackCases,
      feedbackEval,
      factoryCases,
      feedbackRegressionCoverage: { total: feedbackCases.length, executable: feedbackEval.length, executed: feedbackEval.length },
    };
  }

  async function buildFactoryEvalReport() {
    const inputs = await factoryEvalInputs();
    return runFactoryEvalSuite(inputs.factoryCases, (input) => requestRouter.route(input), inputs);
  }

  /**
   * Run the factory's deterministic routing regression before a game can
   * consume the pipeline. The report is run-scoped (for audit/recovery) and a
   * copy is kept at the factory level for change review. Existing reports with
   * the same suite/model/prompt signatures are reused, making resume cheap and
   * idempotent.
   */
  async function ensureFactoryEvalArtifact(runId: string) {
    const reportPath = path.join(store.runRoot(runId), 'artifacts/factory-eval-report.json');
    const inputs = await factoryEvalInputs();
    const { modelSignature, promptSignature, factorySignature, feedbackRegressionIds, feedbackRegressionSignature, feedbackRegressionCoverage } = inputs;
    if (await exists(reportPath)) {
      try {
        const existing = await store.readArtifact(runId, 'factory-eval-report.json') as { suiteVersion?: string; modelSignature?: string; promptSignature?: string; factorySignature?: string; feedbackRegressionIds?: string[]; feedbackRegressionSignature?: string };
        if (existing.suiteVersion === FACTORY_EVAL_SUITE_VERSION
          && existing.modelSignature === modelSignature
          && existing.promptSignature === promptSignature
          && existing.factorySignature === factorySignature
          && JSON.stringify(existing.feedbackRegressionIds ?? []) === JSON.stringify(feedbackRegressionIds)
          && existing.feedbackRegressionSignature === feedbackRegressionSignature
          && JSON.stringify((existing as { feedbackRegressionCoverage?: unknown }).feedbackRegressionCoverage ?? { total: 0, executable: 0, executed: 0 }) === JSON.stringify(feedbackRegressionCoverage)) return existing;
      } catch { /* regenerate malformed or stale evidence */ }
    }
    const report = runFactoryEvalSuite(inputs.factoryCases, (input) => requestRouter.route(input), inputs);
    await store.writeArtifact(runId, 'factory-eval-report.json', report);
    if (operatingProfile.factoryEvalOnChange) {
      const latest = path.join(root, 'factory-eval/latest.json');
      await mkdir(path.dirname(latest), { recursive: true });
      await writeJsonAtomic(latest, report);
    }
    return report;
  }

  /** Collapse the independent evidence families into one operator-facing
   * seven-dimension status matrix.  Missing artifacts become UNKNOWN; this
   * report is advisory in the fast lane and a constitution input in strict
   * production runs. */
  async function refreshQualityGateMatrix(state: RunState, completion: Awaited<ReturnType<typeof buildCompletionGateReport>>, candidateHash?: string) {
    const runId = state.runId;
    const readRecord = async (name: string): Promise<Record<string, unknown> | undefined> => {
      try {
        const value = await store.readArtifact(runId, name);
        return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
      } catch { return undefined; }
    };
    const gate = (id: string) => completion.gates.find((item) => item.id === id);
    const signal = (passed: boolean | undefined, evidence: string[], blocker: string) => ({
      passed,
      evidence: evidence.filter((item) => item.trim().length > 0),
      blockers: passed === true ? [] : [blocker],
    });
    const coreGate = gate('core');
    const flowGate = gate('normalFlow');
    const functionalityPassed = coreGate?.passed === true && flowGate?.passed === true;
    const functionalityEvidence = [...(coreGate?.evidence ?? []), ...(flowGate?.evidence ?? [])];

    const profileQa = await readRecord('final-profile-qa.json');
    const profileQaEvidence = await readRecord('profile-qa-evidence.json');
    const profileSignal = profileQaSignal(profileQa, profileQaEvidence);
    const profilePassed = profileSignal.passed;
    const profileEvidence = profileSignal.evidence ?? [];

    const levelGate = gate('levelDifference');
    const levelDifference = await readRecord('level-difference.json');
    const contentPassed = typeof levelDifference?.passed === 'boolean' ? levelDifference.passed : levelGate?.passed;
    const contentEvidence = levelDifference ? ['artifacts/level-difference.json'] : (levelGate?.evidence ?? []);

    const visualGate = gate('visualEvidence');
    const presentation = await readRecord('presentation-evaluation.json');
    const presentationRequired = presentationQualityRequired();
    const visualPassed = presentationRequired
      ? visualGate?.passed === true && presentation?.passed === true
      : visualGate?.passed;
    const visualEvidence = [...(visualGate?.evidence ?? []), ...(presentation ? ['artifacts/presentation-evaluation.json'] : [])];

    const baseline = await readRecord('quality-baseline.json');
    const platformMatrix = await readRecord('platform-release-matrix.json');
    const platformPackages = await readRecord('platform-package-set.json');
    let platformPassed: boolean | undefined;
    if (platformMatrix) {
      try {
        const parsedMatrix = PlatformReleaseMatrixSchema.parse(platformMatrix);
        const matrixResult = evaluatePlatformReleaseMatrix(parsedMatrix, { strict: enforceOperatingGates });
        platformPassed = matrixResult.passed;
      } catch { platformPassed = false; }
    }
    if (platformQaRequired() && platformPackages) {
      try {
        const packageResult = evaluatePlatformPackageSet(platformPackages, { strict: enforceOperatingGates });
        platformPassed = platformPassed === true && packageResult.passed;
      } catch { platformPassed = false; }
    } else if (!platformQaRequired()) platformPassed = true;
    const performancePassed = typeof baseline?.passed === 'boolean' && baseline.passed === true && platformPassed === true;
    const performanceKnown = typeof baseline?.passed === 'boolean' && platformPassed !== undefined;

    const originality = await readRecord('originality-declaration.json');
    let originalityPassed: boolean | undefined;
    if (originality) {
      try { originalityPassed = evaluateOriginality(originality).passed; } catch { originalityPassed = false; }
    }
    const supplyChain = await readRecord('supply-chain-evaluation.json');
    const integrityParts = [originalityPassed, ...(supplyChainRequired() ? [typeof supplyChain?.passed === 'boolean' ? supplyChain.passed : undefined] : [])];
    const integrityPassed = integrityParts.every((value) => value === true);
    const integrityKnown = integrityParts.every((value) => value !== undefined);

    const candidate = await readRecord('release-candidate.json');
    const human = await readRecord('human/playtest-acceptance.json');
    const buildReport = await readRecord('build-report.json');
    const buildPassed = buildReport?.success === true;
    // The quality matrix is also the input to candidate freezing.  Therefore
    // its release-engineering dimension must be decidable before a candidate
    // exists: build reproducibility plus independent platform evidence are the
    // automatic prerequisites.  Human playtest is deliberately kept in the
    // separate completion-gate/approval ledger and is never used to make a
    // pre-candidate matrix appear complete.
    const automaticReleaseKnown = buildPassed && platformPassed === true;
    const releaseKnown = candidate
      ? typeof candidate.coreHash === 'string' && platformPassed === true && buildPassed
      : enforceOperatingGates ? automaticReleaseKnown : undefined;
    const releasePassed = releaseKnown === true && (candidateHash ? candidate?.coreHash === candidateHash : true);
    const releaseEvidence = candidate
      ? ['artifacts/release-candidate.json', ...(human ? ['human/playtest-acceptance.json'] : [])]
      : automaticReleaseKnown ? ['artifacts/build-report.json', 'artifacts/platform-release-matrix.json'] : [];

    const matrix = buildQualityGateMatrix({
      functionality: signal(functionalityPassed, functionalityEvidence, 'core-or-normal-flow'),
      coreExperience: signal(profilePassed, profileEvidence, profileSignal.blockers?.[0] ?? 'profile-qa-missing-or-failed'),
      contentDifficulty: signal(contentPassed, contentEvidence, 'meaningful-content-difference-missing'),
      visualUx: signal(visualPassed, visualEvidence, 'visual-evidence-missing-or-failed'),
      performanceCompatibility: signal(performanceKnown ? performancePassed : undefined, [...(baseline ? ['artifacts/quality-baseline.json'] : []), ...(platformMatrix ? ['artifacts/platform-release-matrix.json'] : [])], 'baseline-or-platform-evidence-missing'),
      productIntegrity: signal(integrityKnown ? integrityPassed : undefined, [...(originality ? ['artifacts/originality-declaration.json'] : []), ...(supplyChain ? ['artifacts/supply-chain-evaluation.json'] : [])], 'originality-or-supply-chain-evidence-missing'),
      releaseEngineering: signal(releaseKnown === undefined ? undefined : releasePassed, releaseEvidence, candidate ? 'candidate-platform-evidence-missing' : 'automatic-build-platform-evidence-missing'),
    }, { candidateHash, requireCandidateHash: enforceOperatingGates && candidateHash !== undefined });
    await store.writeArtifact(runId, 'quality-gate-matrix.json', matrix);
    return matrix;
  }

  /**
   * Run every automatic release prerequisite before an immutable candidate is
   * frozen.  This is intentionally separate from the final human session:
   * the owner must play the same bytes that have already cleared baseline,
   * originality, supply-chain, platform and cost checks.  A waiting result is
   * returned instead of throwing so the run remains resumable at the earliest
   * owning gate.
   */
  async function runAutomaticReleaseGates(
    state: RunState,
    blueprint: GameBlueprint,
    completion: Awaited<ReturnType<typeof buildCompletionGateReport>>,
    workspace: string,
  ): Promise<RunState | undefined> {
    const runId = state.runId;
    const runRoot = store.runRoot(runId);

    const baselineFile = path.join(runRoot, 'artifacts/quality-baseline.json');
    let baselinePassed = false;
    if (await exists(baselineFile)) {
      try { baselinePassed = QualityBaselineReportSchema.parse(await store.readArtifact(runId, 'quality-baseline.json')).passed; } catch { baselinePassed = false; }
    }
    if (!baselinePassed) {
      const baseline = await store.readArtifact(runId, 'quality-baseline.json').catch(() => evaluateQualityBaseline({}));
      await store.writeArtifact(runId, 'quality-baseline.json', baseline);
      return setWaiting(state, 'QUALITY_BASELINE_QA', ['artifacts/build-report.json', 'artifacts/qa-report.json'], ['artifacts/quality-baseline.json'], ['baseline:all-checks-required', ...QUALITY_BASELINE_CHECKS.map((id) => `check:${id}`)]);
    }
    const baselineStage = state.stages.QUALITY_BASELINE_QA;
    const baselineAudit = await store.readArtifact(runId, 'stage-contracts/QUALITY_BASELINE_QA.json').catch(() => undefined) as { passed?: unknown } | undefined;
    if (!baselineStage || baselineStage.status !== 'completed' || baselineAudit?.passed !== true) {
      const evidence = ['baseline:all-checks'];
      markControlStage(state, 'QUALITY_BASELINE_QA', 'completed', ['artifacts/build-report.json', 'artifacts/qa-report.json'], ['artifacts/quality-baseline.json'], evidence);
      await persistControlStageAudit(state, 'QUALITY_BASELINE_QA', 'completed', ['artifacts/build-report.json', 'artifacts/qa-report.json'], ['artifacts/quality-baseline.json'], evidence);
    }

    const originalityFile = path.join(runRoot, 'artifacts/originality-declaration.json');
    let originalityPassed = false;
    if (await exists(originalityFile)) {
      try { originalityPassed = evaluateOriginality(await store.readArtifact(runId, 'originality-declaration.json')).passed; } catch { originalityPassed = false; }
    }
    if (!originalityPassed) return setWaiting(state, 'BUSINESS_PREFLIGHT', ['artifacts/game-blueprint.json', 'artifacts/reference-mechanic-spec.json'], ['artifacts/originality-declaration.json'], ['human:GO_NO_GO:originality-attestation', 'originality:mechanics-only', 'originality:all-expression-fields-original']);
    const originalityStage = state.stages.ORIGINALITY_REVIEW;
    const originalityAudit = await store.readArtifact(runId, 'stage-contracts/ORIGINALITY_REVIEW.json').catch(() => undefined) as { passed?: unknown } | undefined;
    if (!originalityStage || originalityStage.status !== 'completed' || originalityAudit?.passed !== true) {
      const evidence = ['originality:expression-isolated'];
      markControlStage(state, 'ORIGINALITY_REVIEW', 'completed', ['artifacts/game-blueprint.json', 'artifacts/reference-mechanic-spec.json'], ['artifacts/originality-declaration.json'], evidence);
      await persistControlStageAudit(state, 'ORIGINALITY_REVIEW', 'completed', ['artifacts/game-blueprint.json', 'artifacts/reference-mechanic-spec.json'], ['artifacts/originality-declaration.json'], evidence);
    }

    const unknowns = await syncBusinessUnknowns(runId);
    const unknownResult = evaluateUnknownRegister(unknowns, { requireAllResolved: true });
    await store.writeArtifact(runId, 'unknown-evaluation.json', unknownResult);
    if (!unknownResult.passed) return setWaiting(state, 'BUSINESS_PREFLIGHT', ['artifacts/unknown-register.json'], ['artifacts/unknown-evaluation.json'], unknownResult.blocking.map((item) => `unknown:${item}`));

    if (presentationQualityRequired()) {
      const presentationFile = path.join(runRoot, 'artifacts/presentation-quality.json');
      if (!await exists(presentationFile)) {
        const buildReport = await store.readArtifact(runId, 'build-report.json') as { webBuild?: unknown };
        const buildPath = typeof buildReport.webBuild === 'string' ? path.resolve(runRoot, buildReport.webBuild) : path.join(workspace, 'dist');
        const profile = blueprint.preferences.experienceProfile && typeof blueprint.preferences.experienceProfile === 'object' && 'primary' in blueprint.preferences.experienceProfile ? String((blueprint.preferences.experienceProfile as { primary?: unknown }).primary) : 'STRATEGIC_SYSTEM';
        const parsedProfile = ['ACTION_FEEL', 'NARRATIVE_AGENCY', 'STRATEGIC_SYSTEM', 'PUZZLE_CLARITY', 'SOCIAL_EMOTION', 'EXPLORATION_DISCOVERY'].includes(profile) ? profile as 'ACTION_FEEL' | 'NARRATIVE_AGENCY' | 'STRATEGIC_SYSTEM' | 'PUZZLE_CLARITY' | 'SOCIAL_EMOTION' | 'EXPLORATION_DISCOVERY' : 'STRATEGIC_SYSTEM';
        await store.writeArtifact(runId, 'presentation-quality.json', buildPresentationQualityTemplate({ gameId: blueprint.gameId, buildHash: await hashBuildDirectory(buildPath), profile: parsedProfile }));
      }
      const presentation = PresentationQualityReportSchema.parse(await store.readArtifact(runId, 'presentation-quality.json'));
      const presentationResult = evaluatePresentationQuality(presentation);
      await store.writeArtifact(runId, 'presentation-evaluation.json', presentationResult);
      if (!presentationResult.passed) return setWaiting(state, 'PRESENTATION_QA', ['artifacts/presentation-quality.json'], ['artifacts/presentation-evaluation.json'], presentationResult.blockers.map((item) => `blocked:${item}`));
      const evidence = ['presentation:dimensions', 'presentation:audio-haptics-animation-readability-performance'];
      await recordControlStage(state, 'PRESENTATION_QA', 'completed', ['artifacts/presentation-quality.json'], ['artifacts/presentation-evaluation.json'], evidence);
    }

    if (supplyChainRequired()) {
      const supplyBuildReport = await store.readArtifact(runId, 'build-report.json') as { webBuild?: unknown };
      const supplyBuildPath = typeof supplyBuildReport.webBuild === 'string' ? path.resolve(runRoot, supplyBuildReport.webBuild) : path.join(workspace, 'dist');
      const supply = SupplyChainManifestSchema.parse(await ensureSupplyChainArtifact(runId, blueprint, await hashBuildDirectory(supplyBuildPath)));
      const dependencyManifestEvidence = await store.readArtifact(runId, 'dependency-manifest.json').catch(() => undefined);
      const sbomEvidence = await store.readArtifact(runId, 'sbom.json').catch(() => undefined);
      const provenanceEvidence = await store.readArtifact(runId, 'build-provenance.json').catch(() => undefined);
      const dependencyPolicy = await ensureDependencyPolicyArtifact(runId, supply);
      const dependencyResult = evaluateDependencyPolicy(supply, dependencyPolicy, { required: dependencyAllowlistRequired() });
      await store.writeArtifact(runId, 'dependency-policy-evaluation.json', dependencyResult);
      const baseSupplyResult = evaluateSupplyChainManifest(supply, { dependencyManifest: dependencyManifestEvidence, sbom: sbomEvidence, provenance: provenanceEvidence, requireEvidence: true });
      const supplyResult = { ...baseSupplyResult, passed: baseSupplyResult.passed && dependencyResult.passed, blockers: [...new Set([...baseSupplyResult.blockers, ...dependencyResult.blockers])] };
      await store.writeArtifact(runId, 'supply-chain-evaluation.json', supplyResult);
      if (!supplyResult.passed) return setWaiting(state, 'SUPPLY_CHAIN_QA', ['artifacts/supply-chain.json', 'artifacts/dependency-manifest.json', 'artifacts/sbom.json', 'artifacts/build-provenance.json'], ['artifacts/supply-chain-evaluation.json'], supplyResult.blockers.map((item) => `blocked:${item}`));
      const evidence = ['supply-chain:provenance', 'supply-chain:lockfile-sbom-provenance', `dependency-allowlist:${dependencyResult.passed ? 'passed' : 'not-configured'}`];
      const inputs = ['artifacts/supply-chain.json', 'artifacts/dependency-manifest.json', 'artifacts/sbom.json', 'artifacts/build-provenance.json', 'artifacts/dependency-policy-evaluation.json', ...(dependencyPolicy ? ['artifacts/dependency-policy.json'] : [])];
      await recordControlStage(state, 'SUPPLY_CHAIN_QA', 'completed', inputs, ['artifacts/supply-chain-evaluation.json', 'artifacts/dependency-policy-evaluation.json'], evidence);
    }

    if (certificationRequired()) {
      let checklist: ReturnType<typeof evaluateCertificationChecklist>;
      try { checklist = evaluateCertificationChecklist(await store.readArtifact(runId, 'certification-checklist.json')); }
      catch { checklist = evaluateCertificationChecklist(buildCertificationChecklist({ gameId: blueprint.gameId, title: blueprint.title, entity: operatingProfile.entity, requiredTargets: operatingProfile.requiredTargets, optionalTargets: operatingProfile.optionalTargets })); }
      await store.writeArtifact(runId, 'certification-checklist.json', checklist);
      if (!checklist.ready) return setWaiting(state, 'BUSINESS_PREFLIGHT', ['artifacts/originality-declaration.json'], ['artifacts/certification-checklist.json'], ['human:GO_NO_GO:certification-paperwork', ...checklist.blockers.map((item) => `blocked:${item}`), ...checklist.unknowns.map((item) => `unknown:${item}`)]);
      const certificationStage = state.stages.CERTIFICATION;
      const certificationAudit = await store.readArtifact(runId, 'stage-contracts/CERTIFICATION.json').catch(() => undefined) as { passed?: unknown } | undefined;
      if (!certificationStage || certificationStage.status !== 'completed' || certificationAudit?.passed !== true) {
        const evidence = ['certification:ready'];
        await recordControlStage(state, 'CERTIFICATION', 'completed', ['artifacts/originality-declaration.json'], ['artifacts/certification-checklist.json'], evidence);
      }
    }

    const matrixFile = path.join(runRoot, 'artifacts/platform-release-matrix.json');
    if (!await exists(matrixFile)) {
      const buildReport = await store.readArtifact(runId, 'build-report.json').catch(() => undefined) as { webBuild?: unknown } | undefined;
      const buildDirectory = typeof buildReport?.webBuild === 'string' ? path.resolve(runRoot, buildReport.webBuild) : path.join(workspace, 'dist');
      const coreHash = await hashBuildDirectory(buildDirectory);
      const primaryPlatform = (process.env.FACTORY_PRIMARY_PLATFORM?.trim() || operatingProfile.requiredTargets[0]) as 'wechat-minigame' | 'douyin-minigame' | 'taptap-minigame';
      const matrix = buildPlatformReleaseMatrix({ gameId: blueprint.gameId, coreHash, primaryPlatform, requiredTargets: operatingProfile.requiredTargets, optionalTargets: operatingProfile.optionalTargets });
      await store.writeArtifact(runId, 'platform-release-matrix.json', matrix);
      await ensurePlatformPackageSet(runId, blueprint, coreHash);
      if (!await exists(path.join(runRoot, 'human/platform-qa.example.json'))) await writeFile(path.join(runRoot, 'human/platform-qa.example.json'), `${JSON.stringify({ note: 'Record one result per selected platform using the platform-qa command.', platforms: matrix.children.map((child) => child.platform) }, null, 2)}\n`);
      return setWaiting(state, 'TARGET_PLATFORM_QA', ['artifacts/build-report.json', 'artifacts/platform-release-matrix.json'], ['artifacts/platform-release-matrix.json'], ['platform:each-child-needs-device-or-package-evidence']);
    }
    const matrix = PlatformReleaseMatrixSchema.parse(await store.readArtifact(runId, 'platform-release-matrix.json'));
    const platformStatus = evaluatePlatformReleaseMatrix(matrix, { strict: true });
    if (!platformStatus.passed) return setWaiting(state, 'TARGET_PLATFORM_QA', ['artifacts/platform-release-matrix.json'], ['artifacts/platform-release-matrix.json'], platformStatus.blockers.map((item) => `blocked:${item}`));
    if (platformQaRequired()) {
      const packageSet = await ensurePlatformPackageSet(runId, blueprint, matrix.coreHash);
      const packageStatus = evaluatePlatformPackageSet(packageSet, { strict: true });
      await store.writeArtifact(runId, 'platform-package-evaluation.json', packageStatus);
      if (!packageStatus.passed) return setWaiting(state, 'TARGET_PLATFORM_QA', ['artifacts/platform-package-set.json'], ['artifacts/platform-package-evaluation.json'], packageStatus.blockers.map((item) => `blocked:${item}`));
    }
    const spine = PlatformSpineContractSchema.parse(await store.readArtifact(runId, 'platform-spine.json'));
    const spineEvidence = Object.fromEntries(matrix.children.map((child) => [child.platform, { artifactHash: child.artifactHash ?? '', evidence: child.evidence }]));
    const spineResult = evaluatePlatformSpine(spine, spineEvidence);
    await store.writeArtifact(runId, 'platform-spine.json', spineResult.contract);
    if (!spineResult.passed) return setWaiting(state, 'PLATFORM_ADAPTER_QA', ['artifacts/platform-release-matrix.json', 'artifacts/platform-spine.json'], ['artifacts/platform-spine.json'], spineResult.blockers.map((item) => `blocked:${item}`));
    await recordControlStage(state, 'PLATFORM_ADAPTER_QA', 'completed', ['artifacts/platform-spine.json', 'artifacts/platform-release-matrix.json'], ['artifacts/platform-spine.json'], ['platform-spine:per-child', 'platform:per-child']);
    await recordControlStage(state, 'TARGET_PLATFORM_QA', 'completed', ['artifacts/platform-release-matrix.json', 'workspace/game/dist/'], ['artifacts/platform-release-matrix.json'], ['platform:per-child', 'platform:all-children-ready']);

    if (artQualityRequired()) {
      const artQuality = await store.readArtifact(runId, 'art-quality.json').catch(() => undefined);
      const artGate = evaluateArtQualityGate({ required: true, artifact: artQuality });
      if (!artGate.passed) return setWaiting(state, 'ASSETS', ['artifacts/asset-manifest.json'], ['artifacts/art-quality.json'], artGate.blockers.map((item) => `blocked:${item}`));
    }
    const rawLedger = await store.readArtifact(runId, 'artifact-ledger.json').catch(() => createArtifactLedger());
    const reconciledLedger = await reconcileArtifactLedger(rawLedger as ReturnType<typeof createArtifactLedger>, runRoot, { ignoreDrift: [...VOLATILE_LEDGER_ARTIFACTS], ignoreMissing: [...VOLATILE_LEDGER_ARTIFACTS] });
    if (reconciledLedger.changed.length > 0 || reconciledLedger.missing.length > 0 || reconciledLedger.blockers.some((item) => item.startsWith('unsafe'))) await store.writeArtifact(runId, 'artifact-ledger.json', reconciledLedger.ledger);
    const ledgerResult = evaluateArtifactLedger(reconciledLedger.ledger);
    if (!ledgerResult.passed) return setWaiting(state, 'FULL_BUILD', ['artifacts/artifact-ledger.json'], ['artifacts/artifact-ledger.json'], ledgerResult.blockers.map((item) => `blocked:${item}`));

    const usage = await usageForState(state);
    const cost = evaluateCostGate(CostBudgetSchema.parse(operatingProfile.budget), usage);
    await store.writeArtifact(runId, 'cost-gate.json', cost);
    if (!cost.passed) {
      const abandonment = evaluateAbandonment({ runId, stage: state.stage, budget: operatingProfile.budget, usage, reason: 'cost-cap' });
      await store.writeArtifact(runId, 'abandonment-decision.json', abandonment);
      if (operatingProfile.autoAbandonOnCostCap) {
        state.stage = 'ABANDONED'; state.status = 'completed';
        await recordControlStage(state, 'ABANDONED', 'completed', ['artifacts/cost-gate.json', 'state.json'], ['artifacts/abandonment-decision.json'], ['abandonment:decision', ...abandonment.evidence]);
        await store.save(state); await store.log(runId, 'run.abandoned', { reason: abandonment.reason, blockers: cost.blockers }); return state;
      }
      state.stage = 'NOT_GREENLIT'; state.status = 'completed';
      await recordControlStage(state, 'NOT_GREENLIT', 'completed', ['artifacts/cost-gate.json', 'state.json'], ['state.json'], ['business:not-greenlit', ...cost.blockers.map((item) => `cost:${item}`)]);
      await store.save(state); return state;
    }
    await recordControlStage(state, 'COST_GATE', 'completed', ['state.json', 'artifacts/cost-gate.json'], ['state.json', 'artifacts/cost-gate.json'], ['cost:within-budget', 'state:persisted']);

    const matrixResult = await refreshQualityGateMatrix(state, completion);
    if (!matrixResult.passed) {
      const route: Record<string, StageName> = {
        functionality: 'NORMAL_FLOW_QA',
        coreExperience: 'FINAL_PROFILE_QA',
        contentDifficulty: 'CONTENT_VARIATION_QA',
        visualUx: 'VISUAL_EVIDENCE_QA',
        performanceCompatibility: 'QUALITY_BASELINE_QA',
        productIntegrity: 'ORIGINALITY_REVIEW',
        releaseEngineering: 'TARGET_PLATFORM_QA',
      };
      const owner = route[matrixResult.blockers[0] ?? ''] ?? 'QUALITY_BASELINE_QA';
      return setWaiting(state, owner, ['artifacts/quality-gate-matrix.json'], ['artifacts/quality-gate-matrix.json'], matrixResult.blockers.map((item) => `quality:${item}`));
    }
    await store.save(state);
    return undefined;
  }

  /** Evaluate the release constitution from durable evidence, never from a model assertion. */
  async function persistConstitutionEvaluation(state: RunState, completion: ReturnType<typeof buildCompletionGateReport> extends Promise<infer T> ? T : never, options: { strict: boolean; includeRelease: boolean }) {
    const runId = state.runId;
    const unknowns = await syncBusinessUnknowns(runId);
    const rawLedger = await store.readArtifact(runId, 'artifact-ledger.json').catch(() => createArtifactLedger());
    const reconciledLedger = await reconcileArtifactLedger(rawLedger as ReturnType<typeof createArtifactLedger>, store.runRoot(runId), { ignoreDrift: [...VOLATILE_LEDGER_ARTIFACTS], ignoreMissing: [...VOLATILE_LEDGER_ARTIFACTS] });
    if (reconciledLedger.changed.length > 0 || reconciledLedger.missing.length > 0 || reconciledLedger.blockers.some((item) => item.startsWith('unsafe'))) {
      await store.writeArtifact(runId, 'artifact-ledger.json', reconciledLedger.ledger);
    }
    const ledger = reconciledLedger.ledger;
    const waiverArtifactHashes = Object.fromEntries(ledger.entries.map((entry) => [entry.path, entry.sha256]));
    const runtimeProduct = await store.readArtifact(runId, 'runtime-product-gates.json').catch(() => undefined) as { passed?: boolean } | undefined;
    const platformPackages = await store.readArtifact(runId, 'platform-package-set.json').catch(() => undefined);
    const presentation = await store.readArtifact(runId, 'presentation-evaluation.json').catch(() => undefined) as { passed?: boolean; blockers?: string[] } | undefined;
    const supplyChain = await store.readArtifact(runId, 'supply-chain-evaluation.json').catch(() => undefined) as { passed?: boolean; blockers?: string[] } | undefined;
    const sideEffects = await store.readArtifact(runId, 'side-effect-journal.json').catch(() => undefined);
    const accountCapacity = await store.readArtifact(runId, 'account-capacity-evaluation.json').catch(() => undefined) as { passed?: boolean; blockers?: string[] } | undefined;
    const certification = await store.readArtifact(runId, 'certification-checklist.json').catch(() => undefined) as { ready?: boolean } | undefined;
    const candidate = await store.readArtifact(runId, 'release-candidate.json').catch(() => undefined) as { coreHash?: unknown } | undefined;
    const qualityMatrix = await refreshQualityGateMatrix(state, completion, typeof candidate?.coreHash === 'string' ? candidate.coreHash : undefined);
    const humanApprovals = await evaluateHumanApprovalLedger(runId, typeof candidate?.coreHash === 'string' ? candidate.coreHash : undefined, options.strict);
    let pipelinePlan;
    try { pipelinePlan = validatePipelinePlan(await store.readArtifact(runId, 'pipeline-plan.json')); } catch { pipelinePlan = undefined; }
    const transitionHistory = (state.transitionHistory ?? []).map((item) => StateTransitionRecordSchema.parse(item));
    const transitionAudit = transitionHistory.length > 0
      ? evaluateTransitionHistory(transitionHistory, { plannedStages: pipelinePlan?.mandatoryStages as StageName[] | undefined })
      : { passed: false, blockers: ['transition-history-missing'] };
    await store.writeArtifact(runId, 'state-transition-audit.json', StateTransitionReportSchema.parse({ schemaVersion: 1, ...transitionAudit, checkedAt: new Date().toISOString(), transitionCount: transitionHistory.length }));
    const requiredStageContracts = pipelinePlan
      ? requiredStageContractsForPlan(pipelinePlan, {
        includeRelease: options.includeRelease,
        certificationRequired: certificationRequired(),
        presentationQualityRequired: presentationQualityRequired(),
        supplyChainRequired: supplyChainRequired(),
        blindPlaytestRequired: blindPlaytestRequired(),
      })
      : ['QA', 'FINAL_PROFILE_QA', 'NORMAL_FLOW_QA', 'VISUAL_EVIDENCE_QA', 'CONTENT_VARIATION_QA', 'RELEASE_CANDIDATE', ...(options.includeRelease ? ['RELEASE'] : [])];
    const stageContracts = await Promise.all(requiredStageContracts.map(async (stage) => {
      const statePassed = state.stages[stage]?.status === 'completed';
      const audit = await store.readArtifact(runId, `stage-contracts/${stage}.json`).catch(() => undefined) as {
        passed?: unknown;
        ownerRole?: unknown;
        verifierRole?: unknown;
        verifiedByRole?: unknown;
        independent?: unknown;
      } | undefined;
      return {
        stage,
        passed: statePassed && (audit ? audit.passed === true : !options.strict),
        ...(typeof audit?.ownerRole === 'string' ? { ownerRole: audit.ownerRole } : {}),
        ...(typeof audit?.verifierRole === 'string' ? { verifierRole: audit.verifierRole } : {}),
        ...(typeof audit?.verifiedByRole === 'string' ? { verifiedByRole: audit.verifiedByRole } : {}),
        ...(typeof audit?.independent === 'boolean' ? { independent: audit.independent } : {}),
      };
    }));
    const selfAcceptance = {
      builder: stageContracts.some((item) => item.ownerRole === 'BuilderAgent' && item.verifiedByRole === 'BuilderAgent'),
      fixer: stageContracts.some((item) => item.ownerRole === 'FixerAgent' && item.verifiedByRole === 'FixerAgent'),
      producer: stageContracts.some((item) => item.ownerRole === 'ProducerAgent' && item.verifiedByRole === 'ProducerAgent'),
      qa: stageContracts.some((item) => item.ownerRole === 'QAAgent' && item.verifiedByRole === 'QAAgent'),
      release: stageContracts.some((item) => item.ownerRole === 'ReleaseAgent' && item.verifiedByRole === 'ReleaseAgent'),
    };
    const result = evaluateFactoryConstitution({
      completion,
      unknowns,
      requireAllUnknowns: options.strict,
      requireBoundWaivers: options.strict,
      waiverArtifactHashes,
      ledger,
      platformPackages,
      requirePlatformPackages: options.strict && platformQaRequired(),
      requirePlatformIsolation: options.strict && platformQaRequired(),
      presentation,
      requirePresentation: options.strict && presentationQualityRequired(),
      supplyChain,
      requireSupplyChain: options.strict && supplyChainRequired(),
      sideEffects,
      requireSideEffects: options.strict,
      accountCapacity,
      requireAccountCapacity: options.strict,
      runtimeProduct,
      requireRuntimeProduct: options.strict,
      certificationReady: certification?.ready,
      requireCertification: options.strict && certificationRequired(),
      humanApprovals,
      requireHumanApprovals: options.strict,
      qualityMatrix,
      requireQualityMatrix: options.strict,
      requireStageContracts: options.strict,
      stageContracts,
      requiredStageContracts,
      stateTransitions: transitionHistory,
      plannedStages: pipelinePlan?.mandatoryStages,
      requireStateTransitions: options.strict,
      selfAcceptance,
    });
    await store.writeArtifact(runId, 'constitution-evaluation.json', result);
    await store.log(runId, 'constitution.evaluated', { passed: result.passed, blockers: result.blockers, strict: options.strict, includeRelease: options.includeRelease });
    return result;
  }

  /** Read and evaluate the durable three-session approval ledger. */
  async function listVerifiedRunFiles(runRoot: string): Promise<string[]> {
    const root = path.resolve(runRoot);
    let realRoot: string;
    try { realRoot = await realpath(root); } catch { return []; }
    const files: string[] = [];
    const walk = async (directory: string) => {
      let entries;
      try { entries = await readdir(directory, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        const absolute = path.join(directory, entry.name);
        let stat;
        try { stat = await lstat(absolute); } catch { continue; }
        if (stat.isSymbolicLink()) continue;
        const resolved = await realpath(absolute).catch(() => '');
        if (!resolved || !isStrictChildPath(realRoot, resolved)) continue;
        if (stat.isDirectory()) await walk(absolute);
        else if (stat.isFile()) files.push(path.relative(root, absolute).replaceAll('\\', '/'));
      }
    };
    await walk(root);
    return files.sort();
  }

  async function evaluateHumanApprovalLedger(runId: string, candidateHash?: string, strict = false) {
    const plan = await store.readArtifact(runId, 'human-approval-plan.json');
    const persistedLedger = await store.readArtifact(runId, 'human-approval-ledger.json').catch(() => undefined);
    const availableArtifacts = strict ? await listVerifiedRunFiles(store.runRoot(runId)) : undefined;
    // A missing ledger is the normal pre-approval state.  Once a file exists,
    // however, malformed JSON/schema or a foreign run id is a tamper signal;
    // never turn it into a fresh empty ledger.  The core helper preserves the
    // detailed scheduled-session matrix while adding a durable blocker.
    const evaluation = persistedLedger === undefined
      ? evaluateHumanApprovalRecords(plan, buildHumanApprovalLedger(runId).records, { runId, ...(candidateHash ? { candidateHash } : {}), ...(availableArtifacts ? { availableArtifacts } : {}) })
      : evaluateHumanApprovalLedgerArtifact(plan, persistedLedger, { runId, ...(candidateHash ? { candidateHash } : {}), ...(availableArtifacts ? { availableArtifacts } : {}) });
    await store.writeArtifact(runId, 'human-approval-evaluation.json', evaluation);
    return evaluation;
  }

  /**
   * Persist one canonical scheduled approval when a legacy human-facing gate
   * is completed.  The old YAML/JSON decision remains the detailed evidence;
   * this ledger entry is the compact, release-gate-facing projection.  A
   * repeated identical submission is idempotent, while a changed decision is
   * rejected unless the caller explicitly used that gate's `force` option.
   */
  async function appendScheduledHumanApproval(runId: string, input: Parameters<typeof buildScheduledApprovalRecord>[0] & { force?: boolean }) {
    const { force = false, ...recordInput } = input;
    const record = buildScheduledApprovalRecord(recordInput);
    const ledgerPath = path.join(store.runRoot(runId), 'artifacts/human-approval-ledger.json');
    let ledger = buildHumanApprovalLedger(runId);
    if (await exists(ledgerPath)) {
      ledger = HumanApprovalLedgerSchema.parse(await store.readArtifact(runId, 'human-approval-ledger.json'));
      if (ledger.runId !== runId) throw new Error(`human approval ledger runId ${ledger.runId} does not match ${runId}`);
    }

    const equivalent = (left: typeof record, right: typeof record) => {
      const withoutAuditTime = (value: typeof record) => {
        const rest = { ...value } as Partial<typeof record>;
        delete rest.recordedAt;
        delete rest.recordId;
        return rest;
      };
      return JSON.stringify(withoutAuditTime(left)) === JSON.stringify(withoutAuditTime(right));
    };
    const sameId = ledger.records.findIndex((item) => item.recordId === record.recordId);
    const sameSession = ledger.records.findIndex((item) => item.approvalClass === 'scheduled' && item.sessionId === record.sessionId);
    const existingIndex = sameId >= 0 ? sameId : sameSession;
    let action: 'added' | 'unchanged' | 'replaced' = 'added';
    if (existingIndex >= 0) {
      const existing = ledger.records[existingIndex]!;
      if (existing.approvalClass !== 'scheduled') throw new Error(`human approval session ${record.sessionId} already has a non-scheduled record`);
      if (equivalent(existing as typeof record, record)) {
        action = 'unchanged';
      } else if (!force) {
        throw new Error(`human approval session ${record.sessionId} already exists with different content; pass force to replace it`);
      } else {
        ledger.records[existingIndex] = record;
        action = 'replaced';
      }
    } else {
      ledger.records.push(record);
    }
    ledger.updatedAt = new Date().toISOString();
    await store.writeArtifact(runId, 'human-approval-ledger.json', ledger);
    const candidate = await store.readArtifact(runId, 'release-candidate.json').catch(() => undefined) as { coreHash?: unknown } | undefined;
    const evaluation = await evaluateHumanApprovalLedger(runId, typeof candidate?.coreHash === 'string' ? candidate.coreHash : undefined);
    await store.log(runId, 'human-approval.scheduled-projection', { recordId: record.recordId, sessionId: record.sessionId, decision: record.decision, action, forced: force, passed: evaluation.passed });
    return { record, ledger, evaluation, action };
  }

  async function ensureCostArtifacts(runId: string) {
    const rateFile = path.join(store.runRoot(runId), 'artifacts/cost-rate-card.json');
    if (!await exists(rateFile)) await store.writeArtifact(runId, 'cost-rate-card.json', costRateCardFromEnv());
    else CostRateCardSchema.parse(await store.readArtifact(runId, 'cost-rate-card.json'));
    const adjustmentFile = path.join(store.runRoot(runId), 'artifacts/cost-adjustments.json');
    if (!await exists(adjustmentFile)) {
      await store.writeArtifact(runId, 'cost-adjustments.json', { schemaVersion: 1, entries: [], updatedAt: new Date().toISOString() });
    } else CostAdjustmentLedgerSchema.parse(await store.readArtifact(runId, 'cost-adjustments.json'));
    return {
      rateCard: CostRateCardSchema.parse(await store.readArtifact(runId, 'cost-rate-card.json')),
      adjustments: CostAdjustmentLedgerSchema.parse(await store.readArtifact(runId, 'cost-adjustments.json')),
    };
  }

  async function preflightCostBeforeStage(state: RunState, stage: StageName) {
    const { rateCard } = await ensureCostArtifacts(state.runId);
    const current = await usageForState(state);
    const reserve = reserveForStage(stage);
    const projected = projectStageUsage(current, stage, reserve, rateCard);
    const report = evaluateCostPreflight({ budget: operatingProfile.budget, current, projected, stage, reserve });
    await store.writeArtifact(state.runId, 'cost-preflight.json', report);
    if (report.passed) return report;
    const reason = report.currentBlockers.length > 0 ? 'current ceiling already exceeded' : 'next stage reserve would exceed a configured ceiling';
    await store.log(state.runId, 'cost.preflight.blocked', { stage, blockers: report.projectedBlockers, reason });
    if (operatingProfile.autoAbandonOnCostCap) {
      await markAutoAbandoned(state, 'cost-cap');
      throw new CostGateStopSignal(state);
    }
    state.stage = stage;
    state.status = 'waiting';
    await store.save(state);
    throw new CostGateStopSignal(state);
  }

  /**
   * Ensure every run has a complete, schema-valid capability inventory before
   * any provider can receive context. Existing inventories are never silently
   * repaired: a missing/duplicate stage is a security failure and must be
   * reviewed explicitly so a stale file cannot widen permissions by omission.
   */
  async function ensurePermissionManifestBundle(runId: string) {
    const file = path.join(store.runRoot(runId), 'artifacts/permission-manifest.json');
    if (!await exists(file)) {
      const bundle = buildPermissionManifestBundle();
      await store.writeArtifact(runId, 'permission-manifest.json', bundle);
      return bundle;
    }
    const raw = await store.readArtifact(runId, 'permission-manifest.json');
    const check = evaluatePermissionManifestBundle(raw, {
      requiredStages: StageNameSchema.options,
      requireResearchAllowlist: false,
    });
    if (!check.passed) throw new Error(`permission manifest bundle is invalid or incomplete: ${check.blockers.join(', ')}`);
    return PermissionManifestBundleSchema.parse(raw);
  }

  async function ensureOperatingArtifacts(runId: string, seed: { title: string; theme: string; designMode: 'reference_reskin' | 'prototype_tournament'; runtime?: 'web-lite' | 'cocos-3d'; referenceMechanics?: ReferenceMechanicSpec; targetPlatforms?: string[] }) {
    await ensureConstitutionArtifact(runId);
    await ensureCostArtifacts(runId);
    await ensureSideEffectJournalArtifact(runId);
    await ensurePlatformPolicyArtifact(runId);
    if (portfolioGateRequired()) await ensurePortfolioStrategyArtifact(runId);
    const businessStrategyFile = path.join(store.runRoot(runId), 'artifacts/business-strategy.json');
    if (!await exists(businessStrategyFile)) await store.writeArtifact(runId, 'business-strategy.json', buildBusinessStrategy(effectiveOperatingProfile()));
    const existingCapacityRaw = await store.readArtifact(runId, 'account-capacity.json').catch(() => undefined);
    let existingCapacity: ReturnType<typeof AccountCapacityPlanSchema.parse> | undefined;
    if (existingCapacityRaw !== undefined) {
      try { existingCapacity = AccountCapacityPlanSchema.parse(existingCapacityRaw); }
      catch (error) { throw new Error(`account capacity plan is invalid: ${error instanceof Error ? error.message : String(error)}`); }
    }
    let portfolio: ReturnType<typeof AccountPortfolioSchema.parse> | undefined;
    let portfolioSnapshotError: string | undefined;
    try { portfolio = await readAccountPortfolioSnapshot(); }
    catch (error) {
      portfolioSnapshotError = error instanceof Error ? error.message : String(error);
      if (enforceOperatingGates) throw new Error(`account portfolio snapshot is invalid: ${portfolioSnapshotError}`);
      portfolio = undefined;
    }
    const capacities = operatingProfile.accountCapacities;
    const capacityPlatforms = capacities.map((item) => item.platform);
    const missingPortfolioBlocker = [
      ...(process.env.FACTORY_REQUIRE_PORTFOLIO_SNAPSHOT === '1' ? ['portfolio-snapshot-missing'] : []),
      ...(portfolioSnapshotError ? ['portfolio-snapshot-invalid'] : []),
    ];
    const desiredPlan = portfolio
      ? buildAccountCapacityPlan({
        entity: operatingProfile.entity,
        capacities,
        activeCounts: deriveActiveCountsFromPortfolio(portfolio, capacityPlatforms),
        source: 'portfolio',
        portfolioSnapshotHash: accountPortfolioHash(portfolio),
        portfolioUpdatedAt: portfolio.updatedAt,
      })
      : buildAccountCapacityPlan({ entity: operatingProfile.entity, capacities, activeCounts: capacities.map((item) => ({ platform: item.platform, activeGames: 0, reservedGames: 0 })), blockers: missingPortfolioBlocker, source: 'default-zero' });
    if (!portfolio) {
      const examplePath = path.join(store.runRoot(runId), 'human/account-portfolio.example.json');
      if (!await exists(examplePath)) await writeJsonAtomic(examplePath, { schemaVersion: 1, updatedAt: new Date().toISOString(), entries: [] });
    }
    let capacityChanged = existingCapacity === undefined;
    if (existingCapacity && portfolio) {
      const binding = evaluateAccountCapacityPortfolioBinding(existingCapacity, portfolio);
      const samePlanShape = existingCapacity.entity === desiredPlan.entity
        && JSON.stringify(existingCapacity.capacities) === JSON.stringify(desiredPlan.capacities)
        && JSON.stringify(existingCapacity.activeCounts) === JSON.stringify(desiredPlan.activeCounts)
        && existingCapacity.source === desiredPlan.source
        && existingCapacity.portfolioSnapshotHash === desiredPlan.portfolioSnapshotHash
        && existingCapacity.portfolioUpdatedAt === desiredPlan.portfolioUpdatedAt;
      capacityChanged = !binding.passed || !samePlanShape;
    } else if (existingCapacity) {
      // A previously portfolio-bound plan cannot remain trusted after the
      // global snapshot disappears. Replace it with an explicit zero snapshot
      // (or a blocking marker when the operator requires a portfolio) so the
      // stale counts never reach release.
      capacityChanged = existingCapacity.source === 'portfolio'
        || existingCapacity.portfolioSnapshotHash !== undefined
        || existingCapacity.entity !== desiredPlan.entity
        || JSON.stringify(existingCapacity.capacities) !== JSON.stringify(desiredPlan.capacities)
        || JSON.stringify(existingCapacity.activeCounts) !== JSON.stringify(desiredPlan.activeCounts)
        || JSON.stringify(existingCapacity.blockers) !== JSON.stringify(desiredPlan.blockers);
    }
    if (capacityChanged) {
      await store.writeArtifact(runId, 'account-capacity.json', desiredPlan);
      await store.writeArtifact(runId, 'account-capacity-evaluation.json', evaluateAccountCapacity(desiredPlan));
    } else if (!await exists(path.join(store.runRoot(runId), 'artifacts/account-capacity-evaluation.json'))) {
      await store.writeArtifact(runId, 'account-capacity-evaluation.json', evaluateAccountCapacity(existingCapacity!));
      capacityChanged = true;
    }
    const planFile = path.join(store.runRoot(runId), 'artifacts/pipeline-plan.json');
    const lineText = `${seed.title}\n${seed.theme}`;
    const lineDecisionFile = path.join(store.runRoot(runId), 'artifacts/production-line-decision.json');
    if (!await exists(lineDecisionFile)) {
      await store.writeArtifact(runId, 'production-line-decision.json', inferProductionLineDecisionFromText(lineText));
    } else ProductionLineDecisionSchema.parse(await store.readArtifact(runId, 'production-line-decision.json'));
    if (!await exists(planFile)) {
      const decision = ProductionLineDecisionSchema.parse(await store.readArtifact(runId, 'production-line-decision.json'));
      const line = decision.line ? lockProductionLine(decision.line) : null;
      // Never turn an unsupported/new-line request into the idle template as a
      // convenience. A pending marker keeps the plan truthful until a human
      // explicitly approves and supplies a production line.
      await store.writeArtifact(runId, 'pipeline-plan.json', buildPipelinePlan({ mode: operatingProfile.pipelineMode, designMode: seed.designMode, productionLine: line?.line ?? 'pending-review', primaryProfile: line?.primaryProfile ?? decision.profile, presentationQualityRequired: presentationQualityRequired(), supplyChainRequired: supplyChainRequired(), blindPlaytestRequired: blindPlaytestRequired() }));
    }
    const lineDecision = ProductionLineDecisionSchema.parse(await store.readArtifact(runId, 'production-line-decision.json'));
    if (lineDecision.line && !await exists(path.join(store.runRoot(runId), 'artifacts/natural-input-policy.json'))) {
      await store.writeArtifact(runId, 'natural-input-policy.json', buildNaturalInputPolicy(lineDecision.line));
    }
    const pipelinePlan = validatePipelinePlan(await store.readArtifact(runId, 'pipeline-plan.json'));
    const contractRegistry = evaluateStageContractRegistry(pipelinePlan.mandatoryStages);
    await store.writeArtifact(runId, 'stage-contract-registry.json', contractRegistry);
    if (enforceExplicitStageContracts && !contractRegistry.passed) throw new Error(`pipeline contains stages without explicit contracts: ${contractRegistry.fallbackStages.join(', ')}`);
    const baselineFile = path.join(store.runRoot(runId), 'artifacts/quality-baseline.json');
    if (!await exists(baselineFile)) await store.writeArtifact(runId, 'quality-baseline.json', evaluateQualityBaseline({}));
    const originalityFile = path.join(store.runRoot(runId), 'artifacts/originality-declaration.json');
    if (!await exists(originalityFile)) await store.writeArtifact(runId, 'originality-declaration.json', buildOriginalityTemplate());
    if (!await exists(path.join(store.runRoot(runId), 'artifacts/model-policy.json'))) await store.writeArtifact(runId, 'model-policy.json', snapshotModelPolicy());
    await ensurePermissionManifestBundle(runId);
    if (!await exists(path.join(store.runRoot(runId), 'artifacts/human-approval-plan.json'))) await store.writeArtifact(runId, 'human-approval-plan.json', buildHumanApprovalPlan(seed.designMode));
    if (!await exists(path.join(store.runRoot(runId), 'artifacts/human-approval-ledger.json'))) await store.writeArtifact(runId, 'human-approval-ledger.json', buildHumanApprovalLedger(runId));
    const gameId = seed.title.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/giu, '-').replace(/^-|-$/gu, '') || 'game';
    if (!await exists(path.join(store.runRoot(runId), 'artifacts/randomness-policy.json'))) await store.writeArtifact(runId, 'randomness-policy.json', buildRandomnessPolicy(gameId));
    if (!await exists(path.join(store.runRoot(runId), 'artifacts/artifact-ledger.json'))) await store.writeArtifact(runId, 'artifact-ledger.json', createArtifactLedger());
    await ensureUnknownRegister(runId);
    if (!await exists(path.join(store.runRoot(runId), 'artifacts/platform-spine.json'))) {
      await store.writeArtifact(runId, 'platform-spine.json', buildPlatformSpineContract({ gameId, runtime: seed.runtime ?? 'web-lite', requiredTargets: operatingProfile.requiredTargets, optionalTargets: operatingProfile.optionalTargets }));
    } else PlatformSpineContractSchema.parse(await store.readArtifact(runId, 'platform-spine.json'));
    if (!await exists(path.join(store.runRoot(runId), 'artifacts/certification-checklist.json'))) {
      await store.writeArtifact(runId, 'certification-checklist.json', buildCertificationChecklist({ gameId, title: seed.title, entity: operatingProfile.entity, requiredTargets: operatingProfile.requiredTargets, optionalTargets: operatingProfile.optionalTargets }));
    }
    if (seed.designMode === 'reference_reskin' && seed.referenceMechanics && !await exists(path.join(store.runRoot(runId), 'artifacts/reference-evidence-pack.json'))) {
      const pack = await buildReferenceEvidencePack({
        targetRunId: runId,
        reference: ReferenceMechanicSpecSchema.parse(seed.referenceMechanics),
        runRoot: store.runRoot(runId),
        requireSupplemental: enforceOperatingGates,
        requireHostAllowlist: validationMode === 'production' || process.env.FACTORY_REQUIRE_RESEARCH_ALLOWLIST === '1',
        allowedHosts: (process.env.FACTORY_RESEARCH_ALLOWED_HOSTS ?? '').split(/[\s,]+/u).filter(Boolean),
      });
      await store.writeArtifact(runId, 'reference-evidence-pack.json', pack);
    }
    return { capacityChanged, portfolioSnapshotHash: portfolio ? accountPortfolioHash(portfolio) : undefined };
  }

  async function begin(state: RunState, stage: StageName, inputArtifacts: string[]): Promise<StageRecord> {
    const planPolicy = assertStagePlannedOrLegacy(activePipelinePlan, stage, { legacyPlan: activePlanIsLegacy });
    try {
      await store.writeArtifact(state.runId, `stage-plan-policy/${stage}.json`, {
        schemaVersion: 1,
        stage,
        ...planPolicy,
        source: planPolicy.classification === 'legacy' ? 'legacy-plan-fallback' : 'pipeline-plan',
      });
    } catch { /* policy evidence must not mask stage execution */ }
    const contract = getStageContract(stage);
    await preflightCostBeforeStage(state, stage);
    const record = store.record(stage, state.stages[stage]);
    if (record.attempts > contract.maxAttempts || record.attempts > contract.retryPolicy.maxAttempts) throw new Error(`Stage ${stage} exceeded its bounded retry policy`);
    record.inputArtifacts = inputArtifacts; state.stage = stage; state.status = 'running'; state.stages[stage] = record;
    await store.save(state);
    await store.log(state.runId, 'stage.contract', { stage, contract: getStageContract(stage) });
    await store.log(state.runId, 'stage.started', { stage, attempt: record.attempts });
    const previousError = record.errors.at(-1);
    const failureKind = previousError ? classifyModelFailure(previousError) : 'CAPABILITY_ERROR';
    try { await store.writeArtifact(state.runId, `model-routing/${stage}.attempt-${record.attempts}.json`, buildModelRouteDecision(stage, record.attempts - 1, failureKind, contract.allowedModelTiers)); } catch { /* routing evidence must not mask the stage itself */ }
    return record;
  }
  async function updateArtifactLedger(state: RunState, record: StageRecord, outputs: string[]) {
    const runRoot = store.runRoot(state.runId);
    let ledger = createArtifactLedger();
    try { ledger = await store.readArtifact(state.runId, 'artifact-ledger.json') as ReturnType<typeof createArtifactLedger>; } catch { /* first write or legacy run */ }
    const inputHashes: Record<string, string> = {};
    for (const input of record.inputArtifacts) {
      const file = path.join(runRoot, input.replace(/^artifacts\//u, 'artifacts/'));
      try { const stat = await lstat(file); if (stat.isFile() && !stat.isSymbolicLink()) inputHashes[input] = await sha256File(file); } catch { /* pointer-only input */ }
    }
    for (const output of outputs) {
      if (output.endsWith('/')) continue;
      if (VOLATILE_LEDGER_ARTIFACTS.includes(output as (typeof VOLATILE_LEDGER_ARTIFACTS)[number])) continue;
      const file = path.join(runRoot, output);
      try { const stat = await lstat(file); if (!stat.isFile() || stat.isSymbolicLink()) continue; ledger = recordArtifact(ledger, { path: output, sha256: await sha256File(file), producerStage: record.stage, inputHashes }); } catch { /* directory or optional output */ }
    }
    await store.writeArtifact(state.runId, 'artifact-ledger.json', ledger);
    return evaluateArtifactLedger(ledger);
  }
  async function complete(state: RunState, record: StageRecord, outputs: string[], evidence: string[]) {
    const contract = getStageContract(record.stage);
    const genericContract = contract.idempotencyKey.startsWith('run:{runId}:stage:');
    // Legacy stages without a bespoke contract still have a real deterministic
    // output: the persisted state record itself. Include it explicitly in the
    // audit instead of making every old call site manufacture a fake artifact.
    const observedInputs = genericContract ? [...record.inputArtifacts, 'state.json'] : record.inputArtifacts;
    const observedArtifacts = genericContract ? [...outputs, 'state.json'] : outputs;
    const observedEvidence = genericContract ? [...evidence, 'state:persisted'] : evidence;
    const sideEffects = evaluateStageSideEffects(contract, outputs);
    if (enforceStageContracts && !sideEffects.passed) throw new Error(`Stage ${record.stage} side-effect contract failed: ${sideEffects.blockers.join(', ')}`);
    const artifactVersions = Object.fromEntries([...observedInputs, ...observedArtifacts].flatMap((actual) => {
      const declared = contract.outputs.find((item) => item.required && contractPathMatches(item.path, actual))
        ?? contract.inputs.find((item) => item.required && contractPathMatches(item.path, actual));
      return declared ? [[actual, declared.artifactVersion] as const] : [];
    }));
    const audit = evaluateStageContract(contract, { inputs: observedInputs, artifacts: observedArtifacts, evidence: observedEvidence, artifactVersions, strictVersions: enforceStageContracts });
    await store.writeArtifact(state.runId, `stage-contracts/${record.stage}.json`, audit);
    if (enforceStageContracts && !audit.passed) throw new Error(`Stage ${record.stage} contract failed: ${audit.missing.join(', ')}`);
    const ledgerResult = await updateArtifactLedger(state, record, outputs);
    const policy = executionPolicyForStage(record.stage);
    for (const output of outputs.filter((item) => !item.endsWith('/'))) {
      const entry = ledgerResult.ledger.entries.find((item) => item.path === output);
      if (!entry) continue;
      const metadataName = `artifact-metadata/${output.replaceAll('/', '__')}.json`;
      try {
        await store.writeArtifact(state.runId, metadataName, buildArtifactMetadata({ runId: state.runId, path: output, producerStage: record.stage, inputHashes: entry.inputHashes, outputHash: entry.sha256, model: policy.model, reasoning: policy.reasoning, approvalStatus: getStageContract(record.stage).approvalRequired ? 'PENDING' : 'NONE' }));
      } catch { /* metadata is audit enrichment; stage output remains authoritative */ }
    }
    const modelEvidence = record.evidence.filter((item) => item.startsWith('model:'));
    record.status = 'completed'; record.finishedAt = new Date().toISOString(); record.outputArtifacts = outputs; record.evidence = [...new Set([...evidence, ...modelEvidence])]; state.status = 'running'; await store.save(state); await store.log(state.runId, 'stage.completed', { stage: record.stage, outputs, evidence: record.evidence, contractPassed: audit.passed });
  }
  function addAgentMetrics(record: StageRecord, metrics: AgentCallMetrics) { record.providerCalls.agent += metrics.calls; const model = metrics.model.trim(); if (model && !record.evidence.includes(`model:${model}`)) record.evidence.push(`model:${model}`); if (metrics.usage) { record.tokenUsage.inputTokens += metrics.usage.inputTokens; record.tokenUsage.outputTokens += metrics.usage.outputTokens; record.tokenUsage.totalTokens += metrics.usage.totalTokens; } }
  async function routedModelForAttempt(state: RunState, stage: 'FULL_BUILD' | 'FIX', attempt: number): Promise<string> {
    const routeFile = path.join(store.runRoot(state.runId), `artifacts/model-routing/${stage}.attempt-${Math.max(1, Math.trunc(attempt))}.json`);
    try {
      const route = JSON.parse(await readFile(routeFile, 'utf8')) as { selected?: { model?: unknown }; base?: { model?: unknown } };
      const selected = route.selected?.model;
      if (typeof selected === 'string' && selected.trim()) return selected.trim();
      const base = route.base?.model;
      if (typeof base === 'string' && base.trim()) return base.trim();
    } catch { /* legacy runs may not have routing artifacts */ }
    return process.env.CODEX_MODEL?.trim() || executionPolicyForStage(stage).model;
  }
  async function backfillCodexMetrics(state: RunState, stage: 'FULL_BUILD' | 'FIX') {
    const record = state.stages[stage];
    if (!record) return;
    if (record.providerCalls.agent > 0) {
      if (stage === 'FIX' && record.providerCalls.agent < record.attempts) record.providerCalls.agent = record.attempts;
      return;
    }
    const logFile = path.join(store.runRoot(state.runId), `logs/codex/${stage === 'FULL_BUILD' ? 'BUILD' : stage}.attempt-1.stdout.jsonl`);
    if (!await exists(logFile)) return;
    const parsed = parseCodexJsonl(await readFile(logFile, 'utf8'));
    if (parsed.completed && !parsed.failed && parsed.threadId) addAgentMetrics(record, { provider: 'codex-cli', model: await routedModelForAttempt(state, stage, 1), calls: stage === 'FIX' ? Math.max(1, record.attempts) : 1, usage: parsed.usage });
  }
  async function saveUsage(state: RunState) {
    const stages = Object.fromEntries(Object.entries(state.stages).map(([stage, record]) => [stage, { providerCalls: record.providerCalls, tokenUsage: record.tokenUsage }]));
    await store.writeArtifact(state.runId, 'provider-usage.json', { schemaVersion: 1, stages });
    const usage = await usageForState(state);
    await store.writeArtifact(state.runId, 'cost-usage.json', usage);
    await store.writeArtifact(state.runId, 'cost-gate.json', evaluateCostGate(CostBudgetSchema.parse(operatingProfile.budget), usage));
    return usage;
  }
  async function waitForCodexImagegen(state: RunState, record: StageRecord, error: CodexImagegenPendingError) {
    record.status = 'waiting'; record.finishedAt = null; record.evidence = [path.relative(store.runRoot(state.runId), error.taskPath), ...error.missingFiles.map((file) => `missing:${path.relative(store.runRoot(state.runId), file)}`)];
    const now = new Date().toISOString(); const previous = state.stages.WAITING_FOR_CODEX_IMAGEGEN;
    state.stage = 'WAITING_FOR_CODEX_IMAGEGEN'; state.status = 'waiting';
    state.stages.WAITING_FOR_CODEX_IMAGEGEN = { stage: 'WAITING_FOR_CODEX_IMAGEGEN', status: 'waiting', startedAt: previous?.startedAt ?? now, finishedAt: null, attempts: previous?.attempts ?? 1, inputArtifacts: [path.relative(store.runRoot(state.runId), error.taskPath)], outputArtifacts: [], errors: [], evidence: [error.command], providerCalls: previous?.providerCalls ?? { agent: 0, image: 0 }, tokenUsage: previous?.tokenUsage ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
    await saveUsage(state); await store.save(state); await store.log(state.runId, 'run.waiting', { gate: 'codex-imagegen', task: path.relative(store.runRoot(state.runId), error.taskPath), missingFiles: error.missingFiles.map((file) => path.relative(store.runRoot(state.runId), file)) });
    return state;
  }
  function completeImagegenWait(state: RunState, outputs: string[]) { const wait = state.stages.WAITING_FOR_CODEX_IMAGEGEN; if (wait?.status === 'waiting') { wait.status = 'completed'; wait.finishedAt = new Date().toISOString(); wait.outputArtifacts = outputs; } }
  async function fail(state: RunState, record: StageRecord, error: unknown): Promise<never> {
    if (error instanceof ProviderOutputError) {
      addAgentMetrics(record, error.metrics);
      await store.writeArtifact(state.runId, `provider-errors/${record.stage}.json`, redactValue({ schemaVersion: 1, stage: record.stage, rawResponses: error.rawResponses, validationErrors: error.validationErrors, metrics: error.metrics }));
      await saveUsage(state);
    }
    const message = redactText(error instanceof Error ? error.stack ?? error.message : String(error));
    const failureKind = classifyModelFailure(message);
    try { await store.writeArtifact(state.runId, `model-routing/${record.stage}.failure-${record.attempts}.json`, buildModelRouteDecision(record.stage, record.attempts, failureKind, getStageContract(record.stage).allowedModelTiers)); } catch { /* preserve original failure */ }
    const inferredFailureClass = routeFailureClassFromMessage(message);
    const failureClass: 'rights' | 'compliance' | 'core_experience' | 'platform' | 'build' | 'qa' | 'growth' | 'monetization' | 'unknown' = inferredFailureClass;
    const contract = getStageContract(record.stage);
    const rootRoute = routeFailureToEarliestStage({ symptomStage: record.stage, failureClass: inferredFailureClass, message });
    const route = rootRoute.stage === 'FACTORY_EVAL' && contract.failureRoute.stage !== record.stage ? { ...contract.failureRoute, owner: contract.ownerRole, confidence: 0.5 } : rootRoute;
    const ownerByRole: Record<string, 'ResearchAgent' | 'ProducerAgent' | 'BuilderAgent' | 'FixerAgent' | 'QAAgent' | 'ReleaseAgent' | 'HumanReviewer' | 'FactoryControlPlane'> = {
      ResearchAgent: 'ResearchAgent', ProducerAgent: 'ProducerAgent', BuilderAgent: 'BuilderAgent', FixerAgent: 'FixerAgent', QAAgent: 'QAAgent', ReleaseAgent: 'ReleaseAgent', HumanReviewer: 'HumanReviewer', FactoryControlPlane: 'FactoryControlPlane',
    };
    // The routed owner is authoritative once the failure classifier has
    // located the earliest responsible stage. Using the symptom contract's
    // owner here used to mislabel upstream design failures as the current
    // Builder/QA owner and sent humans to the wrong queue.
    const owner = ownerByRole[route.owner] ?? ownerByRole[contract.ownerRole] ?? 'FactoryControlPlane';
    const primaryCause = message.split('\n').find((line) => line.trim())?.slice(0, 500) ?? 'stage failure';
    const suspectedRootCauses = [{ artifact: record.inputArtifacts[0] ?? `stage:${record.stage}`, confidence: 0.5, reason: primaryCause }];
    const secondaryRoutes = [...new Set([record.stage, contract.failureRoute.stage].filter((stage) => stage !== route.stage))];
    try {
      await store.writeArtifact(state.runId, 'failure-report.json', makeFailureReport({
        stage: record.stage,
        failureClass,
        routeTo: route.stage,
        message: message.slice(0, 4_000),
        hypotheses: [{ cause: primaryCause, confidence: 0.5, evidence: [`stage:${record.stage}`, `attempt:${record.attempts}`, `inputs:${record.inputArtifacts.join(',') || 'none'}`] }],
        symptom: message.split('\n')[0]?.slice(0, 1_000) ?? 'stage failure',
        reproduction: `resume ${state.runId} at ${record.stage}; inputs=${record.inputArtifacts.join(',') || 'none'}`,
        suspectedRootCauses,
        secondaryRoutes,
        owner,
        regressionTest: `regression-required:${record.stage}`,
        failureKind,
        retryable: failureKind !== 'POLICY_BLOCK' && failureKind !== 'SPEC_ERROR',
      }));
    } catch { /* preserve the original failure if evidence persistence itself fails */ }
    record.failureReason = primaryCause; state.failureReason = primaryCause; record.status = 'failed'; record.finishedAt = new Date().toISOString(); record.errors.push(message); state.stage = 'FAILED'; state.status = 'failed'; await store.save(state); await store.log(state.runId, 'stage.failed', { stage: record.stage, message, failureClass, failureKind, routeTo: route.stage }); throw error;
  }

  async function markAutoAbandoned(state: RunState, reason: 'cost-cap' | 'fix-cap' | 'platform-blocked' | 'unknown') {
    const decision = evaluateAbandonment({ runId: state.runId, stage: state.stage, budget: operatingProfile.budget, usage: await usageForState(state), reason });
    await store.writeArtifact(state.runId, 'abandonment-decision.json', decision);
    await recordControlStage(state, 'ABANDONED', 'completed', [`stage:${state.stage}`, 'state.json'], ['artifacts/abandonment-decision.json'], ['abandonment:decision', ...decision.evidence]);
    state.stage = 'ABANDONED'; state.status = 'completed';
    await store.save(state);
    await store.log(state.runId, 'run.abandoned', { reason, automatic: true });
    return state;
  }
  function done(state: RunState, stage: StageName) { return state.stages[stage]?.status === 'completed'; }
  function assertRunMode(state: RunState) {
    if (state.providerMode !== mode) throw new Error(`Run ${state.runId} provider mode ${state.providerMode} does not match current factory mode ${mode}`);
  }
  function invalidateDownstream(state: RunState, stage: StageName) {
    for (const downstreamStage of [stage, ...getDownstreamStages(stage)]) {
      const record = state.stages[downstreamStage];
      if (!record) continue;
      record.status = 'pending'; record.finishedAt = null; record.outputArtifacts = []; record.evidence = [];
    }
  }

  /**
   * Reconcile every recorded artifact before checking whether a run is done.
   * This closes the dangerous "completed fast path": a human edit, interrupted
   * write, or replaced file must invalidate the owning stage and all of its
   * downstream evidence before any release status can be reused.
   */
  async function reconcileRunArtifacts(state: RunState) {
    const runRoot = store.runRoot(state.runId);
    let ledger: ReturnType<typeof createArtifactLedger>;
    try { ledger = await store.readArtifact(state.runId, 'artifact-ledger.json') as ReturnType<typeof createArtifactLedger>; }
    catch { return { state, driftedStages: [] as StageName[], reconciliation: undefined }; }
    const reconciliation = await reconcileArtifactLedger(ledger, runRoot, { ignoreDrift: [...VOLATILE_LEDGER_ARTIFACTS], ignoreMissing: [...VOLATILE_LEDGER_ARTIFACTS] });
    const unsafePaths = reconciliation.blockers
      .filter((item) => item.startsWith('unsafe-path:'))
      .map((item) => item.slice('unsafe-path:'.length));
    const driftedPaths = new Set([...reconciliation.changed, ...reconciliation.missing, ...unsafePaths]);
    // A previous reconciliation may already have marked a dependent
    // INVALIDATED even though its bytes are now present.  Do not let a
    // subsequent resume mistake that stale status for a clean graph.
    const invalidatedPaths = reconciliation.ledger.entries
      .filter((entry) => entry.status === 'INVALIDATED')
      .map((entry) => entry.path);
    for (const item of invalidatedPaths) driftedPaths.add(item);
    if (driftedPaths.size === 0) return { state, driftedStages: [] as StageName[], reconciliation };

    await store.writeArtifact(state.runId, 'artifact-ledger.json', reconciliation.ledger);
    const driftedStages = [...new Set(reconciliation.ledger.entries
      .filter((entry) => driftedPaths.has(entry.path) || entry.status === 'INVALIDATED')
      .flatMap((entry) => {
        const parsed = StageNameSchema.safeParse(entry.producerStage);
        return parsed.success ? [parsed.data] : [];
      }))];
    const order = new Map(CANONICAL_STAGE_ORDER.map((stage, index) => [stage, index]));
    driftedStages.sort((a, b) => (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER));
    for (const stage of driftedStages) invalidateDownstream(state, stage);
    // An unsafe/missing root has no trustworthy producer stage. Keep the run
    // resumable but route it to the earliest concrete build gate for review.
    const earliest = driftedStages[0] ?? (StageNameSchema.safeParse(state.stage).success ? StageNameSchema.parse(state.stage) : 'FULL_BUILD');
    state.stage = earliest;
    state.status = 'pending';
    await store.save(state);
    await store.log(state.runId, 'artifact-ledger.reconciled', {
      changed: reconciliation.changed,
      missing: reconciliation.missing,
      unsafe: unsafePaths,
      driftedStages,
      rewindTo: earliest,
    });
    return { state, driftedStages, reconciliation };
  }

  /** Remove only explicitly allow-listed, disposable evidence for a retry. */
  async function clearRetryArtifacts(runId: string, stage: StageName) {
    const runRoot = store.runRoot(runId);
    const allowed = /^(?:artifacts|human|release-candidate|screenshots|logs|art-review|workspace\/generated-assets)(?:\/|$)/u;
    for (const relative of getDownstreamArtifactPaths(stage)) {
      if (!allowed.test(relative) || relative.includes('..')) throw new Error(`unsafe retry cleanup path: ${relative}`);
      const target = path.join(runRoot, relative);
      // Never follow a symlink while cleaning retry evidence. A malicious or
      // stale artifact can therefore only be unlinked, never recursively
      // removed outside this run.
      try {
        const stat = await lstat(target);
        if (stat.isSymbolicLink() || stat.isFile()) await rm(target, { force: true });
        else if (stat.isDirectory()) await rm(target, { recursive: true, force: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  }

  async function executeActionExperiment(state: RunState): Promise<RunState> {
    selectRuntime('web-lite');
    if (['ACTION_EXPERIMENT_APPROVED', 'ACTION_EXPERIMENT_REFACTOR', 'ACTION_EXPERIMENT_KILLED'].includes(state.stage)) return state;
    if (mode === 'codex-account') await codexExecutor!.assertChatGptLogin();
    const runId = state.runId; const runRoot = store.runRoot(runId);
    if (!done(state, 'ACTION_EXPERIMENT_SPEC')) {
      const record = await begin(state, 'ACTION_EXPERIMENT_SPEC', ['input/action-experiment.json']);
      try {
        const value = ActionMechanicExperimentSpecSchema.parse(JSON.parse(await readFile(path.join(runRoot, 'input/action-experiment.json'), 'utf8')));
        await store.writeArtifact(runId, 'action-experiment-spec.json', value);
        await complete(state, record, ['artifacts/action-experiment-spec.json'], ['zod:ActionMechanicExperimentSpecSchema', 'single-question:true', 'variants:A/B/C']);
      } catch (error) { return fail(state, record, error); }
    }
    const spec = ActionMechanicExperimentSpecSchema.parse(await store.readArtifact(runId, 'action-experiment-spec.json'));
    if (!done(state, 'BUILD_ACTION_PROTOTYPES')) {
      const record = await begin(state, 'BUILD_ACTION_PROTOTYPES', ['artifacts/action-experiment-spec.json', spec.sourceWorkspace]);
      try {
        const context = await contextFor('BUILD_ACTION_PROTOTYPES', runRoot, store.artifact(runId, 'action-prototype-build-report.json'), ['artifacts/action-experiment-spec.json', spec.sourceWorkspace], 'Build isolated action-feel variants from the validated experiment; never modify the source workspace or production game.');
        const result = await builderAgent.buildActionPrototypes(runRoot, path.resolve(repositoryRoot, spec.sourceWorkspace), spec, context);
        addAgentMetrics(record, result.metrics); await store.writeArtifact(runId, 'action-prototype-build-report.json', result.report); await saveUsage(state);
        await complete(state, record, ['artifacts/action-prototype-build-report.json', 'workspace/action-a/dist/', 'workspace/action-b/dist/', 'workspace/action-c/dist/'], ['zod:ActionPrototypeBuildReportSchema', 'builder:BuilderAgent', 'isolated:3']);
      } catch (error) { return fail(state, record, error); }
    }
    const buildReport = ActionPrototypeBuildReportSchema.parse(await store.readArtifact(runId, 'action-prototype-build-report.json'));
    if (!done(state, 'PLAYTEST_ACTION_PROTOTYPES')) {
      const record = await begin(state, 'PLAYTEST_ACTION_PROTOTYPES', ['artifacts/action-experiment-spec.json', 'artifacts/action-prototype-build-report.json']);
      try {
        const report = await qaAgent.actionTournament(spec, buildReport, runRoot);
        await store.writeArtifact(runId, 'action-playtest-report.json', report);
        await complete(state, record, ['artifacts/action-playtest-report.json', 'screenshots/', 'logs/'], ['zod:ActionPlaytestReportSchema', 'reviewer:QAAgent', 'author-independent:true']);
      } catch (error) { return fail(state, record, error); }
    }
    const playtestReport = ActionPlaytestReportSchema.parse(await store.readArtifact(runId, 'action-playtest-report.json'));
    const approvalFile = path.join(runRoot, 'human/action-mechanic-decision.yaml');
    if (!await exists(approvalFile)) {
      const example = { schemaVersion: 1, experimentId: spec.experimentId, decision: 'KEEP', selectedSlot: playtestReport.recommendation === 'NONE' ? null : playtestReport.recommendation, rationale: 'Record the human playtest decision.', requiredChanges: [] };
      if (!await exists(path.join(runRoot, 'human/action-mechanic-decision.example.yaml'))) await writeFile(path.join(runRoot, 'human/action-mechanic-decision.example.yaml'), stringify(example));
      await writeFile(path.join(runRoot, 'human/action-mechanic-review.json'), `${JSON.stringify({ schemaVersion: 1, experimentId: spec.experimentId, question: spec.question, recommendation: playtestReport.recommendation, rationale: playtestReport.rationale, prototypes: buildReport.prototypes }, null, 2)}\n`);
      const now = new Date().toISOString(); const previous = state.stages.WAITING_FOR_ACTION_APPROVAL;
      state.stage = 'WAITING_FOR_ACTION_APPROVAL'; state.status = 'waiting';
      state.stages.WAITING_FOR_ACTION_APPROVAL = { stage: 'WAITING_FOR_ACTION_APPROVAL', status: 'waiting', startedAt: previous?.startedAt ?? now, finishedAt: null, attempts: previous?.attempts ?? 1, inputArtifacts: ['artifacts/action-playtest-report.json'], outputArtifacts: ['human/action-mechanic-review.json'], errors: previous?.errors ?? [], evidence: ['human/action-mechanic-decision.example.yaml', 'variants:A/B/C'], providerCalls: previous?.providerCalls ?? { agent: 0, image: 0 }, tokenUsage: previous?.tokenUsage ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
      await persistControlStageAudit(state, 'WAITING_FOR_ACTION_APPROVAL', 'waiting', ['artifacts/action-playtest-report.json'], ['human/action-mechanic-review.json'], ['human/action-mechanic-decision.example.yaml', 'variants:A/B/C']);
      await store.save(state); await store.log(runId, 'run.waiting', { gate: 'action-mechanic-approval' }); return state;
    }
    const decision = HumanActionMechanicDecisionSchema.parse(parse(await readFile(approvalFile, 'utf8')));
    ActionMechanicExperimentBundleSchema.parse({ spec, buildReport, playtestReport, humanDecision: decision });
    const wait = state.stages.WAITING_FOR_ACTION_APPROVAL;
    if (wait) {
      await recordControlStage(state, 'WAITING_FOR_ACTION_APPROVAL', 'completed', ['artifacts/action-playtest-report.json'], ['human/action-mechanic-review.json', 'human/action-mechanic-decision.yaml'], ['human/action-mechanic-decision.example.yaml', `decision:${decision.decision}`]);
    }
    const terminalStage = decision.decision === 'KEEP' ? 'ACTION_EXPERIMENT_APPROVED' : decision.decision === 'REFACTOR' ? 'ACTION_EXPERIMENT_REFACTOR' : 'ACTION_EXPERIMENT_KILLED';
    const now = new Date().toISOString(); state.stage = terminalStage; state.status = 'completed';
    state.stages[terminalStage] = { stage: terminalStage, status: 'completed', startedAt: now, finishedAt: now, attempts: 1, inputArtifacts: ['human/action-mechanic-decision.yaml'], outputArtifacts: [], errors: [], evidence: [`decision:${decision.decision}`, `selected:${decision.selectedSlot ?? 'NONE'}`], providerCalls: { agent: 0, image: 0 }, tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
    const actionEvidence = [`decision:${decision.decision}`, `selected:${decision.selectedSlot ?? 'NONE'}`];
    await persistControlStageAudit(state, terminalStage, 'completed', ['human/action-mechanic-decision.yaml'], ['state.json'], actionEvidence);
    await store.save(state); await store.log(runId, 'action-experiment.completed', { decision: decision.decision, selectedSlot: decision.selectedSlot }); return state;
  }

  async function executePipeline(runId: string): Promise<RunState> {
    let state = await store.load(runId); assertRunMode(state); if (state.runKind === 'action-experiment') { activePipelinePlan = undefined; activePlanIsLegacy = true; return executeActionExperiment(state); }
    if (mode === 'codex-account') await codexExecutor!.assertChatGptLogin();
    const runRoot = store.runRoot(runId); const seed = await store.readSeedFile(path.join(runRoot, 'input/seed.yaml'));
    selectRuntime(seed.runtime);
    // Reconcile before bootstrap helpers can rewrite any derived artifacts;
    // otherwise a fresh timestamp could mask a real user edit. New runs have
    // no ledger yet and simply continue through bootstrap.
    state = (await reconcileRunArtifacts(state)).state;
    const operatingArtifacts = await ensureOperatingArtifacts(runId, seed);
    if (operatingArtifacts.capacityChanged && state.stages.BUSINESS_PREFLIGHT?.status === 'completed') {
      invalidateDownstream(state, 'BUSINESS_PREFLIGHT');
      state.stage = 'BUSINESS_PREFLIGHT';
      state.status = 'pending';
      await store.log(runId, 'account-capacity.invalidated', {
        reason: 'operator-portfolio-or-capacity-profile-changed',
        portfolioSnapshotHash: operatingArtifacts.portfolioSnapshotHash,
        rewindTo: 'BUSINESS_PREFLIGHT',
      });
      await store.save(state);
    }
    if (['COMPLETED', 'NO_PROTOTYPE_WINNER', 'DESIGN_REJECTED', 'ABANDONED', 'NOT_GREENLIT'].includes(state.stage)) return state;
    let effectivePlan: ReturnType<typeof validatePipelinePlan> | undefined;
    try {
      effectivePlan = validatePipelinePlan(await store.readArtifact(runId, 'pipeline-plan.json'));
      activePlanIsLegacy = false;
    } catch {
      // Pre-plan runs remain resumable, but every stage receives a legacy
      // fallback policy and evidence instead of silently pretending a plan
      // existed.
      activePlanIsLegacy = true;
    }
    activePipelinePlan = effectivePlan;
    if (!effectivePlan) {
      await store.log(runId, 'pipeline-plan.legacy-fallback', { reason: 'pipeline-plan-missing-or-invalid' });
    }
    const missingGovernance = effectivePlan ? missingRequiredGovernanceStages(effectivePlan, {
      certificationRequired: certificationRequired(),
      presentationQualityRequired: presentationQualityRequired(),
      supplyChainRequired: supplyChainRequired(),
      blindPlaytestRequired: blindPlaytestRequired(),
    }) : [];
    if (missingGovernance.length > 0 && (validationMode === 'production' || enforceOperatingGates)) {
      return setWaiting(
        state,
        'PRODUCTION_LINE_REVIEW',
        ['artifacts/pipeline-plan.json'],
        ['artifacts/pipeline-plan.json'],
        ['pipeline:stale-for-effective-policy', ...missingGovernance.map((stage) => `policy-stage-missing:${stage}`), 'action:create-new-run-or-explicitly-migrate-plan'],
      );
    }
    const capacityEvaluation = await store.readArtifact(runId, 'account-capacity-evaluation.json').catch(() => undefined) as { passed?: unknown; blockers?: unknown[] } | undefined;
    if (enforceOperatingGates && capacityEvaluation?.passed !== true) {
      return setWaiting(state, 'BUSINESS_PREFLIGHT', ['artifacts/account-capacity.json'], ['artifacts/account-capacity-evaluation.json'], (Array.isArray(capacityEvaluation?.blockers) ? capacityEvaluation.blockers : ['account-capacity-evaluation-missing']).map((item) => `blocked:${String(item)}`));
    }
    const factoryEval = await ensureFactoryEvalArtifact(runId);
    const factoryEvalPassed = (factoryEval as { passed?: unknown }).passed === true;
    const factoryEvalEvidence = ['factory-eval:cases', `factory-eval:${factoryEvalPassed ? 'passed' : 'failed'}`, `suite:${FACTORY_EVAL_SUITE_VERSION}`];
    markControlStage(state, 'FACTORY_EVAL', factoryEvalPassed ? 'completed' : 'waiting', ['factory-eval/cases.json'], ['artifacts/factory-eval-report.json'], factoryEvalEvidence);
    await persistControlStageAudit(state, 'FACTORY_EVAL', factoryEvalPassed ? 'completed' : 'waiting', ['factory-eval/cases.json'], ['artifacts/factory-eval-report.json'], factoryEvalEvidence);
    await store.save(state);
    if (!factoryEvalPassed && enforceOperatingGates) return setWaiting(state, 'FACTORY_EVAL', ['artifacts/factory-eval-report.json'], ['artifacts/factory-eval-report.json'], ['factory-eval:regression-block']);
    const lineDecision = ProductionLineDecisionSchema.parse(await store.readArtifact(runId, 'production-line-decision.json'));
    const earlyCapability = lineDecision.line
      ? evaluateProductionLineCapability({ line: lineDecision.line, template: seed.template, runtime: seed.runtime })
      : undefined;
    if (earlyCapability) await writeCapabilityIfChanged(runId, earlyCapability);
    if (lineDecision.supportDecision !== 'SUPPORTED' && process.env.FACTORY_ALLOW_UNSUPPORTED_LINE !== '1') {
      return setWaiting(state, 'PRODUCTION_LINE_REVIEW', ['artifacts/production-line-decision.json'], ['artifacts/production-line-decision.json'], [`line:${lineDecision.supportDecision}`, ...lineDecision.detectedSignals]);
    }
    if (earlyCapability && !earlyCapability.passed && process.env.FACTORY_ALLOW_UNIMPLEMENTED_LINE !== '1') {
      return setWaiting(state, 'PRODUCTION_LINE_REVIEW', ['artifacts/production-line-decision.json'], ['artifacts/production-line-capability.json'], earlyCapability.blockers.map((item) => `blocked:${item}`));
    }
    if (!done(state, 'PRODUCTION_LINE_REVIEW')) {
      const record = await begin(state, 'PRODUCTION_LINE_REVIEW', ['input/seed.yaml']);
      try {
        await complete(state, record, ['artifacts/production-line-decision.json', ...(earlyCapability ? ['artifacts/production-line-capability.json'] : [])], ['line:support-decision', `line:${lineDecision.line ?? 'none'}`, `profile:${lineDecision.profile}`, ...(earlyCapability ? ['line:capability-checked', `line-capability:${earlyCapability.passed}`] : [])]);
      } catch (error) { return fail(state, record, error); }
    }
    if (enforceOperatingGates) {
      const profileFile = path.join(runRoot, 'artifacts/factory-profile.json');
      if (!await exists(profileFile)) await store.writeArtifact(runId, 'factory-profile.json', effectiveOperatingProfile());
      const preflightFile = path.join(runRoot, 'artifacts/business-preflight.json');
      if (!await exists(preflightFile)) {
        const template = buildBusinessPreflightTemplate({ targets: operatingProfile.requiredTargets, optionalTargets: operatingProfile.optionalTargets, budget: operatingProfile.budget, entity: operatingProfile.entity });
        await store.writeArtifact(runId, 'business-preflight.json', template);
        if (!await exists(path.join(runRoot, 'human/business-preflight.example.json'))) await writeFile(path.join(runRoot, 'human/business-preflight.example.json'), `${JSON.stringify(template, null, 2)}\n`);
        return setWaiting(state, 'BUSINESS_PREFLIGHT', ['artifacts/factory-profile.json', 'artifacts/account-capacity.json', 'artifacts/account-capacity-evaluation.json', 'artifacts/platform-policy.json', 'artifacts/platform-policy-evaluation.json'], ['artifacts/business-preflight.json'], ['human:verify-accounts-rights-payout', 'decision:PAUSE']);
      }
      const preflight = BusinessPreflightSchema.parse(await store.readArtifact(runId, 'business-preflight.json'));
      if (preflight.decision === 'KILL') {
        state.stage = 'NOT_GREENLIT'; state.status = 'completed';
        await recordControlStage(state, 'NOT_GREENLIT', 'completed', ['artifacts/business-preflight.json', 'state.json'], ['state.json'], ['business:not-greenlit', 'business-preflight:KILL']);
        await store.save(state); return state;
      }
      const platformPolicy = PlatformPolicySnapshotSchema.parse(await store.readArtifact(runId, 'platform-policy.json'));
      const platformPolicyEvaluation = buildPlatformPolicyEvaluation(platformPolicy, {
        requiredPlatforms: operatingProfile.requiredTargets,
        optionalPlatforms: operatingProfile.optionalTargets,
        requireVerified: platformPolicyRequired(),
      });
      await store.writeArtifact(runId, 'platform-policy-evaluation.json', platformPolicyEvaluation);
      if (platformPolicyRequired() && !platformPolicyEvaluation.passed) {
        return setWaiting(
          state,
          'BUSINESS_PREFLIGHT',
          ['artifacts/platform-policy.json', 'artifacts/platform-policy-evaluation.json'],
          ['artifacts/platform-policy-evaluation.json'],
          platformPolicyEvaluation.blockers.map((item) => `blocked:${item}`),
        );
      }
      if (preflight.decision !== 'GO' || preflight.blockers.length > 0 || preflight.unknowns.length > 0) return setWaiting(state, 'BUSINESS_PREFLIGHT', ['artifacts/factory-profile.json', 'artifacts/account-capacity.json', 'artifacts/account-capacity-evaluation.json', 'artifacts/platform-policy.json', 'artifacts/platform-policy-evaluation.json', 'artifacts/business-preflight.json'], ['artifacts/business-preflight.json'], [`decision:${preflight.decision}`, ...preflight.unknowns.map((item) => `unknown:${item}`)]);
      const businessStage = state.stages.BUSINESS_PREFLIGHT;
      if (businessStage && businessStage.status !== 'completed') {
        const capacityPlan = AccountCapacityPlanSchema.parse(await store.readArtifact(runId, 'account-capacity.json'));
        const capacityEvaluation = evaluateAccountCapacity(capacityPlan);
        await store.writeArtifact(runId, 'account-capacity-evaluation.json', capacityEvaluation);
        const businessEvidence = ['business:accounts', 'business:rights-payout', 'business:platform-policy', 'business:account-capacity', 'decision:GO', 'unknowns:0', `platform-policy:${platformPolicyEvaluation.passed ? 'verified' : 'advisory'}`];
        await recordControlStage(state, 'BUSINESS_PREFLIGHT', 'completed', ['artifacts/factory-profile.json', 'artifacts/account-capacity.json', 'artifacts/account-capacity-evaluation.json', 'artifacts/platform-policy.json', 'artifacts/platform-policy-evaluation.json'], ['artifacts/business-preflight.json', 'artifacts/account-capacity.json', 'artifacts/account-capacity-evaluation.json', 'artifacts/platform-policy-evaluation.json'], businessEvidence);
        await store.save(state);
      }
    }
    let approvedGameplay: GameplayIdea | ReferenceMechanicSpec;
    let monetizationContext: CompetitorResearch | ReferenceMechanicSpec;
    let gameplayArtifact: string;
    let humanApprovalArtifact: string;
    if (seed.designMode === 'reference_reskin') {
      const referenceMechanics = ReferenceMechanicSpecSchema.parse(seed.referenceMechanics);
      if (!done(state, 'REFERENCE_DEEP_RESEARCH')) {
        const inputs = ['input/seed.yaml', ...referenceMechanics.source.researchFiles];
        const record = await begin(state, 'REFERENCE_DEEP_RESEARCH', inputs);
        try {
          const pack = await store.readArtifact(runId, 'reference-evidence-pack.json');
          const evaluated = evaluateReferenceEvidence(pack, {
            requireHostAllowlist: validationMode === 'production' || process.env.FACTORY_REQUIRE_RESEARCH_ALLOWLIST === '1',
            allowedHosts: (process.env.FACTORY_RESEARCH_ALLOWED_HOSTS ?? '').split(/[\s,]+/u).filter(Boolean),
          });
          await store.writeArtifact(runId, 'reference-evidence-pack.json', evaluated.pack);
          await complete(state, record, ['artifacts/reference-evidence-pack.json'], ['zod:ReferenceEvidencePackSchema', `evidence-quality:${evaluated.pack.evidenceQuality}`, `unknowns:${evaluated.pack.unknowns.length}`, `status:${evaluated.pack.status}`]);
          if (!evaluated.passed && (enforceOperatingGates || referenceBlockersRequirePause(evaluated.blockers))) return setWaiting(state, 'REFERENCE_DEEP_RESEARCH', inputs, ['artifacts/reference-evidence-pack.json'], evaluated.blockers.map((item) => `blocked:${item}`));
        } catch (error) { return fail(state, record, error); }
      }
      if (!done(state, 'REFERENCE_MECHANIC_LOCK')) {
        const record = await begin(state, 'REFERENCE_MECHANIC_LOCK', ['input/seed.yaml', ...referenceMechanics.source.researchFiles]);
        try {
          await store.writeArtifact(runId, 'reference-mechanic-spec.json', referenceMechanics);
          await complete(state, record, ['artifacts/reference-mechanic-spec.json'], ['zod:ReferenceMechanicSpecSchema', 'locked-by:human', 'agent-ideation:false', 'mechanic-fidelity:maximum-core-mechanics', 'expression-isolation:true']);
        } catch (error) { return fail(state, record, error); }
      }
      const lockedReference = ReferenceMechanicSpecSchema.parse(await store.readArtifact(runId, 'reference-mechanic-spec.json'));
      const referenceApprovalFile = path.join(runRoot, 'human/reference-decision.yaml');
      if (!await exists(referenceApprovalFile)) {
        if (!await exists(path.join(runRoot, 'human/reference-decision.example.yaml'))) await writeFile(path.join(runRoot, 'human/reference-decision.example.yaml'), 'decision: APPROVE\nnotes: []\n');
        await writeFile(path.join(runRoot, 'human/reference-mechanic-review.json'), `${JSON.stringify({ schemaVersion: 1, title: seed.title, theme: seed.theme, mechanicLock: lockedReference, notice: 'Only generic mechanic relationships are approved. Code, assets, names, text, UI layout, audio, and tuning values remain original.' }, null, 2)}\n`);
        const now = new Date().toISOString(); const previous = state.stages.WAITING_FOR_REFERENCE_APPROVAL;
        state.stage = 'WAITING_FOR_REFERENCE_APPROVAL'; state.status = 'waiting';
        state.stages.WAITING_FOR_REFERENCE_APPROVAL = { stage: 'WAITING_FOR_REFERENCE_APPROVAL', status: 'waiting', startedAt: previous?.startedAt ?? now, finishedAt: null, attempts: previous?.attempts ?? 1, inputArtifacts: ['artifacts/reference-mechanic-spec.json'], outputArtifacts: ['human/reference-mechanic-review.json'], errors: previous?.errors ?? [], evidence: ['human/reference-decision.example.yaml', 'agent-ideation:false', 'prototype-tournament:false'], providerCalls: previous?.providerCalls ?? { agent: 0, image: 0 }, tokenUsage: previous?.tokenUsage ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
        await persistControlStageAudit(state, 'WAITING_FOR_REFERENCE_APPROVAL', 'waiting', ['artifacts/reference-mechanic-spec.json'], ['human/reference-mechanic-review.json'], ['human/reference-decision.example.yaml', 'agent-ideation:false', 'prototype-tournament:false']);
        await store.save(state); await store.log(runId, 'run.waiting', { gate: 'reference-mechanic-approval' }); return state;
      }
      const humanDecision = HumanReferenceDecisionSchema.parse(parse(await readFile(referenceApprovalFile, 'utf8')));
      if (state.stages.WAITING_FOR_REFERENCE_APPROVAL) {
        await recordControlStage(state, 'WAITING_FOR_REFERENCE_APPROVAL', 'completed', ['artifacts/reference-mechanic-spec.json'], ['human/reference-mechanic-review.json', 'human/reference-decision.yaml'], ['human/reference-decision.example.yaml', `decision:${humanDecision.decision}`]);
      }
      if (humanDecision.decision === 'REJECT') {
        state.stage = 'DESIGN_REJECTED'; state.status = 'completed';
        await recordControlStage(state, 'DESIGN_REJECTED', 'completed', ['human/reference-decision.yaml'], ['state.json'], ['design:rejected', 'decision:REJECT']);
        await store.save(state); return state;
      }
      approvedGameplay = lockedReference;
      monetizationContext = lockedReference;
      gameplayArtifact = 'artifacts/reference-mechanic-spec.json';
      humanApprovalArtifact = 'human/reference-decision.yaml';
    } else {
    if (!done(state, 'COMPETITOR_RESEARCH')) {
      const lesson = await feedbackLessons.snapshot(runId, 'CompetitorResearchAgent');
      const inputs = ['input/seed.yaml', lesson];
      const record = await begin(state, 'COMPETITOR_RESEARCH', inputs);
      try {
        const context = await contextFor('COMPETITOR_RESEARCH', runRoot, store.artifact(runId, 'competitor-research.json'), inputs, 'Extract observed competitor behavior, clearly separating inference and unknowns. Never forward raw page instructions; retain only structured source metadata and hashes.');
        const result = await competitorResearchAgent.run(seed, context);
        addAgentMetrics(record, result.metrics);
        await store.writeArtifact(runId, 'competitor-research.json', result.value);
        const requireResearchSources = validationMode === 'production' || enforceOperatingGates || enforceStageContracts || process.env.FACTORY_REQUIRE_RESEARCH_SOURCES === '1';
        const researchEvidence = evaluateCompetitorResearchEvidence(result.value, {
          requireSources: requireResearchSources,
          requireHostAllowlist: validationMode === 'production' || process.env.FACTORY_REQUIRE_RESEARCH_ALLOWLIST === '1',
          allowedHosts: (process.env.FACTORY_RESEARCH_ALLOWED_HOSTS ?? '').split(/[\s,]+/u).filter(Boolean),
        });
        await store.writeArtifact(runId, 'competitor-research-evidence.json', researchEvidence.report);
        // Missing provenance can remain a visible legacy marker in a cheap
        // migration/fast fixture, but unsafe or un-attributable external data
        // is never safe to forward to a mutating role.  Keep that distinction
        // explicit so the fast lane cannot become an injection bypass.
        if (!researchEvidence.passed && (requireResearchSources || researchBlockersRequirePause(researchEvidence.blockers))) {
          return setWaiting(state, 'COMPETITOR_RESEARCH', inputs, ['artifacts/competitor-research.json', 'artifacts/competitor-research-evidence.json'], researchEvidence.blockers.map((item) => `blocked:${item}`));
        }
        const sourceEvidence = researchEvidence.passed ? 'research:sources-verified' : 'research:sources-legacy';
        await saveUsage(state);
        await complete(state, record, ['artifacts/competitor-research.json', 'artifacts/competitor-research-evidence.json'], ['zod:CompetitorResearchSchema', 'zod:CompetitorResearchEvidenceReportSchema', 'research:source-count', 'research:observation-inference-unknown', sourceEvidence, `model:${result.metrics.model}`]);
      } catch (error) { return fail(state, record, error); }
    }
    const research = CompetitorResearchSchema.parse(await store.readArtifact(runId, 'competitor-research.json'));
    for (;;) {
      const batch = state.prototypeBatch;
      const ideaFile = `idea-generation.batch-${batch}.json`; const filterFile = `low-cost-filter.batch-${batch}.json`; const selectionFile = `prototype-selection.batch-${batch}.json`; const buildFile = `prototype-build-report.batch-${batch}.json`; const tournamentFile = `playtest-tournament.batch-${batch}.json`; const winnerFile = `winner-selection.batch-${batch}.json`;
      if (!done(state, 'IDEA_GENERATION')) { const lesson = await feedbackLessons.snapshot(runId, 'GameDesignerAgent'); const inputs = ['input/seed.yaml', 'artifacts/competitor-research.json', 'artifacts/competitor-research-evidence.json', lesson]; const record = await begin(state, 'IDEA_GENERATION', inputs); try { const context = await contextFor('IDEA_GENERATION', runRoot, store.artifact(runId, ideaFile), inputs, 'Generate bounded original ideas from validated observations and the research boundary report; do not copy expression or consume raw external content.'); const result = await producerAgent.ideate(seed, research, batch, context); addAgentMetrics(record, result.metrics); await store.writeArtifact(runId, ideaFile, result.value); await saveUsage(state); await complete(state, record, [`artifacts/${ideaFile}`], ['zod:IdeaGenerationSchema', 'research:evidence-consumed', `ideas:${result.value.ideas.length}`, `batch:${batch}`, `model:${result.metrics.model}`]); } catch (error) { return fail(state, record, error); } }
      const ideas = IdeaGenerationSchema.parse(await store.readArtifact(runId, ideaFile));
      if (!done(state, 'LOW_COST_FILTER')) { const lesson = await feedbackLessons.snapshot(runId, 'ProductionCostReviewer'); const inputs = [`artifacts/${ideaFile}`, lesson]; const record = await begin(state, 'LOW_COST_FILTER', inputs); try { const context = await contextFor('LOW_COST_FILTER', runRoot, store.artifact(runId, filterFile), inputs, 'Select only ideas that fit the bounded prototype budget.'); const result = await productionCostReviewerAgent.filter(ideas, context); addAgentMetrics(record, result.metrics); await store.writeArtifact(runId, filterFile, result.value); await complete(state, record, [`artifacts/${filterFile}`], ['zod:LowCostFilterSchema', 'selected:3', `model:${result.metrics.model}`]); } catch (error) { return fail(state, record, error); } }
      const filter = LowCostFilterSchema.parse(await store.readArtifact(runId, filterFile));
      if (!done(state, 'PROTOTYPE_SELECTION')) { const lesson = await feedbackLessons.snapshot(runId, 'GreenlightAgent'); const inputs = [`artifacts/${ideaFile}`, `artifacts/${filterFile}`, lesson]; const record = await begin(state, 'PROTOTYPE_SELECTION', inputs); try { const context = await contextFor('PROTOTYPE_SELECTION', runRoot, store.artifact(runId, selectionFile), inputs, 'Confirm prototype-only selections from the validated filter.'); const result = await greenlightAgent.selectPrototypes(ideas, filter, context); addAgentMetrics(record, result.metrics); await store.writeArtifact(runId, selectionFile, result.value); await complete(state, record, [`artifacts/${selectionFile}`], ['zod:PrototypeSelectionSchema', 'meaning:prototype-only', `model:${result.metrics.model}`]); } catch (error) { return fail(state, record, error); } }
      const selection = PrototypeSelectionSchema.parse(await store.readArtifact(runId, selectionFile));
      if (!done(state, 'BUILD_3_PROTOTYPES')) { const record = await begin(state, 'BUILD_3_PROTOTYPES', [`artifacts/${ideaFile}`, `artifacts/${selectionFile}`]); try { const context = await contextFor('BUILD_3_PROTOTYPES', runRoot, store.artifact(runId, buildFile), [`artifacts/${ideaFile}`, `artifacts/${selectionFile}`], 'Build three disposable greybox prototypes from the validated selection; preserve isolated workspaces and prototype-only scope.'); const result = await builderAgent.buildPrototypes(runRoot, ideas, selection, context); addAgentMetrics(record, result.metrics); await store.writeArtifact(runId, buildFile, result.report); await saveUsage(state); await complete(state, record, [`artifacts/${buildFile}`, 'workspace/prototype-a/dist/', 'workspace/prototype-b/dist/', 'workspace/prototype-c/dist/'], ['zod:PrototypeBuildReportSchema', 'playable:3', 'placeholder-art:true', 'iaa:false']); } catch (error) { return fail(state, record, error); } }
      const buildReport = PrototypeBuildReportSchema.parse(await store.readArtifact(runId, buildFile));
      if (!done(state, 'PLAYTEST_TOURNAMENT')) { const record = await begin(state, 'PLAYTEST_TOURNAMENT', [`artifacts/${buildFile}`]); try { const tournament = await qaAgent.tournament(buildReport, runRoot); await store.writeArtifact(runId, tournamentFile, tournament); await complete(state, record, [`artifacts/${tournamentFile}`, 'screenshots/', 'logs/'], ['zod:PlaytestTournamentSchema', 'reviewer:QAAgent', 'author-independent:true', 'prototypes-played:3']); } catch (error) { return fail(state, record, error); } }
      const tournament = PlaytestTournamentSchema.parse(await store.readArtifact(runId, tournamentFile));
      if (!done(state, 'WINNER_SELECTION')) { const inputs = [`artifacts/${tournamentFile}`]; const record = await begin(state, 'WINNER_SELECTION', inputs); try { const context = await contextFor('WINNER_SELECTION', runRoot, store.artifact(runId, winnerFile), inputs, 'Select a winner only when independent playtest evidence supports it.'); const result = await greenlightAgent.selectWinner(tournament, context); addAgentMetrics(record, result.metrics); await store.writeArtifact(runId, winnerFile, result.value); await complete(state, record, [`artifacts/${winnerFile}`], ['zod:WinnerSelectionSchema', `decision:${result.value.decision}`, `model:${result.metrics.model}`]); } catch (error) { return fail(state, record, error); } }
      const winner = WinnerSelectionSchema.parse(await store.readArtifact(runId, winnerFile));
      if (winner.decision !== 'NONE') break;
      if (batch >= 2) { state.stage = 'NO_PROTOTYPE_WINNER'; state.status = 'completed'; state.stages.NO_PROTOTYPE_WINNER = store.record('NO_PROTOTYPE_WINNER'); state.stages.NO_PROTOTYPE_WINNER.status = 'completed'; state.stages.NO_PROTOTYPE_WINNER.finishedAt = new Date().toISOString(); state.stages.NO_PROTOTYPE_WINNER.evidence = ['winner:NONE', 'automatic-batches:2']; await store.save(state); return state; }
      state.prototypeBatch = 2;
      for (const stage of ['IDEA_GENERATION', 'LOW_COST_FILTER', 'PROTOTYPE_SELECTION', 'BUILD_3_PROTOTYPES', 'PLAYTEST_TOURNAMENT', 'WINNER_SELECTION'] as const) { state.stages[stage]!.status = 'pending'; state.stages[stage]!.finishedAt = null; }
      await store.save(state);
    }
    const batch = state.prototypeBatch; const ideas = IdeaGenerationSchema.parse(await store.readArtifact(runId, `idea-generation.batch-${batch}.json`)); const winner = WinnerSelectionSchema.parse(await store.readArtifact(runId, `winner-selection.batch-${batch}.json`));
    const prototypeApprovalFile = path.join(runRoot, 'human/prototype-decision.yaml');
    if (!await exists(prototypeApprovalFile)) { const example = 'decision: APPROVE\nnotes: []\n'; if (!await exists(path.join(runRoot, 'human/prototype-decision.example.yaml'))) await writeFile(path.join(runRoot, 'human/prototype-decision.example.yaml'), example); const buildReport = PrototypeBuildReportSchema.parse(await store.readArtifact(runId, `prototype-build-report.batch-${batch}.json`)); const review = PrototypeHumanReviewSchema.parse({ schemaVersion: 1, batch, prototypes: buildReport.prototypes.map((prototype) => { const idea = ideas.ideas.find((item) => item.id === prototype.ideaId); if (!idea) throw new Error(`Prototype idea ${prototype.ideaId} is missing`); return { slot: prototype.slot, name: idea.name, coreAction: idea.coreAction, decision: idea.decision, entrypoint: prototype.entrypoint, launchCommand: prototype.launchCommand }; }), recommendation: winner.decision, rationale: winner.rationale }); await writeFile(path.join(runRoot, 'human/prototype-review.json'), `${JSON.stringify(review, null, 2)}\n`); const now = new Date().toISOString(); state.stage = 'WAITING_FOR_PROTOTYPE_APPROVAL'; state.status = 'waiting'; state.stages.WAITING_FOR_PROTOTYPE_APPROVAL = state.stages.WAITING_FOR_PROTOTYPE_APPROVAL ?? { stage: 'WAITING_FOR_PROTOTYPE_APPROVAL', status: 'waiting', startedAt: now, finishedAt: null, attempts: 1, inputArtifacts: [`artifacts/winner-selection.batch-${batch}.json`], outputArtifacts: ['human/prototype-review.json'], errors: [], evidence: ['human/prototype-decision.example.yaml', 'human/prototype-review.json', 'prototype-a', 'prototype-b', 'prototype-c'], providerCalls: { agent: 0, image: 0 }, tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } }; await persistControlStageAudit(state, 'WAITING_FOR_PROTOTYPE_APPROVAL', 'waiting', [`artifacts/winner-selection.batch-${batch}.json`], ['human/prototype-review.json'], ['human/prototype-decision.example.yaml', 'human/prototype-review.json', 'prototype-a', 'prototype-b', 'prototype-c']); await store.save(state); return state; }
    const humanDecision = HumanPrototypeDecisionSchema.parse(parse(await readFile(prototypeApprovalFile, 'utf8')));
    if (state.stages.WAITING_FOR_PROTOTYPE_APPROVAL) {
      await recordControlStage(state, 'WAITING_FOR_PROTOTYPE_APPROVAL', 'completed', [`artifacts/winner-selection.batch-${batch}.json`], ['human/prototype-review.json', 'human/prototype-decision.yaml'], ['human/prototype-decision.example.yaml', `decision:${humanDecision.decision}`]);
    }
    if (humanDecision.decision === 'REJECT') { state.stage = 'DESIGN_REJECTED'; state.status = 'completed'; await recordControlStage(state, 'DESIGN_REJECTED', 'completed', ['human/prototype-decision.yaml'], ['state.json'], ['design:rejected', 'decision:REJECT']); await store.save(state); return state; }
    if (humanDecision.decision === 'REVISE') { state.stage = 'PROTOTYPE_REVISION_REQUESTED'; state.status = 'waiting'; await recordControlStage(state, 'PROTOTYPE_REVISION_REQUESTED', 'waiting', ['human/prototype-decision.yaml'], ['state.json'], ['prototype:revision-requested', 'decision:REVISE']); await store.save(state); return state; }
    const slot = humanDecision.decision.startsWith('PREFER_') ? humanDecision.decision.at(-1)!.toLowerCase() : winner.decision.at(-1)!.toLowerCase();
    const buildReport = PrototypeBuildReportSchema.parse(await store.readArtifact(runId, `prototype-build-report.batch-${batch}.json`)); const selectedPrototype = buildReport.prototypes.find((prototype) => prototype.slot === slot); if (!selectedPrototype) throw new Error(`Selected prototype ${slot} does not exist`); const selectedIdea = ideas.ideas.find((idea) => idea.id === selectedPrototype.ideaId); if (!selectedIdea) throw new Error(`Selected idea ${selectedPrototype.ideaId} does not exist`);
    await store.writeArtifact(runId, 'selected-prototype.json', { schemaVersion: 1, batch, humanDecision: humanDecision.decision, prototype: selectedPrototype, idea: selectedIdea });
    approvedGameplay = selectedIdea;
    monetizationContext = research;
    gameplayArtifact = 'artifacts/selected-prototype.json';
    humanApprovalArtifact = 'human/prototype-decision.yaml';
    }
    if (!done(state, 'OPEN_SOURCE_RESEARCH')) {
      const lesson = await feedbackLessons.snapshot(runId, 'CompetitorResearchAgent');
      const inputs = ['input/seed.yaml', gameplayArtifact, humanApprovalArtifact, lesson];
      const record = await begin(state, 'OPEN_SOURCE_RESEARCH', inputs);
      try {
        const context = await contextFor('OPEN_SOURCE_RESEARCH', runRoot, store.artifact(runId, 'open-source-research.json'), inputs, 'Verify reusable infrastructure, immutable revisions, licenses and platform fit.');
        const result = await openSourceResearchAgent.run(seed, approvedGameplay, context);
        addAgentMetrics(record, result.metrics);
        await store.writeArtifact(runId, 'open-source-research.json', result.value);
        await saveUsage(state);
        await complete(state, record, ['artifacts/open-source-research.json'], ['zod:OpenSourceResearchSchema', 'opensource:license', 'opensource:platform-fit', `outcome:${result.value.outcome}`, 'license-evidence-required:true']);
      } catch (error) { return fail(state, record, error); }
    }
    const openSourceResearch = OpenSourceResearchSchema.parse(await store.readArtifact(runId, 'open-source-research.json'));
    // Keep monetization review and technical blueprint as separate durable
    // stages.  A single model call used to produce both, which made it
    // impossible to tell whether a later build failure came from IAA policy
    // or from an ambiguous design specification.
    if (!done(state, 'IAA_REVIEW')) {
      const iaaLesson = await feedbackLessons.snapshot(runId, 'IAAReviewer');
      const inputs = ['input/seed.yaml', gameplayArtifact, 'artifacts/open-source-research.json', humanApprovalArtifact, iaaLesson];
      const record = await begin(state, 'IAA_REVIEW', inputs);
      try {
        // Keep the provider context identical to the stage contract. Omitting
        // the approved open-source report here made the declared input
        // auditable but invisible to the reviewer, encouraging it to infer
        // provenance from stale conversation state.
        const iaaInputs = ['input/seed.yaml', gameplayArtifact, 'artifacts/open-source-research.json', humanApprovalArtifact, iaaLesson];
        const iaaContext = await contextFor('IAA_REVIEW', runRoot, store.artifact(runId, 'iaa-monetization-review.json'), iaaInputs, 'Review only player-respectful IAA placements and compliance risks.');
        const iaa = await iaaMonetizationReviewerAgent.run(seed, monetizationContext, iaaContext);
        addAgentMetrics(record, iaa.metrics);
        await store.writeArtifact(runId, 'iaa-monetization-review.json', iaa.value);
        const iaaContract = buildIaaContract({ gameId: gameIdFromTitle(seed.title), review: iaa.value });
        await store.writeArtifact(runId, 'iaa-contract.json', iaaContract);
        await saveUsage(state);
        await complete(state, record, ['artifacts/iaa-monetization-review.json', 'artifacts/iaa-contract.json'], ['zod:IaaMonetizationReviewSchema', 'zod:IaaContractSchema', 'iaa:bounded-contract', `human-${seed.designMode === 'reference_reskin' ? 'reference' : 'prototype'}-approved:true`]);
      } catch (error) { return fail(state, record, error); }
    }
    if (!done(state, 'BLUEPRINT')) {
      const designerLesson = await feedbackLessons.snapshot(runId, 'GameDesignerAgent');
      const blueprintInputs = ['input/seed.yaml', gameplayArtifact, humanApprovalArtifact, 'artifacts/open-source-research.json', 'artifacts/iaa-monetization-review.json', 'artifacts/iaa-contract.json', designerLesson];
      const record = await begin(state, 'BLUEPRINT', blueprintInputs);
      try {
        const blueprintContext = await contextFor('BLUEPRINT', runRoot, store.artifact(runId, 'game-blueprint.json'), blueprintInputs, 'Translate the human-locked mechanics into an implementation blueprint without changing the experience target.');
        const blueprintResult = await producerAgent.run(seed, approvedGameplay, openSourceResearch, blueprintContext);
        addAgentMetrics(record, blueprintResult.metrics);
        await store.writeArtifact(runId, 'game-blueprint.json', blueprintResult.value);
        await saveUsage(state);
        await complete(state, record, ['artifacts/game-blueprint.json'], ['zod:GameBlueprintSchema', 'open-source-research-before-blueprint:true']);
      } catch (error) { return fail(state, record, error); }
    }
    const blueprint = GameBlueprintSchema.parse(await store.readArtifact(runId, 'game-blueprint.json'));
    if (portfolioGateRequired()) {
      let portfolioStrategy = await ensurePortfolioStrategyArtifact(runId);
      let portfolioEvaluation = evaluatePortfolioGate(portfolioStrategy, { requestedGameId: blueprint.gameId });
      // Reserve the first slot only after a valid blueprint exists. A rejected
      // idea therefore cannot consume the portfolio gate accidentally.
      if (portfolioEvaluation.passed && portfolioEvaluation.decision === 'START_FIRST_GAME' && portfolioStrategy.firstGameId === null) {
        portfolioStrategy = updatePortfolioStrategy(portfolioStrategy, { gameId: blueprint.gameId, status: 'VALIDATING', evidence: [`run:${runId}:blueprint-ready`], activeGameIds: [...portfolioStrategy.activeGameIds, blueprint.gameId] });
        await writeJsonAtomic(path.join(root, 'portfolio-strategy.json'), portfolioStrategy);
        await store.writeArtifact(runId, 'portfolio-strategy.json', portfolioStrategy);
        portfolioEvaluation = evaluatePortfolioGate(portfolioStrategy, { requestedGameId: blueprint.gameId });
      }
      await store.writeArtifact(runId, 'portfolio-gate-evaluation.json', PortfolioGateEvaluationSchema.parse(portfolioEvaluation));
      if (!portfolioEvaluation.passed) {
        return setWaiting(state, 'BUSINESS_PREFLIGHT', ['artifacts/portfolio-strategy.json', 'artifacts/portfolio-gate-evaluation.json'], ['artifacts/portfolio-gate-evaluation.json'], portfolioEvaluation.blockers.map((item) => `blocked:${item}`));
      }
    }
    let iaaContract: ReturnType<typeof IaaContractSchema.parse>;
    try {
      iaaContract = IaaContractSchema.parse(await store.readArtifact(runId, 'iaa-contract.json'));
    } catch {
      const review = await store.readArtifact(runId, 'iaa-monetization-review.json');
      iaaContract = buildIaaContract({ gameId: blueprint.gameId, review: review as never });
      await store.writeArtifact(runId, 'iaa-contract.json', iaaContract);
    }
    const iaaGate = evaluateIaaContract(iaaContract);
    if (enforceOperatingGates && !iaaGate.passed) return setWaiting(state, 'IAA_MONETIZATION_REVIEW', ['artifacts/iaa-contract.json'], ['artifacts/iaa-contract.json'], iaaGate.blockers.map((item) => `blocked:${item}`));
    let differentiation;
    try {
      differentiation = await store.readArtifact(runId, 'differentiation-contract.json');
    } catch {
      differentiation = buildDifferentiationContract({ gameId: blueprint.gameId, title: blueprint.title, concept: blueprint.concept });
      await store.writeArtifact(runId, 'differentiation-contract.json', differentiation);
    }
    const differentiationGate = evaluateDifferentiationContract(differentiation as never);
    if (process.env.FACTORY_ENFORCE_DIFFERENTIATION === '1' && !differentiationGate.passed) return setWaiting(state, 'BUSINESS_PREFLIGHT', ['artifacts/differentiation-contract.json'], ['artifacts/differentiation-contract.json'], ['human:GO_NO_GO:differentiation-review', ...differentiationGate.blockers.map((item) => `blocked:${item}`)]);
    const productionLineFile = path.join(runRoot, 'artifacts/production-line-contract.json');
    if (!await exists(productionLineFile)) {
      // Template is a stronger prior than generic words such as “choice” in a
      // legacy loop description. Explicit narrative/puzzle/action language in
      // the title/theme/concept can still route the game to its specialist line.
      const lineText = `${blueprint.title}\n${blueprint.theme}\n${blueprint.concept}`;
      await store.writeArtifact(runId, 'production-line-contract.json', lockProductionLine(inferProductionLineFromText(lineText)));
    } else {
      ProductionLineContractSchema.parse(await store.readArtifact(runId, 'production-line-contract.json'));
    }
    const lineContract = ProductionLineContractSchema.parse(await store.readArtifact(runId, 'production-line-contract.json'));
    const hypothesisFile = path.join(runRoot, 'artifacts/experience-hypothesis.json');
    // Classification and implementation capability are separate decisions.
    // Never let a correctly classified action/narrative/puzzle request fall
    // through to the idle template merely because the repository lacks its
    // mother template.
    const capability = evaluateProductionLineCapability({ line: lineContract.line, template: blueprint.template, runtime: blueprint.runtime });
    await writeCapabilityIfChanged(runId, capability);
    if (!capability.passed && process.env.FACTORY_ALLOW_UNIMPLEMENTED_LINE !== '1') {
      return setWaiting(state, 'PRODUCTION_LINE_REVIEW', ['artifacts/production-line-contract.json', 'artifacts/game-blueprint.json'], ['artifacts/production-line-capability.json'], capability.blockers.map((item) => `blocked:${item}`));
    }

    const experienceBundleFile = path.join(runRoot, 'artifacts/profile-experience-bundle.json');
    let experienceBundle: ReturnType<typeof ProfileExperienceBundleSchema.parse>;
    if (!done(state, 'EXPERIENCE_CONTRACT') || !await exists(experienceBundleFile)) {
      const experienceInputs = ['artifacts/game-blueprint.json', 'artifacts/production-line-contract.json'];
      const record = await begin(state, 'EXPERIENCE_CONTRACT', experienceInputs);
      try {
        const blueprintHash = await sha256File(path.join(runRoot, 'artifacts/game-blueprint.json'));
        const generated = await exists(experienceBundleFile)
          ? ProfileExperienceBundleSchema.parse(await store.readArtifact(runId, 'profile-experience-bundle.json'))
          : buildProfileExperienceBundle({ gameId: blueprint.gameId, title: blueprint.title, theme: blueprint.theme, line: lineContract.line, profile: lineContract.primaryProfile, blueprintHash, representativeFlow: lineContract.representativeFlow });
        const evaluation = evaluateProfileExperienceBundle(generated, { line: lineContract.line, profile: lineContract.primaryProfile, blueprintHash });
        if (!evaluation.passed) throw new Error(`experience contract gate failed: ${evaluation.blockers.join(', ')}`);
        experienceBundle = ProfileExperienceBundleSchema.parse(generated);
        await store.writeArtifact(runId, 'profile-experience-bundle.json', experienceBundle);
        await store.writeArtifact(runId, 'experience-contract.json', experienceBundle.experienceContract);
        await store.writeArtifact(runId, 'profile-experience-contract.json', experienceBundle.profileContract);
        await store.writeArtifact(runId, 'natural-play-plan.json', experienceBundle.naturalPlayPlan);
        await complete(state, record, ['artifacts/experience-contract.json', 'artifacts/profile-experience-contract.json', 'artifacts/natural-play-plan.json', 'artifacts/profile-experience-bundle.json'], ['experience:profile-locked', 'experience:oracle-free', `profile:${experienceBundle.profile}`, `line:${experienceBundle.line}`]);
      } catch (error) { return fail(state, record, error); }
    } else {
      experienceBundle = ProfileExperienceBundleSchema.parse(await store.readArtifact(runId, 'profile-experience-bundle.json'));
      const blueprintHash = await sha256File(path.join(runRoot, 'artifacts/game-blueprint.json'));
      const evaluation = evaluateProfileExperienceBundle(experienceBundle, { line: lineContract.line, profile: lineContract.primaryProfile, blueprintHash });
      if (!evaluation.passed && (enforceOperatingGates || enforceStageContracts)) return setWaiting(state, 'EXPERIENCE_CONTRACT', ['artifacts/profile-experience-bundle.json'], ['artifacts/profile-experience-bundle.json'], evaluation.blockers.map((item) => `blocked:${item}`));
    }
    if (!done(state, 'EXPERIENCE_HYPOTHESIS')) {
      const lineContract = ProductionLineContractSchema.parse(await store.readArtifact(runId, 'production-line-contract.json'));
      const profile = lineContract.primaryProfile;
      const record = await begin(state, 'EXPERIENCE_HYPOTHESIS', ['artifacts/game-blueprint.json']);
      try {
        const hypothesis = await exists(hypothesisFile)
          ? ExperienceHypothesisSchema.parse(await store.readArtifact(runId, 'experience-hypothesis.json'))
          : buildExperienceHypothesis({
            gameId: blueprint.gameId,
            profile,
            question: `Can a first-time player feel the intended ${profile} payoff within one short session?`,
            hypotheses: [{ id: 'primary-payoff', statement: `The primary ${profile} verb produces a visible consequence and a reason to try again.`, metric: lineContract.acceptanceDimensions[0] ?? 'player-observable consequence', target: 'pass in natural play and human review', failureCondition: 'player cannot explain or observe the consequence after the first attempt' }],
            sourceBlueprint: blueprint,
          });
        await store.writeArtifact(runId, 'experience-hypothesis.json', hypothesis);
        await complete(state, record, ['artifacts/experience-hypothesis.json'], ['hypothesis:measurable', `profile:${hypothesis.profile}`, `status:${hypothesis.status}`]);
      } catch (error) { return fail(state, record, error); }
    }
    const coreSpecFile = path.join(runRoot, 'artifacts/core-spec-lock.json');
    const expectedCoreDimensions = [...lineContract.acceptanceDimensions];
    const expectedHypothesisHash = sha256Text(JSON.stringify(ExperienceHypothesisSchema.parse(await store.readArtifact(runId, 'experience-hypothesis.json'))));
    const validateCoreSpecLock = (value: unknown) => {
      const lock = CoreSpecLockSchema.parse(value);
      if (lock.gameId !== blueprint.gameId || lock.profile !== lineContract.primaryProfile || lock.hypothesisHash !== expectedHypothesisHash || JSON.stringify(lock.acceptanceDimensions) !== JSON.stringify(expectedCoreDimensions)) {
        throw new Error('core spec lock does not match the current hypothesis, profile or acceptance dimensions');
      }
      return lock;
    };
    if (!done(state, 'CORE_SPEC_FROZEN') || !await exists(coreSpecFile)) {
      if (done(state, 'CORE_SPEC_FROZEN')) {
        invalidateDownstream(state, 'CORE_SPEC_FROZEN');
        state.stage = 'CORE_SPEC_FROZEN';
        state.status = 'pending';
        await store.save(state);
      }
      const record = await begin(state, 'CORE_SPEC_FROZEN', ['artifacts/experience-hypothesis.json', 'artifacts/production-line-contract.json']);
      try {
        const lock = await exists(coreSpecFile)
          ? validateCoreSpecLock(await store.readArtifact(runId, 'core-spec-lock.json'))
          : freezeCoreSpec({ gameId: blueprint.gameId, profile: lineContract.primaryProfile, hypothesis: ExperienceHypothesisSchema.parse(await store.readArtifact(runId, 'experience-hypothesis.json')), acceptanceDimensions: expectedCoreDimensions });
        await store.writeArtifact(runId, 'core-spec-lock.json', lock);
        await complete(state, record, ['artifacts/core-spec-lock.json'], ['spec:frozen', 'spec:human-approval-inherited:CORE_DEMO', `profile:${lock.profile}`, `dimensions:${lock.acceptanceDimensions.length}`]);
      } catch (error) { return fail(state, record, error); }
    } else {
      try { validateCoreSpecLock(await store.readArtifact(runId, 'core-spec-lock.json')); }
      catch (error) { return fail(state, state.stages.CORE_SPEC_FROZEN ?? await begin(state, 'CORE_SPEC_FROZEN', ['artifacts/experience-hypothesis.json', 'artifacts/production-line-contract.json']), error); }
    }
    validateCoreSpecLock(await store.readArtifact(runId, 'core-spec-lock.json'));
    // Full validation promises profile-specific evidence.  The current
    // repository only has a production adapter for the idle/spatial mother
    // templates; until a specialist adapter actually emits its artifacts,
    // stop here instead of silently jumping to art/build with a generic idle
    // oracle.  Fast-reskin intentionally keeps the profile chain optional.
    const pipelinePlan = validatePipelinePlan(await store.readArtifact(runId, 'pipeline-plan.json'));
    if (pipelinePlan.mode === 'full-validation') {
      const completedStages = Object.values(state.stages).filter((record) => record.status === 'completed').map((record) => record.stage);
      const missingProfileStages = missingMandatoryProfileStages(pipelinePlan, completedStages);
      if (missingProfileStages.length > 0) {
        const missingStage = missingProfileStages[0]!;
        const contract = getStageContract(missingStage);
        const contractInputs = contract.inputs.map((input) => input.path);
        const auditEvidence = [`profile-stage-required:${missingStage}`, 'profile-stage-adapter-missing', 'full-validation-not-silently-skipped'];
        return setWaiting(state, missingStage, contractInputs, [`artifacts/stage-contracts/${missingStage}.json`], auditEvidence);
      }
    }
    if (!done(state, 'ART_DIRECTIONS')) { const record = await begin(state, 'ART_DIRECTIONS', ['artifacts/game-blueprint.json']); try {
      let directions;
      if (await store.hasArtifact(runId, 'art-directions.json') && record.attempts > 1) directions = ArtDirectionsSchema.parse(await store.readArtifact(runId, 'art-directions.json'));
      else { const context = await contextFor('ART_DIRECTIONS', runRoot, store.artifact(runId, 'art-directions.json'), ['artifacts/game-blueprint.json'], 'Create four materially different original art directions within the locked production budget.'); const result = await artDirectorAgent.run(blueprint, context); addAgentMetrics(record, result.metrics); directions = result.value; await store.writeArtifact(runId, 'art-directions.json', directions); }
      if (!previewImages.producePreviews) throw new Error('Selected ImageProvider does not support art-direction previews');
      const previewManifest = ArtPreviewManifestSchema.parse(await previewImages.producePreviews({ outputDir: path.join(runRoot, 'art-review/previews'), directions }));
      record.providerCalls.image += previewManifest.callCount;
      if (previewManifest.usage) { record.tokenUsage.inputTokens += previewManifest.usage.inputTokens; record.tokenUsage.outputTokens += previewManifest.usage.outputTokens; record.tokenUsage.totalTokens += previewManifest.usage.totalTokens; }
      if (mode === 'codex-account') directions = ArtDirectionsSchema.parse({ directions: directions.directions.map((direction) => ({ ...direction, previewPath: previewManifest.previews.find((preview) => preview.directionId === direction.id)?.outputPath ?? direction.previewPath })) });
      await store.writeArtifact(runId, 'art-directions.json', directions); await store.writeArtifact(runId, 'art-preview-manifest.json', previewManifest); await createArtReview(runRoot, blueprint, directions, previewManifest); await saveUsage(state);
      const failures = previewManifest.previews.filter((preview) => preview.status === 'failed'); if (failures.length) throw new Error(`${failures.length} art direction preview(s) failed after retry`);
      completeImagegenWait(state, ['art-review/previews/']);
      await complete(state, record, ['artifacts/art-directions.json', 'artifacts/art-preview-manifest.json', 'art-review/index.html', 'art-review/art-directions.json', 'art-review/previews/', 'human/art-approval.example.yaml'], ['zod:ArtDirectionsSchema', 'zod:ArtPreviewManifestSchema', 'art:four-structural-directions', 'directions:4', `image-calls:${previewManifest.callCount}`]);
    } catch (error) { if (error instanceof CodexImagegenPendingError) return waitForCodexImagegen(state, record, error); return fail(state, record, error); } }
    const approvalFile = path.join(runRoot, 'human/art-approval.yaml');
    if (!await exists(approvalFile)) { const now = new Date().toISOString(); state.stage = 'WAITING_FOR_ART_APPROVAL'; state.status = 'waiting'; state.stages.WAITING_FOR_ART_APPROVAL = state.stages.WAITING_FOR_ART_APPROVAL ?? { stage: 'WAITING_FOR_ART_APPROVAL', status: 'waiting', startedAt: now, finishedAt: null, attempts: 1, inputArtifacts: ['artifacts/art-directions.json'], outputArtifacts: [], errors: [], evidence: ['human/art-approval.example.yaml'], providerCalls: { agent: 0, image: 0 }, tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } }; await persistControlStageAudit(state, 'WAITING_FOR_ART_APPROVAL', 'waiting', ['artifacts/art-directions.json', 'art-review/index.html'], ['human/art-approval.yaml'], ['human/art-approval.example.yaml']); await store.save(state); await store.log(runId, 'run.waiting', { gate: 'art-approval' }); return state; }
    if (!done(state, 'STYLE_LOCK')) { if (state.stages.WAITING_FOR_ART_APPROVAL) { await recordControlStage(state, 'WAITING_FOR_ART_APPROVAL', 'completed', ['artifacts/art-directions.json', 'art-review/index.html'], ['human/art-approval.yaml'], ['human/art-approval.example.yaml', 'art:direction-selected']); } const styleInputs = ['artifacts/game-blueprint.json', 'artifacts/art-directions.json', 'human/art-approval.yaml']; const record = await begin(state, 'STYLE_LOCK', styleInputs); try { const approval = ArtApprovalSchema.parse(parse(await readFile(approvalFile, 'utf8'))); const directions = ArtDirectionsSchema.parse(await store.readArtifact(runId, 'art-directions.json')); const context = await contextFor('STYLE_LOCK', runRoot, store.artifact(runId, 'style-lock.json'), styleInputs, 'Freeze the human-selected direction and its explicit changes.'); const result = await styleLockAgent.run(blueprint, directions, approval, context); addAgentMetrics(record, result.metrics); await store.writeArtifact(runId, 'style-lock.json', result.value); await saveUsage(state); await complete(state, record, ['artifacts/style-lock.json'], ['zod:StyleLockSchema', `selected:${result.value.directionId}`, `model:${result.metrics.model}`]); } catch (error) { return fail(state, record, error); } }
    const styleLock = StyleLockSchema.parse(await store.readArtifact(runId, 'style-lock.json'));
    const hypothesis = ExperienceHypothesisSchema.parse(await store.readArtifact(runId, 'experience-hypothesis.json'));
    if (!done(state, 'CONTENT_EXPANSION')) {
      const contentInputs = ['artifacts/game-blueprint.json', 'artifacts/experience-hypothesis.json', 'artifacts/experience-contract.json', 'artifacts/style-lock.json'];
      const record = await begin(state, 'CONTENT_EXPANSION', contentInputs);
      try {
        const contentFile = path.join(runRoot, 'artifacts/content-expansion.json');
        const content = await exists(contentFile)
          ? ContentExpansionPlanSchema.parse(await store.readArtifact(runId, 'content-expansion.json'))
          : buildContentExpansionPlan({ gameId: blueprint.gameId, productionLine: lineContract.line, experienceProfile: hypothesis.profile, representativeFlow: lineContract.representativeFlow });
        await store.writeArtifact(runId, 'content-expansion.json', content);
        await complete(state, record, ['artifacts/content-expansion.json'], ['content:representative-flow', `content:variants:${content.variants.length}`, 'content:structural-difference']);
      } catch (error) { return fail(state, record, error); }
    }
    if (!done(state, 'UI_SKELETON')) {
      const uiInputs = ['artifacts/game-blueprint.json', 'artifacts/experience-hypothesis.json', 'artifacts/content-expansion.json'];
      const record = await begin(state, 'UI_SKELETON', uiInputs);
      try {
        const uiFile = path.join(runRoot, 'artifacts/ui-skeleton.json');
        const ui = await exists(uiFile)
          ? UiSkeletonSchema.parse(await store.readArtifact(runId, 'ui-skeleton.json'))
          : buildUiSkeleton({ gameId: blueprint.gameId, experienceProfile: hypothesis.profile, primaryAction: lineContract.interactionKernel[0] });
        await store.writeArtifact(runId, 'ui-skeleton.json', ui);
        await complete(state, record, ['artifacts/ui-skeleton.json'], ['ui:first-viewport', `ui:screens:${ui.screens.length}`, 'ui:ad-does-not-block-core']);
      } catch (error) { return fail(state, record, error); }
    }
    if (!done(state, 'ASSETS')) { const record = await begin(state, 'ASSETS', ['artifacts/game-blueprint.json', 'artifacts/style-lock.json', 'artifacts/content-expansion.json', 'artifacts/ui-skeleton.json']); try { const value = await assetProducerAgent.run(path.join(runRoot, 'workspace/generated-assets'), blueprint, styleLock); await store.writeArtifact(runId, 'asset-manifest.json', value); const artAudit = await auditAssetFiles({ runRoot, targetGame: blueprint.gameId, assetRoot: 'workspace/generated-assets', assets: value.assets, strict: artQualityRequired() }); await store.writeArtifact(runId, 'art-quality.json', artAudit); if (artQualityRequired() && !artAudit.passed) throw new Error(`art quality gate failed: ${artAudit.blockers.join(', ')}`); completeImagegenWait(state, ['workspace/generated-assets/']); await complete(state, record, ['artifacts/asset-manifest.json', 'artifacts/art-quality.json', 'workspace/generated-assets/'], ['zod:AssetManifestSchema', 'zod:ArtQualitySchema', 'assets:provenance', 'assets:alpha', `assets:${value.assets.length}`, `provider:${value.provider}`, `art-quality:${artAudit.passed}`]); } catch (error) { if (error instanceof CodexImagegenPendingError) return waitForCodexImagegen(state, record, error); return fail(state, record, error); } }
    const assetManifest = AssetManifestSchema.parse(await store.readArtifact(runId, 'asset-manifest.json')); const workspace = path.join(runRoot, 'workspace/game');
    if (!done(state, 'FULL_BUILD')) { const buildInputs = ['artifacts/game-blueprint.json', 'artifacts/production-line-contract.json', 'artifacts/experience-hypothesis.json', 'artifacts/core-spec-lock.json', 'artifacts/experience-contract.json', 'artifacts/profile-experience-contract.json', 'artifacts/natural-play-plan.json', 'artifacts/content-expansion.json', 'artifacts/ui-skeleton.json', 'artifacts/iaa-contract.json', 'artifacts/differentiation-contract.json', 'artifacts/style-lock.json', 'artifacts/asset-manifest.json', `templates/web-lite/${blueprint.template}`, ...(blueprint.gameplayRevision ? [blueprint.gameplayRevision.artifactPath] : [])]; const record = await begin(state, 'FULL_BUILD', buildInputs); try { const gameplayRevision = await loadGameplayRevisionForBuild(runRoot, blueprint); const continuityRaw = await store.readArtifact(runId, 'interaction-continuity-contract.json').catch(() => undefined); const continuityContract = continuityRaw === undefined ? undefined : InteractionContinuityContractSchema.parse(continuityRaw); const context = await contextFor('FULL_BUILD', runRoot, path.join(runRoot, 'logs/codex/BUILD.last-message.txt'), [...buildInputs, ...(continuityContract ? ['artifacts/interaction-continuity-contract.json'] : [])], 'Integrate only the frozen blueprint, core spec lock, profile experience contract, natural-play plan, experience hypothesis, content expansion plan, UI skeleton, production-line contract, IAA contract, differentiation contract, style lock, assets and revision into this run workspace. If an interaction continuity contract is present, implement its semantic nodes and emit derived candidate/successor/recovery facts for QA.'); const result = await builderAgent.run(workspace, blueprint, styleLock, assetManifest, blueprint.template, path.join(runRoot, 'workspace/generated-assets'), undefined, gameplayRevision, context, continuityContract); addAgentMetrics(record, result.metrics); state.codexThreadId = result.threadId; await store.writeArtifact(runId, 'build-report.json', result.report); const buildOutput = result.report.webBuild; const buildHash = await hashBuildDirectory(path.resolve(runRoot, buildOutput)); await store.writeArtifact(runId, 'release-lifecycle.json', promoteReleaseLifecycle(undefined, { gameId: blueprint.gameId, releaseHash: buildHash, from: null, to: 'IMPLEMENTATION_READY' })); await ensureSupplyChainArtifact(runId, blueprint, buildHash); if (presentationQualityRequired()) { const profile = blueprint.preferences.experienceProfile && typeof blueprint.preferences.experienceProfile === 'object' && 'primary' in blueprint.preferences.experienceProfile ? String((blueprint.preferences.experienceProfile as { primary?: unknown }).primary) : 'STRATEGIC_SYSTEM'; const parsedProfile = ['ACTION_FEEL', 'NARRATIVE_AGENCY', 'STRATEGIC_SYSTEM', 'PUZZLE_CLARITY', 'SOCIAL_EMOTION', 'EXPLORATION_DISCOVERY'].includes(profile) ? profile as 'ACTION_FEEL' | 'NARRATIVE_AGENCY' | 'STRATEGIC_SYSTEM' | 'PUZZLE_CLARITY' | 'SOCIAL_EMOTION' | 'EXPLORATION_DISCOVERY' : 'STRATEGIC_SYSTEM'; await store.writeArtifact(runId, 'presentation-quality.json', buildPresentationQualityTemplate({ gameId: blueprint.gameId, buildHash, profile: parsedProfile })); } await saveUsage(state); await complete(state, record, ['artifacts/build-report.json', 'artifacts/release-lifecycle.json', 'artifacts/supply-chain.json', 'artifacts/dependency-manifest.json', 'artifacts/sbom.json', 'artifacts/build-provenance.json', buildOutput.endsWith('/') ? buildOutput : `${buildOutput}/`, 'workspace/game/dist/'], [...(result.report.verification.includes('test:passed') ? ['build:tests'] : ['build:tests:contract']), ...(result.report.verification.includes('typecheck:passed') ? ['build:typecheck'] : ['build:typecheck:contract']), 'build:dist', 'vite:build-success', `build-hash:${buildHash}`, 'supply-chain:provenance-recorded', 'supply-chain:dependency-manifest', 'supply-chain:sbom', 'supply-chain:build-provenance', ...(gameplayRevision ? ['zod:GameplayRevisionLockSchema', `gameplay-revision:${gameplayRevision.revisionId}`] : []), ...(continuityContract ? ['interaction-continuity:builder-contract-bound'] : []), `files:${result.report.files.length}`, `model:${result.metrics.model}`]); } catch (error) { return fail(state, record, error); } }
    let qaPassed = false;
    if (done(state, 'QA') && await exists(path.join(runRoot, 'artifacts/qa-report.json'))) {
      try { qaPassed = QaReportSchema.parse(await store.readArtifact(runId, 'qa-report.json')).passed; } catch { qaPassed = false; }
    }
    while (!qaPassed) {
      const buildReportForQa = await store.readArtifact(runId, 'build-report.json').catch(() => undefined) as { webBuild?: unknown; runtime?: unknown } | undefined;
      const qaBuildPath = typeof buildReportForQa?.webBuild === 'string' ? buildReportForQa.webBuild : 'workspace/game/dist/';
      const record = await begin(state, 'QA', ['artifacts/build-report.json', 'artifacts/production-line-contract.json', qaBuildPath]);
      try {
        const rawReport = await qaAgent.run(workspace, runRoot, await readBuildSuccess(runRoot));
        const buildHash = await hashBuildDirectory(path.resolve(runRoot, qaBuildPath));
        const runtimeProductFile = path.join(runRoot, 'artifacts/runtime-product-gates.json');
        if (!await exists(runtimeProductFile)) {
          await writeJsonAtomic(runtimeProductFile, RuntimeProductGateSchema.parse({ schemaVersion: 1, entrypoint: 'unknown', defaultMode: 'unknown', journey: ['启动', '主要操作', '观察结果', '死亡', '结算', '重试'], coreLoop: [], terminal: [], replay: [], runtimeWiredFiles: ['runtime-product-gates.json:provider-evidence-missing'], legacyBehavior: { status: 'STILL_DEFAULT_PATH', evidence: ['runtime QA provider did not emit a product journey'] }, browserEvidence: ['runtime-product-journey:missing'], passed: false }));
        }
        // A browser QA provider may not know the factory's product-gate
        // schema. When it has emitted a complete natural trace, derive the
        // runtime journey deterministically from that trace and the actual
        // generated entrypoint. This prevents a valid idle/choice product
        // from falling into an endless generic Fixer loop while keeping the
        // strict gate fail-closed for incomplete or forged evidence.
        try {
          const existingRuntime = RuntimeProductGateSchema.parse(JSON.parse(await readFile(runtimeProductFile, 'utf8')));
          const natural = rawReport.naturalFlow;
          if (!existingRuntime.passed && natural?.passed === true) {
            const candidateFiles = ['workspace/game/index.html', 'workspace/game/src/main.ts', 'workspace/game/src/game.ts', 'workspace/game/src/simulation.ts', 'workspace/game/assets/resources/scenes/Main.scene'];
            const runtimeWiredFiles: string[] = [];
            for (const relative of candidateFiles) if (await exists(path.join(runRoot, relative))) runtimeWiredFiles.push(relative);
            if (runtimeWiredFiles.length > 0) {
              const browserEvidence = natural.screenshots.length > 0 ? natural.screenshots : rawReport.screenshots;
              const derived = deriveRuntimeProductGate({
                naturalFlow: natural,
                runtimeWiredFiles,
                browserEvidence,
                entrypoint: runtimeWiredFiles.find((file) => file.endsWith('index.html')) ?? runtimeWiredFiles[0],
                defaultMode: typeof seed.runtime === 'string' ? seed.runtime : undefined,
              });
              await writeJsonAtomic(runtimeProductFile, derived);
            }
          }
        } catch {
          // The original provider report remains the source of truth; a
          // failed projection is recorded by the normal runtime-product gate
          // below and cannot turn a run into a pass.
        }
        const runtimeProduct = RuntimeProductGateSchema.parse(JSON.parse(await readFile(runtimeProductFile, 'utf8')));
        const runtimeWiring = await verifyRuntimeWiredFiles({ runRoot, files: runtimeProduct.runtimeWiredFiles });
        await store.writeArtifact(runId, 'runtime-product-wiring-evaluation.json', runtimeWiring);
        if (enforceOperatingGates && !runtimeWiring.passed) {
          return setWaiting(state, 'NORMAL_FLOW_QA', ['artifacts/runtime-product-gates.json'], ['artifacts/runtime-product-wiring-evaluation.json'], runtimeWiring.blockers.map((item) => `runtime-wiring:${item}`));
        }
        let provenanceSeed: number | string = 42;
        try {
          const policy = await store.readArtifact(runId, 'randomness-policy.json') as { modes?: Array<{ name?: string; seeds?: number[] }> };
          provenanceSeed = policy.modes?.find((mode) => mode.name === 'golden')?.seeds?.[0] ?? provenanceSeed;
        } catch { /* legacy runs use the documented golden fallback */ }
        const provenance = {
          buildHash,
          runtime: typeof buildReportForQa?.runtime === 'string' ? buildReportForQa.runtime : seed.runtime,
          device: operatingProfile.deviceBaselines[1] ?? operatingProfile.deviceBaselines[0]!,
          seed: provenanceSeed,
          runner: 'trusted-qa-runner',
        };
        const evidence = bindQaEvidence(rawReport.evidence, provenance);
        const naturalFlow = bindNaturalFlowEvidence(rawReport.naturalFlow, provenance);
        let report = QaReportSchema.parse({ ...rawReport, evidence, ...(naturalFlow ? { naturalFlow } : {}) });
        // The generic browser runner can prove that *something* changed, but
        // only the locked production-line policy can prove that the intended
        // player verb/decision was exercised. In strict runs a policy failure
        // is a QA gate, never an excuse to silently substitute another line.
        const naturalPolicy = await store.readArtifact(runId, 'natural-input-policy.json').catch(() => undefined);
        if (naturalPolicy !== undefined && naturalFlow !== undefined) {
          const policyResult = evaluateNaturalFlowAgainstPolicy(naturalFlow, naturalPolicy, { expectedBuildHash: buildHash, expectedRuntime: provenance.runtime });
          const policyCheck = { name: 'natural-input-policy', passed: policyResult.passed, evidence: JSON.stringify({ line: policyResult.policy.line, profile: policyResult.policy.profile, blockers: policyResult.blockers }) };
          const policyIssues = policyResult.passed ? [] : [{ id: 'natural-input-policy', severity: 'error' as const, message: `natural-input-policy failed: ${policyResult.blockers.join(', ')}`, evidence: 'artifacts/natural-input-policy.json' }];
          report = QaReportSchema.parse({ ...report, checks: [...report.checks, policyCheck], issues: [...report.issues, ...policyIssues], passed: report.passed && policyResult.passed });
        }
        const naturalLineEvidence = await persistNaturalLineEvidence(runId, report, buildHash);
        await writeFile(path.join(runRoot, 'logs/console.log'), qaMode === 'playwright' ? await readFile(path.join(runRoot, 'logs/console.log')) : 'stub QA\n');
        await store.writeArtifact(runId, 'qa-report.json', report);
        await store.writeArtifact(runId, 'qa-evidence.json', evidence);
        await complete(state, record, ['artifacts/qa-report.json', 'artifacts/completion-gates.json', 'artifacts/qa-evidence.json', 'artifacts/runtime-product-gates.json', ...(naturalLineEvidence ? ['artifacts/production-line-play-evidence.json'] : []), 'logs/console.log', ...report.screenshots], [qaMode === 'playwright' ? 'playwright:completed' : 'qa:stub', 'qa:core', 'qa:normal-flow', 'qa:natural-e2e', 'qa:runtime-product', `runtime-product:${runtimeProduct.passed}`, `qa:build-hash:${buildHash}`, `qa-build-path:${qaBuildPath}`, 'qa:provenance-bound', `passed:${report.passed}`]);
        if (enforceOperatingGates && !runtimeProduct.passed) {
          return setWaiting(state, 'NORMAL_FLOW_QA', ['artifacts/qa-report.json', 'artifacts/runtime-product-gates.json'], ['artifacts/runtime-product-gates.json'], ['runtime-product:startup-core-loop-terminal-replay-required']);
        }
        if (enforceOperatingGates && report.checks.some((check) => check.name === 'natural-input-policy' && !check.passed)) {
          return setWaiting(state, 'NORMAL_FLOW_QA', ['artifacts/qa-report.json', 'artifacts/natural-input-policy.json'], ['artifacts/qa-report.json'], ['natural-input-policy:line-specific-evidence-required']);
        }
        qaPassed = report.passed;
        if (!qaPassed) {
          if (state.fixAttempts >= MAX_FIX_ATTEMPTS) {
            if (operatingProfile.autoAbandonOnCostCap) return markAutoAbandoned(state, 'fix-cap');
            throw new Error(`QA failed after maximum ${MAX_FIX_ATTEMPTS} automatic fixes`);
          }
          const fixInputs = ['artifacts/qa-report.json'];
          const fixRecord = await begin(state, 'FIX', fixInputs);
          const fixContext = await contextFor('FIX', runRoot, path.join(runRoot, 'logs/codex/FIX.last-message.txt'), fixInputs, 'Fix only explicit QA issues; preserve the frozen acceptance standard and add regression coverage.');
          const fix = await fixerAgent.run(workspace, state.codexThreadId, report, fixContext);
          addAgentMetrics(fixRecord, fix.metrics); state.codexThreadId = fix.threadId; state.fixAttempts += 1; await saveUsage(state);
          await complete(state, fixRecord, [qaBuildPath], ['fix:explicit-issues', ...(fix.verification.includes('test:passed') ? ['fix:regression-test'] : ['fix:regression-test:contract']), `fix-attempt:${state.fixAttempts}`, fix.summary, `model:${fix.metrics.model}`]);
        }
      } catch (error) { return fail(state, record, error); }
    }
    const normalFlowReport = QaReportSchema.parse(await store.readArtifact(runId, 'qa-report.json'));
    const normalFlowArtifacts = ['artifacts/qa-report.json', 'artifacts/runtime-product-gates.json', ...(normalFlowReport.naturalFlow ? ['artifacts/production-line-play-evidence.json'] : []), ...normalFlowReport.screenshots];
    const normalFlowEvidence = ['qa:normal-flow', 'qa:no-console-errors', 'qa:runtime-product'];
    markControlStage(state, 'NORMAL_FLOW_QA', 'completed', ['artifacts/build-report.json', 'artifacts/experience-contract.json'], normalFlowArtifacts, normalFlowEvidence);
    await persistControlStageAudit(state, 'NORMAL_FLOW_QA', 'completed', ['artifacts/build-report.json', 'artifacts/experience-contract.json'], normalFlowArtifacts, normalFlowEvidence);
    await store.save(state);

    // Re-check the selected experience profile after the real build, then
    // freeze the exact build that QA observed. Strict runs collect the two
    // remaining player gates before asking for human approval; demo runs still
    // get the same immutable candidate without the production paperwork.
    const strictHuman = enforcePlayerAcceptance || enforceOperatingGates;
    let automaticReleaseGatesCompleted = false;
    let finalQaReport = QaReportSchema.parse(await store.readArtifact(runId, 'qa-report.json'));
    let completion = await refreshAcceptanceArtifacts(runRoot, await readBuildSuccess(runRoot), finalQaReport.passed, finalQaReport.screenshots);
    const finalBuildHash = finalQaReport.evidence?.find((item) => typeof item.buildHash === 'string')?.buildHash;
    const finalProfilePassed = await ensureFinalProfileQa(state, blueprint, finalQaReport, completion.gates.find((gate) => gate.id === 'visualEvidence')?.passed === true, finalBuildHash);
    if (!finalProfilePassed) return setWaiting(state, 'FINAL_PROFILE_QA', ['artifacts/qa-report.json', 'artifacts/build-report.json'], ['artifacts/final-profile-qa.json'], ['profile:feel-repair-required']);

    if (strictHuman) {
      const visualGate = completion.gates.find((gate) => gate.id === 'visualEvidence');
      if (visualGate?.passed !== true) {
        const visualEvidence = ['visual:at-least-two-screenshots-required'];
        markControlStage(state, 'VISUAL_EVIDENCE_QA', 'waiting', ['artifacts/qa-report.json'], finalQaReport.screenshots, visualEvidence);
        await persistControlStageAudit(state, 'VISUAL_EVIDENCE_QA', 'waiting', ['artifacts/qa-report.json'], finalQaReport.screenshots, visualEvidence, { minimumArtifacts: { 'screenshots/*': 2 } });
        return setWaiting(state, 'VISUAL_EVIDENCE_QA', ['artifacts/qa-report.json'], ['screenshots/'], ['visual:at-least-two-screenshots-required']);
      }
      const visualEvidence = ['visual:at-least-two-screenshots', 'visual:trusted-runner-evidence'];
      markControlStage(state, 'VISUAL_EVIDENCE_QA', 'completed', ['artifacts/qa-report.json'], finalQaReport.screenshots, visualEvidence);
      await persistControlStageAudit(state, 'VISUAL_EVIDENCE_QA', 'completed', ['artifacts/qa-report.json'], finalQaReport.screenshots, visualEvidence, { minimumArtifacts: { 'screenshots/*': 2 } });

      const variationFile = path.join(runRoot, 'artifacts/content-variation.json');
      if (!await exists(variationFile)) {
        const variationTemplate = ContentVariationReportSchema.parse({ schemaVersion: 1, passed: false, variants: [{ id: 'variant-a', differences: ['record the first representative route or decision'], evidence: ['screenshots/variant-a.png'] }, { id: 'variant-b', differences: ['record a materially different route, decision or pacing outcome'], evidence: ['screenshots/variant-b.png'] }], rationale: 'Replace this template with observed variation evidence before release.' });
        await store.writeArtifact(runId, 'content-variation.json', variationTemplate);
        const variationEvidence = ['variation:human-evidence-required'];
        markControlStage(state, 'CONTENT_VARIATION_QA', 'waiting', ['artifacts/game-blueprint.json'], ['artifacts/content-variation.json'], variationEvidence);
        await persistControlStageAudit(state, 'CONTENT_VARIATION_QA', 'waiting', ['artifacts/game-blueprint.json'], ['artifacts/content-variation.json'], variationEvidence);
        return setWaiting(state, 'CONTENT_VARIATION_QA', ['artifacts/game-blueprint.json'], ['artifacts/content-variation.json'], ['variation:structural-or-decision-difference-required']);
      }
      const variation = ContentVariationReportSchema.parse(await store.readArtifact(runId, 'content-variation.json'));
      const lockedLine = await store.readArtifact(runId, 'production-line-contract.json').catch(() => undefined) as { line?: unknown } | undefined;
      const variationLine = typeof lockedLine?.line === 'string' && ['single-finger-action', 'cut-stack-dodge', 'idle-management', 'choice-life', 'rule-puzzle'].includes(lockedLine.line)
        ? lockedLine.line as 'single-finger-action' | 'cut-stack-dodge' | 'idle-management' | 'choice-life' | 'rule-puzzle'
        : 'idle-management';
      const variationPlan = buildVariationCoveragePlan(variationLine);
      const variationObservation = buildVariationCoverageObservation(variationLine, variation);
      const variationCoverage = evaluateVariationCoverage(variationPlan, variationObservation);
      await store.writeArtifact(runId, 'variation-coverage-plan.json', variationPlan);
      await store.writeArtifact(runId, 'variation-coverage-evaluation.json', variationCoverage);
      await store.writeArtifact(runId, 'level-difference.json', { passed: variation.passed && variationCoverage.passed, evidence: variation.variants.flatMap((item) => item.evidence), blockers: variationCoverage.blockers });
      if (!variation.passed) {
        const variationEvidence = ['variation:repair-required'];
        markControlStage(state, 'CONTENT_VARIATION_QA', 'waiting', ['artifacts/game-blueprint.json', 'artifacts/content-variation.json'], ['artifacts/content-variation.json', 'artifacts/level-difference.json', 'artifacts/variation-coverage-evaluation.json'], variationEvidence);
        await persistControlStageAudit(state, 'CONTENT_VARIATION_QA', 'waiting', ['artifacts/game-blueprint.json', 'artifacts/content-variation.json'], ['artifacts/content-variation.json', 'artifacts/level-difference.json', 'artifacts/variation-coverage-evaluation.json'], variationEvidence);
        return setWaiting(state, 'CONTENT_VARIATION_QA', ['artifacts/game-blueprint.json', 'artifacts/content-variation.json'], ['artifacts/content-variation.json'], ['variation:structural-or-decision-difference-required']);
      }
      if (!variationCoverage.passed) {
        const variationEvidence = variationCoverage.blockers.map((item) => `variation:${item}`);
        markControlStage(state, 'CONTENT_VARIATION_QA', 'waiting', ['artifacts/game-blueprint.json', 'artifacts/content-variation.json'], ['artifacts/content-variation.json', 'artifacts/variation-coverage-evaluation.json'], variationEvidence);
        await persistControlStageAudit(state, 'CONTENT_VARIATION_QA', 'waiting', ['artifacts/game-blueprint.json', 'artifacts/content-variation.json'], ['artifacts/content-variation.json', 'artifacts/variation-coverage-evaluation.json'], variationEvidence);
        return setWaiting(state, 'CONTENT_VARIATION_QA', ['artifacts/game-blueprint.json', 'artifacts/content-variation.json'], ['artifacts/variation-coverage-evaluation.json'], variationCoverage.blockers.map((item) => `variation:${item}`));
      }
      const variationEvidence = ['variation:run-a-vs-b', 'variation:structural-or-decision-difference', 'variation:line-coverage'];
      markControlStage(state, 'CONTENT_VARIATION_QA', 'completed', ['artifacts/game-blueprint.json', 'artifacts/content-variation.json'], ['artifacts/content-variation.json', 'artifacts/level-difference.json', 'artifacts/variation-coverage-plan.json', 'artifacts/variation-coverage-evaluation.json'], variationEvidence);
      await persistControlStageAudit(state, 'CONTENT_VARIATION_QA', 'completed', ['artifacts/game-blueprint.json', 'artifacts/content-variation.json'], ['artifacts/content-variation.json', 'artifacts/level-difference.json', 'artifacts/variation-coverage-plan.json', 'artifacts/variation-coverage-evaluation.json'], variationEvidence);
      finalQaReport = QaReportSchema.parse(await store.readArtifact(runId, 'qa-report.json'));
      completion = await refreshAcceptanceArtifacts(runRoot, await readBuildSuccess(runRoot), finalQaReport.passed, finalQaReport.screenshots);
      if (!completion.candidateReady) return setWaiting(state, 'QA', ['artifacts/completion-gates.json'], ['artifacts/completion-gates.json'], completion.blockers.map((item) => `blocked:${item}`));
    }

    if (enforceOperatingGates) {
      const automaticStop = await runAutomaticReleaseGates(state, blueprint, completion, workspace);
      if (automaticStop) return automaticStop;
      automaticReleaseGatesCompleted = true;
      // Re-read the non-human completion gates after automatic evidence has
      // been written. The candidate is still intentionally unbound here.
      finalQaReport = QaReportSchema.parse(await store.readArtifact(runId, 'qa-report.json'));
      completion = await refreshAcceptanceArtifacts(runRoot, await readBuildSuccess(runRoot), finalQaReport.passed, finalQaReport.screenshots);
    }
    const candidateBuildReport = await store.readArtifact(runId, 'build-report.json') as { webBuild?: unknown };
    const candidateBuildPath = typeof candidateBuildReport.webBuild === 'string' ? candidateBuildReport.webBuild : 'workspace/game/dist/';
    const candidate = await ensureReleaseCandidate(state, blueprint, { operating: enforceOperatingGates, buildPath: candidateBuildPath }) as { coreHash: string };

    if (strictHuman) {
      if (blindPlaytestRequired()) {
        const blindFile = path.join(runRoot, 'human/blind-playtest.json');
        let blind;
        if (await exists(blindFile)) {
          try { blind = BlindPlaytestSchema.parse(JSON.parse(await readFile(blindFile, 'utf8'))); } catch { blind = undefined; }
        }
        const blindResult = blind ? evaluateBlindPlaytest(blind) : { passed: false, blockers: ['blind-test-missing'] };
        await store.writeArtifact(runId, 'blind-playtest-evaluation.json', blindResult);
        if (!blind || blind.candidateHash !== candidate.coreHash || !blindResult.passed) {
          const example = path.join(runRoot, 'human/blind-playtest.example.json');
          if (!await exists(example)) await writeFile(example, `${JSON.stringify({ schemaVersion: 1, candidateHash: candidate.coreHash, playerId: 'unfamiliar-player', unfamiliar: true, resetVerified: true, naturalInput: true, outcome: 'PASSED', taskCompletionRate: 1, notes: ['Record an unfamiliar player result.'], evidence: ['attach recording or screenshots'], testedAt: new Date().toISOString() }, null, 2)}\n`);
          return setWaiting(state, 'BLIND_PLAYTEST_QA', ['artifacts/release-candidate.json'], ['human/blind-playtest.json', 'artifacts/blind-playtest-evaluation.json'], blind ? [...blindResult.blockers, ...(blind.candidateHash === candidate.coreHash ? [] : ['candidate-hash-mismatch'])] : ['blind-test-required']);
        }
        const blindEvidence = ['blind:clean-natural-play', 'blind:unfamiliar-natural-input', `candidate:${candidate.coreHash}`];
        markControlStage(state, 'BLIND_PLAYTEST_QA', 'completed', ['artifacts/release-candidate.json'], ['human/blind-playtest.json', 'artifacts/blind-playtest-evaluation.json'], blindEvidence);
        await persistControlStageAudit(state, 'BLIND_PLAYTEST_QA', 'completed', ['artifacts/release-candidate.json'], ['human/blind-playtest.json', 'artifacts/blind-playtest-evaluation.json'], blindEvidence);
      }
      const humanFile = path.join(runRoot, 'human/playtest-acceptance.json');
      let acceptance: ReturnType<typeof HumanPlaytestAcceptanceSchema.parse> | undefined;
      if (await exists(humanFile)) {
        try { acceptance = HumanPlaytestAcceptanceSchema.parse(JSON.parse(await readFile(humanFile, 'utf8'))); } catch { acceptance = undefined; }
      }
      const boundToCandidate = acceptance?.buildHash === candidate.coreHash;
      if (!acceptance || !acceptance.passed || !boundToCandidate) {
        const exampleFile = path.join(runRoot, 'human/playtest-acceptance.example.json');
        if (!await exists(exampleFile)) await writeFile(exampleFile, `${JSON.stringify({ schemaVersion: 1, passed: false, sessionId: 'human-session-required', buildHash: candidate.coreHash, inputMode: 'touch', notes: ['Play the frozen release candidate from reset using natural input.'], evidence: ['attach a recording or screenshots'], approvedAt: new Date().toISOString() }, null, 2)}\n`);
        const reasons = !acceptance ? ['human:final-playtest-required'] : !acceptance.passed ? ['human:playtest-rejected'] : ['human:acceptance-build-hash-mismatch'];
        return setWaiting(state, 'WAITING_FOR_HUMAN_PLAYTEST', ['artifacts/release-candidate.json', 'artifacts/completion-gates.json'], ['human/playtest-acceptance.json', 'human/playtest-acceptance.example.json'], reasons);
      }
      completion = await refreshAcceptanceArtifacts(runRoot, await readBuildSuccess(runRoot), finalQaReport.passed, finalQaReport.screenshots, candidate.coreHash);
      await syncPlayerAcceptance(runRoot, completion);
      const finalAcceptance = QaReportSchema.parse(await store.readArtifact(runId, 'qa-report.json')).acceptance;
      if (finalAcceptance) await bindReleaseCandidateAcceptance(runRoot, finalAcceptance);
      await persistControlStageAudit(state, 'WAITING_FOR_HUMAN_PLAYTEST', 'completed', ['artifacts/release-candidate.json', 'artifacts/completion-gates.json'], ['human/playtest-acceptance.json'], ['human:final-playtest-required', 'human:playtest-passed', `candidate:${acceptance.buildHash}`]);
    }

    // Automatic gates have already run before candidate freezing. Keep the
    // legacy block disabled on that path; the compact aggregate check below
    // is the only post-human operating evaluation.
    if (enforceOperatingGates && !automaticReleaseGatesCompleted) {
      const qaReport = QaReportSchema.parse(await store.readArtifact(runId, 'qa-report.json'));
      const completion = await refreshAcceptanceArtifacts(runRoot, await readBuildSuccess(runRoot), qaReport.passed, qaReport.screenshots, candidate.coreHash);
      if (!completion.releaseReady) {
        const variationFile = path.join(runRoot, 'artifacts/content-variation.json');
        if (!await exists(variationFile)) {
          const variationTemplate = ContentVariationReportSchema.parse({ schemaVersion: 1, passed: false, variants: [{ id: 'variant-a', differences: ['record the first representative route or decision'], evidence: ['screenshots/variant-a.png'] }, { id: 'variant-b', differences: ['record a materially different route, decision or pacing outcome'], evidence: ['screenshots/variant-b.png'] }], rationale: 'Replace this template with observed variation evidence before release.' });
          await store.writeArtifact(runId, 'content-variation.json', variationTemplate);
        }
        const humanFile = path.join(runRoot, 'human/playtest-acceptance.example.json');
        if (!await exists(humanFile)) await writeFile(humanFile, `${JSON.stringify({ schemaVersion: 1, passed: false, sessionId: 'human-session-required', inputMode: 'touch', notes: ['Play the release candidate from reset using natural input.'], evidence: ['attach a recording or screenshots'], approvedAt: new Date().toISOString() }, null, 2)}\n`);
        return setWaiting(state, 'WAITING_FOR_HUMAN_PLAYTEST', ['artifacts/qa-report.json', 'artifacts/content-variation.json'], ['artifacts/completion-gates.json', 'human/playtest-acceptance.json'], ['human:final-playtest-required', ...completion.blockers.map((item) => `blocked:${item}`)]);
      }
      const baselineFile = path.join(runRoot, 'artifacts/quality-baseline.json');
      let baselinePassed = false;
      if (await exists(baselineFile)) {
        try {
          const baseline = QualityBaselineReportSchema.parse(await store.readArtifact(runId, 'quality-baseline.json'));
          baselinePassed = baseline.passed;
        } catch { baselinePassed = false; }
      }
      if (!baselinePassed) {
        const baseline = await store.readArtifact(runId, 'quality-baseline.json').catch(() => evaluateQualityBaseline({}));
        await store.writeArtifact(runId, 'quality-baseline.json', baseline);
        return setWaiting(state, 'QUALITY_BASELINE_QA', ['artifacts/build-report.json', 'artifacts/qa-report.json'], ['artifacts/quality-baseline.json'], ['baseline:all-checks-required', ...QUALITY_BASELINE_CHECKS.map((id) => `check:${id}`)]);
      }
      const baselineStage = state.stages.QUALITY_BASELINE_QA;
      const baselineAudit = await store.readArtifact(runId, 'stage-contracts/QUALITY_BASELINE_QA.json').catch(() => undefined) as { passed?: unknown } | undefined;
      // A valid quality artifact is not enough in strict mode: the control
      // transition itself must also have a durable, passing contract audit.
      // This repairs legacy/interrupted runs where the artifact was written
      // just before the state save and prevents a phantom pass at release.
      if (!baselineStage || baselineStage.status !== 'completed' || baselineAudit?.passed !== true) {
        const baselineEvidence = ['baseline:all-checks'];
        markControlStage(state, 'QUALITY_BASELINE_QA', 'completed', ['artifacts/build-report.json', 'artifacts/qa-report.json'], ['artifacts/quality-baseline.json'], baselineEvidence);
        await persistControlStageAudit(state, 'QUALITY_BASELINE_QA', 'completed', ['artifacts/build-report.json', 'artifacts/qa-report.json'], ['artifacts/quality-baseline.json'], baselineEvidence);
      }

      const originalityFile = path.join(runRoot, 'artifacts/originality-declaration.json');
      let originalityPassed = false;
      if (await exists(originalityFile)) {
        try { originalityPassed = evaluateOriginality(await store.readArtifact(runId, 'originality-declaration.json')).passed; } catch { originalityPassed = false; }
      }
      if (!originalityPassed) return setWaiting(state, 'BUSINESS_PREFLIGHT', ['artifacts/game-blueprint.json', 'artifacts/reference-mechanic-spec.json'], ['artifacts/originality-declaration.json'], ['human:GO_NO_GO:originality-attestation', 'originality:mechanics-only', 'originality:all-expression-fields-original']);
      const originalityStage = state.stages.ORIGINALITY_REVIEW;
      const originalityAudit = await store.readArtifact(runId, 'stage-contracts/ORIGINALITY_REVIEW.json').catch(() => undefined) as { passed?: unknown } | undefined;
      if (!originalityStage || originalityStage.status !== 'completed' || originalityAudit?.passed !== true) {
        const originalityEvidence = ['originality:expression-isolated'];
        markControlStage(state, 'ORIGINALITY_REVIEW', 'completed', ['artifacts/game-blueprint.json', 'artifacts/reference-mechanic-spec.json'], ['artifacts/originality-declaration.json'], originalityEvidence);
        await persistControlStageAudit(state, 'ORIGINALITY_REVIEW', 'completed', ['artifacts/game-blueprint.json', 'artifacts/reference-mechanic-spec.json'], ['artifacts/originality-declaration.json'], originalityEvidence);
      }

      const unknowns = await syncBusinessUnknowns(runId);
      const unknownResult = evaluateUnknownRegister(unknowns, { requireAllResolved: enforceOperatingGates });
      await store.writeArtifact(runId, 'unknown-evaluation.json', unknownResult);
      if (!unknownResult.passed) return setWaiting(state, 'BUSINESS_PREFLIGHT', ['artifacts/unknown-register.json'], ['artifacts/unknown-evaluation.json'], unknownResult.blocking.map((item) => `unknown:${item}`));

      if (presentationQualityRequired()) {
        const presentationFile = path.join(runRoot, 'artifacts/presentation-quality.json');
        if (!await exists(presentationFile)) {
          const buildReport = await store.readArtifact(runId, 'build-report.json') as { webBuild?: unknown };
          const buildPath = typeof buildReport.webBuild === 'string' ? path.resolve(runRoot, buildReport.webBuild) : path.join(workspace, 'dist');
          const profile = blueprint.preferences.experienceProfile && typeof blueprint.preferences.experienceProfile === 'object' && 'primary' in blueprint.preferences.experienceProfile ? String((blueprint.preferences.experienceProfile as { primary?: unknown }).primary) : 'STRATEGIC_SYSTEM';
          const parsedProfile = ['ACTION_FEEL', 'NARRATIVE_AGENCY', 'STRATEGIC_SYSTEM', 'PUZZLE_CLARITY', 'SOCIAL_EMOTION', 'EXPLORATION_DISCOVERY'].includes(profile) ? profile as 'ACTION_FEEL' | 'NARRATIVE_AGENCY' | 'STRATEGIC_SYSTEM' | 'PUZZLE_CLARITY' | 'SOCIAL_EMOTION' | 'EXPLORATION_DISCOVERY' : 'STRATEGIC_SYSTEM';
          await store.writeArtifact(runId, 'presentation-quality.json', buildPresentationQualityTemplate({ gameId: blueprint.gameId, buildHash: await hashBuildDirectory(buildPath), profile: parsedProfile }));
        }
        const presentation = PresentationQualityReportSchema.parse(await store.readArtifact(runId, 'presentation-quality.json'));
        const presentationResult = evaluatePresentationQuality(presentation);
        await store.writeArtifact(runId, 'presentation-evaluation.json', presentationResult);
        if (!presentationResult.passed) return setWaiting(state, 'PRESENTATION_QA', ['artifacts/presentation-quality.json'], ['artifacts/presentation-evaluation.json'], presentationResult.blockers.map((item) => `blocked:${item}`));
        const presentationEvidence = ['presentation:dimensions', 'presentation:audio-haptics-animation-readability-performance'];
        markControlStage(state, 'PRESENTATION_QA', 'completed', ['artifacts/presentation-quality.json'], ['artifacts/presentation-evaluation.json'], presentationEvidence);
        await persistControlStageAudit(state, 'PRESENTATION_QA', 'completed', ['artifacts/presentation-quality.json'], ['artifacts/presentation-evaluation.json'], presentationEvidence);
      }
      if (supplyChainRequired()) {
        const supplyBuildReport = await store.readArtifact(runId, 'build-report.json') as { webBuild?: unknown };
        const supplyBuildPath = typeof supplyBuildReport.webBuild === 'string' ? path.resolve(runRoot, supplyBuildReport.webBuild) : path.join(workspace, 'dist');
        const supply = SupplyChainManifestSchema.parse(await ensureSupplyChainArtifact(runId, blueprint, await hashBuildDirectory(supplyBuildPath)));
        const dependencyManifestEvidence = await store.readArtifact(runId, 'dependency-manifest.json').catch(() => undefined);
        const sbomEvidence = await store.readArtifact(runId, 'sbom.json').catch(() => undefined);
        const provenanceEvidence = await store.readArtifact(runId, 'build-provenance.json').catch(() => undefined);
        const dependencyPolicy = await ensureDependencyPolicyArtifact(runId, supply);
        const dependencyResult = evaluateDependencyPolicy(supply, dependencyPolicy, { required: dependencyAllowlistRequired() });
        await store.writeArtifact(runId, 'dependency-policy-evaluation.json', dependencyResult);
        const baseSupplyResult = evaluateSupplyChainManifest(supply, { dependencyManifest: dependencyManifestEvidence, sbom: sbomEvidence, provenance: provenanceEvidence, requireEvidence: true });
        const supplyResult = { ...baseSupplyResult, passed: baseSupplyResult.passed && dependencyResult.passed, blockers: [...new Set([...baseSupplyResult.blockers, ...dependencyResult.blockers])] };
        await store.writeArtifact(runId, 'supply-chain-evaluation.json', supplyResult);
        if (!supplyResult.passed) return setWaiting(state, 'SUPPLY_CHAIN_QA', ['artifacts/supply-chain.json', 'artifacts/dependency-manifest.json', 'artifacts/sbom.json', 'artifacts/build-provenance.json'], ['artifacts/supply-chain-evaluation.json'], supplyResult.blockers.map((item) => `blocked:${item}`));
        const supplyEvidence = ['supply-chain:provenance', 'supply-chain:lockfile-sbom-provenance', `dependency-allowlist:${dependencyResult.passed ? 'passed' : 'not-configured'}`];
        const supplyInputs = ['artifacts/supply-chain.json', 'artifacts/dependency-manifest.json', 'artifacts/sbom.json', 'artifacts/build-provenance.json', 'artifacts/dependency-policy-evaluation.json', ...(dependencyPolicy ? ['artifacts/dependency-policy.json'] : [])];
        markControlStage(state, 'SUPPLY_CHAIN_QA', 'completed', supplyInputs, ['artifacts/supply-chain-evaluation.json', 'artifacts/dependency-policy-evaluation.json'], supplyEvidence);
        await persistControlStageAudit(state, 'SUPPLY_CHAIN_QA', 'completed', supplyInputs, ['artifacts/supply-chain-evaluation.json', 'artifacts/dependency-policy-evaluation.json'], supplyEvidence);
      }

      if (certificationRequired()) {
        let checklist: ReturnType<typeof evaluateCertificationChecklist>;
        try { checklist = evaluateCertificationChecklist(await store.readArtifact(runId, 'certification-checklist.json')); }
        catch { checklist = evaluateCertificationChecklist(buildCertificationChecklist({ gameId: blueprint.gameId, title: blueprint.title, entity: operatingProfile.entity, requiredTargets: operatingProfile.requiredTargets, optionalTargets: operatingProfile.optionalTargets })); }
        await store.writeArtifact(runId, 'certification-checklist.json', checklist);
        if (!checklist.ready) return setWaiting(state, 'BUSINESS_PREFLIGHT', ['artifacts/originality-declaration.json'], ['artifacts/certification-checklist.json'], ['human:GO_NO_GO:certification-paperwork', ...checklist.blockers.map((item) => `blocked:${item}`), ...checklist.unknowns.map((item) => `unknown:${item}`)]);
        const certificationStage = state.stages.CERTIFICATION;
        const certificationAudit = await store.readArtifact(runId, 'stage-contracts/CERTIFICATION.json').catch(() => undefined) as { passed?: unknown } | undefined;
        if (!certificationStage || certificationStage.status !== 'completed' || certificationAudit?.passed !== true) {
          const certificationEvidence = ['certification:ready'];
          markControlStage(state, 'CERTIFICATION', 'completed', ['artifacts/originality-declaration.json'], ['artifacts/certification-checklist.json'], certificationEvidence);
          await persistControlStageAudit(state, 'CERTIFICATION', 'completed', ['artifacts/originality-declaration.json'], ['artifacts/certification-checklist.json'], certificationEvidence);
        }
      }

      const matrixFile = path.join(runRoot, 'artifacts/platform-release-matrix.json');
      if (!await exists(matrixFile)) {
        const buildReport = await store.readArtifact(runId, 'build-report.json').catch(() => undefined) as { webBuild?: unknown } | undefined;
        const buildDirectory = typeof buildReport?.webBuild === 'string' ? path.resolve(runRoot, buildReport.webBuild) : path.join(workspace, 'dist');
        const coreHash = await hashBuildDirectory(buildDirectory);
        const primaryPlatform = (process.env.FACTORY_PRIMARY_PLATFORM?.trim() || operatingProfile.requiredTargets[0]) as 'wechat-minigame' | 'douyin-minigame' | 'taptap-minigame';
        const matrix = buildPlatformReleaseMatrix({ gameId: blueprint.gameId, coreHash, primaryPlatform, requiredTargets: operatingProfile.requiredTargets, optionalTargets: operatingProfile.optionalTargets });
        await store.writeArtifact(runId, 'platform-release-matrix.json', matrix);
        await ensurePlatformPackageSet(runId, blueprint, coreHash);
        if (!await exists(path.join(runRoot, 'human/platform-qa.example.json'))) await writeFile(path.join(runRoot, 'human/platform-qa.example.json'), `${JSON.stringify({ note: 'Record one result per selected platform using the platform-qa command.', platforms: matrix.children.map((child) => child.platform) }, null, 2)}\n`);
        return setWaiting(state, 'TARGET_PLATFORM_QA', ['artifacts/build-report.json', 'artifacts/platform-release-matrix.json'], ['artifacts/platform-release-matrix.json'], ['platform:each-child-needs-device-or-package-evidence']);
      }
      const matrix = PlatformReleaseMatrixSchema.parse(await store.readArtifact(runId, 'platform-release-matrix.json'));
      const platformStatus = evaluatePlatformReleaseMatrix(matrix, { strict: enforceOperatingGates });
      if (!platformStatus.passed) return setWaiting(state, 'TARGET_PLATFORM_QA', ['artifacts/platform-release-matrix.json'], ['artifacts/platform-release-matrix.json'], platformStatus.blockers.map((item) => `blocked:${item}`));
      if (platformQaRequired()) {
        const packageSet = await ensurePlatformPackageSet(runId, blueprint, matrix.coreHash);
        const packageStatus = evaluatePlatformPackageSet(packageSet, { strict: enforceOperatingGates });
        await store.writeArtifact(runId, 'platform-package-evaluation.json', packageStatus);
        if (!packageStatus.passed) return setWaiting(state, 'TARGET_PLATFORM_QA', ['artifacts/platform-package-set.json'], ['artifacts/platform-package-evaluation.json'], packageStatus.blockers.map((item) => `blocked:${item}`));
      }
      const spine = PlatformSpineContractSchema.parse(await store.readArtifact(runId, 'platform-spine.json'));
      const spineEvidence = Object.fromEntries(matrix.children.map((child) => [child.platform, { artifactHash: child.artifactHash ?? '', evidence: child.evidence }]));
      const spineResult = evaluatePlatformSpine(spine, spineEvidence);
      await store.writeArtifact(runId, 'platform-spine.json', spineResult.contract);
      if (!spineResult.passed) return setWaiting(state, 'PLATFORM_ADAPTER_QA', ['artifacts/platform-release-matrix.json', 'artifacts/platform-spine.json'], ['artifacts/platform-spine.json'], spineResult.blockers.map((item) => `blocked:${item}`));
      await recordControlStage(state, 'TARGET_PLATFORM_QA', 'completed', ['artifacts/platform-release-matrix.json', 'release-candidate/'], ['artifacts/platform-release-matrix.json'], ['platform:per-child', 'platform:all-children-ready']);
      await recordControlStage(state, 'PLATFORM_ADAPTER_QA', 'completed', ['artifacts/platform-spine.json', 'artifacts/platform-release-matrix.json'], ['artifacts/platform-spine.json'], ['platform-spine:per-child', 'platform:per-child']);
      const artGateRequired = artQualityRequired();
      if (artGateRequired) {
        // Fail closed on a missing or malformed audit.  Checking only when a
        // file happened to exist let a deleted/stale art report silently pass
        // the production path.
        const artQuality = await store.readArtifact(runId, 'art-quality.json').catch(() => undefined);
        const artGate = evaluateArtQualityGate({ required: true, artifact: artQuality });
        if (!artGate.passed) return setWaiting(state, 'ASSETS', ['artifacts/asset-manifest.json'], ['artifacts/art-quality.json'], artGate.blockers.map((item) => `blocked:${item}`));
      }
      const rawLedger = await store.readArtifact(runId, 'artifact-ledger.json').catch(() => createArtifactLedger());
      const reconciledLedger = await reconcileArtifactLedger(rawLedger as ReturnType<typeof createArtifactLedger>, runRoot, { ignoreDrift: [...VOLATILE_LEDGER_ARTIFACTS], ignoreMissing: [...VOLATILE_LEDGER_ARTIFACTS] });
      if (reconciledLedger.changed.length > 0 || reconciledLedger.missing.length > 0 || reconciledLedger.blockers.some((item) => item.startsWith('unsafe'))) await store.writeArtifact(runId, 'artifact-ledger.json', reconciledLedger.ledger);
      const ledgerResult = evaluateArtifactLedger(reconciledLedger.ledger);
      if (!ledgerResult.passed) return setWaiting(state, 'FULL_BUILD', ['artifacts/artifact-ledger.json'], ['artifacts/artifact-ledger.json'], ledgerResult.blockers.map((item) => `blocked:${item}`));
      const usage = await usageForState(state);
      const cost = evaluateCostGate(CostBudgetSchema.parse(operatingProfile.budget), usage);
      await store.writeArtifact(runId, 'cost-gate.json', cost);
      if (!cost.passed) {
        const abandonment = evaluateAbandonment({ runId, stage: state.stage, budget: operatingProfile.budget, usage, reason: 'cost-cap' });
        await store.writeArtifact(runId, 'abandonment-decision.json', abandonment);
        if (operatingProfile.autoAbandonOnCostCap) {
          state.stage = 'ABANDONED'; state.status = 'completed';
          await recordControlStage(state, 'ABANDONED', 'completed', ['artifacts/cost-gate.json', 'state.json'], ['artifacts/abandonment-decision.json'], ['abandonment:decision', ...abandonment.evidence]);
          await store.save(state); await store.log(runId, 'run.abandoned', { reason: abandonment.reason, blockers: cost.blockers }); return state;
        }
        state.stage = 'NOT_GREENLIT'; state.status = 'completed';
        await recordControlStage(state, 'NOT_GREENLIT', 'completed', ['artifacts/cost-gate.json', 'state.json'], ['state.json'], ['business:not-greenlit', ...cost.blockers.map((item) => `cost:${item}`)]);
        await store.save(state); return state;
      }
      const operatingResult = evaluateOperatingGates({ completion, qaEvidence: qaReport.evidence, naturalFlow: qaReport.naturalFlow, business: BusinessPreflightSchema.parse(await store.readArtifact(runId, 'business-preflight.json')), platform: matrix, costPassed: cost.passed });
      await store.writeArtifact(runId, 'operating-gates.json', operatingResult);
      if (!operatingResult.passed) return setWaiting(state, 'TARGET_PLATFORM_QA', ['artifacts/operating-gates.json'], ['artifacts/operating-gates.json'], operatingResult.blockers.map((item) => `blocked:${item}`));
    }
    if (enforceOperatingGates) {
      const qaReport = QaReportSchema.parse(await store.readArtifact(runId, 'qa-report.json'));
      completion = await refreshAcceptanceArtifacts(runRoot, await readBuildSuccess(runRoot), qaReport.passed, qaReport.screenshots, candidate.coreHash);
      if (!completion.releaseReady) {
        return setWaiting(state, 'WAITING_FOR_HUMAN_PLAYTEST', ['artifacts/release-candidate.json', 'artifacts/completion-gates.json'], ['human/playtest-acceptance.json'], ['human:final-playtest-required', ...completion.blockers.map((item) => `blocked:${item}`)]);
      }
      const matrix = PlatformReleaseMatrixSchema.parse(await store.readArtifact(runId, 'platform-release-matrix.json'));
      const costValue = await store.readArtifact(runId, 'cost-gate.json').catch(() => undefined) as { passed?: unknown } | undefined;
      const buildReport = await store.readArtifact(runId, 'build-report.json') as { runtime?: unknown };
      const naturalPolicy = await store.readArtifact(runId, 'natural-input-policy.json').catch(() => undefined);
      let provenanceSeed: number | string | undefined;
      try {
        const policy = await store.readArtifact(runId, 'randomness-policy.json') as { modes?: Array<{ name?: string; seeds?: number[] }> };
        provenanceSeed = policy.modes?.find((mode) => mode.name === 'golden')?.seeds?.[0];
      } catch { /* legacy runs may omit the seed policy */ }
      const operatingResult = evaluateOperatingGates({
        completion,
        qaEvidence: qaReport.evidence,
        naturalFlow: qaReport.naturalFlow,
        business: BusinessPreflightSchema.parse(await store.readArtifact(runId, 'business-preflight.json')),
        platform: matrix,
        costPassed: costValue?.passed === true,
        expectedBuildHash: candidate.coreHash,
        requireQaProvenance: true,
        expectedRuntime: typeof buildReport.runtime === 'string' ? buildReport.runtime : undefined,
        expectedDevice: operatingProfile.deviceBaselines[1] ?? operatingProfile.deviceBaselines[0],
        ...(provenanceSeed === undefined ? {} : { expectedSeed: provenanceSeed }),
        naturalPolicy,
      });
      await store.writeArtifact(runId, 'operating-gates.json', operatingResult);
      if (!operatingResult.passed) {
        const blocker = operatingResult.blockers[0] ?? 'operating-gates';
        const owner = blocker.startsWith('business') ? 'BUSINESS_PREFLIGHT' : blocker.startsWith('platform') ? 'TARGET_PLATFORM_QA' : blocker.startsWith('cost') ? 'COST_GATE' : blocker.startsWith('natural') || blocker.includes('provenance') ? 'NORMAL_FLOW_QA' : 'ACCEPTANCE_REVIEW';
        return setWaiting(state, owner, ['artifacts/operating-gates.json'], ['artifacts/operating-gates.json'], operatingResult.blockers.map((item) => `blocked:${item}`));
      }
    }
    const constitutionBeforeRelease = await persistConstitutionEvaluation(state, completion, { strict: enforceOperatingGates, includeRelease: false });
    if (enforceOperatingGates && !constitutionBeforeRelease.passed) {
      return setWaiting(state, 'ACCEPTANCE_REVIEW', ['artifacts/completion-gates.json', 'artifacts/quality-gate-matrix.json', 'artifacts/constitution-evaluation.json'], ['artifacts/constitution-evaluation.json'], constitutionBeforeRelease.blockers.map((item) => `blocked:${item}`));
    }
    if (!done(state, 'RELEASE')) { const buildOutputForRelease = (await store.readArtifact(runId, 'build-report.json').catch(() => undefined) as { webBuild?: unknown } | undefined)?.webBuild; const releaseBuildPath = typeof buildOutputForRelease === 'string' ? buildOutputForRelease : 'workspace/game/dist/'; const releaseInputs = ['artifacts/game-blueprint.json', 'artifacts/build-report.json', 'artifacts/qa-report.json', 'artifacts/completion-gates.json', 'artifacts/quality-gate-matrix.json', 'artifacts/release-candidate.json', 'artifacts/side-effect-journal.json', releaseBuildPath]; if (enforceOperatingGates) releaseInputs.push('artifacts/business-preflight.json', 'artifacts/platform-release-matrix.json', 'artifacts/quality-baseline.json', 'artifacts/originality-declaration.json', 'artifacts/platform-policy.json', 'artifacts/platform-policy-evaluation.json'); if (dependencyAllowlistRequired()) releaseInputs.push('artifacts/dependency-policy.json', 'artifacts/dependency-policy-evaluation.json'); const record = await begin(state, 'RELEASE', releaseInputs); try { const manifest = await releaseAgent.run(runRoot, blueprint, { enforceAcceptance: enforcePlayerAcceptance || enforceOperatingGates, enforceOperatingGates, certificationRequired: certificationRequired(), artQualityRequired: artQualityRequired(), requirePresentation: presentationQualityRequired(), requirePlatformSpine: enforceOperatingGates, requirePlatformPackages: enforceOperatingGates && platformQaRequired(), requireDependencyAllowlist: dependencyAllowlistRequired(), requireSideEffectJournal: enforceOperatingGates, requirePortfolioGate: portfolioGateRequired(), requirePlatformPolicy: platformPolicyRequired(), reuseCandidate: true }); await store.writeArtifact(runId, 'release-manifest.json', manifest); const lifecycle = await store.readArtifact(runId, 'release-lifecycle.json').catch(() => undefined); if (lifecycle) { const parsedLifecycle = ReleaseLifecycleSchema.parse(lifecycle); const releaseHash = manifest.coreHash ?? parsedLifecycle.releaseHash; const target = enforceOperatingGates || enforcePlayerAcceptance ? 'RELEASE_READY' : 'CANDIDATE_READY'; state.readiness = target; if (parsedLifecycle.status !== target) await store.writeArtifact(runId, 'release-lifecycle.json', promoteReleaseLifecycle(parsedLifecycle, { gameId: blueprint.gameId, releaseHash, from: parsedLifecycle.status, to: target })); } await complete(state, record, ['artifacts/release-manifest.json', 'artifacts/release-candidate.json', 'artifacts/side-effect-journal.json', 'release-candidate/release-manifest.json', 'release-candidate/'], ['release:five-gates', 'release:platform-children', 'release:hashes', 'release:side-effects-journal', 'release:platform-policy', 'release:immutable-candidate-reused', `release-files:${manifest.files.length}`, 'sha256:recorded', `player-acceptance-enforced:${enforcePlayerAcceptance || enforceOperatingGates}`, `operating-gates-enforced:${enforceOperatingGates}`]); } catch (error) { return fail(state, record, error); } }
    const constitutionAfterRelease = await persistConstitutionEvaluation(state, completion, { strict: enforceOperatingGates, includeRelease: true });
    if (enforceOperatingGates && !constitutionAfterRelease.passed) {
      return setWaiting(state, 'ACCEPTANCE_REVIEW', ['artifacts/quality-gate-matrix.json', 'artifacts/constitution-evaluation.json'], ['artifacts/constitution-evaluation.json'], constitutionAfterRelease.blockers.map((item) => `blocked:${item}`));
    }
    state.stage = 'COMPLETED'; state.status = 'completed';
    await recordControlStage(state, 'COMPLETED', 'completed', ['release-candidate/release-manifest.json'], ['release-candidate/release-manifest.json'], ['pipeline:complete']);
    await store.save(state); await store.log(runId, 'run.completed', {}); return state;
  }

  async function execute(runId: string): Promise<RunState> {
    try {
      return await executePipeline(runId);
    } catch (error) {
      if (error instanceof CostGateStopSignal) return error.state;
      throw error;
    }
  }

  function gameIdFromTitle(title: string): string {
    return title.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/giu, '-').replace(/^-|-$/gu, '') || 'game';
  }

  async function expectedGameId(runId: string): Promise<string> {
    try {
      const blueprint = GameBlueprintSchema.parse(await store.readArtifact(runId, 'game-blueprint.json'));
      return blueprint.gameId;
    } catch {
      const seed = await store.readSeedFile(path.join(store.runRoot(runId), 'input/seed.yaml'));
      return gameIdFromTitle(seed.title);
    }
  }

  async function usageForState(state: RunState) {
    const stages = Object.values(state.stages);
    const started = [state.createdAt, ...stages.map((stage) => stage.startedAt).filter((value): value is string => Boolean(value))]
      .map((value) => Date.parse(value)).filter((value) => Number.isFinite(value));
    const wallClockMinutes = started.length > 0 ? Math.max(0, Math.ceil((Date.now() - Math.min(...started)) / 60_000)) : 0;
    const accounting = await ensureCostArtifacts(state.runId);
    return deriveCostUsage(stages, { rateCard: accounting.rateCard, adjustments: accounting.adjustments, wallClockMinutes });
  }

  function markControlStage(state: RunState, stage: StageName, status: 'completed' | 'waiting', inputArtifacts: string[], outputArtifacts: string[], evidence: string[]) {
    const now = new Date().toISOString();
    const previous = state.stages[stage];
    state.stages[stage] = { stage, status, startedAt: previous?.startedAt ?? now, finishedAt: status === 'completed' ? now : null, attempts: previous?.attempts ?? 1, inputArtifacts, outputArtifacts, errors: previous?.errors ?? [], evidence, providerCalls: previous?.providerCalls ?? { agent: 0, image: 0 }, tokenUsage: previous?.tokenUsage ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 } };
  }

  async function persistControlStageAudit(state: RunState, stage: StageName, status: 'completed' | 'waiting', inputs: string[], outputs: string[], evidence: string[], options: { minimumArtifacts?: Record<string, number> } = {}) {
    const audit = buildControlStageAudit(stage, { inputs, artifacts: outputs, evidence }, { ...options, strictVersions: enforceStageContracts });
    await store.writeArtifact(state.runId, `stage-contracts/${stage}.json`, audit);
    if (status === 'completed' && enforceStageContracts && !audit.passed) throw new Error(`Stage ${stage} contract failed: ${audit.missing.join(', ')}`);
    return audit;
  }

  /** Update a control-plane stage and its durable contract audit together.
   * Keeping this small helper as the only happy-path writer makes it harder
   * for a new gate to mutate state without leaving evidence behind. */
  async function recordControlStage(state: RunState, stage: StageName, status: 'completed' | 'waiting', inputs: string[], outputs: string[], evidence: string[], options: { minimumArtifacts?: Record<string, number> } = {}) {
    markControlStage(state, stage, status, inputs, outputs, evidence);
    return persistControlStageAudit(state, stage, status, inputs, outputs, evidence, options);
  }

  async function recordCertification(runId: string, value: unknown) {
    const state = await store.load(runId);
    const checklist = evaluateCertificationChecklist(value);
    const gameId = await expectedGameId(runId);
    if (checklist.gameId !== gameId) throw new Error(`Certification gameId ${checklist.gameId} does not match run game ${gameId}`);
    await store.writeArtifact(runId, 'certification-checklist.json', CertificationChecklistSchema.parse(checklist));
    const certificationEvidence = checklist.ready
      ? ['certification:ready']
      : [...checklist.blockers.map((item) => `blocked:${item}`), ...checklist.unknowns.map((item) => `unknown:${item}`)];
    await recordControlStage(state, 'CERTIFICATION', checklist.ready ? 'completed' : 'waiting', ['artifacts/originality-declaration.json'], ['artifacts/certification-checklist.json'], certificationEvidence);
    state.stage = checklist.ready ? 'CREATED' : 'CERTIFICATION'; state.status = checklist.ready ? 'pending' : 'waiting';
    await store.save(state); await store.log(runId, 'certification.recorded', { ready: checklist.ready, blockers: checklist.blockers, unknowns: checklist.unknowns });
    return { checklist, nextCommand: `pnpm factory resume ${runId}` };
  }

  /**
   * Persist the operator-maintained cross-run account portfolio.  This is a
   * factory-level snapshot (not a game artifact), so it deliberately contains
   * only validated game/platform status and release hashes—never credentials.
   * Re-submitting the same snapshot is a no-op; an older or same-timestamp
   * conflicting snapshot is rejected to avoid silently regressing capacity
   * decisions made by another process.
   */
  async function recordAccountPortfolio(value: unknown) {
    const portfolio = canonicalAccountPortfolio(AccountPortfolioSchema.parse(value));
    const file = accountPortfolioFilePath();
    let existing: ReturnType<typeof AccountPortfolioSchema.parse> | undefined;
    if (await exists(file)) {
      const stat = await lstat(file);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('account-portfolio.json must be a regular file');
      existing = canonicalAccountPortfolio(JSON.parse(await readFile(file, 'utf8')));
    }
    const snapshotHash = accountPortfolioHash(portfolio);
    const existingHash = existing ? accountPortfolioHash(existing) : undefined;
    const idempotent = existingHash === snapshotHash;
    if (existing && !idempotent) {
      const incomingTime = Date.parse(portfolio.updatedAt);
      const existingTime = Date.parse(existing.updatedAt);
      if (incomingTime < existingTime) throw new Error('account portfolio snapshot is older than the stored snapshot');
      if (incomingTime === existingTime) throw new Error('account portfolio snapshot conflicts at the same updatedAt');
    }
    if (!idempotent) await writeJsonAtomic(file, portfolio);
    const operation = {
      schemaVersion: 1,
      event: 'account-portfolio.updated',
      at: new Date().toISOString(),
      snapshotHash,
      updatedAt: portfolio.updatedAt,
      entryCount: portfolio.entries.length,
      idempotent,
    };
    const operationsFile = path.join(root, 'factory-operations.jsonl');
    if (await exists(operationsFile)) {
      const stat = await lstat(operationsFile);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('factory-operations.jsonl must be a regular file');
    }
    await appendFile(operationsFile, `${JSON.stringify(redactValue(operation))}\n`);
    return { portfolio, snapshotHash, file, idempotent, operation };
  }

  /** Persist an operator-reviewed platform policy snapshot for one run. */
  async function recordPlatformPolicy(runId: string, value: unknown) {
    const state = await store.load(runId);
    const policy = PlatformPolicySnapshotSchema.parse(value);
    const expectedTargets = new Set([...operatingProfile.requiredTargets, ...operatingProfile.optionalTargets]);
    const actualTargets = new Set([...policy.targets, ...policy.optionalTargets]);
    if (expectedTargets.size !== actualTargets.size || [...expectedTargets].some((target) => !actualTargets.has(target))) {
      throw new Error('platform policy targets do not match the operating profile');
    }
    const previous = await store.readArtifact(runId, 'platform-policy.json').catch(() => undefined);
    const previousHash = previous === undefined ? undefined : platformPolicyHash(previous);
    const nextHash = platformPolicyHash(policy);
    if (previousHash !== undefined && previousHash !== nextHash) {
      invalidateDownstream(state, 'BUSINESS_PREFLIGHT');
      // A policy edit invalidates a previously completed business approval,
      // including terminal/release states. Keep the run resumable at the
      // owning gate instead of leaving a stale COMPLETED marker in place.
      state.stage = 'BUSINESS_PREFLIGHT';
      state.status = 'pending';
    }
    await store.writeArtifact(runId, 'platform-policy.json', policy);
    const evaluation = buildPlatformPolicyEvaluation(policy, {
      requiredPlatforms: operatingProfile.requiredTargets,
      optionalPlatforms: operatingProfile.optionalTargets,
      requireVerified: platformPolicyRequired(),
    });
    await store.writeArtifact(runId, 'platform-policy-evaluation.json', evaluation);
    if (state.stage === 'BUSINESS_PREFLIGHT' || state.status === 'waiting') {
      state.stage = 'BUSINESS_PREFLIGHT';
      state.status = 'pending';
      await store.save(state);
    }
    await store.log(runId, 'platform-policy.recorded', { policyHash: nextHash, passed: evaluation.passed, blockers: evaluation.blockers, warnings: evaluation.warnings });
    return { policy, policyHash: nextHash, evaluation, nextCommand: `pnpm factory resume ${runId}` };
  }

  /** Persist the cross-run first-game throttle. This is an operator-owned
   * artifact; accepting it never grants a game publish permission by itself.
   */
  async function recordPortfolioStrategy(value: unknown, options: { force?: boolean } = {}) {
    const strategy = PortfolioStrategySchema.parse(value);
    const file = path.join(root, 'portfolio-strategy.json');
    if (await exists(file)) {
      const stat = await lstat(file);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('portfolio-strategy.json must be a regular file');
      const existing = PortfolioStrategySchema.parse(JSON.parse(await readFile(file, 'utf8')));
      if (!options.force && JSON.stringify(existing) !== JSON.stringify(strategy)) {
        throw new Error('portfolio strategy already exists with different content; pass force to replace');
      }
    }
    await writeJsonAtomic(file, strategy);
    const operation = { schemaVersion: 1, event: 'portfolio-strategy.updated', at: new Date().toISOString(), strategyId: strategy.strategyId, firstGameId: strategy.firstGameId, firstGameStatus: strategy.firstGameStatus, forced: options.force === true };
    const operationsFile = path.join(root, 'factory-operations.jsonl');
    if (await exists(operationsFile)) {
      const stat = await lstat(operationsFile);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('factory-operations.jsonl must be a regular file');
    }
    await appendFile(operationsFile, `${JSON.stringify(redactValue(operation))}\n`);
    return { strategy, file, operation };
  }

  /** Apply one explicit, auditable side-effect transition.  This is the only
   * operator-facing path for repairing an uncertain upload/publish outcome;
   * it never executes the external operation itself and therefore cannot
   * accidentally duplicate a non-idempotent request. */
  async function recordSideEffect(runId: string, value: unknown) {
    await store.load(runId);
    const command = SideEffectCommandSchema.parse(value);
    let journal = await ensureSideEffectJournalArtifact(runId);
    const existing = journal.records.find((record) => record.effectId === command.effectId);
    if (command.action !== 'begin') {
      if (!existing) throw new Error(`side effect ${command.effectId} does not exist; begin it first`);
      if (existing.operation !== command.operation || existing.idempotencyKey !== command.idempotencyKey) {
        throw new Error(`side effect ${command.effectId} identity does not match its journal record`);
      }
    }
    switch (command.action) {
      case 'begin':
        journal = beginSideEffect(journal, {
          effectId: command.effectId,
          operation: command.operation,
          idempotencyKey: command.idempotencyKey,
          maxAttempts: command.maxAttempts,
          costCents: command.costCents,
        }).journal;
        break;
      case 'complete':
        journal = completeSideEffect(journal, command.effectId, command.result);
        break;
      case 'fail':
        journal = failSideEffect(journal, command.effectId, command.error, { reconciliationRequired: command.reconciliationRequired });
        break;
      case 'reconcile':
        journal = reconcileSideEffect(journal, command.effectId, command.result, { outcome: command.outcome, error: command.error });
        break;
    }
    await store.writeArtifact(runId, 'side-effect-journal.json', journal);
    const evaluation = await writeSideEffectEvaluation(runId, journal);
    await store.log(runId, 'side-effect.transition', {
      action: command.action,
      effectId: command.effectId,
      idempotencyKey: command.idempotencyKey,
      status: journal.records.find((record) => record.effectId === command.effectId)?.status,
      passed: evaluation.passed,
    });
    return { journal, evaluation, nextCommand: `pnpm factory operating-status ${runId}` };
  }

  async function recordLaunchMetrics(runId: string, value: unknown) {
    const state = await store.load(runId);
    const snapshot = LaunchMetricSnapshotSchema.parse(value);
    const gameId = await expectedGameId(runId);
    if (snapshot.gameId !== gameId) throw new Error(`Launch metrics gameId ${snapshot.gameId} does not match run game ${gameId}`);
    const candidate = await store.readArtifact(runId, 'release-candidate.json').catch(() => undefined) as { coreHash?: unknown } | undefined;
    if (typeof candidate?.coreHash === 'string' && candidate.coreHash !== snapshot.releaseHash) throw new Error('Launch metrics releaseHash does not match the tested release candidate');
    const decision = decideLaunchDisposition(snapshot, operatingProfile.launchThresholds);
    await store.writeArtifact(runId, `launch-metrics/${snapshot.platform}.json`, snapshot);
    await store.writeArtifact(runId, `launch-decision-${snapshot.platform}.json`, decision);
    // A positive, observed first-game result is the only event that opens the
    // portfolio for additional titles.  Keep this cross-run mutation explicit
    // and hashable; an agent cannot infer revenue from an internal QA pass.
    if (portfolioGateRequired() && (decision.decision === 'SCALE' || decision.decision === 'KILL')) {
      const portfolioFile = path.join(root, 'portfolio-strategy.json');
      if (await exists(portfolioFile)) {
        const currentPortfolio = PortfolioStrategySchema.parse(JSON.parse(await readFile(portfolioFile, 'utf8')));
        if (currentPortfolio.firstGameId === snapshot.gameId) {
          const validated = decision.decision === 'SCALE' && snapshot.dataQuality === 'observed' && snapshot.netRevenueCents > 0;
          const nextPortfolio = updatePortfolioStrategy(currentPortfolio, {
            gameId: snapshot.gameId,
            status: validated ? 'REVENUE_VERIFIED' : 'FAILED',
            evidence: [`runs/${runId}/artifacts/launch-metrics/${snapshot.platform}.json`, `runs/${runId}/artifacts/launch-decision-${snapshot.platform}.json`],
            // `activeGameIds` is the in-flight production queue, not the list
            // of titles that remain live forever.  Once the first title has a
            // measured SCALE/KILL disposition, release its reservation so a
            // one-person operator can start the next bounded validation run.
            activeGameIds: currentPortfolio.activeGameIds.filter((id) => id !== snapshot.gameId),
            blockers: validated ? [] : [`first-game-${decision.decision.toLowerCase()}`],
            ...(validated ? { validation: { users: snapshot.users, observedDays: snapshot.observedDays, netRevenueCents: snapshot.netRevenueCents, evidence: [`runs/${runId}/artifacts/launch-metrics/${snapshot.platform}.json`], source: 'launch-metrics' as const } } : {}),
          });
          await writeJsonAtomic(portfolioFile, nextPortfolio);
          await store.writeArtifact(runId, 'portfolio-strategy.json', nextPortfolio);
          await store.writeArtifact(runId, 'portfolio-gate-evaluation.json', evaluatePortfolioGate(nextPortfolio, { requestedGameId: snapshot.gameId }));
          await store.log(runId, 'portfolio.first-game-status', { gameId: snapshot.gameId, status: nextPortfolio.firstGameStatus, platform: snapshot.platform });
        }
      }
    }
    const liveVerification = await store.readArtifact(runId, `live-verification/${snapshot.platform}.json`).catch(() => undefined);
    const explicitlyVerified = liveVerification ? evaluateLiveVerification(liveVerification).passed : false;
    const lifecycle = await store.readArtifact(runId, 'release-lifecycle.json').catch(() => undefined);
    if (lifecycle) {
      const parsed = ReleaseLifecycleSchema.parse(lifecycle);
      let target: 'CANDIDATE_READY' | 'LIVE_VERIFIED' | 'KILLED' | null = null;
      if (decision.decision === 'SCALE') {
        if (explicitlyVerified || parsed.status === 'LIVE_VERIFIED') target = 'LIVE_VERIFIED';
        else if (parsed.status === 'IMPLEMENTATION_READY') target = 'CANDIDATE_READY';
      } else if (decision.decision === 'KILL') target = 'KILLED';
      else if (parsed.status === 'IMPLEMENTATION_READY') target = 'CANDIDATE_READY';
      if (target && parsed.status !== target) {
        const promoted = promoteReleaseLifecycleThrough(parsed, { gameId: parsed.gameId, releaseHash: snapshot.releaseHash, to: target });
        await store.writeArtifact(runId, 'release-lifecycle.json', promoted);
      }
    }
    if (decision.decision === 'KILL') {
      const abandonment = evaluateAbandonment({ runId, stage: 'LAUNCH_METRICS', budget: operatingProfile.budget, usage: await usageForState(state), reason: decision.blockers.some((item) => item.startsWith('market-') || item === 'd1-retention' || item === 'organic-share') ? 'market-kill' : 'platform-blocked' });
      await store.writeArtifact(runId, 'abandonment-decision.json', abandonment);
      const abandonmentEvidence = ['abandonment:decision', 'launch:KILL'];
      await recordControlStage(state, 'ABANDONED', 'completed', [`artifacts/launch-decision-${snapshot.platform}.json`], ['artifacts/abandonment-decision.json'], abandonmentEvidence);
      state.stage = 'ABANDONED'; state.status = 'completed';
    } else {
      const launchEvidence = ['launch:decision', `launch:${decision.decision}`];
      await recordControlStage(state, 'LAUNCH_METRICS', 'completed', ['artifacts/release-candidate.json'], [`artifacts/launch-metrics/${snapshot.platform}.json`, `artifacts/launch-decision-${snapshot.platform}.json`], launchEvidence);
      if (decision.decision !== 'COLLECTING' && !explicitlyVerified) {
        await recordControlStage(state, 'LIVE_MONITORING', 'waiting', ['artifacts/release-candidate.json', `artifacts/launch-metrics/${snapshot.platform}.json`], [`artifacts/launch-metrics/${snapshot.platform}.json`], ['live:monitoring', `launch:${decision.decision}`]);
      }
      state.stage = decision.decision === 'COLLECTING' ? 'LAUNCH_METRICS' : explicitlyVerified ? 'LIVE_VERIFIED' : 'LIVE_MONITORING'; state.status = decision.decision === 'COLLECTING' ? 'waiting' : explicitlyVerified ? 'completed' : 'pending';
    }
    await store.save(state); await store.log(runId, 'launch-metrics.recorded', { platform: snapshot.platform, decision: decision.decision, users: snapshot.users });
    return { snapshot, decision, nextCommand: decision.decision === 'KILL' ? 'review abandonment-decision.json' : `pnpm factory resume ${runId}` };
  }

  /**
   * Record an explicit post-submission verification.  Traffic metrics alone
   * cannot prove that the package launched, renders on-device, grants IAA
   * rewards exactly once, and survives a resume.  This API is intentionally
   * separate from `recordLaunchMetrics` so a SCALE decision never masquerades
   * as a platform verification.
   */
  async function recordLiveVerification(runId: string, value: unknown) {
    const state = await store.load(runId);
    const raw = value as Record<string, unknown>;
    const report = buildLiveVerification({
      gameId: String(raw.gameId ?? ''),
      platform: String(raw.platform ?? '') as Parameters<typeof buildLiveVerification>[0]['platform'],
      releaseHash: String(raw.releaseHash ?? ''),
      packageHash: typeof raw.packageHash === 'string' ? raw.packageHash : undefined,
      checks: raw.checks as Parameters<typeof buildLiveVerification>[0]['checks'],
      evidence: Array.isArray(raw.evidence) ? raw.evidence.map(String) : [],
      verifier: typeof raw.verifier === 'string' ? raw.verifier : undefined,
    });
    const gameId = await expectedGameId(runId);
    if (report.gameId !== gameId) throw new Error(`Live verification gameId ${report.gameId} does not match run game ${gameId}`);
    const candidate = await store.readArtifact(runId, 'release-candidate.json').catch(() => undefined) as { coreHash?: unknown } | undefined;
    if (typeof candidate?.coreHash !== 'string') throw new Error('Live verification requires an immutable release candidate');
    if (candidate.coreHash !== report.releaseHash) throw new Error('Live verification releaseHash does not match the tested release candidate');

    const evaluation = evaluateLiveVerification(report);
    await store.writeArtifact(runId, `live-verification/${report.platform}.json`, report);
    let lifecycle: ReturnType<typeof ReleaseLifecycleSchema.parse> | undefined;
    const lifecycleValue = await store.readArtifact(runId, 'release-lifecycle.json').catch(() => undefined);
    if (evaluation.passed && lifecycleValue) {
      const parsed = ReleaseLifecycleSchema.parse(lifecycleValue);
      lifecycle = promoteReleaseLifecycleThrough(parsed, { gameId: parsed.gameId, releaseHash: report.releaseHash, to: 'LIVE_VERIFIED' });
      await store.writeArtifact(runId, 'release-lifecycle.json', lifecycle);
    }
    if (evaluation.passed) {
      const liveEvidence = ['live:hash-bound', 'live:runtime-checks', `live:${report.platform}`, 'live:verified'];
      await recordControlStage(state, 'LIVE_VERIFIED', 'completed', ['artifacts/release-candidate.json'], [`artifacts/live-verification/${report.platform}.json`, 'artifacts/release-lifecycle.json'], liveEvidence);
      state.stage = 'LIVE_VERIFIED'; state.status = 'completed';
    } else {
      await recordControlStage(state, 'LIVE_MONITORING', 'waiting', ['artifacts/release-candidate.json'], [`artifacts/live-verification/${report.platform}.json`], ['live:monitoring', ...evaluation.blockers.map((item) => `blocked:${item}`)]);
      state.stage = 'LIVE_MONITORING'; state.status = 'waiting';
    }
    await store.save(state);
    await store.log(runId, 'live-verification.recorded', { platform: report.platform, passed: evaluation.passed, blockers: evaluation.blockers });
    return { report, evaluation, lifecycle, nextCommand: evaluation.passed ? 'continue monitoring launch metrics' : `resolve live verification blockers and retry ${runId}` };
  }

  async function abandon(runId: string, reason: 'manual' | 'cost-cap' | 'fix-cap' | 'platform-blocked' | 'market-kill' | 'unknown' = 'manual') {
    const state = await store.load(runId);
    const decision = evaluateAbandonment({ runId, stage: state.stage, budget: operatingProfile.budget, usage: await usageForState(state), manual: reason === 'manual', reason });
    await store.writeArtifact(runId, 'abandonment-decision.json', decision);
    await recordControlStage(state, 'ABANDONED', 'completed', [`stage:${state.stage}`, 'state.json'], ['artifacts/abandonment-decision.json'], ['abandonment:decision', ...decision.evidence]);
    state.stage = 'ABANDONED'; state.status = 'completed'; await store.save(state); await store.log(runId, 'run.abandoned', { reason, manual: reason === 'manual' });
    return { decision, nextCommand: 'run is terminal; create a new run to continue' };
  }

  async function recordCostAdjustment(runId: string, value: unknown) {
    const state = await store.load(runId);
    const entry = CostAdjustmentEntrySchema.parse(value);
    const current = await ensureCostArtifacts(runId);
    const entries = [...current.adjustments.entries];
    const existing = entries.find((item) => item.id === entry.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(entry)) throw new Error(`cost adjustment ${entry.id} already exists with different content`);
    if (!existing) entries.push(entry);
    const ledger = CostAdjustmentLedgerSchema.parse({ schemaVersion: 1, entries, updatedAt: new Date().toISOString() });
    await store.writeArtifact(runId, 'cost-adjustments.json', ledger);
    const usage = await usageForState(state);
    const cost = evaluateCostGate(CostBudgetSchema.parse(operatingProfile.budget), usage);
    await store.writeArtifact(runId, 'cost-usage.json', usage);
    await store.writeArtifact(runId, 'cost-gate.json', cost);
    await store.log(runId, 'cost.adjustment.recorded', { id: entry.id, kind: entry.kind, cents: entry.cents, minutes: entry.minutes ?? 0, gatePassed: cost.passed });
    return { entry, ledger, usage, cost, nextCommand: `pnpm factory resume ${runId}` };
  }

  async function recordReleaseStatus(runId: string, toValue: string) {
    const to = ReleaseLifecycleStatusSchema.parse(toValue);
    const gameId = await expectedGameId(runId);
    const candidate = await store.readArtifact(runId, 'release-candidate.json').catch(() => undefined) as { coreHash?: unknown } | undefined;
    let releaseHash: string;
    if (typeof candidate?.coreHash === 'string') releaseHash = candidate.coreHash;
    else {
      const buildReport = await store.readArtifact(runId, 'build-report.json').catch(() => undefined) as { webBuild?: unknown } | undefined;
      const buildPath = typeof buildReport?.webBuild === 'string' ? path.resolve(store.runRoot(runId), buildReport.webBuild) : path.join(store.runRoot(runId), 'workspace/game/dist');
      releaseHash = await hashBuildDirectory(buildPath);
    }
    const previousValue = await store.readArtifact(runId, 'release-lifecycle.json').catch(() => undefined);
    let previous = previousValue ? ReleaseLifecycleSchema.parse(previousValue) : undefined;
    if (!previous) previous = promoteReleaseLifecycle(undefined, { gameId, releaseHash, from: null, to: 'IMPLEMENTATION_READY' });
    const lifecycle = promoteReleaseLifecycleThrough(previous, { gameId, releaseHash, to });
    await store.writeArtifact(runId, 'release-lifecycle.json', lifecycle);
    await store.log(runId, 'release-lifecycle.promoted', { status: to, releaseHash });
    return lifecycle;
  }

  return {
    routeRequest: requestRouter.route.bind(requestRouter),
    escalateRequestRoute: requestRouter.escalate.bind(requestRouter),
    async runFactoryEval() { return buildFactoryEvalReport(); },
    async persistFactoryEval() {
      const report = await buildFactoryEvalReport();
      const file = path.join(root, 'factory-eval/latest.json');
      await mkdir(path.dirname(file), { recursive: true });
      await writeJsonAtomic(file, report);
      return { report, file };
    },
    makeGrowthExperiment,
    decideGrowthExperiment,
    recordCertification,
    recordAccountPortfolio,
    recordPlatformPolicy,
    recordPortfolioStrategy,
    recordSideEffect,
    recordLaunchMetrics,
    recordLiveVerification,
    recordCostAdjustment,
    abandon,
    recordReleaseStatus,
    recordFeedback: feedbackLessons.record.bind(feedbackLessons),
    async recordStructuredFeedback(runId: string, value: unknown) { return feedbackLessons.recordStructured(runId, StructuredFeedbackSchema.parse(value)); },
    operatingProfile,
    // Expose the policy actually used by this factory instance.  The base
    // profile is kept for backwards compatibility, but callers must not have
    // to reverse-engineer production defaults from environment variables.
    effectiveOperatingProfile: effectiveOperatingProfile(),
    validationMode,
    enforceExplicitStageContracts,
    async approveBusinessPreflight(runId: string, value: unknown, options: { force?: boolean } = {}) {
      const state = await store.load(runId);
      const preflight = BusinessPreflightSchema.parse(value);
      await store.writeArtifact(runId, 'business-preflight.json', preflight);
      // The business gate is the first scheduled human session.  A paused
      // submission is intentionally not recorded as an approval: it remains
      // resumable and the next explicit GO/KILL decision becomes the durable
      // session result.
      const scheduledProjection = preflight.decision === 'PAUSE'
        ? undefined
        : await appendScheduledHumanApproval(runId, {
          sessionId: 'GO_NO_GO',
          decision: preflight.decision === 'GO' ? 'APPROVE' : 'KILL',
          artifactRefs: ['artifacts/factory-profile.json', 'artifacts/account-capacity.json', 'artifacts/account-capacity-evaluation.json', 'artifacts/platform-policy.json', 'artifacts/platform-policy-evaluation.json', 'artifacts/business-preflight.json'],
          notes: [...preflight.blockers, ...preflight.unknowns],
          force: options.force,
        });
      const businessEvidence = preflight.decision === 'GO'
        ? ['business:accounts', 'business:rights-payout', 'business:platform-policy', 'business:account-capacity', 'decision:GO', 'unknowns:0']
        : [`decision:${preflight.decision}`, `unknowns:${preflight.unknowns.length}`, ...preflight.blockers.map((item) => `blocked:${item}`)];
      await recordControlStage(state, 'BUSINESS_PREFLIGHT', preflight.decision === 'GO' ? 'completed' : 'waiting', ['artifacts/factory-profile.json', 'artifacts/account-capacity.json', 'artifacts/account-capacity-evaluation.json', 'artifacts/platform-policy.json', 'artifacts/platform-policy-evaluation.json'], ['artifacts/business-preflight.json', 'artifacts/account-capacity.json', 'artifacts/account-capacity-evaluation.json', 'artifacts/platform-policy-evaluation.json'], businessEvidence);
      state.stage = preflight.decision === 'GO' ? 'CREATED' : 'BUSINESS_PREFLIGHT'; state.status = preflight.decision === 'GO' ? 'pending' : 'waiting';
      await store.save(state); await store.log(runId, 'business-preflight.recorded', { decision: preflight.decision, unknowns: preflight.unknowns.length });
      return { preflight, ...(scheduledProjection ? { approval: scheduledProjection } : {}), nextCommand: preflight.decision === 'GO' ? `pnpm factory resume ${runId}` : 'resolve blockers and resubmit' };
    },
    async submitPlatformQa(runId: string, value: unknown) {
      const state = await store.load(runId);
      const submission = PlatformQaSubmissionSchema.parse(value);
      const matrix = PlatformReleaseMatrixSchema.parse(await store.readArtifact(runId, 'platform-release-matrix.json'));
      const reviewed = evaluatePlatformQa(matrix, submission.results, { strict: enforceOperatingGates });
      await store.writeArtifact(runId, 'platform-release-matrix.json', reviewed.matrix);
      let packageSet = await ensurePlatformPackageSet(runId, await store.readArtifact(runId, 'game-blueprint.json').then((value) => GameBlueprintSchema.parse(value)), matrix.coreHash);
      const packageVerificationBlockers: string[] = [];
      for (const result of submission.results) {
        if (!result.passed || !result.artifactHash || !result.device) continue;
        let artifactHash = result.artifactHash;
        if (enforceOperatingGates && !result.packagePath) {
          packageVerificationBlockers.push(`${result.platform}:package-path-missing`);
          continue;
        }
        if (enforceOperatingGates && result.packagePath) {
          const verified = await verifyPlatformPackageArtifact({ runRoot: store.runRoot(runId), platform: result.platform, childRoot: result.packagePath, expectedHash: result.artifactHash });
          if (!verified.passed) {
            packageVerificationBlockers.push(`${result.platform}:${verified.blockers.join('|')}`);
            continue;
          }
          artifactHash = verified.artifactHash ?? artifactHash;
        }
        packageSet = markPlatformPackageReady(packageSet, result.platform, { artifactHash, childRoot: result.packagePath, device: { name: result.device.name, width: result.device.width, height: result.device.height, os: 'platform-qa' }, evidence: result.evidence, normalFlowEvidence: result.normalFlowEvidence, visualEvidence: result.visualEvidence, runtimeEvidence: result.runtimeEvidence });
      }
      await store.writeArtifact(runId, 'platform-package-set.json', packageSet);
      const packageStatus = evaluatePlatformPackageSet(packageSet, { strict: enforceOperatingGates });
      await store.writeArtifact(runId, 'platform-package-evaluation.json', packageStatus);
      const passed = reviewed.passed && packageStatus.passed && packageVerificationBlockers.length === 0;
      const platformEvidence = passed ? ['platform:per-child', 'platform:all-children-ready', 'platform:packages-hashed'] : [...reviewed.blockers, ...packageStatus.blockers, ...packageVerificationBlockers].map((item) => `blocked:${item}`);
      await recordControlStage(state, 'TARGET_PLATFORM_QA', passed ? 'completed' : 'waiting', ['artifacts/platform-release-matrix.json', 'release-candidate/'], ['artifacts/platform-release-matrix.json', 'artifacts/platform-package-set.json', 'artifacts/platform-package-evaluation.json'], platformEvidence);
      const spineEvidence = passed ? ['platform-spine:per-child', 'platform:per-child'] : platformEvidence;
      await recordControlStage(state, 'PLATFORM_ADAPTER_QA', passed ? 'completed' : 'waiting', ['artifacts/platform-spine.json', 'artifacts/platform-release-matrix.json'], ['artifacts/platform-spine.json'], spineEvidence);
      state.stage = passed ? 'QA' : 'TARGET_PLATFORM_QA'; state.status = passed ? 'pending' : 'waiting';
      await store.save(state); await store.log(runId, 'platform-qa.recorded', { passed, matrixPassed: reviewed.passed, packagePassed: packageStatus.passed, blockers: [...reviewed.blockers, ...packageStatus.blockers, ...packageVerificationBlockers] });
      return { ...reviewed, packageStatus };
    },
    async approveHumanPlaytest(runId: string, value: unknown, options: { force?: boolean } = {}) {
      const state = await store.load(runId);
      const parsedAcceptance = HumanPlaytestAcceptanceSchema.parse(value);
      // Bind an API-submitted approval to the frozen candidate when one is
      // available. Manual files are still checked strictly during resume.
      const candidate = await store.readArtifact(runId, 'release-candidate.json').catch(() => undefined) as { coreHash?: unknown } | undefined;
      const acceptance = HumanPlaytestAcceptanceSchema.parse({ ...parsedAcceptance, ...(parsedAcceptance.buildHash ? {} : typeof candidate?.coreHash === 'string' ? { buildHash: candidate.coreHash } : {}) });
      await writeJsonAtomic(path.join(store.runRoot(runId), 'human/playtest-acceptance.json'), acceptance);
      const candidateBound = typeof candidate?.coreHash === 'string' && acceptance.buildHash === candidate.coreHash;
      const acceptancePassed = acceptance.passed && candidateBound;
      const acceptanceEvidence = acceptancePassed
        ? ['human:final-playtest-required', 'human:playtest-passed', `candidate:${acceptance.buildHash}`]
        : [acceptance.passed ? 'human:acceptance-build-hash-mismatch' : 'human:playtest-rejected'];
      // Only a candidate-bound passing playtest is an approval. Failed or
      // stale submissions stay visible in the playtest artifact and leave the
      // scheduled session open for a corrected submission.
      const scheduledProjection = acceptancePassed
        ? await appendScheduledHumanApproval(runId, {
          sessionId: 'FINAL_RELEASE',
          decision: 'APPROVE',
          artifactRefs: ['artifacts/release-candidate.json', 'artifacts/completion-gates.json', 'artifacts/platform-release-matrix.json', 'human/playtest-acceptance.json'],
          candidateHash: acceptance.buildHash,
          notes: acceptance.notes,
          force: options.force,
        })
        : undefined;
      await recordControlStage(state, 'WAITING_FOR_HUMAN_PLAYTEST', acceptancePassed ? 'completed' : 'waiting', ['artifacts/release-candidate.json', 'artifacts/completion-gates.json'], ['human/playtest-acceptance.json'], acceptanceEvidence);
      state.stage = acceptancePassed ? 'QA' : 'WAITING_FOR_HUMAN_PLAYTEST'; state.status = acceptancePassed ? 'pending' : 'waiting';
      await store.save(state); await store.log(runId, 'human-playtest.recorded', { passed: acceptance.passed, sessionId: acceptance.sessionId });
      return { acceptance, ...(scheduledProjection ? { approval: scheduledProjection } : {}), nextCommand: `pnpm factory resume ${runId}` };
    },
    /** Append one explicit approval/exception record to the run ledger. */
    async recordHumanApproval(runId: string, value: unknown) {
      const state = await store.load(runId);
      const record = HumanApprovalRecordSchema.parse(value);
      const ledgerPath = path.join(store.runRoot(runId), 'artifacts/human-approval-ledger.json');
      let ledger = buildHumanApprovalLedger(runId);
      if (await exists(ledgerPath)) {
        ledger = HumanApprovalLedgerSchema.parse(await store.readArtifact(runId, 'human-approval-ledger.json'));
        if (ledger.runId !== runId) throw new Error(`human approval ledger runId ${ledger.runId} does not match ${runId}`);
      }
      const existing = ledger.records.find((item) => item.recordId === record.recordId);
      if (existing && JSON.stringify(existing) !== JSON.stringify(record)) throw new Error(`human approval record ${record.recordId} already exists with different content`);
      if (!existing) ledger.records.push(record);
      ledger.updatedAt = new Date().toISOString();
      await store.writeArtifact(runId, 'human-approval-ledger.json', ledger);
      const candidate = await store.readArtifact(runId, 'release-candidate.json').catch(() => undefined) as { coreHash?: unknown } | undefined;
      const evaluation = await evaluateHumanApprovalLedger(runId, typeof candidate?.coreHash === 'string' ? candidate.coreHash : undefined);
      await store.log(runId, 'human-approval.recorded', { recordId: record.recordId, sessionId: record.sessionId, approvalClass: record.approvalClass, decision: record.decision, passed: evaluation.passed });
      // Recording is intentionally side-effect free with respect to stage
      // state; the next resume re-evaluates all release gates atomically.
      return { record, ledger, evaluation, nextCommand: `pnpm factory resume ${state.runId}` };
    },
    async recordContentVariation(runId: string, value: unknown) {
      const state = await store.load(runId);
      const variation = ContentVariationReportSchema.parse(value);
      await store.writeArtifact(runId, 'content-variation.json', variation);
      const lineContract = await store.readArtifact(runId, 'production-line-contract.json').catch(() => undefined) as { line?: unknown } | undefined;
      const lineValue = lineContract?.line;
      const line = typeof lineValue === 'string' && ['single-finger-action', 'cut-stack-dodge', 'idle-management', 'choice-life', 'rule-puzzle'].includes(lineValue)
        ? lineValue as 'single-finger-action' | 'cut-stack-dodge' | 'idle-management' | 'choice-life' | 'rule-puzzle'
        : 'idle-management';
      const coveragePlan = buildVariationCoveragePlan(line);
      const coverageObservation = buildVariationCoverageObservation(line, variation);
      const coverage = evaluateVariationCoverage(coveragePlan, coverageObservation);
      await store.writeArtifact(runId, 'variation-coverage-plan.json', coveragePlan);
      await store.writeArtifact(runId, 'variation-coverage-evaluation.json', coverage);
      await store.writeArtifact(runId, 'level-difference.json', { passed: variation.passed && coverage.passed, evidence: variation.variants.flatMap((item) => item.evidence), blockers: coverage.blockers });
      const passed = variation.passed && coverage.passed;
      const evidence = passed ? ['variation:run-a-vs-b', 'variation:structural-or-decision-difference', 'variation:line-coverage'] : [...(variation.passed ? [] : ['variation:repair-required']), ...coverage.blockers.map((item) => `variation:${item}`)];
      const inputs = ['artifacts/game-blueprint.json', 'artifacts/content-variation.json'];
      markControlStage(state, 'CONTENT_VARIATION_QA', passed ? 'completed' : 'waiting', inputs, ['artifacts/content-variation.json', 'artifacts/level-difference.json', 'artifacts/variation-coverage-plan.json', 'artifacts/variation-coverage-evaluation.json'], evidence);
      await persistControlStageAudit(state, 'CONTENT_VARIATION_QA', passed ? 'completed' : 'waiting', inputs, ['artifacts/content-variation.json', 'artifacts/level-difference.json', 'artifacts/variation-coverage-plan.json', 'artifacts/variation-coverage-evaluation.json'], evidence);
      state.stage = 'QA'; state.status = 'pending';
      await store.save(state); await store.log(runId, 'content-variation.recorded', { passed: variation.passed, variants: variation.variants.length });
      return { variation, coverage, nextCommand: `pnpm factory resume ${runId}` };
    },
    async recordQualityBaseline(runId: string, value: unknown) {
      const state = await store.load(runId);
      const baseline = QualityBaselineReportSchema.parse(value);
      await store.writeArtifact(runId, 'quality-baseline.json', baseline);
      const baselineEvidence = baseline.passed ? ['baseline:all-checks'] : baseline.blockers.map((item) => `blocked:${item}`);
      await recordControlStage(state, 'QUALITY_BASELINE_QA', baseline.passed ? 'completed' : 'waiting', ['artifacts/build-report.json', 'artifacts/qa-report.json'], ['artifacts/quality-baseline.json'], baselineEvidence);
      state.stage = 'QA'; state.status = 'pending';
      await store.save(state); await store.log(runId, 'quality-baseline.recorded', { passed: baseline.passed, blockers: baseline.blockers });
      return { baseline, nextCommand: `pnpm factory resume ${runId}` };
    },
    async recordOriginality(runId: string, value: unknown) {
      const state = await store.load(runId);
      const declaration = OriginalityDeclarationSchema.parse(value);
      await store.writeArtifact(runId, 'originality-declaration.json', declaration);
      const originalityPassed = evaluateOriginality(declaration).passed;
      await recordControlStage(state, 'ORIGINALITY_REVIEW', originalityPassed ? 'completed' : 'waiting', ['artifacts/game-blueprint.json', 'artifacts/reference-mechanic-spec.json'], ['artifacts/originality-declaration.json'], originalityPassed ? ['originality:expression-isolated'] : ['originality:review-required']);
      state.stage = 'QA'; state.status = 'pending';
      await store.save(state); await store.log(runId, 'originality.recorded', { status: declaration.status, unknowns: declaration.unknowns.length });
      return { declaration, nextCommand: `pnpm factory resume ${runId}` };
    },
    async pipelinePlan(runId: string) { return store.readArtifact(runId, 'pipeline-plan.json'); },
    async operatingStatus(runId: string) {
      const state = await store.load(runId);
      const runRoot = store.runRoot(runId);
      // `FileRunStore.readArtifact` resolves names below `<run>/artifacts`.
      // Keep the existence probe in that same namespace; probing the run root
      // made the status API silently return `undefined` for every artifact.
      const readOptional = async (name: string) => {
        const artifactName = name.replace(/^artifacts\//u, '');
        return await exists(path.join(runRoot, 'artifacts', artifactName))
          ? await store.readArtifact(runId, artifactName).catch(() => undefined)
          : undefined;
      };
      const readLaunchMetrics = async () => {
        const directory = path.join(runRoot, 'artifacts/launch-metrics');
        if (!await exists(directory)) return [];
        const files = await listFiles(directory);
        const values: unknown[] = [];
        for (const file of files.filter((item) => item.endsWith('.json'))) {
          try { values.push(await store.readArtifact(runId, `launch-metrics/${file}`)); } catch { /* retain a best-effort status view */ }
        }
        return values;
      };
      return {
        state,
        effectivePolicy: {
          validationMode,
          enforcePlayerAcceptance,
          enforceOperatingGates,
          enforceStageContracts,
          enforceExplicitStageContracts,
          certificationRequired: certificationRequired(),
          platformQaRequired: platformQaRequired(),
          presentationQualityRequired: presentationQualityRequired(),
          blindPlaytestRequired: blindPlaytestRequired(),
          supplyChainRequired: supplyChainRequired(),
          artQualityRequired: artQualityRequired(),
          dependencyAllowlistRequired: dependencyAllowlistRequired(),
          portfolioGateRequired: portfolioGateRequired(),
          platformPolicyRequired: platformPolicyRequired(),
        },
        effectiveOperatingProfile: effectiveOperatingProfile(),
        business: await readOptional('business-preflight.json'),
        accountCapacityPlan: await readOptional('account-capacity.json'),
        accountCapacity: await readOptional('account-capacity-evaluation.json'),
        accountPortfolioSnapshotHash: await (async () => { try { const portfolio = await readAccountPortfolioSnapshot(); return portfolio ? accountPortfolioHash(portfolio) : undefined; } catch { return undefined; } })(),
        platform: await readOptional('platform-release-matrix.json'),
        platformSpine: await readOptional('platform-spine.json'),
        certification: await readOptional('certification-checklist.json'),
        portfolioStrategy: await readOptional('portfolio-strategy.json'),
        portfolioGate: await readOptional('portfolio-gate-evaluation.json'),
        sideEffectJournal: await readOptional('side-effect-journal.json'),
        sideEffectEvaluation: await readOptional('side-effect-evaluation.json'),
        dependencyPolicy: await readOptional('dependency-policy.json'),
        dependencyPolicyEvaluation: await readOptional('dependency-policy-evaluation.json'),
        platformPolicy: await readOptional('platform-policy.json'),
        platformPolicyEvaluation: await readOptional('platform-policy-evaluation.json'),
        cost: await readOptional('cost-gate.json'),
        costUsage: await readOptional('cost-usage.json'),
        costPreflight: await readOptional('cost-preflight.json'),
        completion: await readOptional('completion-gates.json'),
        humanApprovals: await readOptional('human-approval-evaluation.json'),
        launchMetrics: await readLaunchMetrics(),
        releaseLifecycle: await readOptional('release-lifecycle.json'),
        abandonment: await readOptional('abandonment-decision.json'),
      };
    },
    validate: (seedFile: string) => store.readSeedFile(seedFile),
    async newRun(seedFile: string) {
      const seed = await store.readSeedFile(seedFile);
      const runId = `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${sha256Text(stringify(seed)).slice(0, 8)}`;
      let candidate = runId; let suffix = 1;
      while (await exists(store.runRoot(candidate))) candidate = `${runId}-${suffix++}`;
      await store.create(candidate, seedFile, mode);
      await store.writeArtifact(candidate, 'factory-profile.json', effectiveOperatingProfile());
      await ensureOperatingArtifacts(candidate, seed);
      return candidate;
    },
    async newActionExperiment(specFile: string) {
      const encoded = await readFile(specFile, 'utf8'); const spec = ActionMechanicExperimentSpecSchema.parse(JSON.parse(encoded));
      const runId = `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-action-${sha256Text(JSON.stringify(spec)).slice(0, 8)}`;
      let candidate = runId; let suffix = 1; while (await exists(store.runRoot(candidate))) candidate = `${runId}-${suffix++}`;
      await store.createActionExperiment(candidate, specFile, mode);
      // Action experiments still cross a Builder boundary. Give them the same
      // closed-world permission inventory as game runs before any experiment
      // context is read or a variant is built.
      await ensurePermissionManifestBundle(candidate);
      return candidate;
    },
    run: execute,
    async resume(runId: string) { const state = await store.load(runId); assertRunMode(state); if (state.stage === 'WAITING_FOR_REFERENCE_APPROVAL' && !await exists(path.join(store.runRoot(runId), 'human/reference-decision.yaml'))) return state; if (state.stage === 'WAITING_FOR_PROTOTYPE_APPROVAL' && !await exists(path.join(store.runRoot(runId), 'human/prototype-decision.yaml'))) return state; if (state.stage === 'WAITING_FOR_ACTION_APPROVAL' && !await exists(path.join(store.runRoot(runId), 'human/action-mechanic-decision.yaml'))) return state; if (state.stage === 'WAITING_FOR_ART_APPROVAL' && !await exists(path.join(store.runRoot(runId), 'human/art-approval.yaml'))) return state; if (state.stage === 'PROTOTYPE_REVISION_REQUESTED') return state; return execute(runId); },
    async approveActionExperiment(runId: string, input: { decision: string; selectedSlot: string | null; rationale: string; requiredChanges: string[]; force?: boolean }) {
      const state = await store.load(runId);
      if (state.stage !== 'WAITING_FOR_ACTION_APPROVAL' || state.status !== 'waiting') throw new Error(`Run ${runId} is not waiting for action mechanic approval`);
      const spec = ActionMechanicExperimentSpecSchema.parse(await store.readArtifact(runId, 'action-experiment-spec.json'));
      const decision = HumanActionMechanicDecisionSchema.parse({ schemaVersion: 1, experimentId: spec.experimentId, decision: input.decision.toUpperCase(), selectedSlot: input.selectedSlot?.toUpperCase() ?? null, rationale: input.rationale, requiredChanges: input.requiredChanges });
      const file = path.join(store.runRoot(runId), 'human/action-mechanic-decision.yaml');
      try { await writeFile(file, stringify(decision), { flag: input.force ? 'w' : 'wx' }); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`Action mechanic decision already exists for run ${runId}; pass --force to overwrite`); throw error; }
      await store.log(runId, 'action-mechanic-decision.created', { decision: decision.decision, selectedSlot: decision.selectedSlot, forced: input.force === true });
      return { decision, file, nextCommand: `pnpm factory resume ${runId}` };
    },
    async approveReference(runId: string, input: { decision: string; notes: string; force?: boolean }) {
      const state = await store.load(runId);
      if (state.stage !== 'WAITING_FOR_REFERENCE_APPROVAL' || state.status !== 'waiting') throw new Error(`Run ${runId} is not waiting for reference mechanic approval`);
      const decision = HumanReferenceDecisionSchema.parse({ decision: input.decision.toUpperCase(), notes: input.notes.trim() ? [input.notes.trim()] : [] });
      const file = path.join(store.runRoot(runId), 'human/reference-decision.yaml');
      try { await writeFile(file, stringify(decision), { flag: input.force ? 'w' : 'wx' }); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`Reference mechanic decision already exists for run ${runId}; pass --force to overwrite`); throw error; }
      await store.log(runId, 'reference-mechanic-decision.created', { decision: decision.decision, forced: input.force === true });
      return { decision, file, nextCommand: `pnpm factory resume ${runId}` };
    },
    async approvePrototype(runId: string, input: { decision: string; notes: string; force?: boolean }) {
      const state = await store.load(runId);
      if (state.stage !== 'WAITING_FOR_PROTOTYPE_APPROVAL' || state.status !== 'waiting') throw new Error(`Run ${runId} is not waiting for prototype approval`);
      const decision = HumanPrototypeDecisionSchema.parse({ decision: input.decision.toUpperCase(), notes: input.notes.trim() ? [input.notes.trim()] : [] });
      const file = path.join(store.runRoot(runId), 'human/prototype-decision.yaml');
      try { await writeFile(file, stringify(decision), { flag: input.force ? 'w' : 'wx' }); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`Prototype decision already exists for run ${runId}; pass --force to overwrite`); throw error; }
      await store.log(runId, 'prototype-decision.created', { decision: decision.decision, forced: input.force === true });
      return { decision, file, nextCommand: `pnpm factory resume ${runId}` };
    },
    async implementFormalPrototype(constraintsFile: string) {
      if (mode !== 'codex-account') throw new Error('Formal prototype implementation requires FACTORY_MODE=codex-account');
      await codexExecutor!.assertChatGptLogin();
      const constraints = FormalPrototypeFollowupConstraintsSchema.parse(JSON.parse(await readFile(constraintsFile, 'utf8')));
      const resolveRepositoryPath = (relativePath: string) => {
        const resolved = path.resolve(repositoryRoot, relativePath);
        const relative = path.relative(repositoryRoot, resolved);
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Formal prototype path must remain inside the repository: ${relativePath}`);
        return resolved;
      };
      const actionState = await store.load(constraints.implementationGate.actionExperimentRunId);
      if (actionState.stage !== constraints.implementationGate.requiredTerminalStage || actionState.status !== 'completed') {
        throw new Error(`Action experiment ${actionState.runId} must be completed at ${constraints.implementationGate.requiredTerminalStage}`);
      }
      const actionRunRoot = store.runRoot(actionState.runId);
      const decision = HumanActionMechanicDecisionSchema.parse(parse(await readFile(path.join(actionRunRoot, 'human/action-mechanic-decision.yaml'), 'utf8')));
      if (decision.decision !== 'KEEP' || !decision.selectedSlot) throw new Error(`Action experiment ${actionState.runId} must have a selected KEEP decision`);
      const spec = ActionMechanicExperimentSpecSchema.parse(await store.readArtifact(actionState.runId, 'action-experiment-spec.json'));
      if (decision.experimentId !== spec.experimentId) throw new Error('Action decision does not match the validated experiment specification');
      const variant = spec.prototypes.find(({ slot }) => slot === decision.selectedSlot);
      if (!variant) throw new Error(`Selected action slot ${decision.selectedSlot} does not exist`);
      const research = OpenSourceResearchArtifactSchema.parse(JSON.parse(await readFile(resolveRepositoryPath(constraints.openSourceResearchArtifact), 'utf8')));
      if (research.targetGame !== constraints.game.title || research.targetWorkspace !== constraints.targetWorkspace) {
        throw new Error('Validated open-source research target does not match the formal game and workspace');
      }
      const workspace = resolveRepositoryPath(constraints.targetWorkspace);
      if (!await exists(path.join(workspace, 'package.json'))) throw new Error(`Formal prototype workspace is missing package.json: ${constraints.targetWorkspace}`);
      const selectedWorkspace = path.posix.join('runs', actionState.runId, variant.workspace);
      if (path.resolve(repositoryRoot, selectedWorkspace) === workspace) throw new Error('Selected action experiment workspace must remain isolated from the formal workspace');
      const result = await builderAgent.implementFormalPrototype(workspace, {
        constraints,
        research,
        actionSelection: { runId: actionState.runId, decision: 'KEEP', selectedSlot: decision.selectedSlot, selectedWorkspace, treatment: variant.treatment },
      });
      const report = FormalPrototypeBuildReportSchema.parse(result.report);
      const artifactFile = path.resolve(workspace, '../../artifacts/formal-prototype-build-report.json');
      await writeFile(artifactFile, `${JSON.stringify(report, null, 2)}\n`);
      return { report, artifactFile, metrics: result.metrics };
    },
    async approve(runId: string, input: { direction: string; notes: string; force?: boolean }) {
      const state = await store.load(runId);
      if (state.stage !== 'WAITING_FOR_ART_APPROVAL' || state.status !== 'waiting') throw new Error(`Run ${runId} is not waiting for art approval`);
      const directions = ArtDirectionsSchema.parse(await store.readArtifact(runId, 'art-directions.json'));
      if (!directions.directions.some((direction) => direction.id === input.direction)) throw new Error(`Art direction ${input.direction} does not exist in run ${runId}`);
      const approval = ArtApprovalSchema.parse({ selected_direction: input.direction, keep: [], change: [], notes: input.notes.trim() ? [input.notes.trim()] : [] });
      const file = path.join(store.runRoot(runId), 'human/art-approval.yaml');
      try { await writeFile(file, stringify(approval), { flag: input.force ? 'w' : 'wx' }); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`Art approval already exists for run ${runId}; pass --force to overwrite`); throw error; }
      // This is the second scheduled session: the owner has already seen the
      // mechanic/prototype gate, and now locks the combined core-demo
      // presentation direction. Keep any earlier mechanic review as extra
      // evidence, but require only artifacts that exist at this gate.
      const coreEvidenceRefs = ['artifacts/game-blueprint.json', 'artifacts/experience-contract.json', 'artifacts/art-directions.json', 'human/art-approval.yaml'];
      for (const optional of ['human/reference-mechanic-review.json', 'human/reference-decision.yaml', 'human/prototype-review.json', 'human/prototype-decision.yaml']) {
        if (await exists(path.join(store.runRoot(runId), optional))) coreEvidenceRefs.push(optional);
      }
      const scheduledProjection = await appendScheduledHumanApproval(runId, {
        sessionId: 'CORE_DEMO',
        decision: 'APPROVE',
        artifactRefs: coreEvidenceRefs,
        notes: approval.notes,
        force: input.force,
      });
      await store.log(runId, 'art-approval.created', { direction: approval.selected_direction, forced: input.force === true });
      return { approval, file, scheduledProjection, nextCommand: `pnpm factory resume ${runId}` };
    },
    status: (runId: string) => store.load(runId),
    async inspect(runId: string) { const state = await store.load(runId); const artifacts = await listFiles(path.join(store.runRoot(runId), 'artifacts')); return { state, artifacts }; },
    async verifyBuild(runId: string) {
      const state = await store.load(runId); assertRunMode(state);
      if (mode !== 'codex-account') throw new Error('verify-build is only available in FACTORY_MODE=codex-account');
      const buildStatus = state.stages.FULL_BUILD?.status;
      if (buildStatus !== 'failed' && buildStatus !== 'completed') throw new Error(`Run ${runId} does not have a failed or completed FULL_BUILD stage to verify`);
      const runRoot = store.runRoot(runId);
      let threadId = state.codexThreadId;
      let historicalBuild: ReturnType<typeof parseCodexJsonl> | undefined;
      const logFile = path.join(runRoot, 'logs/codex/BUILD.attempt-1.stdout.jsonl');
      if (buildStatus === 'failed') {
        if (!await exists(logFile)) throw new Error(`Run ${runId} has no completed Builder JSONL log to verify`);
        const parsedBuild = parseCodexJsonl(await readFile(logFile, 'utf8'));
        if (!parsedBuild.completed || parsedBuild.failed || !parsedBuild.threadId) throw new Error(`Run ${runId} Builder JSONL does not prove a completed turn with a threadId`);
        threadId = parsedBuild.threadId;
        historicalBuild = parsedBuild;
      } else if (await exists(logFile)) {
        const parsedBuild = parseCodexJsonl(await readFile(logFile, 'utf8'));
        if (parsedBuild.completed && !parsedBuild.failed && parsedBuild.threadId) historicalBuild = parsedBuild;
      }
      if (!threadId) throw new Error(`Run ${runId} has no Builder threadId to verify`);
      const blueprint = GameBlueprintSchema.parse(await store.readArtifact(runId, 'game-blueprint.json'));
      const inputs = ['artifacts/game-blueprint.json', 'artifacts/style-lock.json', 'artifacts/asset-manifest.json', `templates/web-lite/${blueprint.template}`];
      invalidateDownstream(state, 'FULL_BUILD');
      const record = await begin(state, 'FULL_BUILD', inputs);
      try {
        const result = await builderAgent.verifyExisting(path.join(runRoot, 'workspace/game'), blueprint.template, threadId, 'full');
        if (record.providerCalls.agent === 0 && historicalBuild) addAgentMetrics(record, { provider: 'codex-cli', model: await routedModelForAttempt(state, 'FULL_BUILD', 1), calls: 1, usage: historicalBuild.usage });
        await backfillCodexMetrics(state, 'FIX');
        state.codexThreadId = threadId;
        await store.writeArtifact(runId, 'build-report.json', result.report);
        await saveUsage(state);
        await complete(state, record, ['artifacts/build-report.json', 'workspace/game/dist/'], [buildStatus === 'failed' ? 'codex:completed-log-reused' : 'codex:existing-thread-reused', ...result.report.verification, `files:${result.report.files.length}`]);
        return execute(runId);
      } catch (error) { return fail(state, record, error); }
    },
    async retry(runId: string, stage: StageName) {
      const state = await store.load(runId);
      assertRunMode(state);
      const cleanupPaths = getDownstreamArtifactPaths(stage);
      invalidateDownstream(state, stage);
      // Mark old evidence stale before deleting files. This prevents a resume
      // racing with cleanup (or a missing output) from treating prior hashes
      // as release-valid.
      let ledger = createArtifactLedger();
      try { ledger = await store.readArtifact(runId, 'artifact-ledger.json') as ReturnType<typeof createArtifactLedger>; } catch { /* legacy run */ }
      await store.writeArtifact(runId, 'artifact-ledger.json', invalidateArtifacts(ledger, cleanupPaths, `retry:${stage}`));
      await clearRetryArtifacts(runId, stage);
      state.stage = stage;
      state.status = 'pending';
      if (stage === 'FULL_BUILD' || stage === 'BUILD') state.fixAttempts = 0;
      await store.save(state);
      await store.log(runId, 'run.retry', { stage, cleared: cleanupPaths, ledgerInvalidated: true });
      return execute(runId);
    },
    async previewPrototype(runId: string, prototype: string) { if (!/^prototype-[abc]$/.test(prototype)) throw new Error('Prototype must be prototype-a, prototype-b or prototype-c'); return webRuntime.startPreview(path.join(store.runRoot(runId), 'workspace', prototype)); },
    async demo(seedFile = path.join(repositoryRoot, 'examples/seeds/ghost-night-market.yaml')) { const runId = await this.newRun(seedFile); await execute(runId); await this.approvePrototype(runId, { decision: 'APPROVE', notes: 'Mock regression approves the AI winner.' }); await execute(runId); await this.approve(runId, { direction: 'direction_b', notes: '保留人物比例和配色，降低饱和度，简化背景，不要太幼儿化' }); await execute(runId); return runId; },
  };
}
