export type RevisionMarketId = 'beach-stall' | 'coral-cove-market' | 'moon-tide-market';
export type EmployeeRole = 'runner' | 'cashier';

export type RevisionPosition = { x: number; y: number };

export type MarketDefinition = {
  id: RevisionMarketId;
  name: string;
  atmosphere: string;
  accent: string;
  goalLabel: string;
  constructionTarget: number;
  demandProductIds: string[];
  stationPositions: Record<string, RevisionPosition>;
};

export const MARKET_DEFINITIONS: Record<RevisionMarketId, MarketDefinition> = {
  'beach-stall': {
    id: 'beach-stall',
    name: '潮汐渔货铺',
    atmosphere: '晴湾集市',
    accent: '#4ba3c7',
    goalLabel: '完成潮池扩建',
    constructionTarget: 4,
    demandProductIds: ['fresh-fish', 'kelp', 'smoked-fish'],
    stationPositions: {
      net: { x: 120, y: 180 },
      'fish-shelf': { x: 270, y: 420 },
      smokehouse: { x: 120, y: 420 },
      'smoked-shelf': { x: 420, y: 520 },
      checkout: { x: 270, y: 640 },
      'kelp-pool': { x: 420, y: 180 },
      'kelp-shelf': { x: 410, y: 420 },
      'kelp-build': { x: 410, y: 720 },
      'capacity-upgrade': { x: 120, y: 720 },
      'runner-hire': { x: 120, y: 820 },
      'cashier-hire': { x: 270, y: 820 },
      'market-entry': { x: 480, y: 840 },
    },
  },
  'coral-cove-market': {
    id: 'coral-cove-market',
    name: '珊瑚湾市场',
    atmosphere: '珊瑚浅湾',
    accent: '#e98d70',
    goalLabel: '交付两份烟熏鱼订单',
    constructionTarget: 2,
    demandProductIds: ['smoked-fish', 'fresh-fish'],
    stationPositions: {
      net: { x: 96, y: 220 },
      'fish-shelf': { x: 240, y: 390 },
      smokehouse: { x: 136, y: 460 },
      'smoked-shelf': { x: 390, y: 390 },
      checkout: { x: 280, y: 650 },
      'kelp-pool': { x: 444, y: 190 },
      'kelp-shelf': { x: 440, y: 500 },
      'kelp-build': { x: 420, y: 760 },
      'capacity-upgrade': { x: 100, y: 760 },
      'runner-hire': { x: 110, y: 850 },
      'cashier-hire': { x: 280, y: 850 },
      'market-entry': { x: 480, y: 880 },
    },
  },
  'moon-tide-market': {
    id: 'moon-tide-market',
    name: '月潮码头',
    atmosphere: '月光夜潮',
    accent: '#a78bfa',
    goalLabel: '补齐月潮双货架',
    constructionTarget: 3,
    demandProductIds: ['fresh-fish', 'smoked-fish'],
    stationPositions: {
      net: { x: 440, y: 190 },
      'fish-shelf': { x: 320, y: 370 },
      smokehouse: { x: 430, y: 480 },
      'smoked-shelf': { x: 180, y: 390 },
      checkout: { x: 270, y: 640 },
      'kelp-pool': { x: 90, y: 220 },
      'kelp-shelf': { x: 100, y: 500 },
      'kelp-build': { x: 120, y: 760 },
      'capacity-upgrade': { x: 440, y: 760 },
      'runner-hire': { x: 390, y: 850 },
      'cashier-hire': { x: 270, y: 850 },
      'market-entry': { x: 60, y: 880 },
    },
  },
};

export const PROCESSOR_DEFINITIONS = {
  smokehouse: {
    inputProductId: 'fresh-fish',
    outputProductId: 'smoked-fish',
    inputShelfId: 'fish-shelf',
    outputShelfId: 'smoked-shelf',
    cycleMs: 1_600,
    capacity: 3,
  },
} as const;

export const EMPLOYEE_DEFINITIONS: Record<EmployeeRole, {
  hireCost: number;
  cargoCapacity: number;
  label: string;
  stationId: string;
}> = {
  runner: { hireCost: 3, cargoCapacity: 2, label: '补货跑腿', stationId: 'runner-hire' },
  cashier: { hireCost: 5, cargoCapacity: 0, label: '收银帮手', stationId: 'cashier-hire' },
};

export const MARKET_ENTRY_POSITION: RevisionPosition = { x: 480, y: 840 };
export const STOCKOUT_PATIENCE_MS = 8_000;
export const SEAGULL_GRACE_MS = 1_000;
export const SEAGULL_LOSS_PERIOD_MS = 2_200;

export function getMarketDefinition(marketId: string | null | undefined): MarketDefinition {
  return MARKET_DEFINITIONS[(marketId as RevisionMarketId) ?? 'beach-stall'] ?? MARKET_DEFINITIONS['beach-stall'];
}
