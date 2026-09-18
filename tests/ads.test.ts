import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

type AdsModule = typeof import('../src/ads.ts');
const ads = await import('../src/ads.ts').catch(() => null) as AdsModule | null;

function requireAds(): AdsModule {
  assert.ok(ads, 'expected the ad provider abstraction to exist');
  return ads;
}

describe('TapTap-ready ad abstraction', () => {
  test('Noop provider never blocks gameplay and never grants a reward', async () => {
    const { NoopAdProvider } = requireAds();
    const provider = new NoopAdProvider();
    assert.deepEqual(await provider.showRewarded('revive'), { status: 'unavailable' });
    assert.deepEqual(await provider.showInterstitial('natural-transition'), { status: 'unavailable' });
  });

  test('injected bridge converts rejection into a non-blocking failed result', async () => {
    const { InjectedAdProvider } = requireAds();
    const provider = new InjectedAdProvider({
      showRewarded: async () => { throw new Error('offline'); },
      showInterstitial: async () => { throw new Error('offline'); },
    });
    assert.deepEqual(await provider.showRewarded('double-wishfire'), { status: 'failed' });
    assert.deepEqual(await provider.showInterstitial('natural-transition'), { status: 'failed' });
  });

  test('mock provider only completes rewards explicitly queued as completed', async () => {
    const { MockAdProvider } = requireAds();
    const provider = new MockAdProvider();
    provider.queueRewarded({ status: 'dismissed' }, { status: 'completed' });
    assert.deepEqual(await provider.showRewarded('revive'), { status: 'dismissed' });
    assert.deepEqual(await provider.showRewarded('revive'), { status: 'completed' });
    assert.deepEqual(provider.rewardedPlacements, ['revive', 'revive']);
  });
});
