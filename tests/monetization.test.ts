import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

type MonetizationModule = typeof import('../src/monetization.ts');
const monetization = await import('../src/monetization.ts').catch(() => null) as MonetizationModule | null;

function requireMonetization(): MonetizationModule {
  assert.ok(monetization, 'expected monetization domain module to exist');
  return monetization;
}

describe('夜市飞侠 IAA rules', () => {
  test('base wishfire is granted once and a completed reward doubles it once', async () => {
    const { NightMarketMonetization, MemoryProgressStorage } = requireMonetization();
    const adsModule = await import('../src/ads.ts');
    const ads = new adsModule.MockAdProvider();
    ads.queueRewarded({ status: 'completed' }, { status: 'completed' });
    assert.equal(typeof NightMarketMonetization, 'function');
    const economy = new NightMarketMonetization(ads, new MemoryProgressStorage());

    assert.deepEqual(economy.completeRun('run-1', 30), { baseReward: 30, totalReward: 30, canDouble: true });
    assert.deepEqual(economy.completeRun('run-1', 30), { baseReward: 30, totalReward: 30, canDouble: true });
    assert.equal(economy.getProgress().wishfire, 30, 'base reward cannot be reduced or duplicated');
    assert.equal((await economy.doubleWishfire('run-1')).status, 'granted');
    assert.equal(economy.getProgress().wishfire, 60);
    assert.equal((await economy.doubleWishfire('run-1')).status, 'already-claimed');
    assert.equal(economy.getProgress().wishfire, 60);
    assert.equal(ads.rewardedPlacements.length, 1, 'a claimed completion must not open another ad');
  });

  test('simultaneous double-wishfire requests reserve one run before opening an ad', async () => {
    const { NightMarketMonetization, MemoryProgressStorage } = requireMonetization();
    const { MockAdProvider } = await import('../src/ads.ts');
    const ads = new MockAdProvider();
    ads.queueRewarded({ status: 'completed' }, { status: 'completed' });
    const economy = new NightMarketMonetization(ads, new MemoryProgressStorage());
    economy.completeRun('concurrent-run', 30);

    const results = await Promise.all([
      economy.doubleWishfire('concurrent-run'),
      economy.doubleWishfire('concurrent-run'),
    ]);

    assert.deepEqual(results.map((result) => result.status).sort(), ['already-claimed', 'granted']);
    assert.equal(economy.getProgress().wishfire, 60);
    assert.deepEqual(ads.rewardedPlacements, ['double-wishfire']);
  });

  test('settlement and completed double remain idempotent after monetization re-instantiation', async () => {
    const { NightMarketMonetization, MemoryProgressStorage } = requireMonetization();
    const { MockAdProvider } = await import('../src/ads.ts');
    const storage = new MemoryProgressStorage();
    const firstAds = new MockAdProvider();
    firstAds.queueRewarded({ status: 'completed' });
    const first = new NightMarketMonetization(firstAds, storage);
    first.completeRun('stable-terminal-run', 30);
    assert.equal((await first.doubleWishfire('stable-terminal-run')).status, 'granted');

    const secondAds = new MockAdProvider();
    secondAds.queueRewarded({ status: 'completed' });
    const restored = new NightMarketMonetization(secondAds, storage);
    assert.deepEqual(restored.completeRun('stable-terminal-run', 30), { baseReward: 30, totalReward: 60, canDouble: false });
    assert.equal(restored.getProgress().wishfire, 60);
    assert.equal((await restored.doubleWishfire('stable-terminal-run')).status, 'already-claimed');
    assert.equal(secondAds.rewardedPlacements.length, 0);
  });

  test('dismissed or unavailable rewarded ads do not grant wishfire', async () => {
    const { NightMarketMonetization, MemoryProgressStorage } = requireMonetization();
    const adsModule = await import('../src/ads.ts');
    const ads = new adsModule.MockAdProvider();
    ads.queueRewarded({ status: 'dismissed' });
    const economy = new NightMarketMonetization(ads, new MemoryProgressStorage());
    economy.completeRun('run-2', 25);
    assert.equal((await economy.doubleWishfire('run-2')).status, 'not-granted');
    assert.equal(economy.getProgress().wishfire, 25);
  });

  test('legacy and malformed saves migrate defensively to version one', () => {
    const { NightMarketMonetization, MemoryProgressStorage } = requireMonetization();
    const adsModulePromise = import('../src/ads.ts');
    return adsModulePromise.then(({ NoopAdProvider }) => {
      const legacy = new MemoryProgressStorage(JSON.stringify({ wishfire: 42, completionCount: 3 }));
      const migrated = new NightMarketMonetization(new NoopAdProvider(), legacy);
      assert.deepEqual(migrated.getProgress(), { version: 1, wishfire: 42, completionCount: 3 });

      const malformed = new MemoryProgressStorage('{not json');
      const recovered = new NightMarketMonetization(new NoopAdProvider(), malformed);
      assert.deepEqual(recovered.getProgress(), { version: 1, wishfire: 0, completionCount: 0 });
    });
  });

  test('interstitial eligibility respects every timing and session cap gate', () => {
    const { InterstitialPolicy } = requireMonetization();
    const policy = new InterstitialPolicy(0);
    for (let index = 0; index < 6; index += 1) policy.recordCompletion();
    assert.equal(policy.canShowAtNaturalTransition(299_999), false);
    assert.equal(policy.canShowAtNaturalTransition(300_000), true);
    policy.recordInterstitial(300_000);
    assert.equal(policy.canShowAtNaturalTransition(449_999), false);
    assert.equal(policy.canShowAtNaturalTransition(450_000), true);
    policy.recordRewarded(450_000);
    assert.equal(policy.canShowAtNaturalTransition(629_999), false);
    assert.equal(policy.canShowAtNaturalTransition(630_000), true);
    policy.recordInterstitial(630_000);
    policy.recordInterstitial(780_000);
    assert.equal(policy.canShowAtNaturalTransition(930_000), false, 'three interstitials cap the session');
  });

  test('rewarded revive flow grants only after a completed ad and records cooldown', async () => {
    const { InterstitialPolicy, NightMarketAdFlow } = requireMonetization();
    const { MockAdProvider } = await import('../src/ads.ts');
    const ads = new MockAdProvider();
    ads.queueRewarded({ status: 'dismissed' }, { status: 'completed' });
    const policy = new InterstitialPolicy(0);
    const flow = new NightMarketAdFlow(ads, policy);
    let eligible = true;
    let revives = 0;
    const reviveTarget = {
      canRewardedRevive: () => eligible,
      reviveFromSafeState: () => { revives += 1; eligible = false; return true; },
    };

    assert.equal((await flow.tryRewardedRevive(reviveTarget, 300_000)).status, 'not-granted');
    assert.equal(revives, 0);
    assert.equal(policy.canShowAtNaturalTransition(479_999), false, 'dismissed rewarded ad still starts cooldown');
    assert.equal((await flow.tryRewardedRevive(reviveTarget, 480_000)).status, 'granted');
    assert.equal(revives, 1);
    assert.equal((await flow.tryRewardedRevive(reviveTarget, 700_000)).status, 'not-eligible');
    assert.equal(ads.rewardedPlacements.length, 2, 'ineligible requests must not open an ad');
  });

  test('natural-transition hook shows an interstitial only when policy is eligible', async () => {
    const { InterstitialPolicy, NightMarketAdFlow } = requireMonetization();
    const { MockAdProvider } = await import('../src/ads.ts');
    const ads = new MockAdProvider();
    ads.queueInterstitial({ status: 'shown' });
    const policy = new InterstitialPolicy(0);
    const flow = new NightMarketAdFlow(ads, policy);
    assert.equal((await flow.showNaturalTransitionInterstitial(299_999)).status, 'skipped');
    for (let index = 0; index < 6; index += 1) policy.recordCompletion();
    assert.equal((await flow.showNaturalTransitionInterstitial(300_000)).status, 'shown');
    assert.deepEqual(ads.interstitialPlacements, ['natural-transition']);
    assert.equal((await flow.showNaturalTransitionInterstitial(300_001)).status, 'skipped');
  });
});
