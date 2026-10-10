import { describe, expect, it } from 'vitest';
import { createFactory } from '../../src/factory.js';
import { buildPipelinePlan } from '../../src/core/pipeline-plan.js';
import { RequestRouteSchema } from '../../src/schemas/index.js';

it('rejects persisted unsupported existing-game routes that try to build', () => {
  const route = createFactory({ mode: 'mock', qaMode: 'stub' }).routeRequest({ request: '修复实时多人联机崩溃', targetRunId: 'existing' });
  expect(() => RequestRouteSchema.parse({ ...route, stages: ['FULL_BUILD', 'QA'] })).toThrow(/review/u);
});

type RoutableFactory = ReturnType<typeof createFactory> & {
  routeRequest(input: { request: string; targetRunId?: string; rigor?: 'minimal' | 'standard' | 'full' }): {
    requestType: string;
    entryLane: string;
    targetRunId: string | null;
    stages: string[];
    fullGreenlight: boolean;
    reviewEscalations: unknown[];
  };
  escalateRequestRoute(
    route: ReturnType<RoutableFactory['routeRequest']>,
    decision: { schemaVersion: 1; requestedBy: string; review: string; reason: string },
  ): ReturnType<RoutableFactory['routeRequest']>;
};

function router() {
  return createFactory({ mode: 'mock', qaMode: 'stub' }) as RoutableFactory;
}

describe('RequestRouter', () => {
  it('routes orphan-interactive-object audits through profile and perceptual gates', () => {
    const route = router().routeRequest({ request: '检查一个关卡：每个危险、目标、平台、奖励、触发器、敌人或资源节点都必须可触碰、可绕行或用于恢复；孤立交互对象必须阻断构建', targetRunId: 'eval-existing' });
    expect(route.experienceProfile.primary).toBe('ACTION_FEEL');
    expect(route.stages).toEqual(expect.arrayContaining(['EXPERIENCE_CONTRACT', 'FEEL_PROTOTYPE', 'PERCEPTUAL_QA']));
  });

  it('routes decorative collider consistency audits through build and perceptual gates', () => {
    const route = router().routeRequest({ request: '如果交互对象被标记为 decorative，就必须没有 gameplay collider，且视觉不能伪装成会导致失败的危险物', targetRunId: 'eval-existing' });
    expect(route.experienceProfile.primary).toBe('ACTION_FEEL');
    expect(route.stages).toEqual(expect.arrayContaining(['EXPERIENCE_CONTRACT', 'FEEL_PROTOTYPE', 'PERCEPTUAL_QA']));
  });

  it.each([
    ['请创建一个新的妖怪夜市经营游戏', undefined, 'NEW_GAME'],
    ['调整已有游戏的顾客连击玩法', 'run-1', 'GAMEPLAY_REVISION'],
    ['重画角色并更新界面配色', 'run-1', 'VISUAL_REVISION'],
    ['把升级价格和订单奖励调平衡', 'run-1', 'BALANCE_REVISION'],
    ['修复点击升级后崩溃的问题', 'run-1', 'BUG_FIX'],
    ['调整激励广告触发和频控', 'run-1', 'MONETIZATION_REVISION'],
    ['发布当前已通过 QA 的版本', 'run-1', 'RELEASE'],
    ['demo 已批准，请继续扩展关卡和完善玩法', 'run-1', 'PRODUCTIZATION_REVISION'],
  ])('classifies %s as %s', (request, targetRunId, expectedType) => {
    expect(router().routeRequest({ request, targetRunId }).requestType).toBe(expectedType);
  });

  it('routes post-demo productization through content expansion and UI skeleton before build', () => {
    const route = router().routeRequest({ request: 'demo 已批准，请继续扩展关卡和完善玩法', targetRunId: 'run-1' });
    expect(route.stages).toEqual(['SYSTEMS_CONTRACT', 'SYSTEMS_PROTOTYPE', 'STRATEGY_QA', 'PROGRESSION_REVIEW', 'CONTENT_EXPANSION', 'UI_SKELETON', 'FULL_BUILD', 'QA']);
    expect(route.rationale).toMatch(/content expansion|产品化/i);
  });

  it('routes competitor-copy requests through deep mechanic research before lock', () => {
    const route = router().routeRequest({ request: '深度还原这个竞品的核心体验和关卡机制，做原创表达', targetRunId: 'run-1' });
    expect(route.requestType).toBe('GAMEPLAY_REVISION');
    expect(route.stages[0]).toBe('REFERENCE_DEEP_RESEARCH');
    expect(route.stages).toContain('REFERENCE_MECHANIC_LOCK');
    expect(route.rationale).toMatch(/deep|深度|mechanic research/i);
  });

  it('prioritizes an explicit new-game request over revision keywords', () => {
    const route = router().routeRequest({
      request: '新做一个参考同类作品核心循环、但题材和表达原创的放置游戏',
    });

    expect(route.requestType).toBe('NEW_GAME');
    expect(route.entryLane).toBe('REFERENCE_ADAPTATION');
    expect(route.targetRunId).toBeNull();
  });

  it('routes a generic new game through the original prototype lane', () => {
    const route = router().routeRequest({ request: '做一个新的夜市经营小游戏' });

    expect(route).toMatchObject({ requestType: 'NEW_GAME', entryLane: 'ORIGINAL_PROTOTYPE', targetRunId: null, fullGreenlight: false, reviewEscalations: [] });
    const plan = buildPipelinePlan({ designMode: 'prototype_tournament', productionLine: 'idle-management', primaryProfile: route.experienceProfile.primary });
    expect(route.pipelinePlan).toMatchObject({ mode: 'fast-reskin', designMode: 'prototype_tournament', rigor: 'standard' });
    expect(route.stages).toEqual(plan.mandatoryStages);
    expect(route.stages).toEqual(expect.arrayContaining(['BUILD_3_PROTOTYPES', 'PLAYTEST_TOURNAMENT', 'WINNER_SELECTION', 'WAITING_FOR_PROTOTYPE_APPROVAL']));
    expect(route.stages).not.toEqual(expect.arrayContaining(['REFERENCE_DEEP_RESEARCH', 'REFERENCE_MECHANIC_LOCK', 'WAITING_FOR_REFERENCE_APPROVAL']));
  });

  it('routes an explicit reference request through the reference adaptation lane', () => {
    const route = router().routeRequest({ request: '参考一款同类游戏的核心循环，但做原创题材和表达' });

    expect(route).toMatchObject({ requestType: 'NEW_GAME', entryLane: 'REFERENCE_ADAPTATION', targetRunId: null, fullGreenlight: true });
    expect(route.stages).toEqual(buildPipelinePlan({ designMode: 'reference_reskin', productionLine: 'idle-management' }).mandatoryStages);
    expect(route.stages.slice(0, 3)).toEqual(['REFERENCE_DEEP_RESEARCH', 'REFERENCE_MECHANIC_LOCK', 'WAITING_FOR_REFERENCE_APPROVAL']);
    expect(route.stages).not.toEqual(expect.arrayContaining(['IDEA_GENERATION', 'BUILD_3_PROTOTYPES', 'PLAYTEST_TOURNAMENT']));
  });

  it('keeps an unbound reference revision in the existing-game category', () => {
    expect(() => router().routeRequest({ request: '修复参考游戏的追兵碰撞' })).toThrow(/targetRunId/i);
  });

  it('requires line review for a hybrid new-game request before any build', () => {
    const route = router().routeRequest({ request: '做一个有大量演出的 3D 小游戏' });
    expect(route.supportDecision).toBe('HYBRID_REVIEW_REQUIRED');
    expect(route.fullGreenlight).toBe(false);
    expect(route.stages).toEqual(['BUSINESS_PREFLIGHT', 'PRODUCTION_LINE_REVIEW']);
  });

  it('keeps an unsupported repair at the line review boundary', () => {
    const route = router().routeRequest({ request: '修复实时多人联机的崩溃', targetRunId: 'run-1' });
    expect(route.stages).toEqual(['BUSINESS_PREFLIGHT', 'PRODUCTION_LINE_REVIEW']);
    expect(route.repairRoute).toBe('direct-builder');
    expect(route.repairReasons).toEqual([]);
    expect(route.rationale).toMatch(/unsupported|boundary/i);
  });

  it('uses the factory operating profile when planning a new reference run', () => {
    const factory = createFactory({ mode: 'mock', qaMode: 'stub', operatingProfile: { pipelineMode: 'full-validation' } });
    const route = factory.routeRequest({ request: '做一个参考同类核心循环的游戏' });
    expect(route.pipelinePlan?.mode).toBe('full-validation');
  });

  it('selects an explicit full rigor from the same pipeline planner', () => {
    const route = router().routeRequest({ request: '做一个参考同类核心循环的游戏', rigor: 'full' });
    const plan = buildPipelinePlan({ mode: 'full-validation', designMode: 'reference_reskin', productionLine: 'idle-management', primaryProfile: route.experienceProfile.primary });
    expect(route.pipelinePlan).toMatchObject({ mode: 'full-validation', rigor: 'full' });
    expect(route.stages).toEqual(plan.mandatoryStages);
  });

  it('lets explicit rigor override the configured mode in the route', () => {
    const factory = createFactory({ mode: 'mock', qaMode: 'stub', operatingProfile: { pipelineMode: 'full-validation' } });
    const route = factory.routeRequest({ request: '做一个参考同类核心循环的游戏', rigor: 'minimal' });
    expect(route.pipelinePlan).toMatchObject({ mode: 'replica-preview', rigor: 'minimal' });
  });

  it('includes the configured governance gates in the new-game route', () => {
    const factory = createFactory({ mode: 'mock', qaMode: 'stub', operatingProfile: {
      pipelineMode: 'full-validation', presentationQualityRequired: true, supplyChainRequired: true, blindPlaytestRequired: true,
    } });
    const route = factory.routeRequest({ request: '做一个原创小店游戏' });
    expect(route.stages).toEqual(buildPipelinePlan({
      mode: 'full-validation', designMode: 'prototype_tournament', productionLine: 'pending-review',
      primaryProfile: route.experienceProfile.primary, presentationQualityRequired: true, supplyChainRequired: true, blindPlaytestRequired: true,
    }).mandatoryStages);
  });

  it.each([
    ['GAMEPLAY_REVISION', '修改核心玩法', ['FULL_BUILD', 'QA']],
    ['VISUAL_REVISION', '替换角色美术和 UI', ['ART_DIRECTIONS', 'WAITING_FOR_ART_APPROVAL', 'STYLE_LOCK', 'ASSETS', 'FULL_BUILD', 'QA']],
    ['BALANCE_REVISION', '调整金币数值平衡', ['FULL_BUILD', 'QA']],
    ['BUG_FIX', '修复闪退 bug', ['QA', 'FIX', 'QA']],
    ['MONETIZATION_REVISION', '调整广告频控', ['FULL_BUILD', 'QA']],
    ['RELEASE', '发布版本', ['RELEASE']],
  ])('uses the shortest default path for %s', (expectedType, request, expectedStages) => {
    const route = router().routeRequest({ request, targetRunId: 'existing-run' });

    expect(route).toMatchObject({ requestType: expectedType, fullGreenlight: false, reviewEscalations: [] });
    expect(route.stages).toEqual(expectedStages);
    expect(route.stages).not.toEqual(expect.arrayContaining([
      'COMPETITOR_RESEARCH',
      'PRODUCTION_COST_REVIEW',
      'IAA_MONETIZATION_REVIEW',
      'GREENLIGHT_GATE',
    ]));
  });

  it.each([
    '调整摆荡手感',
    '优化物理手感',
    '改进自动选钩',
    '调整松手动量保留',
    '改造核心动作手感',
  ])('routes core-action revision "%s" through the action-experiment approval gate', (request) => {
    const route = router().routeRequest({ request, targetRunId: 'existing-run' });

    expect(route).toMatchObject({ requestType: 'GAMEPLAY_REVISION', fullGreenlight: false });
    expect(route.stages).toEqual([
      'ACTION_EXPERIMENT_SPEC',
      'BUILD_ACTION_PROTOTYPES',
      'PLAYTEST_ACTION_PROTOTYPES',
      'WAITING_FOR_ACTION_APPROVAL',
    ]);
  });

  it('accepts dedicated action-experiment stages on an existing-game route', () => {
    const parsed = RequestRouteSchema.parse({
      schemaVersion: 1,
      request: '调整摆荡手感',
      requestType: 'GAMEPLAY_REVISION',
      targetRunId: 'existing-run',
      stages: [
        'ACTION_EXPERIMENT_SPEC',
        'BUILD_ACTION_PROTOTYPES',
        'PLAYTEST_ACTION_PROTOTYPES',
        'WAITING_FOR_ACTION_APPROVAL',
      ],
      fullGreenlight: false,
      reviewEscalations: [],
      rationale: 'Core-action changes require a dedicated experiment.',
    });

    expect(parsed.stages).toHaveLength(4);
  });

  it('rejects hidden ideation or tournament stages appended to a designated-reference new-game route', () => {
    expect(() => RequestRouteSchema.parse({
      schemaVersion: 1,
      request: '参考指定游戏做原创换皮',
      requestType: 'NEW_GAME',
      entryLane: 'REFERENCE_ADAPTATION',
      targetRunId: null,
      stages: ['REFERENCE_MECHANIC_LOCK', 'WAITING_FOR_REFERENCE_APPROVAL', 'IDEA_GENERATION', 'OPEN_SOURCE_RESEARCH'],
      fullGreenlight: true,
      reviewEscalations: [],
      rationale: 'Reference-driven path.',
    })).toThrow(/ideation|tournament/i);
  });

  it('adds an optional review only from its corresponding review agent', () => {
    const factory = router();
    const route = factory.routeRequest({ request: '调整广告频控', targetRunId: 'existing-run' });
    const escalated = factory.escalateRequestRoute(route, {
      schemaVersion: 1,
      requestedBy: 'IaaMonetizationReviewerAgent',
      review: 'IAA_MONETIZATION_REVIEW',
      reason: 'The change introduces a new ad placement and needs a retention-risk review.',
    });

    expect(escalated.stages).toEqual(['IAA_MONETIZATION_REVIEW', 'FULL_BUILD', 'QA']);
    expect(escalated.reviewEscalations).toHaveLength(1);
    expect(() => factory.escalateRequestRoute(route, {
      schemaVersion: 1,
      requestedBy: 'ProductionCostReviewerAgent',
      review: 'IAA_MONETIZATION_REVIEW',
      reason: 'Wrong reviewer for this decision.',
    })).toThrow(/corresponding review agent/i);
  });

  it('requires an existing run for every non-new-game request', () => {
    expect(() => router().routeRequest({ request: '修复点击后崩溃' })).toThrow(/targetRunId/i);
  });

  it('flags high-risk product shapes instead of silently routing them through a light-game line', () => {
    const route = router().routeRequest({ request: '做一个实时多人开放世界 UGC 3D 游戏', targetRunId: 'existing-run' });
    expect(route.supportDecision).toBe('UNSUPPORTED');
    expect(route.rationale).toMatch(/risk|unsupported|人工|产线/i);
  });

  it('blocks unsupported new-game shapes before a reference or build route', () => {
    const route = router().routeRequest({ request: '新建一个实时多人联机游戏' });
    expect(route.supportDecision).toBe('UNSUPPORTED');
    expect(route.fullGreenlight).toBe(false);
    expect(route.stages).toEqual(['BUSINESS_PREFLIGHT', 'PRODUCTION_LINE_REVIEW']);
  });
});
