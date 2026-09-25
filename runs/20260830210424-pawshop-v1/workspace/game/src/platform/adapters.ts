import type { AdPlacement } from './ads';
export type MiniGamePlatform = 'wechat' | 'douyin' | 'taptap';
export type PlatformAdapter = {
  platform: MiniGamePlatform;
  storageNamespace: string;
  capabilities: { ads: 'rewarded-only'; purchaseCurrency: false };
  requestRewardedAd: (placement: AdPlacement) => Promise<{ status: 'sdk-unavailable'; rewarded: false; placement: AdPlacement }>;
};

export function createPlatformAdapter(platform: MiniGamePlatform): PlatformAdapter {
  return {
    platform,
    storageNamespace: `beach-fish-market:${platform}:save-v5`,
    capabilities: { ads: 'rewarded-only', purchaseCurrency: false },
    requestRewardedAd: async (placement) => ({ status: 'sdk-unavailable', rewarded: false, placement }),
  };
}
