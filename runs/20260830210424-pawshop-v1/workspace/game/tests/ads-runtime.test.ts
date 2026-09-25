import { describe, expect, it } from 'vitest';
import { createAdState } from '../src/platform/ads';
import { runRewardedAdFlow } from '../src/platform/ads-runtime';

describe('runtime IAA bridge', () => {
  it('only commits a reward after the platform reports a completed rewarded ad', async () => {
    const result = await runRewardedAdFlow(createAdState(), 'offline_double', 1_000, {
      requestRewardedAd: async () => ({ status: 'completed', rewarded: true }),
    });
    expect(result.accepted).toBe(true);
    expect(result.reward?.kind).toBe('offline_multiplier');
    expect(result.state.impressionsByPlacement.offline_double).toBe(1);
  });

  it('does not consume cooldown or grant a reward when the SDK is unavailable', async () => {
    const result = await runRewardedAdFlow(createAdState(), 'gull_bonus', 1_000, {
      requestRewardedAd: async () => ({ status: 'sdk-unavailable', rewarded: false }),
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('sdk-unavailable');
    expect(result.state.impressionsByPlacement.gull_bonus).toBe(0);
  });
});
