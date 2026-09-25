import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadContract } from './contracts';

type Ui = typeof import('../src/ui/view-model');
type Simulation = typeof import('../src/game/simulation');

describe('responsive UI shell', () => {
  it('uses a compact objective chip instead of a fixed bottom action bar', async () => {
    const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(source).toContain('id="objective-chip"');
    expect(source).not.toContain('id="status-card"');
    expect(css).toMatch(/#objective-chip[\s\S]*top:/);
    expect(css).not.toMatch(/#status-card[\s\S]*bottom:/);
  });

  it('exposes icon-language upgrade attributes instead of a prose-only capacity card', async () => {
    const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const runtime = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(source).toContain('upgrade-attribute-grid');
    expect(source).toContain('upgrade-attribute-capacity');
    expect(source).toContain('upgrade-attribute-speed');
    expect(source).toContain('upgrade-attribute-checkout');
    expect(source).not.toContain('确认升级');
    expect(runtime).not.toContain("byId('upgrade-copy')");
  });

  it('exposes an independent 背篓容量 panel and no world workshop station', async () => {
    const ui = await loadContract<Ui>(() => import('../src/ui/view-model'), 'UI view model');
    const sim = await loadContract<Simulation>(() => import('../src/game/simulation'), 'game simulation');
    const state = sim.createInitialState(0);
    state.currency = 40;
    const view = ui.createUiView(state);
    expect(view.stations.some((station) => station.id === 'upgrade')).toBe(false);
    expect(JSON.stringify(view)).not.toContain('浮标工坊');
    expect(view.upgrade).toMatchObject({
      title: '背篓容量',
      current: 4,
      next: 6,
      nextPrice: 40,
      redDot: true,
    });
  });

  it('shows only the next locked requirement and local facility upgrade semantics', async () => {
    const ui = await loadContract<Ui>(() => import('../src/ui/view-model'), 'UI view model');
    const sim = await loadContract<Simulation>(() => import('../src/game/simulation'), 'game simulation');
    const state = sim.createInitialState(0);
    state.construction = { invested: 96, kelpUnlocked: true };
    state.telemetry.completedOrders = 8;
    let view = ui.createUiView(state);
    expect(JSON.stringify(view)).toContain('完成售卖 8/18');
    expect(JSON.stringify(view)).not.toContain('售出鲜虾');

    state.telemetry.completedOrders = 18;
    state.facilities.shrimpTrap.unlocked = true;
    state.progression.completedSalesByProduct.shrimp = 6;
    state.facilityExperience.fishNet = true;
    state.facilityExperience.shrimpBatchesCollected = 2;
    view = ui.createUiView(state);
    expect(JSON.stringify(view)).toContain('售出鲜虾 6/10');
    expect(JSON.stringify(view)).toContain('浸泡 4.2→3.5秒 · 80');
    expect(JSON.stringify(view)).toContain('渔网速度 520→440ms · 48');
    expect(JSON.stringify(view)).not.toContain('待取上限 1→2 · 98');

    state.facilities.crabPot.unlocked = true;
    state.facilityExperience.crabsSold = 1;
    view = ui.createUiView(state);
    expect(JSON.stringify(view)).toContain('待取上限 1→2 · 98');
  });

  it('uses independent local shelf counters without adding four top-HUD stock counters', async () => {
    const ui = await loadContract<Ui>(() => import('../src/ui/view-model'), 'UI view model');
    const sim = await loadContract<Simulation>(() => import('../src/game/simulation'), 'game simulation');
    const state = sim.createInitialState(0);
    state.construction = { invested: 96, kelpUnlocked: true };
    state.facilities.shrimpTrap.unlocked = true;
    state.facilities.crabPot.unlocked = true;
    state.shelves = { fish: 8, kelp: 3, shrimp: 6, crab: 3 };
    const view = ui.createUiView(state);
    expect(Object.keys(view.hud).filter((key) => key.endsWith('Stock'))).toEqual(['fishStock', 'kelpStock']);
    expect(view.stations.find((station) => station.id === 'shrimpShelf')?.counter).toBe('库存 6/6 · 已满');
    expect(view.stations.find((station) => station.id === 'crabShelf')?.counter).toBe('库存 3/3 · 已满');
  });

  it('does not expose the highlighted top stock or carrying strips', () => {
    const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const runtime = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('class="stock-strip"');
    expect(source).not.toContain('class="carry-pill"');
    expect(runtime).not.toContain("byId('carrying')");
    expect(runtime).not.toContain("byId('fish-stock')");
    expect(runtime).not.toContain("byId('kelp-stock')");
  });

  it('renders one kelp unlock node and complete shelf capacity copy', async () => {
    const ui = await loadContract<Ui>(() => import('../src/ui/view-model'), 'UI view model');
    const sim = await loadContract<Simulation>(() => import('../src/game/simulation'), 'game simulation');
    const state = sim.createInitialState(0);
    state.shelves = { fish: 8, kelp: 3, shrimp: 0, crab: 0 };
    const view = ui.createUiView(state);
    const allCopy = JSON.stringify(view);
    expect(view.stations.filter((station) => station.id === 'kelpSource')).toHaveLength(1);
    expect(allCopy).not.toContain('海带建设区');
    expect(allCopy).not.toContain('右下角建设区');
    expect(view.hud.fishStock).toBe('鲜鱼 8/8 · 已满');
    expect(view.hud.kelpStock).toBe('海带 3/8');
    expect(view.stations.find((station) => station.id === 'fishShelf')?.counter).toBe('库存 8/8 · 已满');
  });

  it('shows no phantom price at max carrier level', async () => {
    const ui = await loadContract<Ui>(() => import('../src/ui/view-model'), 'UI view model');
    const sim = await loadContract<Simulation>(() => import('../src/game/simulation'), 'game simulation');
    const state = sim.createInitialState(0);
    state.capacityTier = 2;
    state.capacity = 8;
    const upgrade = ui.createUiView(state).upgrade;
    expect(upgrade.label).toBe('背篓容量 8 · 已满级');
    expect(upgrade.nextPrice).toBeNull();
  });

  it('explains the kelp gate for capacity 6 and reveals the 88 price only after unlock', async () => {
    const ui = await loadContract<Ui>(() => import('../src/ui/view-model'), 'UI view model');
    const sim = await loadContract<Simulation>(() => import('../src/game/simulation'), 'game simulation');
    const state = sim.createInitialState(0);
    state.capacityTier = 1;
    state.capacity = 6;
    let upgrade = ui.createUiView(state).upgrade;
    expect(upgrade.label).toBe('背篓容量 6 · 解锁海带后开放');
    expect(upgrade.nextPrice).toBeNull();

    state.construction = { invested: 96, kelpUnlocked: true };
    upgrade = ui.createUiView(state).upgrade;
    expect(upgrade.label).toBe('背篓容量 6 · 下一级 8');
    expect(upgrade.nextPrice).toBe(88);
  });

  it('shows 满载 only at the current upgrade-aware capacity', async () => {
    const ui = await loadContract<Ui>(() => import('../src/ui/view-model'), 'UI view model');
    const cases = [
      { carrying: 0, capacity: 4, visible: false },
      { carrying: 3, capacity: 4, visible: false },
      { carrying: 4, capacity: 4, visible: true },
      { carrying: 3, capacity: 4, visible: false },
      { carrying: 4, capacity: 5, visible: false },
      { carrying: 5, capacity: 5, visible: true },
      { carrying: 6, capacity: 5, visible: true },
    ];
    for (const value of cases) {
      expect(ui.getFullBadgeModel(value.carrying, value.capacity).visible).toBe(value.visible);
    }
  });

  it.each([
    [360, 800],
    [390, 844],
    [430, 932],
  ])('keeps the attached 满载 badge outside cached HUD exclusions at %sx%s', async (width, height) => {
    const ui = await loadContract<Ui>(() => import('../src/ui/view-model'), 'UI view model');
    const viewport = { width, height };
    const exclusions = ui.getHudExclusions(viewport);
    const placement = ui.placeAttachedBadge(
      { x: 72, y: 132, width: 54, height: 66 },
      3,
      viewport,
      exclusions,
    );
    expect(placement.attached).toBe(true);
    expect(exclusions.every((rect) => !ui.rectsIntersect(placement.rect, rect))).toBe(true);
  });
});
