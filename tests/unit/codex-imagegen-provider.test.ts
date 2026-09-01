import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CodexImagegenPendingError, CodexImagegenProvider, probeCodexImagegen } from '../../src/providers/codex-imagegen.js';
import type { ArtDirections, GameBlueprint, StyleLock } from '../../src/schemas/index.js';

const direction = { id: 'direction_a' as const, name: 'Ink', summary: 'ink direction', visualKeywords: ['ink'], palette: ['#112233'], characterStyle: 'ink figures', environmentStyle: 'ink market', uiStyle: 'paper cards', iconConcept: 'seal', forbiddenElements: ['logos'], productionComplexity: 'low' as const, previewPrompt: 'original ink market' };
const directions: ArtDirections = { directions: [direction, { ...direction, id: 'direction_b', name: 'Clay', summary: 'clay direction', previewPrompt: 'original clay market' }, { ...direction, id: 'direction_c', name: 'Neon', summary: 'neon direction', previewPrompt: 'original neon market' }, { ...direction, id: 'direction_d', name: 'Wood', summary: 'wood direction', previewPrompt: 'original wood market' }] };
const blueprint: GameBlueprint = { schemaVersion: 1, gameId: 'test', title: 'Test', theme: 'spirits', runtime: 'web-lite', template: 'idle-shop-v1', designMode: 'prototype_tournament', targetPlatforms: ['wechat-minigame', 'douyin-minigame', 'taptap-minigame'], concept: 'test', coreLoop: ['a', 'b', 'c', 'd'], content: { productName: 'tea', customerName: 'spirit', currencyName: 'coin' }, balance: { startingCurrency: 0, orderReward: 1, baseUpgradeCost: 2 }, preferences: {} };
const styleLock: StyleLock = { schemaVersion: 1, directionId: 'direction_a', direction, kept: [], changes: [], notes: [], lockedAt: new Date().toISOString() };
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);

describe('Codex imagegen bridge', () => {
  it('reports manual mode when codex exec has no image output contract', () => {
    expect(probeCodexImagegen('Options:\n  -i, --image <FILE> input only')).toEqual(expect.objectContaining({ available: true, automatic: false, mode: 'manual-conversation' }));
  });

  it('writes four $imagegen tasks and pauses instead of creating placeholders', async () => {
    const runRoot = await mkdtemp(path.join(tmpdir(), 'codex-imagegen-'));
    const outputDir = path.join(runRoot, 'art-review/previews');
    const provider = new CodexImagegenProvider();

    const error = await provider.producePreviews({ outputDir, directions }).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(CodexImagegenPendingError);
    const task = await readFile(path.join(runRoot, 'art-review/art-imagegen-task.md'), 'utf8');
    expect(task.match(/\$imagegen/g)).toHaveLength(4);
    for (const item of directions.directions) {
      expect(task).toContain(item.id);
      expect(task).toContain(`${item.id}.png`);
      expect(task).toContain(item.previewPrompt);
    }
    expect(task).toContain('可以粘贴到当前 Codex 对话');
    await expect(readFile(path.join(outputDir, 'direction_a.svg'))).rejects.toThrow();
    expect((error as CodexImagegenPendingError).command).toContain('art-imagegen-task.md');
  });

  it('continues only after all four real PNG files pass validation', async () => {
    const runRoot = await mkdtemp(path.join(tmpdir(), 'codex-imagegen-'));
    const outputDir = path.join(runRoot, 'art-review/previews');
    const provider = new CodexImagegenProvider();
    await expect(provider.producePreviews({ outputDir, directions })).rejects.toBeInstanceOf(CodexImagegenPendingError);
    await Promise.all(directions.directions.map((item) => writeFile(path.join(outputDir, `${item.id}.png`), png)));

    const manifest = await provider.producePreviews({ outputDir, directions });

    expect(manifest.previews).toHaveLength(4);
    expect(manifest.previews.every((item) => item.status === 'generated')).toBe(true);
    expect(manifest.previews.map((item) => item.outputPath)).toEqual(['previews/direction_a.png', 'previews/direction_b.png', 'previews/direction_c.png', 'previews/direction_d.png']);
  });

  it('uses the same manual gate for formal assets', async () => {
    const runRoot = await mkdtemp(path.join(tmpdir(), 'codex-assets-'));
    const outputDir = path.join(runRoot, 'workspace/generated-assets');
    const provider = new CodexImagegenProvider();

    await expect(provider.produce({ outputDir, blueprint, styleLock })).rejects.toBeInstanceOf(CodexImagegenPendingError);

    const task = await readFile(path.join(runRoot, 'art-review/asset-imagegen-task.md'), 'utf8');
    expect(task).toContain('$imagegen');
    expect(task).toContain('customer.png');
    expect(task).toContain('background.png');
  });
});
