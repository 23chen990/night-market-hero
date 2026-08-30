import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sha256Text } from '../core/files.js';
import type { AgentProvider, CodexProvider, ImageProvider } from './interfaces.js';
import type { ArtApproval, ArtDirections, GameBlueprint, Seed, StyleLock } from '../schemas/index.js';

export class MockAgentProvider implements AgentProvider {
  async generateBlueprint(seed: Seed) {
    return { schemaVersion: 1, gameId: seed.title.toLowerCase().replace(/\s+/g, '-'), title: seed.title, theme: seed.theme, runtime: 'web-lite', template: seed.template, concept: `${seed.theme}主题的轻量点击经营游戏`, coreLoop: ['顾客出现', '点击生产', '交付商品', '获得金币', '升级摊位'], content: { productName: '月光团子', customerName: '夜行客', currencyName: '灯币' }, balance: { startingCurrency: 0, orderReward: 5, baseUpgradeCost: 10 }, preferences: seed.preferences };
  }
  async generateArtDirections(blueprint: GameBlueprint) {
    const specs = [
      ['direction_a', '墨灯剪影', ['ink', 'paper-cut'], ['#151225', '#F6C768', '#D66B5D'], '1:2', 'sharp cards', 'layered silhouettes'],
      ['direction_b', '雾蓝夜摊', ['soft gouache', 'mist'], ['#172A46', '#78B9B5', '#F4D58D'], '1:2.5', 'rounded minimal', 'misty stalls'],
      ['direction_c', '霓虹符纸', ['neon', 'graphic'], ['#1A102B', '#EF4E8B', '#53D8FB'], '1:3', 'bold geometric', 'graphic night market'],
      ['direction_d', '木刻怪谈', ['woodcut', 'limited color'], ['#211A17', '#D99A4E', '#A84632'], '1:2', 'seal-like', 'textured woodcut'],
    ] as const;
    return { directions: specs.map(([id, name, keywords, palette, proportion, uiStyle, sceneStyle]) => ({ id, name, keywords: [...keywords], palette: [...palette], characterProportion: proportion, uiStyle, sceneStyle, forbidden: ['existing franchise likeness', 'third-party logo', 'illegible UI'], productionComplexity: id === 'direction_c' ? 'medium' : 'low', imagePrompt: `Original ${name} key art for ${blueprint.theme}, ${keywords.join(', ')}, no text, no known characters`, previewPath: `previews/${id}.svg` })) };
  }
  async generateStyleLock(_blueprint: GameBlueprint, directions: ArtDirections, approvalValue: unknown) {
    const approval = approvalValue as ArtApproval; const direction = directions.directions.find((item) => item.id === approval.selected_direction);
    if (!direction) throw new Error('Approved art direction does not exist');
    return { schemaVersion: 1, directionId: direction.id, direction, kept: approval.keep, changes: approval.change, notes: approval.notes, lockedAt: new Date().toISOString() };
  }
}

export class MockImageProvider implements ImageProvider {
  async produce({ outputDir, blueprint, styleLock }: { outputDir: string; blueprint: GameBlueprint; styleLock: StyleLock }) {
    await mkdir(outputDir, { recursive: true });
    const definitions = [['customer', 'character'], ['product', 'product'], ['background', 'background'], ['upgrade', 'ui'], ['promo', 'marketing']] as const;
    const assets = [];
    for (const [id, kind] of definitions) {
      const color = styleLock.direction.palette[definitions.indexOf([id, kind] as never) % styleLock.direction.palette.length] ?? '#F6C768';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="48" fill="${styleLock.direction.palette[0]}"/><circle cx="256" cy="220" r="120" fill="${color}"/><text x="256" y="430" text-anchor="middle" fill="white" font-family="sans-serif" font-size="36">${blueprint.title} · ${id}</text></svg>`;
      const file = path.join(outputDir, `${id}.svg`); await writeFile(file, svg);
      assets.push({ id, kind, path: `assets/${id}.svg`, prompt: `${styleLock.direction.imagePrompt}; isolated ${kind}`, status: 'generated', sha256: sha256Text(svg) });
    }
    return { schemaVersion: 1, assets, provider: 'mock-svg' };
  }
}

export class MockCodexProvider implements CodexProvider {
  async build() { return { threadId: `mock-thread-${Date.now()}` }; }
  async fix({ threadId }: { threadId?: string }) { return { threadId: threadId ?? `mock-thread-${Date.now()}`, summary: 'Mock repair acknowledged only the reported QA issues.' }; }
}
