import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

describe('IAA道具与城门结算契约', () => {
  test('每个道具账号首次免费，之后看一次广告永久解锁', async () => {
    const { NightMarketMonetization, MemoryProgressStorage } = await import('../src/monetization.ts');
    const { MockAdProvider } = await import('../src/ads.ts');
    const ads = new MockAdProvider();
    ads.queueRewarded({ status: 'completed' });
    const economy = new NightMarketMonetization(ads, new MemoryProgressStorage());

    assert.deepEqual(economy.consumeItem('talisman'), { status: 'free' });
    assert.deepEqual(economy.consumeItem('talisman'), { status: 'locked' });
    assert.deepEqual(await economy.unlockItemWithAd('talisman'), { status: 'granted', adStatus: 'completed' });
    assert.deepEqual(economy.consumeItem('talisman'), { status: 'unlocked' });
    assert.deepEqual(economy.consumeItem('talisman'), { status: 'unlocked' });
    assert.deepEqual(ads.rewardedPlacements, ['iaa-talisman']);
  });

  test('收益只由固定拾取金币和已闯城门奖励构成', async () => {
    const { settlementCoins } = await import('../src/endless.ts');
    assert.equal(settlementCoins({ distanceMeters: 9999, gates: 3, pickupCoins: 14, combo: 99, depthMultiplier: 9 }), 1727);
  });
});
