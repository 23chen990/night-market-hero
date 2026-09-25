export const platformAdapter = {
  platform: 'wechat',
  storageNamespace: 'beach-fish-market:wechat:save-v5',
  capabilities: { ads: 'rewarded-only', purchaseCurrency: false },
  requestRewardedAd: async (placement: string) => ({ status: 'sdk-unavailable', rewarded: false, placement }),
} as const;
