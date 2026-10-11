import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdProvider } from '../src/ads';
import {
  MemoryProgressStorage,
  NightMarketMonetization,
  type ProgressStorage,
} from '../src/monetization';

const quietAds: AdProvider = {
  async showRewarded() {
    return { status: 'dismissed' };
  },
  async showInterstitial() {
    return { status: 'unavailable' };
  },
};

class ToggleStorage implements ProgressStorage {
  constructor(private value: string | null = null, private failWrites = false) {}

  read(): string | null {
    return this.value;
  }

  write(value: string): void {
    if (this.failWrites) throw new Error('quota');
    this.value = value;
  }

  setFailWrites(value: boolean): void {
    this.failWrites = value;
  }
}

test('preserves malformed and future progress bytes and reports a recoverable issue', () => {
  for (const raw of [
    '{not json',
    JSON.stringify({ version: 99, coins: 999, completionCount: 9, futureField: { keep: true } }),
    JSON.stringify({ version: 2, coins: '999', completionCount: 9 }),
    JSON.stringify({ version: 2, coins: 12, completionCount: 9, records: { totalMeters: 'bad' } }),
    JSON.stringify({ version: 2, coins: 12, completionCount: 9, settlements: [['run', { baseReward: 4, doubled: false }], ['run', { baseReward: 7, doubled: true }]] }),
  ]) {
    const storage = new MemoryProgressStorage(raw);
    const economy = new NightMarketMonetization(quietAds, storage);

    assert.equal(storage.read(), raw);
    assert.equal(typeof economy.getPersistenceIssue(), 'string');
    const result = economy.completeRun('must-not-overwrite', 30);
    assert.equal(result.status, 'not-committed');
    assert.equal(storage.read(), raw);
  }
});

test('does not mutate wallet or settlement ledger when a write is rejected, then retries atomically', () => {
  const storage = new ToggleStorage(null, true);
  const economy = new NightMarketMonetization(quietAds, storage);
  const before = economy.getProgressV2();

  const rejected = economy.completeRun('retryable-run', 30, { distanceMeters: 12, gatesPassed: 2 });
  assert.equal(rejected.status, 'not-committed');
  assert.deepEqual(economy.getProgressV2(), before);
  assert.equal(storage.read(), null);

  storage.setFailWrites(false);
  const committed = economy.completeRun('retryable-run', 30, { distanceMeters: 12, gatesPassed: 2 });
  assert.deepEqual(committed, { baseReward: 30, totalReward: 30, canDouble: true });
  assert.equal(economy.getProgressV2().coins, 30);

  const replay = economy.completeRun('retryable-run', 999);
  assert.deepEqual(replay, committed);
  assert.equal(economy.getProgressV2().coins, 30);
});

test('rejects invalid economy numbers without mutation and floors valid fractional values', () => {
  const storage = new MemoryProgressStorage();
  const economy = new NightMarketMonetization(quietAds, storage);
  const before = economy.getProgressV2();

  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, Number.MAX_SAFE_INTEGER + 1, '3' as unknown as number]) {
    const result = economy.completeRun(`invalid-${String(value)}`, value);
    assert.equal(result.status, 'rejected');
    assert.deepEqual(economy.getProgressV2(), before);
  }

  assert.equal(economy.completeRun('fractional-run', 7.9).baseReward, 7);
  const afterReward = economy.getProgressV2();
  assert.equal(economy.spendCoins(Number.NaN), false);
  assert.equal(economy.spendCoins(Number.POSITIVE_INFINITY), false);
  assert.equal(economy.spendCoins(-1), false);
  assert.equal(economy.spendCoins(Number.MAX_SAFE_INTEGER + 1), false);
  assert.deepEqual(economy.getProgressV2(), afterReward);
  assert.equal(economy.spendCoins(2.9), true);
  assert.equal(economy.getProgressV2().coins, 5);
});

test('deduplicates concurrent item unlocks and releases the reservation after provider failure', async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let calls = 0;
  const ads: AdProvider = {
    async showRewarded() {
      calls += 1;
      await pending;
      return { status: 'completed' };
    },
    async showInterstitial() {
      return { status: 'unavailable' };
    },
  };
  const economy = new NightMarketMonetization(ads, new MemoryProgressStorage());

  const firstPromise = economy.unlockItemWithAd('talisman');
  await Promise.resolve();
  const secondPromise = economy.unlockItemWithAd('talisman');
  release();
  const [first, second] = await Promise.all([firstPromise, secondPromise]);
  assert.deepEqual(second, { status: 'in-flight' });
  assert.equal(first.status, 'granted');
  assert.equal(calls, 1);

  let failedCalls = 0;
  const failingAds: AdProvider = {
    async showRewarded() {
      failedCalls += 1;
      if (failedCalls === 1) throw new Error('provider offline');
      return { status: 'completed' };
    },
    async showInterstitial() {
      return { status: 'unavailable' };
    },
  };
  const retryable = new NightMarketMonetization(failingAds, new MemoryProgressStorage());
  assert.deepEqual(await retryable.unlockItemWithAd('firecracker'), { status: 'not-granted' });
  assert.deepEqual(await retryable.unlockItemWithAd('firecracker'), { status: 'granted', adStatus: 'completed' });
  assert.equal(failedCalls, 2);
});
