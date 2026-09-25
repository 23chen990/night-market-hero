import {
  canShowRewardedAd,
  grantRewardedAd,
  type AdPlacement,
  type AdReward,
  type AdState,
} from './ads';

export type RewardedAdBridge = {
  requestRewardedAd: (placement: AdPlacement) => Promise<{ status: 'completed' | 'sdk-unavailable' | 'cancelled'; rewarded: boolean }>;
};
export type RewardedAdFlowResult = {
  accepted: boolean;
  state: AdState;
  reward?: AdReward;
  reason?: 'cooldown' | 'sdk-unavailable' | 'cancelled';
};

export async function runRewardedAdFlow(state: AdState, placement: AdPlacement, nowMs: number, bridge: RewardedAdBridge): Promise<RewardedAdFlowResult> {
  if (!canShowRewardedAd(state, placement, nowMs)) return { accepted: false, state, reason: 'cooldown' };
  const response = await bridge.requestRewardedAd(placement);
  if (response.status !== 'completed' || !response.rewarded) {
    return { accepted: false, state, reason: response.status === 'cancelled' ? 'cancelled' : 'sdk-unavailable' };
  }
  const granted = grantRewardedAd(state, placement, nowMs);
  return { accepted: granted.accepted, state: granted.state, reward: granted.reward };
}
