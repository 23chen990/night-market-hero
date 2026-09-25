export const platformAdapter = {
  platform: 'douyin',
  storageNamespace: 'beach-fish-market:douyin:save-v5',
  capabilities: { ads: 'rewarded-only', purchaseCurrency: false },
  requestRewardedAd: async (placement: string) => ({ status: 'sdk-unavailable', rewarded: false, placement }),
} as const;
