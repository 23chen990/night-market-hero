import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { WebLiteRuntimeAdapter } from '../../src/adapters/web-lite.js';
import type { AssetManifest, GameBlueprint, StyleLock } from '../../src/schemas/index.js';

const blueprint: GameBlueprint = { schemaVersion: 1, gameId: 'real-assets', title: 'Real Assets', theme: 'night market', runtime: 'web-lite', template: 'idle-shop-v1', designMode: 'prototype_tournament', targetPlatforms: ['wechat-minigame', 'douyin-minigame', 'taptap-minigame'], concept: 'test', coreLoop: ['arrive', 'produce', 'deliver', 'reward'], content: { productName: 'dango', customerName: 'spirit', currencyName: 'lamp' }, balance: { startingCurrency: 0, orderReward: 1, baseUpgradeCost: 2 }, preferences: {} };
const direction = { id: 'direction_c' as const, name: 'Woodcut', summary: 'bold woodcut', visualKeywords: ['woodcut'], palette: ['#111827', '#E8DEC8'], characterStyle: 'angular', environmentStyle: 'diagonal', uiStyle: 'notched', iconConcept: 'carved', forbiddenElements: ['logos'], productionComplexity: 'low' as const, previewPrompt: 'original woodcut market' };
const styleLock: StyleLock = { schemaVersion: 1, directionId: direction.id, direction, kept: [], changes: [], notes: [], lockedAt: new Date().toISOString() };

describe('WebLiteRuntimeAdapter real assets', () => {
  it('keeps the idle mother template naturally repeatable after a settlement', async () => {
    const source = await readFile(path.join(process.cwd(), 'templates/web-lite/idle-shop-v1/src/main.ts'), 'utf8');
    expect(source).toMatch(/scheduleNextCustomer/);
    expect(source).toMatch(/setTimeout/);
  });

  it('writes the manifest PNG paths into generated game config', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'web-lite-real-assets-'));
    const workspace = path.join(root, 'game'); const sourceDir = path.join(root, 'source');
    const adapter = new WebLiteRuntimeAdapter(process.cwd());
    await adapter.createProject(workspace, 'idle-shop-v1');
    await adapter.applyBlueprint(workspace, blueprint, styleLock);
    await mkdir(sourceDir, { recursive: true });
    const definitions = [['customer', 'character'], ['product', 'product'], ['background', 'background'], ['upgrade', 'ui'], ['promo', 'marketing']] as const;
    await Promise.all(definitions.map(([id]) => writeFile(path.join(sourceDir, `${id}.png`), Buffer.from(`png-${id}`))));
    const manifest: AssetManifest = { schemaVersion: 1, provider: 'codex-imagegen', assets: definitions.map(([id, kind]) => ({ id, kind, path: `assets/${id}.png`, prompt: id, status: 'generated' as const, sha256: 'hash' })) };

    await adapter.importAssets(workspace, manifest, sourceDir);

    const config = JSON.parse(await readFile(path.join(workspace, 'src/generated/game-config.json'), 'utf8')) as { assets: Record<string, string> };
    expect(config.assets).toMatchObject({ customer: './assets/customer.png', product: './assets/product.png', background: './assets/background.png', upgrade: './assets/upgrade.png', promo: './assets/promo.png' });
    await expect(readFile(path.join(workspace, 'public/assets/customer.png'), 'utf8')).resolves.toBe('png-customer');
  });

  it('verifies the generated-game contract without requiring Codex-only scripts in Mock mode', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'web-lite-contract-'));
    const workspace = path.join(root, 'game');
    const adapter = new WebLiteRuntimeAdapter(process.cwd());
    await adapter.createProject(workspace, 'idle-shop-v1');

    await expect(adapter.verifyProject(workspace, { requireScripts: false })).resolves.toEqual(expect.arrayContaining([
      'contract:test-api-7',
      'save:versioned',
    ]));
  });

  it('supports full Builder verification on the idle production template', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'web-lite-full-verification-'));
    const workspace = path.join(root, 'game');
    const adapter = new WebLiteRuntimeAdapter(process.cwd());
    await adapter.createProject(workspace, 'idle-shop-v1');

    await expect(adapter.verifyProject(workspace, { requireScripts: true })).resolves.toEqual([
      'contract:test-api-7',
      'save:versioned',
      'test:passed',
      'typecheck:passed',
    ]);
  });

  it('accepts a versioned save implemented in a module imported by main', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'web-lite-modular-save-'));
    const workspace = path.join(root, 'game');
    const adapter = new WebLiteRuntimeAdapter(process.cwd());
    await adapter.createProject(workspace, 'idle-shop-v1');
    const mainFile = path.join(workspace, 'src/main.ts');
    const main = await readFile(mainFile, 'utf8');
    await writeFile(mainFile, main.replace("type State = { version: 1;", "import { CURRENT_SAVE_VERSION } from './game-state.ts';\ntype State = { version: number;").replace('version: 1,', 'version: CURRENT_SAVE_VERSION,'));
    await writeFile(path.join(workspace, 'src/game-state.ts'), 'export const CURRENT_SAVE_VERSION = 2;\n');

    await expect(adapter.verifyProject(workspace, { requireScripts: false })).resolves.toContain('save:versioned');
  });

  it('packages the production entrypoint for direct Finder and Safari opening', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'web-lite-finder-build-'));
    const workspace = path.join(root, 'game');
    const sourceDir = path.join(root, 'source');
    const adapter = new WebLiteRuntimeAdapter(process.cwd());
    await adapter.createProject(workspace, 'idle-shop-v1');
    await adapter.applyBlueprint(workspace, blueprint, styleLock);
    await mkdir(sourceDir, { recursive: true });
    const definitions = [['customer', 'character'], ['product', 'product'], ['background', 'background'], ['upgrade', 'ui'], ['promo', 'marketing']] as const;
    await Promise.all(definitions.map(([id]) => writeFile(path.join(sourceDir, `${id}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="red"/></svg>`)));
    const manifest: AssetManifest = { schemaVersion: 1, provider: 'test', assets: definitions.map(([id, kind]) => ({ id, kind, path: `assets/${id}.svg`, prompt: id, status: 'generated' as const, sha256: 'hash' })) };
    await adapter.importAssets(workspace, manifest, sourceDir);

    await adapter.buildWeb(workspace);

    const html = await readFile(path.join(workspace, 'dist/index.html'), 'utf8');
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).not.toMatch(/<script[^>]+type="module"/);
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"/);
    expect(html).toContain('data:image/svg+xml;base64,');
    expect(html.indexOf('<script>')).toBeGreaterThan(html.indexOf('</main>'));
  });
});
