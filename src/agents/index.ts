import type { RuntimeAdapter } from '../adapters/runtime.js';
import { listFiles } from '../core/files.js';
import { packageRelease } from '../core/release.js';
import type { AgentProvider, CodexProvider, ImageProvider, QAProvider } from '../providers/interfaces.js';
import { ArtApprovalSchema, ArtDirectionsSchema, AssetManifestSchema, BuildReportSchema, GameBlueprintSchema, QaReportSchema, ReleaseManifestSchema, StyleLockSchema, type ArtApproval, type ArtDirections, type AssetManifest, type GameBlueprint, type QaReport, type Seed, type StyleLock } from '../schemas/index.js';

/** Non-builder roles return validated artifacts and never receive a game workspace. */
export class ProducerAgent {
  constructor(private readonly provider: AgentProvider) {}
  async run(seed: Seed) { return GameBlueprintSchema.parse(await this.provider.generateBlueprint(seed)); }
}
export class ArtDirectorAgent {
  constructor(private readonly provider: AgentProvider) {}
  async run(blueprint: GameBlueprint) { return ArtDirectionsSchema.parse(await this.provider.generateArtDirections(blueprint)); }
}
export class StyleLockAgent {
  constructor(private readonly provider: AgentProvider) {}
  async run(blueprint: GameBlueprint, directions: ArtDirections, approval: ArtApproval) { return StyleLockSchema.parse(await this.provider.generateStyleLock(blueprint, directions, ArtApprovalSchema.parse(approval))); }
}
export class AssetProducerAgent {
  constructor(private readonly provider: ImageProvider) {}
  async run(outputDir: string, blueprint: GameBlueprint, styleLock: StyleLock) { return AssetManifestSchema.parse(await this.provider.produce({ outputDir, blueprint, styleLock })); }
}

/** Builder and Fixer are the only roles whose provider is authorized to edit the game workspace. */
export class BuilderAgent {
  constructor(private readonly provider: CodexProvider, private readonly runtime: RuntimeAdapter) {}
  async run(workspace: string, blueprint: GameBlueprint, styleLock: StyleLock, assets: AssetManifest, template: string, assetSource: string) {
    await this.runtime.createProject(workspace, template);
    await this.runtime.applyBlueprint(workspace, blueprint, styleLock);
    await this.runtime.importAssets(workspace, assets, assetSource);
    const codexResult = await this.provider.build({ workspace, blueprint, styleLock, assets, template });
    const webBuild = await this.runtime.buildWeb(workspace);
    const report = BuildReportSchema.parse({ schemaVersion: 1, success: true, runtime: 'web-lite', template, codexThreadId: codexResult.threadId, workspace: 'workspace/game', webBuild: 'workspace/game/dist', files: await listFiles(webBuild), builtAt: new Date().toISOString() });
    return { report, threadId: codexResult.threadId };
  }
}
export class QAAgent {
  constructor(private readonly provider: QAProvider, private readonly runtime: RuntimeAdapter) {}
  async run(workspace: string, runRoot: string): Promise<QaReport> {
    return QaReportSchema.parse(await this.provider.playtest({ runtime: this.runtime, workspace, runRoot }));
  }
}
export class FixerAgent {
  constructor(private readonly provider: CodexProvider, private readonly runtime: RuntimeAdapter) {}
  async run(workspace: string, threadId: string | undefined, qaReport: QaReport) {
    const result = await this.provider.fix({ workspace, threadId, qaReport: QaReportSchema.parse(qaReport) });
    await this.runtime.buildWeb(workspace);
    return result;
  }
}
export class ReleaseAgent {
  async run(runRoot: string, blueprint: GameBlueprint) { return ReleaseManifestSchema.parse(await packageRelease(runRoot, blueprint)); }
}
