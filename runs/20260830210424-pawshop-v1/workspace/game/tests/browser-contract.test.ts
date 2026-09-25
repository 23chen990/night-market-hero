import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('production browser contract', () => {
  it('exposes exactly the seven deterministic controls', () => {
    const source = read('../src/main.ts');
    const assignment = source.match(/window\.__GAME_TEST__\s*=\s*\{([^}]+)\}/s)?.[1] ?? '';
    const controls = assignment.match(/\b(resetGame|getState|spawnCustomer|completeOrder|grantCurrency|upgradeStation|setRandomSeed)\b/g) ?? [];
    expect([...new Set(controls)].sort()).toEqual([
      'completeOrder',
      'getState',
      'grantCurrency',
      'resetGame',
      'setRandomSeed',
      'spawnCustomer',
      'upgradeStation',
    ]);
    expect(assignment).not.toMatch(/produce|saveGame|teleport/);
  });

  it('keeps accepted save-v5 and both migration-key markers in generated TypeScript', () => {
    const source = [read('../src/main.ts'), read('../src/game/persistence.ts'), read('../src/game/simulation.ts')].join('\n');
    expect(source).toContain('localStorage');
    expect(source).toMatch(/CURRENT_SAVE_VERSION\s*=\s*5/);
    expect(source).toContain('save-v5');
    expect(source).toContain('save-v4');
    expect(source).toContain('save-v3');
  });

  it('uses upgrade.png only in an independent keyboard-accessible 背篓容量 DOM panel', () => {
    const html = read('../index.html');
    const css = read('../src/style.css');
    const source = read('../src/main.ts');
    const combined = `${html}\n${css}\n${source}`;
    expect(combined).not.toContain('浮标工坊');
    expect(html).toMatch(/<button[^>]+id="upgrade-button"[^>]*>/);
    expect(html).toContain('/assets/upgrade.png');
    expect(html).toContain('背篓容量');
    expect(html).toMatch(/id="upgrade-panel"[\s\S]*id="confirm-upgrade"/);
    expect(css).toMatch(/#upgrade-button[\s\S]*min-width:\s*44px/);
    expect(css).toMatch(/#confirm-upgrade[\s\S]*min-height:\s*44px/);
    expect(source).not.toMatch(/this\.load\.image\(\s*['"]upgrade['"]/);
    expect(source).not.toContain('STATIONS.upgrade');
  });

  it('preloads manifest textures before revealing the game', () => {
    const source = read('../src/main.ts');
    expect(source).toContain('AssetPreloadGate');
    expect(source).toMatch(/await\s+assetGate\.preload\(\)/);
    expect(source.indexOf('await assetGate.preload()')).toBeLessThan(source.indexOf('new Phaser.Game'));
    expect(source).not.toMatch(/\.src\s*=.*(?:update|frame|tick)/i);
  });

  it('provides safe-area responsive UI with no forbidden duplicate kelp copy', () => {
    const html = read('../index.html');
    const css = read('../src/style.css');
    const source = read('../src/main.ts');
    const combined = `${html}\n${css}\n${source}`;
    expect(combined).not.toContain('海带建设区');
    expect(combined).not.toContain('右下角建设区');
    expect(html).toContain('viewport-fit=cover');
    expect(css).toContain('env(safe-area-inset-top)');
    expect(css).toContain('overflow-x: hidden');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(html.match(/data-motion=/g)?.length ?? 0).toBeGreaterThanOrEqual(7);
  });

  it('uses ECONOMY as the only interpreted runtime balance source', () => {
    const source = read('../src/main.ts');
    const simulation = read('../src/game/simulation.ts');
    expect(source).not.toContain('config.economy');
    expect(source).not.toMatch(/\/96\b/);
    expect(source).not.toMatch(/(?:shelves\.(?:fish|kelp)\s*===\s*8|index\s*<\s*8)/);
    expect(source).toContain('ECONOMY.kelpUnlock.investmentCost');
    expect(source).toContain('ECONOMY.shelves.capacityPerProduct');
    expect(simulation).not.toMatch(/(?:rawCapacity\s*>=\s*(?:8|6)|carriedTotal\s*>\s*(?:6|4)|capacityTier\s*===\s*2\s*\?\s*8)/);
    expect(simulation).toContain('ECONOMY.carrier.tiers.map');
    expect(simulation).not.toMatch(/\b900\b/);
    expect(simulation).toContain('ECONOMY.customers.browseDurationMs');
    const generated = JSON.parse(read('../src/generated/game-config.json')) as {
      economy: { customers: { browseDurationMs: number } };
    };
    expect(generated.economy.customers.browseDurationMs).toBe(2_400);
  });

  it('preloads five static PNGs and three fixed-frame character atlases before playback', () => {
    const source = read('../src/main.ts');
    const imageLoads = source.match(/this\.load\.image\(/g) ?? [];
    expect(imageLoads).toHaveLength(4);
    const spriteLoads = source.match(/this\.load\.spritesheet\(/g) ?? [];
    expect(spriteLoads).toHaveLength(3);
    expect(source).not.toContain('this.load.svg(');
    for (const key of ['character', 'fish', 'kelp']) {
      expect(source).toMatch(new RegExp(`this\\.load\\.image\\(\\s*['"]${key}['"],\\s*config\\.assets\\.${key}`));
    }
    expect(source).toMatch(/this\.load\.image\(\s*['"]background['"],\s*config\.assets\.background/);
    const generated = JSON.parse(read('../src/generated/game-config.json')) as { assets: Record<string, string> };
    expect(Object.values(generated.assets)).toHaveLength(8);
    expect(Object.values(generated.assets).every((asset) => asset.endsWith('.png'))).toBe(true);
    for (const [key, configKey] of [['otter-walk-front', 'otterWalkFront'], ['otter-walk-back', 'otterWalkBack'], ['otter-walk-side', 'otterWalkSide']]) {
      expect(source).toMatch(new RegExp(`this\\.load\\.spritesheet\\(\\s*['"]${key}['"],\\s*config\\.assets\\.${configKey}.*?frameWidth:\\s*256.*?frameHeight:\\s*256`, 's'));
    }
    expect(source).toContain('advanceCharacterMotion');
  });

  it('defines a real lint command without a production lint dependency', () => {
    const pkg = JSON.parse(read('../package.json')) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.scripts?.lint).toMatch(/^eslint\b/);
    expect(pkg.dependencies?.eslint).toBeUndefined();
    expect(pkg.devDependencies?.eslint).toBeTypeOf('string');
  });
});
