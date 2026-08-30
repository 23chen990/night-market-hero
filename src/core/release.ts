import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import type { GameBlueprint, ReleaseManifest } from '../schemas/index.js';
import { clearDir, copyTree, ensureDir, listFiles, sha256File, writeJsonAtomic } from './files.js';

export async function packageRelease(runRoot: string, blueprint: GameBlueprint): Promise<ReleaseManifest> {
  const release = path.join(runRoot, 'release-candidate'); await clearDir(release);
  await copyTree(path.join(runRoot, 'workspace/game/dist'), path.join(release, 'web'));
  await ensureDir(path.join(release, 'reports'));
  for (const name of ['build-report.json', 'qa-report.json']) await copyFile(path.join(runRoot, 'artifacts', name), path.join(release, 'reports', name));
  const promo = path.join(runRoot, 'workspace/game/public/assets/promo.svg'); await ensureDir(path.join(release, 'marketing')); await copyFile(promo, path.join(release, 'marketing/promo.svg'));
  const beforeManifest = await listFiles(release); const files = await Promise.all(beforeManifest.map(async (file) => ({ path: file, sha256: await sha256File(path.join(release, file)) })));
  const manifest: ReleaseManifest = { schemaVersion: 1, name: blueprint.title, description: `${blueprint.theme}主题的原创轻量经营小游戏。`, entrypoint: 'web/index.html', iconAndPromoAssets: ['marketing/promo.svg'], reports: ['reports/build-report.json', 'reports/qa-report.json'], files, createdAt: new Date().toISOString() };
  await writeJsonAtomic(path.join(release, 'release-manifest.json'), manifest); return manifest;
}
