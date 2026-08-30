import { spawn } from 'node:child_process';
import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RuntimeAdapter } from './runtime.js';
import type { AssetManifest, GameBlueprint, StyleLock } from '../schemas/index.js';
import { clearDir, copyTree, exists } from '../core/files.js';

function command(bin: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => { const child = spawn(bin, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }); let output = ''; child.stdout.on('data', (d) => output += d); child.stderr.on('data', (d) => output += d); child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${bin} failed (${code}): ${output}`))); });
}
export class WebLiteRuntimeAdapter implements RuntimeAdapter {
  private preview?: { stop: () => Promise<void> };
  constructor(private readonly repositoryRoot: string) {}
  async createProject(workspace: string, template: string) {
    if (template !== 'idle-shop-v1') throw new Error(`Unsupported web-lite template: ${template}`);
    await clearDir(workspace); await copyTree(path.join(this.repositoryRoot, 'templates/web-lite/idle-shop-v1'), workspace);
    // Generated projects reuse the factory's pinned dependency store; the release build is self-contained.
    await symlink(path.join(this.repositoryRoot, 'node_modules'), path.join(workspace, 'node_modules'), 'dir');
  }
  async applyBlueprint(workspace: string, blueprint: GameBlueprint, styleLock: StyleLock) {
    await mkdir(path.join(workspace, 'src/generated'), { recursive: true });
    await writeFile(path.join(workspace, 'src/generated/game-config.json'), JSON.stringify({ title: blueprint.title, theme: blueprint.theme, content: blueprint.content, balance: blueprint.balance, palette: styleLock.direction.palette, uiStyle: styleLock.direction.uiStyle, assets: { customer: './assets/customer.svg', product: './assets/product.svg', background: './assets/background.svg', upgrade: './assets/upgrade.svg' } }, null, 2));
  }
  async importAssets(workspace: string, manifest: AssetManifest, sourceDir: string) {
    const publicAssets = path.join(workspace, 'public/assets'); await mkdir(publicAssets, { recursive: true });
    for (const asset of manifest.assets) await writeFile(path.join(publicAssets, path.basename(asset.path)), await readFile(path.join(sourceDir, path.basename(asset.path))));
  }
  async buildWeb(workspace: string) {
    await command(path.join(this.repositoryRoot, 'node_modules/.bin/vite'), ['build'], workspace);
    const output = path.join(workspace, 'dist'); if (!await exists(path.join(output, 'index.html'))) throw new Error('Vite did not produce dist/index.html'); return output;
  }
  async buildTarget(workspace: string, target: string) { if (target !== 'web') throw new Error(`web-lite does not support target ${target}`); return this.buildWeb(workspace); }
  async startPreview(workspace: string) {
    const child = spawn(path.join(this.repositoryRoot, 'node_modules/.bin/vite'), ['preview', '--host', '127.0.0.1', '--port', '0'], { cwd: workspace, stdio: ['ignore', 'pipe', 'pipe'] });
    const url = await new Promise<string>((resolve, reject) => { let output = ''; const onData = (data: Buffer) => { output += data.toString(); const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)\//); if (match) resolve(match[0]); }; child.stdout.on('data', onData); child.stderr.on('data', onData); child.on('exit', (code) => reject(new Error(`preview exited early (${code}): ${output}`))); setTimeout(() => reject(new Error('preview start timeout')), 15_000); });
    const stop = async () => { if (!child.killed) child.kill('SIGTERM'); }; this.preview = { stop }; return { url, stop };
  }
  async stopPreview() { await this.preview?.stop(); this.preview = undefined; }
}
