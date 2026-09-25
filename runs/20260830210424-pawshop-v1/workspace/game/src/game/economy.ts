export const ECONOMY = {
  currencyName: '贝壳币',
  products: {
    fish: { saleReward: 4, pickupIntervalMs: 520 },
    kelp: { saleReward: 6, pickupIntervalMs: 650 },
    shrimp: { saleReward: 8, productionCycleMs: 4_200, batchYield: 2, bufferCapacity: 4 },
    crab: { saleReward: 14, productionCycleMs: 10_400, batchYield: 1, bufferCapacity: 1 },
  },
  carrier: {
    initialCapacity: 4,
    tiers: [
      { capacity: 6, cost: 40, requires: null },
      { capacity: 8, cost: 88, requires: 'kelpUnlocked' },
    ],
    purchaseIntervalMs: 500,
    maxPurchases: 2,
  },
  shelves: {
    capacityPerProduct: 8,
    capacityByProduct: { fish: 8, kelp: 8, shrimp: 6, crab: 3 },
    deliveryIntervalMs: 240,
  },
  customers: {
    firstSpawnDelayMs: 22_000,
    browseDurationMs: 2_400,
    preUnlockSpawnIntervalMs: 5_500,
    postUnlockSpawnIntervalMs: 4_200,
    postUnlockFishProbability: 0.68,
    demandAfterAllUnlock: { fish: 0.48, kelp: 0.25, shrimp: 0.19, crab: 0.08 },
    maxActive: 5,
    stockPatienceMs: 10_000,
    crabStockPatienceMs: 14_000,
  },
  checkout: { serviceIntervalMs: 700, tokenPickupDelayMs: 300 },
  kelpUnlock: { investmentCost: 96, investmentIntervalMsPerCoin: 220 },
  facilityUnlocks: {
    shrimp: { investmentCost: 144, requiredCompletedSales: 18 },
    crab: { investmentCost: 268, requiredShrimpSales: 10 },
    investmentIntervalMsPerCoin: 220,
  },
  facilityUpgrades: {
    fishNetSpeed: { cost: 48, pickupIntervalMs: 440 },
    shrimpTrapSpeed: { cost: 80, productionCycleMs: 3_500 },
    crabPotReadyCapacity: { cost: 98, readyCapacity: 2 },
  },
  sourceCollectionIntervalMs: 240,
  legacyV4: { kelpInvestmentCost: 12 },
} as const;

export type ProductId = keyof typeof ECONOMY.products;

export const PRODUCT_IDS: readonly ProductId[] = ['fish', 'kelp', 'shrimp', 'crab'];
