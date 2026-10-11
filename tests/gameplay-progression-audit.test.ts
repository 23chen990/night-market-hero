import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdProvider } from '../src/ads';
import {
  MemoryProgressStorage,
  NightMarketMonetization,
} from '../src/monetization';

const quietAds: AdProvider = {
  async showRewarded() {
    return { status: 'dismissed' };
  },
  async showInterstitial() {
    return { status: 'unavailable' };
  },
};

test('character unlock and selection validate roster ids, affordability, ownership, and persistence', () => {
  const storage = new MemoryProgressStorage();
  const economy = new NightMarketMonetization(quietAds, storage);
  assert.ok(economy.getProgressV2().characters?.includes('街灯客'));

  const beforeUnknown = economy.getProgressV2();
  assert.equal(economy.unlockCharacter('unknown-character').status, 'unknown-character');
  assert.deepEqual(economy.getProgressV2(), beforeUnknown);
  assert.equal(economy.unlockCharacter('走绳伎').status, 'insufficient-coins');
  assert.deepEqual(economy.selectCharacter('走绳伎'), { status: 'not-owned', characterId: '走绳伎' });

  economy.completeRun('character-funds', 2_000);
  assert.deepEqual(economy.unlockCharacter('走绳伎'), { status: 'unlocked', characterId: '走绳伎', coins: 200 });
  assert.deepEqual(economy.unlockCharacter('走绳伎'), { status: 'already-owned', characterId: '走绳伎', coins: 200 });
  assert.deepEqual(economy.selectCharacter('走绳伎'), { status: 'selected', characterId: '走绳伎' });
  assert.equal(economy.getProgressV2().selectedCharacter, '走绳伎');

  const restored = new NightMarketMonetization(quietAds, storage);
  assert.equal(restored.getProgressV2().selectedCharacter, '走绳伎');
  assert.ok(restored.getProgressV2().characters?.includes('走绳伎'));
  assert.equal(restored.getProgressV2().coins, 200);
});

test('missions expose exactly three active slots and atomically claim historical record eligibility once', () => {
  const economy = new NightMarketMonetization(quietAds, new MemoryProgressStorage());
  assert.equal(economy.getActiveMissions().length, 3);
  assert.equal(economy.getActiveMissions().every((mission) => mission.current >= 0 && mission.target > 0), true);

  economy.completeRun('mission-run', 10, {
    gatesPassed: 3,
    combo: 3,
    skySegments: 1,
    pickupCoins: 5,
  });
  const beforeClaim = economy.getProgressV2();
  assert.equal(economy.claimMission('gate-3').status, 'claimed');
  assert.equal(economy.getProgressV2().coins, (beforeClaim.coins ?? 0) + 400);
  assert.equal(economy.claimMission('gate-3').status, 'already-claimed');
  assert.equal(economy.claimMission('unknown-mission').status, 'unknown-mission');
  assert.equal(economy.claimMission('gate-5').status, 'not-eligible');

  const historicalRaw = JSON.stringify({
    version: 1,
    wishfire: 10,
    completionCount: 1,
    endlessUnlocked: true,
    bestGates: 3,
    records: { totalMeters: 100, totalPickups: 2, bestCombo: 3, gates: 3 },
  });
  const historical = new NightMarketMonetization(quietAds, new MemoryProgressStorage(historicalRaw));
  assert.equal(historical.getActiveMissions().length, 3);
  assert.equal(historical.getActiveMissions().some((mission) => mission.id === 'gate-3' && mission.claimable), true);
  assert.equal(historical.claimMission('gate-3').status, 'claimed');
  assert.equal(historical.getProgressV2().records?.coinsCollected, 0);
  assert.equal(historical.getProgressV2().records?.skySegments, 0);
});

test('record ledger maps persisted deltas and resumed terminal rewards without replaying a run', () => {
  const storage = new MemoryProgressStorage();
  const economy = new NightMarketMonetization(quietAds, storage);
  const first = economy.completeRun('resume-run', 10, {
    distanceMeters: 100,
    pickups: 2,
    combo: 3,
    gatesPassed: 1,
    pickupCoins: 7,
    skySegments: 1,
  });
  assert.deepEqual(first, { baseReward: 10, totalReward: 10, canDouble: true });
  assert.deepEqual(economy.getRecordLedger(), {
    runs: 1,
    bestDistanceMeters: 100,
    lifetimeDistanceMeters: 100,
    coinsCollected: 7,
    highestCombo: 3,
    skySegments: 1,
  });

  const duplicate = economy.completeRun('resume-run', 999, {
    distanceMeters: 999,
    pickupCoins: 99,
    skySegments: 9,
  });
  assert.deepEqual(duplicate, first);
  assert.equal(economy.getRecordLedger().lifetimeDistanceMeters, 100);

  assert.deepEqual(economy.resumeRun('resume-run'), { status: 'resumed', runId: 'resume-run' });
  const resumed = economy.completeRun('resume-run', 25, {
    distanceMeters: 150,
    pickups: 3,
    combo: 4,
    gatesPassed: 2,
    pickupCoins: 10,
    skySegments: 2,
  });
  assert.deepEqual(resumed, { baseReward: 25, totalReward: 25, canDouble: true });
  assert.equal(economy.getProgressV2().coins, 25);
  assert.deepEqual(economy.getRecordLedger(), {
    runs: 1,
    bestDistanceMeters: 150,
    lifetimeDistanceMeters: 150,
    coinsCollected: 10,
    highestCombo: 4,
    skySegments: 2,
  });
  assert.equal(economy.resumeRun('resume-run').status, 'resumed');
  assert.equal(economy.completeRun('resume-run', 25, { distanceMeters: 150, pickupCoins: 10, skySegments: 2 }).totalReward, 25);
  assert.equal(economy.getProgressV2().coins, 25);

  const restored = new NightMarketMonetization(quietAds, storage);
  assert.deepEqual(restored.getRecordLedger(), economy.getRecordLedger());
});

test('daily free revive is an atomic UTC-day claim that survives reload and rejects invalid input', () => {
  const storage = new MemoryProgressStorage();
  const economy = new NightMarketMonetization(quietAds, storage);
  const dayOne = Date.UTC(2026, 0, 2, 1, 0, 0);
  const dayTwo = Date.UTC(2026, 0, 3, 1, 0, 0);

  assert.equal(economy.canDailyFreeRevive(dayOne), true);
  assert.deepEqual(economy.claimDailyFreeRevive('revive-run-1', dayOne), { status: 'granted', runId: 'revive-run-1' });
  assert.equal(economy.canDailyFreeRevive(dayOne + 10_000), false);
  assert.equal(economy.claimDailyFreeRevive('revive-run-1', dayOne + 10_000).status, 'already-claimed');
  assert.equal(economy.canDailyFreeRevive(dayTwo), true);
  assert.deepEqual(economy.claimDailyFreeRevive('revive-run-2', dayTwo), { status: 'granted', runId: 'revive-run-2' });
  assert.equal(economy.claimDailyFreeRevive('revive-run-3', Number.NaN).status, 'rejected');

  const restored = new NightMarketMonetization(quietAds, storage);
  assert.equal(restored.canDailyFreeRevive(dayTwo), false);
  assert.equal(restored.canDailyFreeRevive(dayTwo + 86_400_000), true);
});

test('failed tutorial completion does not unlock endless mode while legacy calls retain completion behavior', () => {
  const failedTutorial = new NightMarketMonetization(quietAds, new MemoryProgressStorage());
  failedTutorial.completeRun('tutorial-fail', 4, { tutorialCompleted: false });
  assert.equal(failedTutorial.getProgressV2().endlessUnlocked, false);

  const legacy = new NightMarketMonetization(quietAds, new MemoryProgressStorage());
  legacy.completeRun('legacy-run', 4);
  assert.equal(legacy.getProgressV2().endlessUnlocked, true);
});

test('item and spending transactions preserve the cross-session settlement ledger', async () => {
  const storage = new MemoryProgressStorage();
  const economy = new NightMarketMonetization(quietAds, storage);
  economy.completeRun('settled', 2000);
  economy.consumeItem('talisman');
  assert.equal(economy.spendCoins(1), true);
  economy.unlockCharacter('走绳伎');
  economy.selectCharacter('走绳伎');
  const restored = new NightMarketMonetization(quietAds, storage);
  const before = restored.getProgressV2();
  restored.completeRun('settled', 9000);
  assert.deepEqual(restored.getProgressV2(), before);
});

test('failed progression writes are atomic and a doubled settlement cannot be resumed', async () => {
  let fail = false;
  const storage = new MemoryProgressStorage();
  const rejecting = { read: () => storage.read(), write: (value: string) => fail ? false : storage.write(value) };
  const ads: AdProvider = { ...quietAds, async showRewarded() { return { status: 'completed' }; } };
  const economy = new NightMarketMonetization(ads, rejecting);
  economy.completeRun('funds', 2000, { gatesPassed: 3, combo: 3 });
  const before = economy.getProgressV2();
  fail = true;
  assert.equal(economy.unlockCharacter('走绳伎').status, 'not-committed');
  assert.equal(economy.claimMission('gate-3').status, 'not-committed');
  assert.equal(economy.claimDailyFreeRevive('funds', Date.UTC(2026, 9, 9)).status, 'not-committed');
  assert.equal(economy.resumeRun('funds').status, 'not-committed');
  assert.deepEqual(economy.getProgressV2(), before);
  fail = false;
  assert.equal((await economy.doubleWishfire('funds')).status, 'granted');
  assert.equal(economy.resumeRun('funds').status, 'not-eligible');
  assert.equal(economy.canDailyFreeRevive(Number.POSITIVE_INFINITY), false);
  assert.equal(economy.claimDailyFreeRevive('funds', -1).status, 'rejected');
});

test('free revive claim atomically reopens the existing ledger and pays only new earnings', () => {
  const storage = new MemoryProgressStorage();
  const economy = new NightMarketMonetization(quietAds, storage);
  economy.completeRun('free-continuation', 20, { distanceMeters: 100 });
  assert.equal(economy.claimDailyFreeRevive('free-continuation', Date.UTC(2026, 9, 9)).status, 'granted');
  const restored = new NightMarketMonetization(quietAds, storage);
  assert.equal(restored.completeRun('free-continuation', 35, { distanceMeters: 150 }).totalReward, 35);
  assert.equal(restored.getProgressV2().coins, 35);
  assert.equal(restored.getRecordLedger().runs, 1);
  assert.equal(restored.getRecordLedger().lifetimeDistanceMeters, 150);
  assert.equal(restored.claimDailyFreeRevive('free-continuation', Date.UTC(2026, 9, 10)).status, 'already-claimed');
});
