import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RuntimeAdapter } from './runtime.js';
import type { AssetManifest, GameBlueprint, StyleLock } from '../schemas/index.js';
import { clearDir, copyTree, exists, listFiles } from '../core/files.js';

function command(bin: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => { const child = spawn(bin, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }); let output = ''; child.stdout.on('data', (d) => output += d); child.stderr.on('data', (d) => output += d); child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${bin} failed (${code}): ${output}`))); });
}

const playableMimeTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function packageFinderPlayable(output: string): Promise<void> {
  const indexFile = path.join(output, 'index.html');
  let html = await readFile(indexFile, 'utf8');
  const scriptMatch = html.match(/<script[^>]*src="([^"]+)"[^>]*><\/script>/);
  const styleMatch = html.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
  if (!scriptMatch?.[1] || !styleMatch?.[1]) throw new Error('Production build must contain one script and stylesheet entrypoint');
  const resolveOutputReference = (reference: string) => path.join(output, reference.replace(/^(?:\.\/|\/)/, ''));
  let script = await readFile(resolveOutputReference(scriptMatch[1]), 'utf8');
  let style = await readFile(resolveOutputReference(styleMatch[1]), 'utf8');
  for (const file of await listFiles(output)) {
    const mime = playableMimeTypes[path.extname(file).toLowerCase()];
    if (!mime) continue;
    const data = await readFile(path.join(output, file));
    const dataUrl = `data:${mime};base64,${data.toString('base64')}`;
    for (const reference of [`./${file}`, `/${file}`, file]) {
      script = script.replaceAll(reference, dataUrl);
      style = style.replaceAll(reference, dataUrl);
    }
  }
  script = script.replaceAll('</script', '<\\/script');
  style = style.replaceAll('</style', '<\\/style');
  html = html.replace(scriptMatch[0], '').replace(styleMatch[0], `<style>${style}</style>`);
  html = html.replace('</body>', `<script>${script}</script></body>`);
  await writeFile(indexFile, html);
}

export class WebLiteRuntimeAdapter implements RuntimeAdapter {
  private preview?: { stop: () => Promise<void> };
  constructor(private readonly repositoryRoot: string) {}
  async createProject(workspace: string, template: string) {
    const templateDirectories: Record<string, string> = {
      'idle-shop-v1': 'idle-shop-v1',
      'spatial-shop-v1': 'spatial-shop-v1',
    };
    const templateDirectory = templateDirectories[template];
    if (!templateDirectory) throw new Error(`Unsupported web-lite template: ${template}`);
    await clearDir(workspace); await copyTree(path.join(this.repositoryRoot, 'templates/web-lite', templateDirectory), workspace);
    await rm(path.join(workspace, 'node_modules'), { recursive: true, force: true });
    await rm(path.join(workspace, 'dist'), { recursive: true, force: true });
    // Generated projects reuse the factory's pinned dependency store; the release build is self-contained.
    await symlink(path.join(this.repositoryRoot, 'node_modules'), path.join(workspace, 'node_modules'), 'dir');
  }
  async applyBlueprint(workspace: string, blueprint: GameBlueprint, styleLock: StyleLock) {
    await mkdir(path.join(workspace, 'src/generated'), { recursive: true });
    await writeFile(path.join(workspace, 'src/generated/game-config.json'), `${JSON.stringify({ title: blueprint.title, theme: blueprint.theme, content: blueprint.content, balance: blueprint.balance, palette: styleLock.direction.palette, uiStyle: styleLock.direction.uiStyle, assets: { customer: './assets/customer.svg', product: './assets/product.svg', background: './assets/background.svg', upgrade: './assets/upgrade.svg' }, ...(blueprint.spatialShop ? { spatialShop: blueprint.spatialShop } : {}) }, null, 2)}\n`);
  }
  async importAssets(workspace: string, manifest: AssetManifest, sourceDir: string) {
    const publicAssets = path.join(workspace, 'public/assets'); await mkdir(publicAssets, { recursive: true });
    for (const asset of manifest.assets) await writeFile(path.join(publicAssets, path.basename(asset.path)), await readFile(path.join(sourceDir, path.basename(asset.path))));
    const configFile = path.join(workspace, 'src/generated/game-config.json');
    const config = JSON.parse(await readFile(configFile, 'utf8')) as Record<string, unknown>;
    config.assets = Object.fromEntries(manifest.assets.map((asset) => [asset.id, `./assets/${path.basename(asset.path)}`]));
    await writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`);
  }
  async verifyProject(workspace: string, options: { requireScripts: boolean }) {
    const sourceRoot = path.join(workspace, 'src');
    const sourceFiles = (await listFiles(sourceRoot)).filter((file) => file.endsWith('.ts'));
    const sources = await Promise.all(sourceFiles.map((file) => readFile(path.join(sourceRoot, file), 'utf8')));
    const source = sources.join('\n');
    const testApi = ['resetGame', 'getState', 'spawnCustomer', 'completeOrder', 'grantCurrency', 'upgradeStation', 'setRandomSeed'];
    const missingApi = testApi.filter((name) => !source.includes(name));
    if (missingApi.length > 0) throw new Error(`Builder test API is missing: ${missingApi.join(', ')}`);
    if (!source.includes('localStorage') || !/(?:CURRENT_SAVE_VERSION\s*=\s*\d+|version\s*:\s*\d+|save-v\d+)/.test(source)) throw new Error('Builder must implement a versioned local save');
    const checks = ['contract:test-api-7', 'save:versioned'];
    if (!options.requireScripts) return checks;

    const packageJson = JSON.parse(await readFile(path.join(workspace, 'package.json'), 'utf8')) as { scripts?: Record<string, string> };
    const missingScripts = ['test', 'typecheck'].filter((name) => !packageJson.scripts?.[name]);
    if (missingScripts.length > 0) throw new Error(`Builder verification requires package scripts: test, typecheck; missing ${missingScripts.join(', ')}`);
    await command('pnpm', ['test'], workspace);
    checks.push('test:passed');
    await command('pnpm', ['typecheck'], workspace);
    checks.push('typecheck:passed');
    return checks;
  }
  async verifyFormalProject(workspace: string) {
    const packageJson = JSON.parse(await readFile(path.join(workspace, 'package.json'), 'utf8')) as { scripts?: Record<string, string> };
    const missingScripts = ['lint', 'typecheck', 'test', 'build'].filter((name) => !packageJson.scripts?.[name]);
    if (missingScripts.length > 0) throw new Error(`Formal prototype verification requires package scripts: lint, typecheck, test, build; missing ${missingScripts.join(', ')}`);
    const sourceRoot = path.join(workspace, 'src');
    const sourceFiles = (await listFiles(sourceRoot)).filter((file) => file.endsWith('.ts'));
    const source = (await Promise.all(sourceFiles.map((file) => readFile(path.join(sourceRoot, file), 'utf8')))).join('\n');
    const requiredMarkers = ['__FORMAL_TEST__', 'contractVersion', 'safe-tutorial', 'first-pursuit', 'route-alternation', 'gate-climax'];
    const missingMarkers = requiredMarkers.filter((marker) => !source.includes(marker));
    if (missingMarkers.length > 0) throw new Error(`Formal prototype test contract is missing: ${missingMarkers.join(', ')}`);
    await command('pnpm', ['lint'], workspace);
    await command('pnpm', ['typecheck'], workspace);
    await command('pnpm', ['test'], workspace);
    return ['lint:passed', 'typecheck:passed', 'test:passed', 'formal-test-contract:v1'];
  }
  async buildWeb(workspace: string) {
    await command(path.join(this.repositoryRoot, 'node_modules/.bin/vite'), ['build'], workspace);
    const output = path.join(workspace, 'dist');
    if (!await exists(path.join(output, 'index.html'))) throw new Error('Vite did not produce dist/index.html');
    await packageFinderPlayable(output);
    return output;
  }
  async buildTarget(workspace: string, target: string) { if (target !== 'web') throw new Error(`web-lite does not support target ${target}`); return this.buildWeb(workspace); }
  async startPreview(workspace: string) {
    const child = spawn(path.join(this.repositoryRoot, 'node_modules/.bin/vite'), ['preview', '--host', '127.0.0.1', '--port', '0'], { cwd: workspace, stdio: ['ignore', 'pipe', 'pipe'] });
    const url = await new Promise<string>((resolve, reject) => { let output = ''; const onData = (data: Buffer) => { output += data.toString(); const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)\//); if (match) resolve(match[0]); }; child.stdout.on('data', onData); child.stderr.on('data', onData); child.on('exit', (code) => reject(new Error(`preview exited early (${code}): ${output}`))); setTimeout(() => reject(new Error('preview start timeout')), 15_000); });
    const stop = async () => { if (!child.killed) child.kill('SIGTERM'); }; this.preview = { stop }; return { url, stop };
  }
  async stopPreview() { await this.preview?.stop(); this.preview = undefined; }
}
