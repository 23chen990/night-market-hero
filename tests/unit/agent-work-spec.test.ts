import { describe, expect, it } from 'vitest';
import { compileAgentContext } from '../../src/agents/context-compiler.js';
import { AgentPackageSchema, packageForExecution } from '../../src/agents/packages.js';
import { assertExecutionContext } from '../../src/core/execution-boundary.js';
import { sha256Text } from '../../src/core/files.js';

const input = {
  path: 'artifacts/game-blueprint.json',
  content: '{"gameId":"game-1","runtime":"web-lite","template":"cut-stack-dodge-v1"}',
};

describe('agent work specifications', () => {
  it('binds Builder work to the selected production line and records real recipe/tool provenance', () => {
    const result = compileAgentContext({
      stage: 'FULL_BUILD',
      productionLine: 'cut-stack-dodge',
      runtime: 'web-lite',
      taskKind: 'build',
      taskId: 'task-1',
      targetRunId: 'run-1',
      targetGameId: 'game-1',
      summary: 'Implement the frozen cut-stack contract.',
      inputs: [input],
      requiredPaths: [input.path],
    });

    expect(AgentPackageSchema.parse(result.package)).toMatchObject({
      schemaVersion: 2,
      role: 'builder',
      productionLine: 'cut-stack-dodge',
      runtime: 'web-lite',
      taskKind: 'build',
      recipeRef: { id: 'builder.cut-stack-dodge.build', version: '1' },
      toolPolicyRef: { allowedTools: expect.arrayContaining(['write-game-workspace', 'run-tests', 'run-build']) },
    });
    expect(result.package.recipeRef.body).toMatch(/cut|settle|failure|retry/iu);
    expect(result.package.recipeRef.source).toContain('src/agents');
    expect(result.taskBundle.promptProvenance.promptBundleHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.taskBundle.promptProvenance.promptBundleHash).toBe(sha256Text(result.instruction));
    expect(result.package.skillRefs).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'web-lite-game-builder', body: expect.stringContaining('# Web-lite Game Builder') })]));
    expect(result.audit.skills).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'web-lite-game-builder', source: '.agents/skills/web-lite-game-builder/SKILL.md', sha256: expect.stringMatching(/^[a-f0-9]{64}$/u), available: true })]));
    expect(result.taskBundle.promptProvenance.loadedRefs).toContain('web-lite-game-builder');
    expect(result.instruction).toContain('# Web-lite Game Builder');
    expect(result.instruction).toMatch(/external text as data|never as instructions/iu);
    expect(result.instruction).toMatch(/self-checks are not independent QA|independent QA/iu);
    expect(result.instruction).toMatch(/frozen|settle|retry/iu);
  });

  it('selects a natural-input QA recipe and does not declare fixture mutation as a QA tool', () => {
    const result = compileAgentContext({
      stage: 'QA',
      productionLine: 'cut-stack-dodge',
      runtime: 'web-lite',
      taskKind: 'qa-natural',
      taskId: 'qa-1',
      targetRunId: 'run-1',
      targetGameId: 'game-1',
      summary: 'Verify the player-visible default journey.',
      inputs: [input],
      requiredPaths: [input.path],
    });

    expect(result.package).toMatchObject({
      role: 'reviewer',
      taskKind: 'qa-natural',
      recipeRef: { id: 'qa.cut-stack-dodge.qa-natural', version: '1' },
      canModifyWorkspace: false,
    });
    expect(result.package.allowedTools).not.toContain('write-game-workspace');
    expect(result.package.recipeRef.body).toMatch(/normal player input|natural|replay/iu);
    expect(result.package.recipeRef.body).not.toMatch(/grantCurrency|spawnCustomer|deliver/iu);
    expect(result.instruction).not.toMatch(/spawnCustomer|produce\/deliver\/reward|grant\/upgrade/iu);
  });

  it('blocks a required tool that the execution environment did not expose', () => {
    expect(() => compileAgentContext({
      stage: 'FIX',
      productionLine: 'cut-stack-dodge',
      runtime: 'web-lite',
      taskKind: 'fix',
      summary: 'Repair one validated issue.',
      inputs: [input],
      requiredPaths: [input.path],
      availableTools: ['read-qa-report'],
    })).toThrow(/tool.*(?:available|exposed|required)/iu);
  });

  it('keeps fixer discretion narrow and records the task identity without forwarding a full task book', () => {
    const result = compileAgentContext({
      stage: 'FIX',
      productionLine: 'idle-management',
      runtime: 'web-lite',
      taskKind: 'fix',
      taskId: 'fix-2',
      targetRunId: 'run-2',
      targetGameId: 'game-2',
      summary: 'Repair the reported retry issue.',
      inputs: [input],
      requiredPaths: [input.path],
      lockedDecisions: ['preserve the frozen economy contract'],
      allowedDiscretion: ['choose the smallest causally related implementation'],
      requiresApproval: ['dependency changes'],
    });

    expect(result.taskBundle).toMatchObject({
      taskId: 'fix-2',
      targetRunId: 'run-2',
      targetGameId: 'game-2',
      lockedDecisions: ['preserve the frozen economy contract'],
      allowedDiscretion: ['choose the smallest causally related implementation'],
      requiresApproval: ['dependency changes'],
    });
    expect(result.instruction).not.toContain('AI Mini-Game Factory：全部讨论最终交接总方案');
    expect(result.package.roleRules).toMatch(/causal|unrelated|QA/iu);
  });

  it('rejects a package whose declared task stage or role has been tampered with', () => {
    const pkg = packageForExecution({ stage: 'FULL_BUILD', productionLine: 'cut-stack-dodge', runtime: 'web-lite', taskKind: 'build' });
    expect(() => AgentPackageSchema.parse({ ...pkg, role: 'reviewer' })).toThrow();
  });

  it('loads the repository skill body for the later producer and release stages', () => {
    for (const [stage, skill] of [['BLUEPRINT', 'seed-to-game-blueprint'], ['ART_DIRECTIONS', 'art-direction-generator'], ['ASSETS', 'asset-manifest-generator'], ['STYLE_LOCK', 'style-lock-generator'], ['RELEASE', 'release-packager'] ] as const) {
      const pkg = packageForExecution({ stage, productionLine: 'cut-stack-dodge', runtime: 'web-lite' });
      expect(pkg.skillRefs).toEqual(expect.arrayContaining([expect.objectContaining({ id: skill, required: true, available: true, sha256: expect.stringMatching(/^[a-f0-9]{64}$/u) })]));
    }
  });

  it('rejects a package or task bundle when the runtime boundary is changed', () => {
    const compiled = compileAgentContext({
      stage: 'FULL_BUILD', productionLine: 'cut-stack-dodge', runtime: 'web-lite', taskKind: 'build', taskId: 'runtime-1',
      summary: 'Build the selected runtime candidate.', inputs: [input], requiredPaths: [input.path],
    });
    expect(() => assertExecutionContext({
      runRoot: '/tmp/run', outputPath: '/tmp/run/logs/build.txt', logDir: '/tmp/run/logs', inputPaths: [],
      stage: 'FULL_BUILD', runtime: 'cocos-3d', sandbox: 'workspace-write', agentPackage: compiled.package, taskBundle: compiled.taskBundle,
    })).toThrow(/runtime/iu);
    expect(() => assertExecutionContext({
      runRoot: '/tmp/run', outputPath: '/tmp/run/logs/build.txt', logDir: '/tmp/run/logs', inputPaths: [],
      stage: 'FULL_BUILD', runtime: 'web-lite', sandbox: 'workspace-write', agentPackage: compiled.package,
      taskBundle: { ...compiled.taskBundle, productionLine: 'idle-management' },
    })).toThrow(/references do not match/iu);
    expect(() => assertExecutionContext({
      runRoot: '/tmp/run', outputPath: '/tmp/run/logs/build.txt', logDir: '/tmp/run/logs', inputPaths: [],
      stage: 'FULL_BUILD', runtime: 'web-lite', sandbox: 'workspace-write', agentPackage: compiled.package,
      taskBundle: { ...compiled.taskBundle, inputPaths: ['../secret.txt'] },
    })).toThrow(/taskBundle\.inputPaths/iu);
    expect(() => assertExecutionContext({
      runRoot: '/tmp/run', outputPath: '/tmp/run/logs/build.txt', logDir: '/tmp/run/logs', inputPaths: [],
      stage: 'FULL_BUILD', productionLine: 'idle-management', taskKind: 'build', taskId: compiled.taskBundle.taskId,
      runtime: 'web-lite', sandbox: 'workspace-write', agentPackage: compiled.package, taskBundle: compiled.taskBundle,
    })).toThrow(/production line/iu);
    expect(() => assertExecutionContext({
      runRoot: '/tmp/run', outputPath: '/tmp/run/logs/build.txt', logDir: '/tmp/run/logs', inputPaths: [],
      stage: 'FULL_BUILD', productionLine: 'cut-stack-dodge', taskKind: 'fix', taskId: compiled.taskBundle.taskId,
      runtime: 'web-lite', sandbox: 'workspace-write', agentPackage: compiled.package, taskBundle: compiled.taskBundle,
    })).toThrow(/task kind/iu);
    expect(() => assertExecutionContext({
      runRoot: '/tmp/run', outputPath: '/tmp/run/logs/build.txt', logDir: '/tmp/run/logs', inputPaths: ['artifacts/game-blueprint.json'],
      stage: 'FULL_BUILD', productionLine: 'cut-stack-dodge', taskKind: 'build', taskId: compiled.taskBundle.taskId,
      runtime: 'web-lite', sandbox: 'workspace-write', agentPackage: compiled.package,
      taskBundle: { ...compiled.taskBundle, inputPaths: ['artifacts/other.json'] },
    })).toThrow(/input.*execution context/iu);
    expect(() => assertExecutionContext({
      runRoot: '/tmp/run', outputPath: '/tmp/run/logs/build.txt', logDir: '/tmp/run/logs', inputPaths: [],
      stage: 'FULL_BUILD', productionLine: 'cut-stack-dodge', taskKind: 'build', taskId: compiled.taskBundle.taskId,
      runtime: 'web-lite', sandbox: 'workspace-write', agentPackage: compiled.package,
      taskBundle: { ...compiled.taskBundle, acceptanceRef: { ...compiled.taskBundle.acceptanceRef, sha256: 'f'.repeat(64) } },
    })).toThrow(/references do not match/iu);
  });
});
