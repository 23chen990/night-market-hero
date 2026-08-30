import { appendFile, copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { exists, readJson, writeJsonAtomic } from './files.js';
import { RunStateSchema, SeedSchema, type RunState, type Seed, type StageName, type StageRecord } from '../schemas/index.js';

export class FileRunStore {
  constructor(readonly root: string) {}
  runsRoot() { return path.join(this.root, 'runs'); }
  runRoot(runId: string) { return path.join(this.runsRoot(), runId); }
  artifact(runId: string, name: string) { return path.join(this.runRoot(runId), 'artifacts', name); }
  async readSeedFile(file: string): Promise<Seed> { return SeedSchema.parse(parse(await readFile(file, 'utf8'))); }
  async create(runId: string, seedFile: string, mode: 'mock' | 'real') {
    const root = this.runRoot(runId);
    for (const name of ['input', 'artifacts', 'art-review/previews', 'human', 'workspace/game', 'logs', 'screenshots', 'release-candidate']) await mkdir(path.join(root, name), { recursive: true });
    await copyFile(seedFile, path.join(root, 'input/seed.yaml'));
    const now = new Date().toISOString();
    const state: RunState = { schemaVersion: 1, runId, stage: 'CREATED', status: 'pending', createdAt: now, updatedAt: now, fixAttempts: 0, providerMode: mode, stages: {} };
    await this.save(state); await this.log(runId, 'run.created', { seedFile }); return state;
  }
  async load(runId: string) { return RunStateSchema.parse(await readJson(path.join(this.runRoot(runId), 'state.json'))); }
  async save(state: RunState) { state.updatedAt = new Date().toISOString(); await writeJsonAtomic(path.join(this.runRoot(state.runId), 'state.json'), RunStateSchema.parse(state)); }
  async log(runId: string, event: string, data: unknown) { await appendFile(path.join(this.runRoot(runId), 'logs/factory.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), event, data })}\n`); }
  async hasArtifact(runId: string, name: string) { return exists(this.artifact(runId, name)); }
  async writeArtifact(runId: string, name: string, value: unknown) { await writeJsonAtomic(this.artifact(runId, name), value); }
  async readArtifact(runId: string, name: string) { return readJson(this.artifact(runId, name)); }
  record(stage: StageName, previous?: StageRecord): StageRecord { return { stage, status: 'running', startedAt: new Date().toISOString(), finishedAt: null, attempts: (previous?.attempts ?? 0) + 1, inputArtifacts: [], outputArtifacts: [], errors: previous?.errors ?? [], evidence: [] }; }
}
