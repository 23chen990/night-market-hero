import { ECONOMY } from '../game/economy';
import type { GameState, ProductId } from '../game/simulation';

export type Rect = { x: number; y: number; width: number; height: number };
export type Viewport = { width: number; height: number };

const stockText = (name: string, current: number, capacity: number) => (
  `${name} ${current}/${capacity}${current === capacity ? ' · 已满' : ''}`
);
const counterText = (current: number, capacity: number) => (
  `库存 ${current}/${capacity}${current === capacity ? ' · 已满' : ''}`
);
const shelfCapacity = (product: ProductId) => ECONOMY.shelves.capacityByProduct[product];

export function createUiView(state: GameState) {
  const nextTier = ECONOMY.carrier.tiers[state.capacityTier];
  const gated = nextTier?.requires === 'kelpUnlocked' && !state.construction.kelpUnlocked;
  const affordable = Boolean(nextTier && !gated && state.currency >= nextTier.cost);
  const stations: Array<{ id: string; title: string; counter: string }> = [
    { id: 'fishSource', title: '近岸渔网', counter: state.facilityUpgrades.fishNetSpeed ? '渔网速度 440ms' : '靠近自动捕鱼' },
    { id: 'kelpSource', title: state.construction.kelpUnlocked ? '潮池 · 海带采集点' : '锁定潮池', counter: state.construction.kelpUnlocked
      ? '靠近自动采集海带' : `投入 ${state.construction.invested}/${ECONOMY.kelpUnlock.investmentCost} 贝壳币` },
    { id: 'fishShelf', title: '鲜鱼冰盘', counter: counterText(state.shelves.fish, shelfCapacity('fish')) },
    { id: 'kelpShelf', title: '海带篮', counter: counterText(state.shelves.kelp, shelfCapacity('kelp')) },
  ];
  if (state.construction.kelpUnlocked) {
    stations.push({
      id: 'shrimpTrap',
      title: state.facilities.shrimpTrap.unlocked ? '浅滩虾笼' : '锁定浅滩虾笼',
      counter: state.facilities.shrimpTrap.unlocked
        ? `蓄货 ${state.facilities.shrimpTrap.buffer}/4`
        : `完成售卖 ${Math.min(state.telemetry.completedOrders, ECONOMY.facilityUnlocks.shrimp.requiredCompletedSales)}/${ECONOMY.facilityUnlocks.shrimp.requiredCompletedSales}`,
    });
    if (state.facilities.shrimpTrap.unlocked) {
      stations.push({ id: 'shrimpShelf', title: '鲜虾木箱', counter: counterText(state.shelves.shrimp, shelfCapacity('shrimp')) });
    }
  }
  if (state.facilities.shrimpTrap.unlocked) {
    stations.push({
      id: 'crabPot',
      title: state.facilities.crabPot.unlocked ? '礁边蟹笼' : '锁定礁边蟹笼',
      counter: state.facilities.crabPot.unlocked
        ? `待取 ${state.facilities.crabPot.readyCount}/${state.facilities.crabPot.readyCapacity}`
        : `售出鲜虾 ${Math.min(state.progression.completedSalesByProduct.shrimp, ECONOMY.facilityUnlocks.crab.requiredShrimpSales)}/${ECONOMY.facilityUnlocks.crab.requiredShrimpSales}`,
    });
    if (state.facilities.crabPot.unlocked) {
      stations.push({ id: 'crabShelf', title: '礁蟹冰盘', counter: counterText(state.shelves.crab, shelfCapacity('crab')) });
    }
  }
  stations.push({ id: 'checkout', title: '贝壳收银台', counter: `排队 ${state.checkoutQueue.length}` });

  const localPrompts: string[] = [];
  if (state.facilityExperience.fishNet && !state.facilityUpgrades.fishNetSpeed) localPrompts.push('渔网速度 520→440ms · 48');
  if (state.facilities.shrimpTrap.unlocked && state.facilityExperience.shrimpBatchesCollected >= 2 && !state.facilityUpgrades.shrimpTrapSpeed) localPrompts.push('浸泡 4.2→3.5秒 · 80');
  if (state.facilities.crabPot.unlocked && state.facilityExperience.crabsSold >= 1 && !state.facilityUpgrades.crabPotReadyCapacity) localPrompts.push('待取上限 1→2 · 98');

  return {
    hud: {
      currency: `${ECONOMY.currencyName} ${state.currency}`,
      carrying: `携带 ${Object.values(state.carrying).reduce((sum, count) => sum + count, 0)}/${state.capacity}`,
      fishStock: stockText('鲜鱼', state.shelves.fish, shelfCapacity('fish')),
      kelpStock: stockText('海带', state.shelves.kelp, shelfCapacity('kelp')),
    },
    stations,
    objective: state.facilities.shrimpTrap.unlocked
      ? state.facilities.crabPot.unlocked ? null : `售出鲜虾 ${Math.min(state.progression.completedSalesByProduct.shrimp, 10)}/10`
      : state.construction.kelpUnlocked ? `完成售卖 ${Math.min(state.telemetry.completedOrders, 18)}/18` : '投入贝壳币解锁潮池',
    localPrompts,
    upgrade: {
      title: '背篓容量',
      current: state.capacity,
      next: nextTier?.capacity ?? null,
      label: gated ? `背篓容量 ${state.capacity} · 解锁海带后开放` : nextTier ? `背篓容量 ${state.capacity} · 下一级 ${nextTier.capacity}` : `背篓容量 ${state.capacity} · 已满级`,
      nextPrice: gated ? null : nextTier?.cost ?? null,
      gated,
      redDot: affordable,
    },
  };
}

export function getFullBadgeModel(carrying: number, capacity: number) {
  return { text: '满载', visible: capacity > 0 && carrying >= capacity };
}

export function rectsIntersect(a: Rect, b: Rect) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function getHudExclusions(viewport: Viewport): Rect[] {
  const inset = 12;
  return [
    { x: inset, y: inset, width: Math.min(250, viewport.width - inset * 2), height: 96 },
    { x: Math.max(inset, viewport.width - 104), y: inset, width: 92, height: 48 },
  ];
}

function clampRect(rect: Rect, viewport: Viewport): Rect {
  return {
    ...rect,
    x: Math.min(viewport.width - rect.width - 4, Math.max(4, rect.x)),
    y: Math.min(viewport.height - rect.height - 4, Math.max(4, rect.y)),
  };
}

export function placeAttachedBadge(playerRect: Rect, stackCount: number, viewport: Viewport, exclusions: Rect[]) {
  const width = 52;
  const height = 26;
  const stackTop = playerRect.y - Math.min(72, stackCount * 14);
  const candidates: Rect[] = [
    { x: playerRect.x + playerRect.width / 2 - width / 2, y: stackTop - height - 8, width, height },
    { x: playerRect.x + playerRect.width + 8, y: playerRect.y + 2, width, height },
    { x: playerRect.x - width - 8, y: playerRect.y + 2, width, height },
    { x: playerRect.x + playerRect.width + 6, y: playerRect.y + playerRect.height - height, width, height },
  ].map((candidate) => clampRect(candidate, viewport));
  const rect = candidates.find((candidate) => exclusions.every((excluded) => !rectsIntersect(candidate, excluded))) ?? candidates[candidates.length - 1]!;
  return { rect, attached: true };
}
