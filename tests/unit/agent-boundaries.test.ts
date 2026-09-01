import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, it } from 'vitest';
import { builderVerificationPassed, FixerAgent } from '../../src/agents/index.js';
import type { CodexProvider } from '../../src/providers/interfaces.js';
import type { RuntimeAdapter } from '../../src/adapters/runtime.js';

it('keeps generated game workspace mutations inside BuilderAgent and FixerAgent', async () => {
  const orchestrator = await readFile(path.join(process.cwd(), 'src/factory.ts'), 'utf8');
  expect(orchestrator).not.toMatch(/runtime\.(createProject|applyBlueprint|importAssets|buildWeb|buildTarget)\(/);

  const roles = await readFile(path.join(process.cwd(), 'src/agents/index.ts'), 'utf8');
  expect(roles).toMatch(/class BuilderAgent[\s\S]*createProject[\s\S]*buildWeb/);
  expect(roles).toMatch(/class FixerAgent[\s\S]*buildWeb/);
});

it('does not label a Builder report successful when a verification check is explicitly failed', () => {
  expect(builderVerificationPassed(['contract:test-api-7', 'typecheck:passed'])).toBe(true);
  expect(builderVerificationPassed(['contract:test-api-7', 'typecheck:failed'])).toBe(false);
});

it('always runs the full regression verification after a fixer turn', async () => {
  let requireScripts: boolean | undefined;
  const provider: CodexProvider = {
    build: async () => ({ verificationMode: 'contract' as const, metrics: { provider: 'test', model: 'test', calls: 1 } }),
    fix: async () => ({ verificationMode: 'contract' as const, summary: 'fixed', metrics: { provider: 'test', model: 'test', calls: 1 } }),
  };
  const runtime = {
    verifyProject: async (_workspace: string, options: { requireScripts: boolean }) => { requireScripts = options.requireScripts; return ['contract:test-api-7', 'test:passed', 'typecheck:passed']; },
    buildWeb: async () => '/tmp/fixer-dist',
  } as unknown as RuntimeAdapter;
  const result = await new FixerAgent(provider, runtime).run('/tmp/game-workspace', undefined, {
    schemaVersion: 1,
    passed: false,
    checks: [],
    issues: [{ id: 'qa-1', severity: 'error', message: 'broken', evidence: 'screenshot' }],
    screenshots: [],
    consoleLog: 'logs/console.log',
    testedAt: new Date(0).toISOString(),
  });
  expect(requireScripts).toBe(true);
  expect(result.verification).toEqual(['contract:test-api-7', 'test:passed', 'typecheck:passed']);
});
