import { Agent, run } from '@openai/agents';
import { Codex } from '@openai/codex-sdk';
import OpenAI from 'openai';
import type { AgentProvider, CodexProvider, ImageProvider } from './interfaces.js';
import type { ArtDirections, GameBlueprint, QaReport, Seed, StyleLock, AssetManifest } from '../schemas/index.js';

function requireKey() { if (!process.env.OPENAI_API_KEY) throw new Error('Real provider mode requires OPENAI_API_KEY'); }
async function jsonAgent(name: string, instructions: string, input: unknown) {
  requireKey(); const agent = new Agent({ name, instructions: `${instructions}\nReturn only valid JSON.` });
  const result = await run(agent, JSON.stringify(input)); return JSON.parse(String(result.finalOutput));
}
export class OpenAIAgentProvider implements AgentProvider {
  generateBlueprint(seed: Seed) { return jsonAgent('ProducerAgent', 'Create a compact original web-lite idle shop blueprint.', seed); }
  generateArtDirections(blueprint: GameBlueprint) { return jsonAgent('ArtDirectorAgent', 'Create exactly four distinct feasible original art directions.', blueprint); }
  generateStyleLock(blueprint: GameBlueprint, directions: ArtDirections, approval: unknown) { return jsonAgent('StyleLockAgent', 'Apply only the human approval and lock a production style.', { blueprint, directions, approval }); }
}
export class OpenAIImageProvider implements ImageProvider {
  async produce() { requireKey(); void new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); throw new Error('Real image production is configured but not enabled in MVP; use mock mode'); }
}
export class OpenAICodexProvider implements CodexProvider {
  private readonly codex = new Codex();
  async build(input: { workspace: string; blueprint: GameBlueprint; styleLock: StyleLock; assets: AssetManifest; template: string }) {
    requireKey(); const thread = this.codex.startThread({ workingDirectory: input.workspace, skipGitRepoCheck: true });
    await thread.run(`Modify only this generated game workspace. Implement the supplied validated blueprint/style/assets without broad rewrites. Inputs:\n${JSON.stringify(input)}`);
    return { threadId: thread.id ?? undefined };
  }
  async fix(input: { workspace: string; threadId?: string; qaReport: QaReport }) {
    requireKey(); const thread = input.threadId ? this.codex.resumeThread(input.threadId) : this.codex.startThread({ workingDirectory: input.workspace, skipGitRepoCheck: true });
    await thread.run(`Fix only the explicitly reported QA issues. Do not rewrite unrelated game code. QA:\n${JSON.stringify(input.qaReport)}`);
    return { threadId: thread.id ?? undefined, summary: 'Codex continued the builder thread and addressed the reported issues.' };
  }
}
