export const platformAdapter = {
  platform: 'taptap',
  storageNamespace: 'beach-fish-market:taptap:save-v5',
  capabilities: { ads: 'rewarded-only', purchaseCurrency: false },
  requestRewardedAd: async (placement: string) => ({ status: 'sdk-unavailable', rewarded: false, placement }),
} as const;
