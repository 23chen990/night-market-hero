import type { AssetManifest, GameBlueprint, StyleLock } from '../schemas/index.js';

export interface RuntimeAdapter {
  createProject(workspace: string, template: string): Promise<void>;
  applyBlueprint(workspace: string, blueprint: GameBlueprint, styleLock: StyleLock): Promise<void>;
  importAssets(workspace: string, manifest: AssetManifest, sourceDir: string): Promise<void>;
  startPreview(workspace: string): Promise<{ url: string; stop: () => Promise<void> }>;
  buildWeb(workspace: string): Promise<string>;
  buildTarget(workspace: string, target: string): Promise<string>;
  stopPreview(): Promise<void>;
}
