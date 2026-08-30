import type { ArtDirections, AssetManifest, GameBlueprint, QaReport, Seed, StyleLock } from '../schemas/index.js';
import type { RuntimeAdapter } from '../adapters/runtime.js';

export interface AgentProvider { generateBlueprint(seed: Seed): Promise<unknown>; generateArtDirections(blueprint: GameBlueprint): Promise<unknown>; generateStyleLock(blueprint: GameBlueprint, directions: ArtDirections, approval: unknown): Promise<unknown>; }
export interface CodexProvider { build(input: { workspace: string; blueprint: GameBlueprint; styleLock: StyleLock; assets: AssetManifest; template: string }): Promise<{ threadId?: string }>; fix(input: { workspace: string; threadId?: string; qaReport: QaReport }): Promise<{ threadId?: string; summary: string }>; }
export interface ImageProvider { produce(input: { outputDir: string; blueprint: GameBlueprint; styleLock: StyleLock }): Promise<unknown>; }
export interface RuntimeProvider { runtime(name: 'web-lite'): RuntimeAdapter; }
export interface QAProvider { playtest(input: { runtime: RuntimeAdapter; workspace: string; runRoot: string }): Promise<unknown>; }
