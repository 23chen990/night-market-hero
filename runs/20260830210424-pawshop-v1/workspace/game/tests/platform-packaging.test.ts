import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stagePlatformPackages } from '../src/platform/package-stager';

describe('isolated platform package staging', () => {
  it('stages three adapter packages with deterministic hashes and explicit non-publish status', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'pawshop-platform-'));
    await writeFile(path.join(root, 'index.html'), '<canvas></canvas>');
    await writeFile(path.join(root, 'main.js'), 'console.log("web-lite");');
    const manifests = await stagePlatformPackages(root, ['index.html', 'main.js']);
    expect(manifests).toHaveLength(3);
    for (const manifest of manifests) {
      expect(manifest.status).toBe('staged-web-lite-adapter');
      expect(manifest.platform).toMatch(/^(wechat|douyin|taptap)$/);
      expect(manifest.files).toEqual(['index.html', 'main.js']);
      expect(manifest.sha256).toMatch(/^[a-f0-9]{64}$/);
      const saved = JSON.parse(await readFile(path.join(root, 'platforms', `${manifest.platform}-minigame`, 'build', 'manifest.json'), 'utf8'));
      expect(saved.sha256).toBe(manifest.sha256);
    }
  });
});
