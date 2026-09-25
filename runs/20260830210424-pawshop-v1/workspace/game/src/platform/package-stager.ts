import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { MiniGamePlatform } from './adapters';

export type PlatformPackageManifest = {
  schemaVersion: 1;
  platform: MiniGamePlatform;
  files: string[];
  sha256: string;
  status: 'staged-web-lite-adapter';
  publishable: false;
};

const PLATFORMS: MiniGamePlatform[] = ['wechat', 'douyin', 'taptap'];

export async function stagePlatformPackages(workspaceRoot: string, files: string[]): Promise<PlatformPackageManifest[]> {
  const contents = await Promise.all(files.map(async (file) => ({ file, bytes: await readFile(path.join(workspaceRoot, file)) })));
  const hash = createHash('sha256');
  contents.forEach(({ bytes }) => hash.update(bytes));
  const sha256 = hash.digest('hex');
  return Promise.all(PLATFORMS.map(async (platform) => {
    const buildDir = path.join(workspaceRoot, 'platforms', `${platform}-minigame`, 'build');
    await mkdir(buildDir, { recursive: true });
    await Promise.all(contents.map(({ file, bytes }) => writeFile(path.join(buildDir, file), bytes)));
    const manifest: PlatformPackageManifest = { schemaVersion: 1, platform, files: files.slice(), sha256, status: 'staged-web-lite-adapter', publishable: false };
    await writeFile(path.join(buildDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return manifest;
  }));
}
