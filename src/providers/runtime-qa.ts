import type { RuntimeAdapter } from '../adapters/runtime.js';
import { WebLiteRuntimeAdapter } from '../adapters/web-lite.js';
import { runPlaywrightQa } from '../qa/playwright-qa.js';
import type { QAProvider, RuntimeProvider } from './interfaces.js';

export class LocalRuntimeProvider implements RuntimeProvider {
  constructor(private readonly repositoryRoot: string) {}
  runtime(name: 'web-lite'): RuntimeAdapter { void name; return new WebLiteRuntimeAdapter(this.repositoryRoot); }
}
export class PlaywrightQAProvider implements QAProvider {
  playtest({ runtime, workspace, runRoot }: { runtime: RuntimeAdapter; workspace: string; runRoot: string }) { return runPlaywrightQa(runtime, workspace, runRoot); }
}
export class MockQAProvider implements QAProvider {
  async playtest() { return { schemaVersion: 1, passed: true, checks: [{ name: 'stub-contract', passed: true, evidence: 'QA stub selected by integration test' }], issues: [], screenshots: [], consoleLog: 'logs/console.log', testedAt: new Date().toISOString() }; }
}
