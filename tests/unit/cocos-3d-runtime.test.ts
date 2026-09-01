import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Cocos3dRuntimeAdapter, type RuntimeCommandRunner } from '../../src/adapters/cocos-3d.js';
import { LocalRuntimeProvider } from '../../src/providers/runtime-qa.js';
import type { GameBlueprint, StyleLock } from '../../src/schemas/index.js';
import { Hybrid3dAssetResearchArtifactSchema } from '../../src/schemas/hybrid-3d-assets.js';
import { beachSpatialShop } from '../fixtures/spatial-shop.js';

const blueprint: GameBlueprint = {
  schemaVersion: 1,
  gameId: 'toy-factory-direct-store-3d',
  title: '玩具工厂直营店 3D',
  theme: '玩具工厂',
  runtime: 'cocos-3d',
  template: 'spatial-shop-3d-v1',
  designMode: 'prototype_tournament',
  spatialShop: beachSpatialShop,
  targetPlatforms: ['wechat-minigame', 'douyin-minigame', 'taptap-minigame'],
  concept: 'A hybrid 3D toy factory shop.',
  coreLoop: ['collect', 'stock', 'checkout', 'expand'],
  content: { productName: 'toy', customerName: 'shopper', currencyName: 'gear' },
  balance: { startingCurrency: 0, orderReward: 3, baseUpgradeCost: 12 },
  preferences: { visual_pipeline: 'hybrid-3d' },
};

const styleLock: StyleLock = {
  schemaVersion: 1,
  directionId: 'direction_a',
  direction: {
    id: 'direction_a',
    name: 'Chunky toy factory',
    summary: 'True 3D volumes with transparent rendered detail.',
    visualKeywords: ['chunky', 'playful'],
    palette: ['#EF6A62', '#1FA7A2', '#F5B947', '#FFF3D6'],
    characterStyle: 'Miniature low-poly people.',
    environmentStyle: 'Bright modular toy workshop.',
    uiStyle: 'Rounded and high contrast.',
    iconConcept: 'Interlocking gears.',
    forbiddenElements: ['copied brands'],
    productionComplexity: 'low',
    previewPrompt: 'Original chunky hybrid 3D toy factory.',
  },
  kept: ['fixed three-quarter camera'],
  changes: [],
  notes: [],
  lockedAt: '2026-08-31T00:00:00.000+08:00',
};

describe('Cocos3dRuntimeAdapter', () => {
  it('is selectable from the shared local runtime provider', () => {
    expect(new LocalRuntimeProvider(process.cwd()).runtime('cocos-3d')).toBeInstanceOf(Cocos3dRuntimeAdapter);
  });

  it('creates an isolated Cocos project and writes validated generated config', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'cocos-runtime-'));
    const workspace = path.join(root, 'game');
    const adapter = new Cocos3dRuntimeAdapter(process.cwd(), { commandRunner: async () => ({ code: 36, output: 'success' }) });

    await adapter.createProject(workspace, 'spatial-shop-3d-v1');
    await adapter.applyBlueprint(workspace, blueprint, styleLock);

    const config = JSON.parse(await readFile(path.join(workspace, 'assets/resources/generated/game-config.json'), 'utf8'));
    expect(config).toMatchObject({ runtime: 'cocos-3d', template: 'spatial-shop-3d-v1', spatialShop: beachSpatialShop });
    expect(await readFile(path.join(workspace, 'assets/scenes/main.scene'), 'utf8')).toContain('"__type__": "7e55cESrsFKH4tTDHbbtj9j"');
    expect(await adapter.verifyProject(workspace, { requireScripts: false })).toContain('cocos-project:3.8');
  });

  it('imports only manifest-listed generated assets', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'cocos-assets-'));
    const workspace = path.join(root, 'game');
    const sourceDir = path.join(root, 'source');
    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, 'toy.png'), 'png');
    await writeFile(path.join(sourceDir, 'unlisted.png'), 'do-not-copy');
    const adapter = new Cocos3dRuntimeAdapter(process.cwd(), { commandRunner: async () => ({ code: 36, output: 'success' }) });
    await adapter.createProject(workspace, 'spatial-shop-3d-v1');
    await adapter.importAssets(workspace, {
      schemaVersion: 1,
      provider: 'test',
      assets: [
        { id: 'toy-a', kind: 'product', path: 'toy.png', prompt: 'toy a', status: 'generated', sha256: 'a' },
        { id: 'toy-b', kind: 'product', path: 'toy.png', prompt: 'toy b', status: 'generated', sha256: 'a' },
        { id: 'toy-c', kind: 'background', path: 'toy.png', prompt: 'toy c', status: 'generated', sha256: 'a' },
        { id: 'toy-d', kind: 'ui', path: 'toy.png', prompt: 'toy d', status: 'generated', sha256: 'a' },
      ],
    }, sourceDir);

    expect(await readFile(path.join(workspace, 'assets/resources/generated/cutouts/toy.png'), 'utf8')).toBe('png');
    await expect(readFile(path.join(workspace, 'assets/resources/generated/cutouts/unlisted.png'), 'utf8')).rejects.toThrow();
  });

  it('imports only the curated files selected by validated third-party research', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'cocos-approved-assets-'));
    const workspace = path.join(root, 'game');
    const sourceRoot = path.resolve('runs/20260830165832-6d29b0ff/artifacts/approved-third-party');
    const research = Hybrid3dAssetResearchArtifactSchema.parse(JSON.parse(await readFile('runs/20260830165832-6d29b0ff/artifacts/hybrid-3d-asset-research.json', 'utf8')));
    const adapter = new Cocos3dRuntimeAdapter(process.cwd(), { commandRunner: async () => ({ code: 36, output: 'success' }) });
    await adapter.createProject(workspace, 'spatial-shop-3d-v1');

    await adapter.importApproved3dAssets(workspace, research, sourceRoot);

    expect(await readFile(path.join(workspace, 'assets/resources/third-party/kenney-factory-kit-3.0/conveyor-long.glb'))).toBeTruthy();
    expect(await readFile(path.join(workspace, 'assets/resources/third-party/kenney-mini-characters-1.0/character-female-a.glb'))).toBeTruthy();
    await expect(readFile(path.join(workspace, 'assets/resources/third-party/kenney-brick-kit-1.0'), 'utf8')).rejects.toThrow();
  });

  it('uses Cocos web-mobile builds and keeps TapTap conditional on its official plugin', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'cocos-build-'));
    const workspace = path.join(root, 'game');
    const calls: Parameters<RuntimeCommandRunner>[] = [];
    const commandRunner: RuntimeCommandRunner = async (...args) => {
      calls.push(args);
      await mkdir(path.join(workspace, 'build/web-mobile'), { recursive: true });
      await writeFile(path.join(workspace, 'build/web-mobile/index.html'), '<!doctype html>');
      return { code: 36, output: 'Build success' };
    };
    const adapter = new Cocos3dRuntimeAdapter(process.cwd(), { creatorExecutable: '/Applications/CocosCreator', commandRunner });
    await adapter.createProject(workspace, 'spatial-shop-3d-v1');

    expect(await adapter.buildWeb(workspace)).toBe(path.join(workspace, 'build/web-mobile'));
    expect(calls[0]?.[1]).toContainEqual(expect.stringContaining('platform=web-mobile'));
    await expect(adapter.buildTarget(workspace, 'taptap-minigame')).rejects.toThrow(/official TapTap/i);
  });

  it('accepts the versioned save marker in the dedicated session module', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'cocos-session-save-'));
    const workspace = path.join(root, 'game');
    const adapter = new Cocos3dRuntimeAdapter(process.cwd(), { commandRunner: async () => ({ code: 0, output: 'success' }) });
    await adapter.createProject(workspace, 'spatial-shop-3d-v1');
    const bootstrapPath = path.join(workspace, 'assets/scripts/GameBootstrap.ts');
    await writeFile(bootstrapPath, (await readFile(bootstrapPath, 'utf8')).replace('save-v1', 'session-owned-save'));
    await writeFile(path.join(workspace, 'assets/scripts/core/game-session.ts'), "export const SAVE_KEY = 'toy-factory:save-v2';\n");

    await expect(adapter.verifyProject(workspace, { requireScripts: true })).resolves.toContain('test:passed');
  });
});
