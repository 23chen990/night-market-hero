import { describe, expect, it } from 'vitest';
import { classifyModelFailure, executionPolicyForStage, getModelPolicy, modelForStage, nextModelAfterFailure } from '../../src/core/model-policy.js';
import { StageNameSchema } from '../../src/schemas/index.js';

describe('model policy', () => {
  it('keeps high-risk design and experience decisions on a frontier model', () => {
    expect(modelForStage('COMPETITOR_RESEARCH')).toMatchObject({ tier: 'frontier', model: 'gpt-5.6-sol', reasoning: 'max' });
    expect(modelForStage('EXPERIENCE_REVIEW')).toMatchObject({ tier: 'frontier', model: 'gpt-5.6-sol' });
    expect(modelForStage('FULL_BUILD')).toMatchObject({ tier: 'builder', model: 'gpt-5.6-terra' });
  });

  it('routes the narrative vertical slice to the writing-capable Builder tier', () => {
    expect(modelForStage('STORY_VERTICAL_SLICE')).toMatchObject({ tier: 'builder', model: 'gpt-5.6-terra' });
    expect(executionPolicyForStage('STORY_VERTICAL_SLICE')).toMatchObject({ role: 'builder', sandbox: 'workspace-write', canModifyWorkspace: true });
  });

  it('only assigns Spark to bounded execution and evidence tasks', () => {
    const policy = getModelPolicy();
    expect(modelForStage('UI_SKELETON')).toMatchObject({ tier: 'reviewer', model: 'gpt-5.6-luna' });
    expect(modelForStage('QA')).toMatchObject({ tier: 'reviewer', model: 'gpt-5.6-luna' });
    expect(policy.FULL_BUILD?.tier).not.toBe('fast');
  });

  it('keeps research capability limited to explicit research stages', () => {
    expect(executionPolicyForStage('COMPETITOR_RESEARCH')).toMatchObject({ role: 'research', sandbox: 'read-only' });
    expect(executionPolicyForStage('LOW_COST_FILTER')).toMatchObject({ role: 'producer', sandbox: 'read-only' });
    expect(executionPolicyForStage('PRODUCTION_LINE_REVIEW')).toMatchObject({ role: 'reviewer', sandbox: 'read-only' });
    const researchStages = StageNameSchema.options.filter((stage) => executionPolicyForStage(stage).role === 'research');
    expect(researchStages).toEqual(['REFERENCE_DEEP_RESEARCH', 'COMPETITOR_RESEARCH', 'OPEN_SOURCE_RESEARCH']);
  });

  it('escalates instead of retrying a weak model on a failed high-risk task', () => {
    expect(nextModelAfterFailure('UI_SKELETON', 1)).toMatchObject({ model: 'gpt-5.6-sol', tier: 'frontier' });
    expect(nextModelAfterFailure('EXPERIENCE_REVIEW', 1)).toMatchObject({ model: 'gpt-5.6-sol', tier: 'frontier' });
  });

  it('does not escalate for transient, specification or policy failures', () => {
    expect(nextModelAfterFailure('UI_SKELETON', 1, 'TRANSIENT')).toMatchObject({ tier: 'reviewer' });
    expect(nextModelAfterFailure('UI_SKELETON', 1, 'SPEC_ERROR')).toMatchObject({ tier: 'reviewer' });
    expect(classifyModelFailure('429 rate limit')).toBe('TRANSIENT');
    expect(classifyModelFailure('license policy blocked')).toBe('POLICY_BLOCK');
  });
});
