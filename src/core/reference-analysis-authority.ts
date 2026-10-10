import { ReferenceBehaviorAnalysisSchema, type ReferenceBehaviorAnalysis } from '../schemas/reference-evidence.js';

export const NON_AUTHORITATIVE_RECORDING_PROVIDER = 'recording-level:non-authoritative-provider:mock';

/** Code-only input cannot substantiate observed pixels, even if a provider
 * labels its output READY. Retain gaps instead of silently relabeling claims. */
export function enforceCodeAnalysisBasis(value: ReferenceBehaviorAnalysis): ReferenceBehaviorAnalysis {
  const analysis = ReferenceBehaviorAnalysisSchema.parse(value);
  const blockers: string[] = [];
  if (analysis.behaviorChecks.some(check => check.evidenceBasis !== 'code-analysis' || check.viewportBasis !== 'qa-target')) blockers.push('reference-code:behavior-basis-missing');
  if (!analysis.evidenceLimitations?.length) blockers.push('reference-code:evidence-limitations-missing');
  if (analysis.levelReconstruction) blockers.push('reference-code:unsupported-recording-reconstruction');
  if (blockers.length === 0) return analysis;
  return ReferenceBehaviorAnalysisSchema.parse({ ...analysis, status: 'BLOCKED', unknowns: [...new Set([...analysis.unknowns, ...blockers])] });
}

export function enforceRecordingAnalysisAuthority(input: {
  analysis: ReferenceBehaviorAnalysis;
  provider: string;
  recordingDeclared: boolean;
  allowSyntheticForTests?: boolean;
}): ReferenceBehaviorAnalysis {
  const analysis = ReferenceBehaviorAnalysisSchema.parse(input.analysis);
  if (!input.recordingDeclared || input.allowSyntheticForTests || input.provider !== 'mock') return analysis;

  const unknowns = [...new Set([...analysis.unknowns, NON_AUTHORITATIVE_RECORDING_PROVIDER])];
  const levelReconstruction = analysis.levelReconstruction
    ? {
        ...analysis.levelReconstruction,
        unknowns: [...new Set([...analysis.levelReconstruction.unknowns])],
        blockers: [...new Set([...analysis.levelReconstruction.blockers, NON_AUTHORITATIVE_RECORDING_PROVIDER])],
        status: 'BLOCKED' as const,
      }
    : analysis.levelReconstruction;

  return ReferenceBehaviorAnalysisSchema.parse({
    ...analysis,
    unknowns,
    levelReconstruction,
    status: 'BLOCKED',
  });
}
